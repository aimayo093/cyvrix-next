/**
 * The rules that decide what Paperclip agents can see and submit
 * (DECISIONS section 15). Run with: npm run test:paperclip
 *
 * Covers the token scopes, what a draft may contain, the claims check that
 * blocks approval, and that the feed's queries never reach staff-only data.
 */
import fs from "node:fs";
import path from "node:path";
import {
  canApprove,
  draftFindings,
  draftInputSchema,
  draftView,
  MAX_BLOG_PARAGRAPHS,
  normaliseDraft,
  plainText,
} from "../lib/agent-drafts-core";
import { CLAIM_RULES, claimFindings } from "../lib/claim-rules";
import { authorise, integrationToken, paperclipTokenCheck } from "../lib/paperclip-auth";

let passed = 0;
let failed = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) passed += 1;
  else failed += 1;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`}`);
}

const READ = "r".repeat(48);
const DRAFT = "d".repeat(48);
const env = { PAPERCLIP_READ_TOKEN: READ, PAPERCLIP_DRAFT_TOKEN: DRAFT };

console.log("\n  Token scopes");
check("both scopes off with no tokens", [authorise("read", `Bearer ${READ}`, {}), authorise("draft", `Bearer ${DRAFT}`, {})], ["off", "off"]);
check("read token reads", authorise("read", `Bearer ${READ}`, env), "ok");
check("draft token drafts", authorise("draft", `Bearer ${DRAFT}`, env), "ok");
check("draft token cannot read client data", authorise("read", `Bearer ${DRAFT}`, env), "unauthorised");
check("read token cannot submit drafts", authorise("draft", `Bearer ${READ}`, env), "unauthorised");
check("missing header refused", authorise("read", null, env), "unauthorised");
check("short tokens leave the scope off", authorise("read", "Bearer short", { PAPERCLIP_READ_TOKEN: "short" }), "off");
check("the same value for both switches drafting off", integrationToken("draft", { PAPERCLIP_READ_TOKEN: READ, PAPERCLIP_DRAFT_TOKEN: READ }), null);
check("the old feed token still opens the read scope", integrationToken("read", { EXECUTIVE_OS_FEED_TOKEN: READ }), READ);

console.log("\n  Security Center");
check("not configured is not applicable", paperclipTokenCheck({}).notApplicable, true);
check("two strong distinct tokens pass", paperclipTokenCheck(env).status, "pass");
check("a shared value warns", paperclipTokenCheck({ PAPERCLIP_READ_TOKEN: READ, PAPERCLIP_DRAFT_TOKEN: READ }).status, "warn");
check("a short token warns", paperclipTokenCheck({ PAPERCLIP_DRAFT_TOKEN: "short" }).status, "warn");
check("the check never contains a token", JSON.stringify(paperclipTokenCheck(env)).includes(READ), false);

console.log("\n  Draft content");
const source = { agent: "Copywriter", role: "Marketing" };
const blog = (body: string, extra: Record<string, unknown> = {}) =>
  draftInputSchema.safeParse({ kind: "blog", idempotencyKey: "blog-0001", source, title: "Backups that restore", body, ...extra });

check("a plain blog draft is accepted", blog("First paragraph.\n\n## A heading\n\nSecond paragraph.").success, true);
check(
  "a script tag is removed, with its contents",
  plainText('Hello<script>alert("x")</script> <b>world</b>'),
  "Hello world",
);
check("a tag rebuilt from pieces does not survive", /<|script/i.test(plainText("<scr<script></script>ipt>alert(1)</script>")), false);
check("a split tag leaves no angle bracket", /[<>]/.test(plainText("<<b>img src=x onerror=alert(1)>")), false);
check("style bodies go too, any case", plainText("a<STYLE>body{x:1}</style>b"), "ab");
check("an unclosed script drops the rest", plainText("keep<script>steal()"), "keep");
check("a case-changing character cannot shift the scan", /alert/.test(plainText("İ<script>alert(1)</script>ok")), false);
check("a lone < in prose keeps the rest", plainText("Use x < 3 and continue"), "Use x  3 and continue");
check("</scripture> does not end a script block", /alert/.test(plainText("<script>a</scripture>alert(1)</script>after")), false);
check("text after a real closing tag survives", plainText("<script>x</script >after"), "after");
check("plain prose is unchanged", plainText("Backups restore in hours, not days."), "Backups restore in hours, not days.");
const parsedScript = blog("Intro<script>steal()</script>\n\nMore");
check("script never reaches the stored body", parsedScript.success && !normaliseDraft(parsedScript.data).body.includes("steal"), true);
check(
  `more than ${MAX_BLOG_PARAGRAPHS} paragraphs is refused, not silently cut`,
  blog(Array.from({ length: MAX_BLOG_PARAGRAPHS + 1 }, (_, i) => `Paragraph ${i}.`).join("\n\n")).success,
  false,
);
check("more than 8 tags is refused", blog("Body", { tags: Array.from({ length: 9 }, (_, i) => `t${i}`) }).success, false);
check("an unknown kind is refused", draftInputSchema.safeParse({ kind: "tweet", idempotencyKey: "x-0000001", source, text: "hi" }).success, false);
check("a short idempotency key is refused", blog("Body", { idempotencyKey: "abc" }).success, false);
check(
  "a social link must be https",
  draftInputSchema.safeParse({ kind: "social", idempotencyKey: "social-001", source, network: "linkedin", text: "Hi", link: "http://cyvrix.co.uk" }).success,
  false,
);
check(
  "a javascript: link is refused",
  draftInputSchema.safeParse({ kind: "social", idempotencyKey: "social-002", source, network: "linkedin", text: "Hi", link: "javascript:alert(1)" }).success,
  false,
);
check("an empty body after stripping markup is refused", blog("<div></div>").success, false);

console.log("\n  Claims check");
const certified = blog("We are ISO 27001 certified and offer a 99.9% uptime guarantee.");
const certifiedDraft = certified.success ? normaliseDraft(certified.data) : null;
const findings = certifiedDraft ? draftFindings(certifiedDraft) : [];
check(
  "an unevidenced certification, SLA figure and guarantee are all found",
  [...new Set(findings.map((f) => f.rule))].sort(),
  ["certification held", "guarantee", "uptime or SLA figure"].sort(),
);
check("a blog draft with findings cannot be approved", canApprove("blog", findings), false);
check("a clean blog draft can be approved", canApprove("blog", []), true);
check("an internal proposal is not blocked by public-claims rules", canApprove("proposal", findings), true);
check("readiness work is not a claim", claimFindings("We help with ISO 27001 readiness.").length, 0);
check("claims in tags and the summary are checked too", draftFindings({ title: "T", body: "B", payload: { summary: "Award-winning support", tags: [] } }).length, 1);
check(
  "the build check and drafts use the same rules",
  fs.readFileSync(path.join(process.cwd(), "scripts/check-claims.mts"), "utf8").includes('from "../lib/claim-rules"') && CLAIM_RULES.length >= 7,
  true,
);

console.log("\n  What an agent is told");
const view = draftView({
  id: "00000000-0000-0000-0000-000000000000",
  kind: "blog",
  status: "REJECTED",
  title: "T",
  claimFindings: [],
  reviewNote: "Too salesy",
  reviewedAt: new Date("2026-11-11T10:00:00Z"),
  publishedRef: null,
  createdAt: new Date("2026-11-11T09:00:00Z"),
  updatedAt: new Date("2026-11-11T10:00:00Z"),
});
check("the review note is returned", view.reviewNote, "Too salesy");
check("the reviewer's identity is not", "reviewerId" in view, false);

console.log("\n  Feed boundaries");
const feedSource = fs.readFileSync(path.join(process.cwd(), "lib/executive-os-feed.ts"), "utf8");
check("ticket messages are limited to client-visible ones", /visibility:\s*"client"/.test(feedSource), true);
check("no password, session or setting is ever selected", /passwordHash|userSession|siteSetting|twoFactor/i.test(feedSource), false);
const snapshotSource = fs.readFileSync(path.join(process.cwd(), "lib/paperclip-snapshot.ts"), "utf8");
const snapshotCode = snapshotSource.replace(/\/\*[\s\S]*?\*\//g, "");
check("the snapshot carries no contact details", /email|phone/i.test(snapshotCode), false);
check("snapshot queue items carry no name, company or subject", /item\.(title|detail)/.test(snapshotCode), false);

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
