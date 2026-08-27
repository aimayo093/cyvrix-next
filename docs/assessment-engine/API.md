# API Design

Status: proposed. REST over HTTPS, JSON, OpenAPI 3.1 generated from Zod schemas
in `packages/contracts` so the specification cannot drift from the code.

---

## Conventions

**Versioned:** `/v1/...`. A breaking change is a new version, not a silent
change of shape.

**Tenant-implicit.** No route contains an organisation identifier. The tenant
comes from the token and only from the token. `GET /v1/assessments` returns
the caller's organisation's assessments; there is no
`/v1/organisations/{id}/assessments`, because that route's existence is an
invitation to get authorisation wrong on it.

**Errors** are RFC 9457 problem documents:

```json
{
  "type": "https://api.cyvrix.co.uk/problems/insufficient-permission",
  "title": "Insufficient permission",
  "status": 403,
  "detail": "This action requires the administrator role.",
  "instance": "/v1/assessments/2f9c.../start",
  "correlationId": "01JBQ..."
}
```

`detail` is safe to show a user. Stack traces, SQL and provider payloads never
appear in a response — the standing rule for this organisation is that internal
stack traces are never exposed, and the correlation ID is how support ties a
user's report to the server-side log without leaking anything.

**Idempotency** on every state-changing POST via an `Idempotency-Key` header.
Starting an assessment twice because a customer double-clicked should not run
two collections against their tenant.

**Pagination** is cursor-based. Offset pagination over a findings table that is
still being written produces duplicates and gaps.

---

## Surface

### Authentication
```
POST   /v1/auth/register
POST   /v1/auth/login                    → MFA challenge
POST   /v1/auth/mfa/verify               → session
POST   /v1/auth/mfa/enrol
POST   /v1/auth/mfa/recovery
POST   /v1/auth/logout
GET    /v1/auth/sessions
DELETE /v1/auth/sessions/{id}
```

### Organisation
```
GET    /v1/organisation
PATCH  /v1/organisation
GET    /v1/organisation/members
POST   /v1/organisation/invitations
DELETE /v1/organisation/members/{id}
PATCH  /v1/organisation/members/{id}/role
```

### Assessments
```
GET    /v1/assessment-templates
POST   /v1/assessments                          → draft
GET    /v1/assessments
GET    /v1/assessments/{id}
PUT    /v1/assessments/{id}/scope
POST   /v1/assessments/{id}/authorisation       → immutable, required
GET    /v1/assessments/{id}/preflight
POST   /v1/assessments/{id}/start
POST   /v1/assessments/{id}/cancel
GET    /v1/assessments/{id}/progress            → SSE
```

`POST /authorisation` has no counterpart `PATCH` or `DELETE`. Amending an
authorisation means creating another one, which matches what the record is for.

### Connectors
```
GET    /v1/connectors
POST   /v1/connectors/microsoft-365/consent-url
GET    /v1/connectors/microsoft-365/callback
POST   /v1/connectors/{id}/preflight
DELETE /v1/connectors/{id}                      → revoke + destroy ciphertext
```

No endpoint returns a token, a refresh token, or key material. There is no
`GET /v1/connectors/{id}/credential`.

### Findings, scores, reports
```
GET    /v1/assessments/{id}/findings            → filter, sort, cursor
GET    /v1/findings/{id}
PATCH  /v1/findings/{id}/status                 → acknowledge, plan, accept risk, false positive
POST   /v1/findings/{id}/notes
GET    /v1/assessments/{id}/score
GET    /v1/organisation/score-history
POST   /v1/assessments/{id}/reports
GET    /v1/reports/{id}
GET    /v1/reports/{id}/download                → short-lived pre-signed URL
```

### Remediation
```
POST   /v1/assessments/{id}/remediation-requests
GET    /v1/remediation-requests
GET    /v1/remediation-requests/{id}
PATCH  /v1/remediation-tasks/{id}
```

### Agent (mTLS, separate listener)
```
POST   /agent/v1/enrol                          → one-time token → certificate
POST   /agent/v1/heartbeat
GET    /agent/v1/jobs                           → signed envelopes
POST   /agent/v1/jobs/{id}/result
```

The agent listener is a separate port and a separate authentication mechanism.
An agent certificate cannot authenticate to the customer API and a session
cookie cannot authenticate to the agent API. Keeping them apart means a flaw in
one does not reach the other.

### Cyvrix staff (`/v1/admin/...`)

Separate role check, every access audited individually, and never reachable with
a customer token. Staff endpoints resolve the tenant explicitly and log which
staff member read which organisation's data.

---

## Rate limits

| Scope | Limit |
| --- | --- |
| Authentication | 5 per minute per IP, then exponential backoff |
| General API | 300 per minute per organisation |
| Assessment start | 5 concurrent per organisation |
| Report generation | 10 per hour per organisation |
| Agent heartbeat | 1 per 30 seconds per agent |

Exceeding a limit returns 429 with `Retry-After`. The platform honours that
header when calling Microsoft; it is reasonable to expect the same in return.
