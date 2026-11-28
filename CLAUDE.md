# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

「首相動静 日めくりクイズ」(public residence stay-day quiz) — an Astro + TypeScript single-page quiz app. The player taps tiles to reveal a Japanese sentence describing a real historical date one character at a time, then guesses whether that day was a "stayed at official residence all day" day (`stay: true`) or not, trading unrevealed characters for a higher score.

## Commands

```bash
npm run dev       # astro dev — local dev server
npm run build     # astro build — type-checks via astro sync + outputs static site to dist/
npm run preview   # astro preview — serve the built dist/ locally
npm test          # vitest run — helper, question-data, and update-script tests (see below)
node scripts/update-daily-question.mjs [YYYY-MM-DD]  # fetch+add one day's question from kanteilog.com (defaults to yesterday, JST); no-ops if the file already exists or the page isn't published yet
```

There is no lint command configured. Type checking happens as part of `astro build` (and via `@astrojs/check`, which astro build runs internally); there is no separate `tsc`/`astro check` script defined, so run `npx astro check` directly if you need type checking without a full build.

Vitest tests (`vitest.config.ts` excludes `.claude/**` and `dist/**`):
- `src/lib/quiz-utils.test.ts` — the pure, DOM-free quiz helpers.
- `src/content/questions.test.ts` — data-integrity checks over every real question file (filename = date, real date within tenure and not in the future, `stay:true` ⇔ text `終日、公邸で過ごす。`, exact field set). These enforce the README data rule; a bad question file fails `npm test`.
- `scripts/lib/daily-question.test.mjs` — the update script's pure logic (`scripts/lib/daily-question.mjs`: page parsing, text/stay derivation, JST date math). Keep new script logic there, not in the network/fs wrapper `scripts/update-daily-question.mjs`.

There is no coverage for the DOM/game-loop logic inline in `src/pages/index.astro`, since that code is tightly coupled to the DOM and not easily unit-tested in isolation.

The site is deployed to GitHub Pages as a project page; `astro.config.mjs` sets `site`/`base` accordingly (`base: "/pm-dousei-ndo"`). If the repo is ever renamed, `base` must be updated to match.

## CI (`.github/workflows/`)

- `ci.yml`: runs `npm test` and `npm run build` on every pull request.
- `deploy.yml`: runs `npm test`, then builds and deploys to GitHub Pages, on every push to `main` (requires the repo's Pages source set to "GitHub Actions" in its settings — a one-time manual step, not something this workflow can do itself).
- `update-daily-question.yml`: runs `scripts/update-daily-question.mjs` daily (07:30 JST, after kanteilog.com's ~07:00 JST data update); if a question was added, it runs `npm test` (bot PRs made with `GITHUB_TOKEN` don't trigger `ci.yml`), then pushes to a throwaway branch, opens a PR, and immediately merges it, since `main` has a branch ruleset requiring all changes go through a pull request.

## Architecture

- **Content collection (`src/content/questions/`)**: each quiz question is one JSON file named by its date (`YYYY-MM-DD.json`). The schema is defined in `src/content.config.ts` using Astro's `glob` loader + Zod: `{ date, text, stay }`.
- **Single page (`src/pages/index.astro`)**: loads all questions via `getCollection("questions")` at build time, passes them into the page as `window.__QUESTIONS__` via `define:vars`, then a client-side `<script>` (typed against `CollectionEntry<"questions">`) runs the entire quiz: shuffling the deck, revealing tiles, scoring, and the end screen. There is no client-side framework (React/Vue/etc.) and no separate game-logic module — game state and DOM manipulation live inline in this one script block. Pure helpers with no DOM dependency (`formatDate`, `shuffle`, `getYesterdayISO`, `pickDailyQuestion`, `calcScore`) are factored out into `src/lib/quiz-utils.ts`. The end screen's share button builds a result text (date, per-question emoji results, score, the `#首相動静日めくりクイズ` hashtag, and the page URL) and uses `navigator.share` where available, falling back to a Twitter/X intent URL otherwise.
- **Layout (`src/layouts/Layout.astro`)**: minimal HTML shell, imports `src/styles/global.css` globally, `lang="ja"`. Also sets OGP/Twitter-card meta tags pointing at `public/og-image.png`.
- **Dark mode**: `src/styles/global.css` defines colors via a `prefers-color-scheme: dark` media query; there is no manual theme toggle.
- Daily mode: the question is yesterday's (browser-local date); if that day's data isn't collected yet (it lands ~07:30 JST the next morning), `pickDailyQuestion` falls back to the most recent earlier question. Practice mode only appears if there is no earlier question at all.
- Scoring: `pts = max(10, round(100 * (1 - revealCount / totalChars)))` on a correct guess; 0 on an incorrect guess. Revealing fewer characters before guessing yields a higher score.

### Data integrity rule (important when adding/editing question data)

**`src/content/questions/README.md` is the single source of truth for the data-sourcing rule** (what counts as a fact vs. a quote, the data source (all files are generated from kanteilog.com structured data by the update script), `stay: true`/`false` criteria, and how `scripts/update-daily-question.mjs` derives `text`) — read it before adding or editing question data, rather than relying on a summary here that could drift out of sync.

In short: `text` must be original Japanese prose, never a direct quote from source articles; `stay: true` requires `work_min == 0` AND location == 公邸 (official residence), with `text` fixed to `終日、公邸で過ごす。`; `stay: false` is everything else; all `date` values must be real and within the current PM's tenure.
