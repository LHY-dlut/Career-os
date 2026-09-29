# AIInfraGuide-style UI refinement — review report

## Baseline and scope

- Started from clean `feat/library-curriculum-training` at `7444589`. The last published application code is `f062d13`, with its deployment record in `7444589` and [DEPLOYMENT.md](DEPLOYMENT.md). This refinement is on `codex/aiinfra-ui-refinement`; **it has not been deployed or merged**.
- Used the live [AIInfraGuide home](https://caomaolufei.github.io/AIInfraGuide/) and [learning route](https://caomaolufei.github.io/AIInfraGuide/guides/ai-infra%E5%AD%A6%E4%B9%A0%E8%B7%AF%E7%BA%BF/) for layout reference. The two screenshots mentioned in the user's attached document were not supplied as image files in this task, so visual validation used the live pages and local screenshots.
- No article IDs, Markdown source, course ordering data, repositories, Firebase rules, auth logic, API provider, or deployment configuration changed.

## Implemented

- `/` is now a public learning portal: centered pale-grid hero, real shared compact training editor immediately afterward, published learning paths, and a list of recently **checked sources**. Those dates are source verification dates, not claims about original publication. It does not use private notes, applications, or interviews for public sections. Public content renders during auth restoration or private workspace failure; the training component displays its own honest loading/error state.
- `/dashboard` is a compact personal page with training, due reviews, recent private notes, interviews and applications. Existing detail URLs remain unchanged. A `from=home` return parameter takes full training back to `/` with the same selected task; dashboard navigation returns to `/dashboard`. Both use the same `TrainingProvider` and recovery storage.
- The navigation now has five primary destinations and a More menu for knowledge, review, AI, career, and settings. Search, language, theme, quick add, account, GitHub, and mobile drawer remain available.
- The existing library reader uses 272px course navigation, an 840px maximum article column, and a 224px article TOC within a 1600px layout. The active course item has a thin blue rail; article metadata, title, summary and tags precede the utility controls. Long-form heading/paragraph sizing and overflow handling are scoped to `.library-reading`. Duplicate article H1 text is visually hidden while retaining its original heading ID, and the TOC starts at H2. Provenance remains in the article body/footer, and the existing source/outline notices still appear where needed.

## Verification

- Final checks passed: `npm run lint`, `npm run typecheck`, `npm test` (**20 files, 141 tests**), and `npm run build`. The Vite build still reports its existing advisory about a few chunks near/over 500 kB; there is no build failure.
- Real Chromium browser checks passed in an isolated guest context for home → full training → home draft continuity and refresh; `/dashboard` separation; article TOC hash and direct refresh; language switch; mobile navigation; and no document/main horizontal overflow at 390px for `/`, `/library`, a reader deep link, and `/dashboard`.
- Unit/integration coverage added for the public portal during auth/private data failure and the real shared training draft route. Existing navigation and language tests were updated for the intentional nav/TOC behavior.

| Screenshot | Viewport |
| --- | --- |
| [Portal, light](screenshots/aiinfra-home-1440-light.png) | 1440×900 |
| [Reader, light](screenshots/aiinfra-reader-1440-light.png) | 1440×900 |
| [Reader, wide](screenshots/aiinfra-reader-1920-light.png) | 1920×1080 |
| [Portal, mobile](screenshots/aiinfra-home-390-light.png) | 390×844 |
| [Reader, mobile](screenshots/aiinfra-reader-390-light.png) | 390×844 |
| [Portal, dark](screenshots/aiinfra-home-1440-dark.png) | 1440×900 |
| [Reader, dark](screenshots/aiinfra-reader-1440-dark.png) | 1440×900 |

## Limits and release path

- Firebase-hosted production and cross-device account sync were not exercised for this **preview-only** change. Local browser checks used guest storage and public article assets. The screenshots show the first viewport; the automated flow checked interactions and overflow separately.
- Preview locally with `npm ci && npm run dev` and open `http://localhost:5173/`. Review the draft PR against `feat/library-curriculum-training`, which contains the latest released feature code.
- After separate approval to publish: re-run the checks, build the reviewed commit, confirm the local `career-os` Hosting target still maps to `career-os-lhy-dlut`, then deploy only `hosting:career-os` to the existing Firebase project. Verify `/`, `/dashboard`, `/library`, an article/hash deep link, and the training draft round trip on the public URL.
- To roll back a future visual release, build the previously published application commit `f062d13` in a clean checkout and redeploy its `dist` to the same Hosting target. This restores the prior routes and UI without touching Firestore data.
