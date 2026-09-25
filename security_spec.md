# Security Specification

## Implemented boundaries

- Guest repositories are local only. Signed-in repositories query each collection with `userId == uid`; cloud failures remain failures.
- Firestore denies unauthenticated and cross-user reads/writes, constrains create/update `id` and `userId`, and checks ownership of linked parents after an atomic write. Default unknown collections are denied. The prototype's shared `system` data is no longer readable through these rules.
- User-owned deletes are allowed. Full field validation lives in the application Zod schemas; the rules are an ownership/relationship boundary, not an exhaustive business schema. An owner using a separate client can still create malformed fields or orphan children by deleting a parent. Future schema hardening and server-side lifecycle enforcement remain necessary for multi-user deployment.
- Every `/api/copilot/*` request passes Firebase Admin ID token verification with revocation checks, a server-side UID allowlist, and rate limits. Guest AI is disabled. CORS uses exact origins, not `*`; originless clients must still authenticate.
- IP limit: 60/minute before token verification. UID limits: 10/minute and 100/day. Global: 300/day. In-memory stores reset with the process and are not shared across instances; provider quotas are still required for cost control.
- Input schemas limit fields, model choices, chat length and 128 KB request bodies. Server provider timeout is 30 seconds, browser timeout 45 seconds, generated output bounded to 4096 tokens.
- DeepSeek is the default provider (`AI_PROVIDER=deepseek`, `DEEPSEEK_MODEL=deepseek-flash`). Server-side fetch uses the fixed official `https://api.deepseek.com/chat/completions` endpoint; no client-supplied URL is accepted. All DeepSeek profiles use the same model with thinking explicitly disabled. There are no automatic retries or paid provider fallbacks. Gemini requires explicit `AI_PROVIDER=gemini` configuration.
- DeepSeek structured tasks use JSON output mode plus prompt field constraints and server Zod validation; malformed or incomplete output is a failure, not a fabricated success.
- API failures contain safe errors; no provider exception text, secrets, fabricated answers or invented fallback citations. DeepSeek web search is disabled in the UI and rejected server-side. Optional Gemini grounding URLs are read from provider metadata. JD local references are restricted to titles submitted with the request.
- Public `/api/capabilities` exposes only provider, model, webSearch and configured. It makes no paid model call and exposes no credentials. The configured flag indicates that a provider key was supplied, not successful authentication or a live credential check. Copilot endpoints retain their existing authorization and quota requirements.
- Secrets stay server-side. `.env`, known service-account names and `credentials/` are ignored; `.env.example` contains placeholders. Firebase browser config is public by design and not an access-control mechanism.

## Verified locally

`tests/api.test.ts` uses real HTTP requests to an ephemeral Express server with injected identity verification and mocked provider functions. It covers 401/403, CORS, health, invalid inputs, provider errors and 429; it does not prove real Firebase credentials or DeepSeek/Gemini access.

`tests/rules/firestore.test.ts` runs against the real Firestore emulator: unauthenticated/cross-user access for all nine collections, scoped queries, immutable owner/id, parent ownership, atomic valid and rejected batches.

`tests/repositories.test.ts` and `tests/dataProvider.test.tsx` cover identity selection, no cloud fallback, local write failure, backup validation, and stale account loads. See `docs/FOUNDATION_REPORT.md` for executed results.

## Not yet verified

Actual Google popup login, token revocation against a live project, deployed Firestore behavior, Render proxy/CORS integration and paid DeepSeek/Gemini calls require configured test credentials and deployment. No claim of a complete security audit or production certification is made. `docs/FOUNDATION_REPORT.md` records the earlier foundation delivery and does not establish live verification of the subsequent DeepSeek integration.
