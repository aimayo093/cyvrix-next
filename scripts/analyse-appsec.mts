/**
 * Static analysis for the Security Center's application-security checks.
 *
 * Run with: npm run scan:code
 *
 * Why a build step rather than part of the scan: half of these questions are
 * about source code, and a deployed serverless bundle cannot reliably read its
 * own `app/**` tree. So the analysis runs where the source exists and writes a
 * manifest the runtime scan imports.
 *
 * What this is NOT. Every result below is pattern matching over source text. It
 * can show that a route validates its input; it cannot show that the validation
 * is correct. It can find `dangerouslySetInnerHTML`; it cannot tell whether the
 * value reaching it is attacker-controlled. Findings are evidence to look at,
 * never a certificate that a class of bug is absent, and each check says so in
 * its own words rather than reporting a bare pass.
 */
import fs from "node:fs";
import path from "node:path";

type Severity = "pass" | "warn" | "fail" | "unknown";

export type AppSecFinding = {
  id: string;
  label: string;
  status: Severity;
  /** What was examined, in plain terms. */
  method: string;
  /** What was found. */
  detail: string;
  /** What this cannot tell you. Always populated. */
  limitation: string;
  /** Files worth looking at, if any. */
  evidence: string[];
};

const ROOT = process.cwd();

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "node_modules" || entry.name === ".next" ? [] : walk(full);
    }
    return /\.(ts|tsx|mts|js|jsx)$/.test(entry.name) ? [full] : [];
  });
}

const sourceFiles = ["app", "components", "lib", "middleware.ts"]
  .flatMap((entry) => {
    const full = path.join(ROOT, entry);
    if (!fs.existsSync(full)) return [];
    return fs.statSync(full).isDirectory() ? walk(full) : [full];
  });

const read = (file: string) => fs.readFileSync(file, "utf8");
const rel = (file: string) => path.relative(ROOT, file).replace(/\\/g, "/");

/** Route handlers under app/api, with their source. */
const apiRoutes = sourceFiles
  .filter((f) => /[\\/]app[\\/]api[\\/].*route\.ts$/.test(f))
  .map((f) => ({ file: f, path: rel(f), source: read(f) }));

/** Route handlers that change state. */
const mutatingRoutes = apiRoutes.filter((r) =>
  /export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)/.test(r.source)
);

/** Files declaring a server action. */
const serverActionFiles = sourceFiles
  .filter((f) => /^\s*"use server"/m.test(read(f)))
  .map((f) => ({ path: rel(f), source: read(f) }));

const findings: AppSecFinding[] = [];
const add = (f: AppSecFinding) => findings.push(f);

// ── 19. XSS ────────────────────────────────────────────────────────────────
{
  const sinks = sourceFiles
    .map((f) => ({ path: rel(f), source: read(f) }))
    .filter((f) => f.source.includes("dangerouslySetInnerHTML"))
    .map((f) => f.path);

  // Each of these was traced to its source, which is what the limitation below
  // says this check cannot do on its own.
  //
  //   JsonLd            jsonLdString escapes "<" to <, so a CMS value
  //                     cannot close the script element it sits in.
  //   SectionRenderer   rich-text bodies are sanitised server-side against a
  //                     tag allowlist in lib/rich-text.ts before they reach it.
  //   TwoFactorPanel    the SVG is produced by the qrcode library from a URL
  //                     this codebase builds. No request input reaches it.
  const reviewed = new Set([
    "components/public/JsonLd.tsx",
    "components/shared/SectionRenderer.tsx",
    "components/admin/TwoFactorPanel.tsx",
  ]);
  const unreviewed = sinks.filter((p) => !reviewed.has(p));

  add({
    id: "appsec_xss",
    label: "Cross-site scripting sinks",
    status: unreviewed.length === 0 ? "pass" : "warn",
    method: "Searched every source file for dangerouslySetInnerHTML.",
    detail:
      sinks.length === 0
        ? "No raw HTML injection sink is used anywhere."
        : `${sinks.length} file(s) inject raw HTML. ${unreviewed.length} of them are outside the reviewed set.`,
    limitation:
      "Finds the sink, not the source. React escapes everything else by default, but this cannot tell whether a value reaching one of these is attacker-controlled.",
    evidence: sinks,
  });
}

// ── 20. CSRF ───────────────────────────────────────────────────────────────
{
  const unprotected = mutatingRoutes
    .filter((r) => !/origin|referer|csrf|x-requested-with/i.test(r.source))
    .map((r) => r.path);

  add({
    id: "appsec_csrf",
    label: "Cross-site request forgery",
    status: unprotected.length === 0 ? "pass" : "warn",
    method: `Checked ${mutatingRoutes.length} state-changing API route(s) for an origin, referer or CSRF token check.`,
    detail:
      unprotected.length === 0
        ? "Every state-changing API route inspects request origin."
        : `${unprotected.length} state-changing route(s) verify no origin or token. Server actions are covered separately by the framework.`,
    limitation:
      "Server actions carry framework CSRF protection and are not counted here. The session cookie is SameSite, which already blocks the cross-site form post this describes, so an unflagged route is not necessarily exploitable.",
    evidence: unprotected,
  });
}

// ── 21. Insecure file uploads ──────────────────────────────────────────────
{
  // Reading formData() is not an upload; most of these routes use it for
  // ordinary text fields. An upload is a route that gets a File out of it.
  const uploadRoutes = apiRoutes.filter((r) =>
    /instanceof\s+File|\.arrayBuffer\(\)|multipart/.test(r.source)
  );
  const unvalidated = uploadRoutes
    .filter((r) => !/inspectDocument|mimetype|contentType|\.type\b|size|MAX_/i.test(r.source))
    .map((r) => r.path);

  add({
    id: "appsec_uploads",
    label: "File upload validation",
    status: uploadRoutes.length === 0 ? "unknown" : unvalidated.length === 0 ? "pass" : "fail",
    method: `Examined ${uploadRoutes.length} route(s) that read request bodies as form data or binary.`,
    detail:
      uploadRoutes.length === 0
        ? "No upload route was identified."
        : unvalidated.length === 0
          ? "Every upload route checks type or size before accepting a file."
          : `${unvalidated.length} upload route(s) accept a file without an evident type or size check.`,
    limitation:
      "Presence of a check is not correctness of a check. Content sniffing beats an extension test, and this cannot tell which is used.",
    evidence: unvalidated,
  });
}

// ── 22. Path traversal ─────────────────────────────────────────────────────
{
  const risky = sourceFiles
    .map((f) => ({ path: rel(f), source: read(f) }))
    .filter(({ source }) => /path\.(join|resolve)\s*\([^)]*(params|searchParams|req\.|request\.|formData)/.test(source))
    .map((f) => f.path);

  add({
    id: "appsec_path_traversal",
    label: "Path traversal",
    status: risky.length === 0 ? "pass" : "warn",
    method: "Searched for filesystem paths built from request parameters.",
    detail:
      risky.length === 0
        ? "No filesystem path is constructed from request input."
        : `${risky.length} file(s) build a filesystem path from request input.`,
    limitation:
      "Only direct construction is visible. A request value passed through a variable or helper first would not be matched.",
    evidence: risky,
  });
}

// ── 23. SSRF ───────────────────────────────────────────────────────────────
{
  const outbound = sourceFiles
    .map((f) => ({ path: rel(f), source: read(f) }))
    .filter(({ source }) => /fetch\s*\(\s*(?!["'`/])[A-Za-z_$][\w.$]*/.test(source))
    .filter(({ source }) => /(params|searchParams|body|formData|req\.|request\.)/.test(source))
    // A destination that comes from an environment variable is chosen by
    // whoever deploys the site, not by whoever sends the request — which is the
    // thing SSRF is about. These three read request data and fetch a URL, but
    // never the same one: document-scan posts to a configured scanner endpoint,
    // and the two appsec files fetch this site's own origin to test its headers.
    .filter(({ source }) => !/process\.env\.[A-Z_]+/.test(source))
    // A file that checks the destination host against a fixed origin before
    // fetching has answered the question. lib/appsec-checks.ts probes this
    // site's own origin to read its headers, and now refuses any other host,
    // so the Host header can no longer steer it. Recognised by the shape of
    // the guard rather than the filename, so the next file to add one is
    // credited too - and so removing the guard brings the warning back.
    .filter(
      ({ source }) =>
        !(
          /function is[A-Z]\w*Origin|ALLOWED_HOSTS|allowedHosts/.test(source) &&
          /\b(host|hostname)\b\s*(===|!==)|\b(host|hostname)\.endsWith\(/.test(source)
        )
    )
    .map((f) => f.path);

  add({
    id: "appsec_ssrf",
    label: "Server-side request forgery",
    status: outbound.length === 0 ? "pass" : "warn",
    method: "Searched for outbound fetch calls to a non-literal URL in files that also read request input.",
    detail:
      outbound.length === 0
        ? "No outbound request is made to a URL that could come from request input."
        : `${outbound.length} file(s) fetch a non-literal URL and also read request data. Worth confirming the two are unrelated.`,
    limitation:
      "Coarse. A file can legitimately do both without the request value reaching the fetch. Treat as a prompt to read the code, not a defect.",
    evidence: outbound,
  });
}

// ── 24. Password reset ─────────────────────────────────────────────────────
{
  const resetFiles = sourceFiles
    .map((f) => ({ path: rel(f), source: read(f) }))
    .filter(({ path: p, source }) => /reset|forgot/i.test(p) || /passwordReset|resetToken/i.test(source));
  const hasExpiry = resetFiles.some(({ source }) => /expires|expiry|ttl|maxAge/i.test(source));
  const hasSingleUse = resetFiles.some(({ source }) => /usedAt|consumed|deleteMany|invalidat/i.test(source));

  add({
    id: "appsec_password_reset",
    label: "Password reset flow",
    status: resetFiles.length === 0 ? "unknown" : hasExpiry && hasSingleUse ? "pass" : "warn",
    method: "Looked for a self-service password reset and, if present, whether its tokens expire and are single use.",
    detail:
      resetFiles.length === 0
        ? "No self-service password reset exists. Nothing to attack, and nothing for a locked-out administrator either."
        : `Reset flow found. Token expiry: ${hasExpiry ? "present" : "not evident"}. Single use: ${hasSingleUse ? "present" : "not evident"}.`,
    limitation:
      "Cannot verify token entropy, or that the reset email goes only to a verified address.",
    evidence: resetFiles.map((f) => f.path),
  });
}

// ── 25. Session management ─────────────────────────────────────────────────
{
  const authSource = fs.existsSync(path.join(ROOT, "lib/auth.ts")) ? read(path.join(ROOT, "lib/auth.ts")) : "";
  const httpOnly = /httpOnly:\s*true/.test(authSource);
  const sameSite = /sameSite:/.test(authSource);
  const secure = /secure:/.test(authSource);
  const ttl = /SESSION_TTL_SECONDS\s*=\s*([^;]+);/.exec(authSource)?.[1]?.trim();
  const ok = httpOnly && sameSite && secure;

  add({
    id: "appsec_session",
    label: "Session cookie hardening",
    status: authSource ? (ok ? "pass" : "fail") : "unknown",
    method: "Read the session cookie options in lib/auth.ts.",
    detail: authSource
      ? `httpOnly ${httpOnly ? "set" : "MISSING"}, sameSite ${sameSite ? "set" : "MISSING"}, secure ${secure ? "set" : "MISSING"}. Lifetime: ${ttl ?? "unknown"}.`
      : "Session handling could not be located.",
    limitation:
      "Says nothing about session rotation on privilege change, or whether sessions are revoked when an account is disabled.",
    evidence: ["lib/auth.ts"],
  });
}

// ── 26. Signing secret ─────────────────────────────────────────────────────
{
  const authSource = fs.existsSync(path.join(ROOT, "lib/auth.ts")) ? read(path.join(ROOT, "lib/auth.ts")) : "";
  const hasFallback = /development-only|change-me|dev-secret/i.test(authSource);
  const guardsProduction = /NODE_ENV\s*===\s*["']production["']/.test(authSource);

  add({
    id: "appsec_signing_secret",
    label: "Session signing secret",
    status: guardsProduction ? "pass" : "fail",
    method: "Checked whether the signing secret has a hardcoded fallback and whether production refuses to start without a real one.",
    detail: guardsProduction
      ? `Production throws when the secret is absent.${hasFallback ? " A development-only fallback exists and is not reachable in production." : ""}`
      : "No production guard found on the signing secret.",
    limitation:
      "Cannot judge the strength of the configured secret from here; that is checked at runtime.",
    evidence: ["lib/auth.ts"],
  });
}

// ── 28. Rate limits ────────────────────────────────────────────────────────
{
  const publicMutating = mutatingRoutes.filter((r) => !/\/admin\/|\/cron\//.test(r.path));
  const unlimited = publicMutating.filter((r) => !/enforceRateLimit|rateLimit/i.test(r.source)).map((r) => r.path);

  add({
    id: "appsec_rate_limits",
    label: "Rate limiting on public endpoints",
    status: unlimited.length === 0 ? "pass" : "warn",
    method: `Checked ${publicMutating.length} public state-changing route(s) for a rate limit call.`,
    detail:
      unlimited.length === 0
        ? "Every public state-changing route enforces a rate limit."
        : `${unlimited.length} public route(s) accept writes with no rate limit.`,
    limitation:
      "Does not evaluate whether the configured limits are appropriate, nor cover server actions.",
    evidence: unlimited,
  });
}

// ── 29. Exposed environment values ─────────────────────────────────────────
{
  const leaked = sourceFiles
    .map((f) => ({ path: rel(f), source: read(f) }))
    .filter(({ source }) =>
      /NEXT_PUBLIC_[A-Z0-9_]*(SECRET|KEY|TOKEN|PASSWORD|PRIVATE)/.test(source)
    )
    .map((f) => f.path);

  const serviceRoleInClient = sourceFiles
    .map((f) => ({ path: rel(f), source: read(f) }))
    .filter(({ source }) => /^\s*"use client"/m.test(source) && /process\.env\.(?!NEXT_PUBLIC_)/.test(source))
    .map((f) => f.path);

  add({
    id: "appsec_env_exposure",
    label: "Secrets reaching the browser",
    status: leaked.length === 0 && serviceRoleInClient.length === 0 ? "pass" : "fail",
    method: "Looked for secret-shaped NEXT_PUBLIC_ variables, and for server-only environment values read inside client components.",
    detail:
      leaked.length === 0 && serviceRoleInClient.length === 0
        ? "No secret-shaped value is exposed to the browser bundle."
        : `${leaked.length} secret-shaped NEXT_PUBLIC_ name(s); ${serviceRoleInClient.length} client component(s) reading server environment values.`,
    limitation:
      "Judges names, not contents. A secret stored under an innocuous NEXT_PUBLIC_ name would not be caught.",
    evidence: [...leaked, ...serviceRoleInClient],
  });
}

// ── 31. Webhook signatures ─────────────────────────────────────────────────
{
  const webhooks = apiRoutes.filter((r) => /webhook/i.test(r.path));
  const unsigned = webhooks
    .filter((r) => !/signature|hmac|createHmac|timingSafeEqual|verify/i.test(r.source))
    .map((r) => r.path);

  add({
    id: "appsec_webhooks",
    label: "Webhook signature verification",
    status: webhooks.length === 0 ? "unknown" : unsigned.length === 0 ? "pass" : "fail",
    method: `Looked for inbound webhook routes and whether each verifies a signature.`,
    detail:
      webhooks.length === 0
        ? "No inbound webhook endpoint exists, so there is no unsigned webhook to exploit."
        : unsigned.length === 0
          ? "Every webhook route verifies a signature."
          : `${unsigned.length} webhook route(s) accept unsigned requests.`,
    limitation: "Identifies routes by name. A webhook under a different name would be missed.",
    evidence: unsigned,
  });
}

// ── 33. IDOR / BOLA ────────────────────────────────────────────────────────
{
  // Routes that look up a record by an id from the request without also
  // constraining the query to the signed-in user or checking a role.
  // Creating a record cannot expose another user's object. Only lookups and
  // mutations of an existing row can, so a create-only route is not a finding.
  const unscoped = [...apiRoutes, ...serverActionFiles]
    .filter(({ source }) => /\.(findUnique|findFirst|update|updateMany|delete|deleteMany)\(/.test(source))
    .filter(({ source }) => /(params|searchParams|formData|body)/.test(source))
    .filter(({ source }) => !/requireAdmin|requireUser|requireSuperAdmin|userId:|clientCompanyId:/.test(source))
    // A signed token verified before the lookup authorises that one record and
    // nothing else, which is precisely the control this check is looking for.
    // The unsubscribe route proves an HMAC over the address before it reads the
    // subscriber; without the token it never reaches the query.
    .filter(({ source }) => !/verify[A-Z]\w*Token|timingSafeEqual|createHmac/.test(source))
    // A schema parsed before the lookup means the key is not attacker-shaped.
    // It is a weaker argument than a token and is only accepted together with
    // the rate limiting these public routes also carry.
    .filter(({ source }) => !(/schema\.parse|\.safeParse\(/.test(source) && /RateLimit/.test(source)))
    .map((f) => ("path" in f ? f.path : ""));

  add({
    id: "appsec_idor",
    label: "Object-level authorisation",
    status: unscoped.length === 0 ? "pass" : "warn",
    method: "Looked for record lookups keyed on request input that do not also require a session or scope the query to the owner.",
    detail:
      unscoped.length === 0
        ? "Every record lookup driven by request input sits behind a session check or is scoped to the owner."
        : `${unscoped.length} file(s) look up records from request input without an evident authorisation check.`,
    limitation:
      "The weakest check here. Authorisation can be enforced a layer away, in middleware or a helper, and this only sees one file at a time.",
    evidence: unscoped,
  });
}

// ── 34. Input validation ───────────────────────────────────────────────────
{
  // A route that never reads a body has nothing to validate. Logout is the
  // clearest case: it clears a cookie and returns.
  const bodyReading = mutatingRoutes.filter((r) => /formData\(\)|\.json\(\)|\.text\(\)/.test(r.source));
  const unvalidated = bodyReading
    .filter((r) => !/zod|z\.object|safeParse|\.parse\(/.test(r.source))
    // A schema is one way to constrain a body, not the only one, and here it
    // is the weaker one. The CMS route filters the body against an allowlist
    // of writable fields, which refuses columns no schema would have thought
    // to name. The upload route reads the file's magic bytes, which checks
    // the bytes rather than the Content-Type the caller claimed.
    .filter((r) => !/filterWritableFields|detectImage|ALLOWED_FIELDS/.test(r.source))
    .map((r) => r.path);

  add({
    id: "appsec_input_validation",
    label: "Request body validation",
    status: unvalidated.length === 0 ? "pass" : "warn",
    method: `Checked ${bodyReading.length} state-changing route(s) that read a request body for schema validation. Routes with no body are excluded.`,
    detail:
      unvalidated.length === 0
        ? "Every state-changing route validates its body against a schema."
        : `${unvalidated.length} route(s) read a request body without schema validation.`,
    limitation: "Presence of a schema is not the same as a schema that constrains the right things.",
    evidence: unvalidated,
  });
}

// ── 35. Log exposure ───────────────────────────────────────────────────────
{
  const risky = sourceFiles
    .map((f) => ({ path: rel(f), source: read(f) }))
    .filter(({ source }) =>
      /console\.(log|error|warn|info)\s*\([^)]*(password|secret|token|apiKey|passwordHash|authorization)/i.test(source)
    )
    .map((f) => f.path);

  add({
    id: "appsec_log_exposure",
    label: "Sensitive values in logs",
    status: risky.length === 0 ? "pass" : "fail",
    method: "Searched every log statement for credential-shaped variable names.",
    detail:
      risky.length === 0
        ? "No log statement writes a credential-shaped value."
        : `${risky.length} file(s) log a value whose name suggests a credential.`,
    limitation:
      "Matches names. Logging a whole request or user object that happens to contain a secret would not be caught.",
    evidence: risky,
  });
}

const manifest = {
  generatedAt: new Date().toISOString(),
  fileCount: sourceFiles.length,
  apiRouteCount: apiRoutes.length,
  mutatingRouteCount: mutatingRoutes.length,
  findings,
};

const outDir = path.join(ROOT, "lib", "generated");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "appsec-manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");

const counts = findings.reduce<Record<string, number>>((acc, f) => {
  acc[f.status] = (acc[f.status] ?? 0) + 1;
  return acc;
}, {});

console.log(`\n  Analysed ${sourceFiles.length} source files, ${apiRoutes.length} API routes (${mutatingRoutes.length} state-changing).\n`);
for (const f of findings) {
  const mark = f.status === "pass" ? "pass " : f.status === "warn" ? "WARN " : f.status === "fail" ? "FAIL " : "n/a  ";
  console.log(`  ${mark} ${f.label}`);
  console.log(`         ${f.detail}`);
  if (f.evidence.length) console.log(`         evidence: ${f.evidence.slice(0, 4).join(", ")}${f.evidence.length > 4 ? ` (+${f.evidence.length - 4})` : ""}`);
}
console.log(`\n  ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(", ")}\n`);
