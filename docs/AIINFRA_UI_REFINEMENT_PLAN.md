# AIInfraGuide-style interface refinement plan

Baseline: `7444589` on `feat/library-curriculum-training`, released previously to Firebase Hosting. This work continues on `codex/aiinfra-ui-refinement` and stays preview-only until separately approved.

1. Make `/` a public learning portal with a quiet grid hero, the existing compact `TrainingWorkspace`, published course paths, and source-checked public updates. Keep `/dashboard` as the private workbench and all current deep links.
2. Simplify desktop navigation, retain every business destination in the overflow and mobile menus, and keep language, search, theme, account, and quick-add controls.
3. Refine the existing library tree, reader typography, article metadata, and TOC with scoped styles. Preserve IDs, source attribution, reading order, notes, heading hashes, and the single reader scroll container.
4. Run lint, typecheck, tests, and build; inspect real browser layouts at the requested sizes and verify training draft continuity plus public reading when private data is unavailable. Record screenshots, findings, and release/rollback steps without deploying this branch.
