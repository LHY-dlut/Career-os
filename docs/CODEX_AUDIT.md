# Repository Audit — 2026-09-24

Baseline: `7e7b59b` (Gemini prototype). This audit was written before implementation changes. The workspace was initially empty and was cloned from the requested repository. No AGENTS.md was found. Inspection covered root configuration, every page/component, services, server handlers, types, seed data and Markdown utilities. Findings below are observations of the baseline, not assertions about the eventual implementation.

## Current Architecture

- Frontend: React 19 / Vite / Tailwind 4; nine substantial page components. `App.tsx` owns authentication, theme, navigation, eight datasets and all mutations.
- Routing: `activeView` and `selectedEntityId` state only. Most pages initialize their own selection once; no URL, history or bookmark contract.
- Authentication: Firebase Google popup and auth observer; observer is resubscribed when UID changes. Initial loading is tracked but never rendered.
- Database/data layer: `services/db.ts` mixes Firestore, global localStorage keys, automatic cloud seeding and fallback. Even `guest-user` queries/writes Firestore. The error helper throws, making fallback unreachable on permission failures.
- Persistence: writes update local storage before cloud confirmation; empty collections repopulate from seed data. Account changes share the same local records. Reset calls `localStorage.clear()` and writes records without IDs/owners. Restore accepts unvalidated JSON, writes only local storage, reloads cloud and says “synced”.
- AI: browser service calls `/api/copilot/*`; Express invokes Gemini. Keys are server-side (retain this). No ID token verification, quota, CORS policy or input bounds. Missing keys and malformed structured responses manufacture answers/research/citations.
- Backend/deployment: Vite embeds Express in development; production `server.ts` hardcodes 3000 and serves SPA. No Hosting configuration, CI or test runner. `node server.ts` relies on runtime-specific TypeScript support and extensionless imports. Only bun.lock is tracked but README proposes multiple package managers.
- State: React local state and prop callbacks; no external state framework is needed.

## Good Existing Work

- Preserve all nine pages, dark/slate visual language, layout, icons and Markdown editor/import UI.
- Useful typed domain entities already separate CodingProblem/CodingAttempt and Application/Interview; application status type already uses the requested high-level stages.
- Review history exists; dashboard majority of metrics are derived from passed records, rather than fixed numbers. Problem is fabricated activity in seeds and misleading demo/cloud semantics.
- Existing GFM/KaTeX renderer, code copy, category filters, search, CRM board/table and AI service boundary are reusable.
- Existing Firestore rules enforce owner checks on reads/creates. Strengthen update ownership and test rather than replace the database.

## P0 Problems

1. Public AI endpoints permit unbounded quota use; arbitrary model/input accepted (`src/server/apiRouter.ts`).
2. Cross-account local storage, guest Firestore errors, non-atomic cloud/local writes and destructive origin-wide reset (`src/services/db.ts`).
3. Invalid restore can corrupt records; cloud refresh overwrites restored local records; false sync success (`src/pages/Settings.tsx`).
4. Fake AI research and citations on missing credentials; fabricated structured feedback on parsing failure (`src/server/geminiService.ts`).
5. Several Firestore update rules permit the current owner to change `userId` to a different identity.
6. Authentication/load races can show stale records; most mutation handlers have no error recovery.

## P1 Problems

- No URL routing; stale page selections; broken Cmd/Ctrl+K because two listeners compete.
- App owns unrelated responsibilities; UI settings call concrete storage directly.
- TOC slugs discard Chinese and duplicates; renderer doesn't set matching heading IDs. Regex includes fenced code headings.
- Markdown serializer/parser does not reliably round-trip quoted values or comma-containing tags; category inference overrides an explicit Transformer category.
- Review queue recalculates after a rating while advancing index, skipping cards. Review/history writes are separate.
- Interview promotion does not persist `questionId`; interview defaults allow unattached `manual` applications. Full loop belongs to v0.3.
- Fake coding progress in dashboard fallback, seed review history, and generated practice answers can look like real activity.
- No tests, deployment recipe, health verification or reproducible package-manager contract. README includes missing screenshots/files and inaccurate feature claims.

## P2 Improvements

- Break down Knowledge/AICopilot by real responsibilities once foundation contracts stabilize.
- Improve mobile document layout, focus handling, keyboard controls and accessible form associations.
- Route-level bundle splitting, consistent typography, previous/next navigation and clearly separated study materials versus career activity.
- `firebase-blueprint.json` describes array fields as strings and is not runtime validation. `security_spec.md` claims tested vectors without tests.

## Target Architecture

Keep React + Vite + Firebase + Express + Gemini. App composes auth/data/theme providers and React Router. Shell owns only chrome/command palette; route adapters connect existing pages to typed repositories. Guest uses an identity-scoped local snapshot, cloud uses user-filtered Firestore with atomic batches for related writes and never silently falls back. Errors are visible and retryable. Firebase Admin verifies tokens before paid AI work; bounded input, per-user and global limits plus owner allowlist protect a personal deployment. Shared API client supplies token and configurable base URL. Firebase Hosting serves the SPA; Render starts compiled Express. No database or framework migration.

## Migration Plan

1. Commit this audit before source modifications; preserve prototype history on the foundation branch.
2. Establish npm lock, TypeScript/Vitest baseline and reproducible build/start commands.
3. Introduce repository contracts, guest snapshot, explicit cloud adapter, validated backup and deterministic review function.
4. Extract auth/data/theme lifecycles; wire real URL routes and page selection to history.
5. Secure all AI paths, remove fabricated fallbacks, centralize API/environment/production configuration.
6. Repair deterministic Markdown navigation and existing data correctness issues; retain overall UI.
7. Verify tests/build/local production health + browser flows, then document actual deployment prerequisites and unresolved work.

## Sprint Plan

- v0.2 (this round): audit, routing, App separation, repositories, identity/local data, backup, auth/security, production configuration, tests/CI/docs.
- v0.3: finish InterviewQuestion↔Question linking, occurrences/review histories, real activity and career follow-up. Integrate reference-inspired learning navigation.
- v0.4: grounded local Knowledge Assistant, complete coach/JD/mock interview flows with validated saved outputs.
- v0.5: measured retrieval quality before advanced RAG.
- v1.0: stable daily-use system with cloud end-to-end validation and polished responsive UX.

## Reference Websites — all three requested dimensions

The user confirmed reading experience, content organization and visual presentation are all desired. Apply incrementally; the first round explicitly excludes a large UI redesign.

| Reference | Observed pattern | Career OS direction |
| --- | --- | --- |
| [卡码 LLM 面试](https://notes.kamacoder.com/interview/llm/) | Topic chapters, interview entry points, linked deeper explanations | Domain → topic → question hierarchy; concise answer and deeper study |
| [AIInfraGuide](https://caomaolufei.github.io/AIInfraGuide/) | Learning roadmap, prerequisites and category cards with article counts | Learning overview with actual content counts and ordered prerequisite paths |
| [labuladong](https://labuladong.online/zh/algo/essential-technique/algorithm-summary/) | Chapter sidebar, on-page contents, reusable code frameworks, cross-links | Stable article links, working heading anchors, readable math/code, previous/next |
| [ARIS in AI Offer](https://wanshuiyin.github.io/ARIS-in-AI-Offer/) | Searchable topic cards, difficulty tiers, code/derivations, read tracking, theme control | Quick-reference cards, filters, honest reading progress, coordinated light/dark styles |

Retain original content and provenance. These references inform interaction and layout; do not copy whole third-party articles. First-round visible work: reliable reading links/TOC, code/math rendering and basic responsive fixes. Later design: topic landing cards + learning paths + reading history, with the existing slate/sky/indigo palette.
