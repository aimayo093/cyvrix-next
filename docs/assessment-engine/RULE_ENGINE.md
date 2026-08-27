# Rule Engine

Status: proposed.

The rule engine is the part of the platform that decides things. Everything
before it collects; everything after it explains. It is deliberately the
least clever component in the system, because its output has to be defensible
to a customer's auditor six months from now.

---

## Properties that are not negotiable

**Deterministic.** The same evidence and the same rule version produce the same
result, every time. No clock, no randomness, no network, no model.

**Pure.** A rule is a function of `(evidence, config) → RuleResult`. It cannot
read the database, call an API, or write anything.

**Versioned.** A published `RuleVersion` is immutable. Changing a rule creates a
new version. Historical assessments keep the version they ran under, so a
customer comparing March to September is comparing like with like — and a
tightened threshold cannot silently rewrite last quarter's report.

**Honest about absence.** Missing evidence is `not_applicable`, with a reason.
Never a pass. A control that could not be inspected has not been satisfied, and
scoring treats it as neither.

---

## Rule shape

```ts
type Rule = {
  ruleId: string;              // "M365-ID-001" — stable across versions
  name: string;
  description: string;
  category: SecurityDomain;    // identity | endpoint | network | cloud
                               // email | backup | governance
  dataSource: string;          // "microsoft_graph"
  requires: EvidenceRequirement[];
  prerequisites?: string[];    // licences or capabilities, e.g. "AAD_PREMIUM_P2"
  evaluate(ctx: RuleContext): RuleOutcome;
  severity: Severity;
  scoreWeight: number;
  recommendationTemplate: string;   // used when AI is unavailable
  frameworkMapping: FrameworkRef[];
  remediationReference?: string;
};
```

`requires` is declarative and checked before `evaluate` runs. A rule that needs
`user.mfa_registered` and finds none does not execute — the engine returns
`not_applicable` with `reason: "evidence_absent"`. This is what stops a rule
concluding "no privileged accounts lack MFA" when the truth is that nothing was
collected.

`prerequisites` covers licensing. A Defender rule on a tenant without the licence
returns `not_applicable` with `reason: "licence_absent"`, and the report says so
in words rather than implying a clean result.

---

## Worked example

The specification's first example, in full, because the detail is the point.

```ts
export const M365_ID_001: Rule = {
  ruleId: "M365-ID-001",
  name: "Privileged account without multi-factor authentication",
  description:
    "An account holding a privileged directory role has no strong " +
    "authentication method registered. A password alone protects the " +
    "highest-privilege accounts in the tenant.",

  category: "identity",
  dataSource: "microsoft_graph",

  requires: [
    { resourceType: "user", property: "privileged_roles" },
    { resourceType: "user", property: "strong_authentication_registered" },
  ],

  evaluate(ctx) {
    const users = ctx.evidence.byResourceType("user");

    const privileged = users.filter(
      (u) => (u.get("privileged_roles") as string[] ?? []).length > 0
    );

    // No privileged accounts at all is not a pass. It means the directory
    // read returned nothing useful, and something is wrong upstream.
    if (privileged.length === 0) {
      return { status: "not_applicable", reason: "no_privileged_accounts_observed" };
    }

    const exposed = privileged.filter(
      (u) => u.get("strong_authentication_registered") !== true
    );

    if (exposed.length === 0) return { status: "pass" };

    return {
      status: "fail",
      affected: exposed.map((u) => u.resourceId),
      evidenceIds: exposed.flatMap((u) => u.evidenceIds),
      facts: {
        exposedCount: exposed.length,
        privilegedCount: privileged.length,
        roles: [...new Set(exposed.flatMap((u) => u.get("privileged_roles") as string[]))],
      },
    };
  },

  severity: "critical",
  scoreWeight: 10,

  recommendationTemplate:
    "Register a strong authentication method for every account holding a " +
    "privileged role, and enforce it with a Conditional Access policy " +
    "targeting directory roles rather than named users.",

  frameworkMapping: [
    { framework: "CIS_M365", control: "1.1.1" },
    { framework: "NIST_CSF", control: "PR.AC-7" },
    { framework: "CYBER_ESSENTIALS", control: "Access control" },
    { framework: "NCSC_10_STEPS", control: "Identity and access management" },
  ],
};
```

Three things this example is demonstrating:

- **`facts` carries structured numbers, not prose.** The AI receives
  `exposedCount: 4` and writes the sentence. The rule never writes English about
  quantities, so the number in the report is always the number in the evidence.
- **`evidenceIds` is returned by the rule**, which is how the database
  constraint requiring evidence on every finding can be satisfied without the
  caller guessing.
- **Zero privileged accounts is `not_applicable`, not `pass`.** Every tenant has
  at least one Global Administrator. Observing none means the collection failed,
  and reporting a pass would be a fabricated clean result.

---

## The first rule pack

Milestone 6 ships the Microsoft 365 pack. The specification names five; these
are the ones that will actually be built first, chosen because each is severe,
unambiguous from a read-only Graph call, and remediable.

| Rule | Name | Severity |
| --- | --- | --- |
| `M365-ID-001` | Privileged account without MFA | Critical |
| `M365-ID-002` | Excessive Global Administrators | High |
| `M365-ID-003` | Legacy authentication permitted | High |
| `M365-ID-004` | No Conditional Access policy enforcing MFA | High |
| `M365-ID-005` | Guest accounts with directory read access | Medium |
| `M365-ID-006` | Dormant privileged accounts | Medium |
| `M365-EXO-001` | Automatic external forwarding permitted | High |
| `M365-EXO-002` | DKIM not configured for an accepted domain | Medium |
| `M365-EXO-003` | Anti-phishing policy absent or weakened | High |
| `M365-EXO-004` | Mailbox auditing disabled | Medium |
| `M365-SPO-001` | Overly permissive external sharing | High |
| `M365-SPO-002` | Anonymous sharing links permitted without expiry | Medium |
| `M365-INT-001` | Managed devices non-compliant with policy | Medium |
| `M365-INT-002` | Disk encryption not enforced | High |
| `M365-APP-001` | Enterprise applications with excessive consented permissions | High |

`M365-ID-002`'s threshold is configuration, not code — the specification says
"configurable threshold", and the default (more than four, or more than 5% of
users, whichever is greater) is stored in `SystemSetting` and recorded on the
`Score` row alongside the result.

---

## Evaluation

```
  Evidence for assessment
          │
          ▼
  For each rule in the template's pack:
          │
          ├─ prerequisites met?        no ─► not_applicable (licence_absent)
          ├─ required evidence present? no ─► not_applicable (evidence_absent)
          ├─ evaluate()                 threw ─► error, logged, assessment continues
          │
          ▼
     RuleResult  ──► pass: recorded, contributes to score
                 ──► fail: creates Finding + FindingEvidence
                 ──► not_applicable: recorded, excluded from score,
                                     reduces coverage
```

A rule that throws produces `error` and does not stop the assessment. One
malformed rule must not deny a customer the other forty results — but the error
is surfaced in the technical report rather than swallowed, because a silent
`error` is indistinguishable from a pass to a reader.

Rules run in parallel; none depends on another's output. Where a conclusion
genuinely depends on two areas, that belongs in scoring or in the AI's
thematic analysis, not in a rule reading another rule's verdict.

---

## Scoring

```
domain score  = Σ(weight × pass) / Σ(weight × assessed) × 100
overall       = Σ(domain score × domain weight)
coverage      = assessed / (assessed + not_applicable) × 100
```

`not_applicable` is excluded from the denominator of the score and included in
the denominator of coverage. This is the mechanism that stops an unconnected
environment inflating a score — the fewer controls inspected, the lower the
coverage, while the security score honestly describes what was seen.

Domain weights and band thresholds come from specification section 27, are
configurable, and are stored on the `Score` row so a historical score remains
interpretable after the defaults change.

---

## Authoring and change control

Rules live in `packages/rules` as TypeScript, reviewed like any other code, with
unit tests over fixture evidence — a passing case, a failing case, an
absent-evidence case, and a malformed-evidence case, for every rule.

Cyvrix administrators can enable, disable and configure thresholds at runtime
per specification section 24. They cannot author logic through the admin UI:
arbitrary customer-visible logic entered through a web form is both a security
problem and an untestable one.

Publishing a new `RuleVersion` requires a changelog entry stating what changed
and why. Prior assessments are never recomputed. If a customer wants their
March assessment re-evaluated under September's rules, that is a new assessment
over the retained evidence, recorded as such.
