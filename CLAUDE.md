# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

「首相動静 日めくりクイズ」(public residence stay-day quiz) — an Astro + TypeScript single-page quiz app. The player taps tiles to reveal a Japanese sentence describing a real historical date one character at a time, then guesses whether that day was a "stayed at official residence all day" day (`stay: true`) or not, trading unrevealed characters for a higher score.

## Commands

```bash
npm run dev       # astro dev — local dev server
npm run build     # astro build — type-checks via astro sync + outputs static site to dist/
npm run preview   # astro preview — serve the built dist/ locally
node scripts/update-daily-question.mjs [YYYY-MM-DD]  # fetch+add one day's question from kanteilog.com (defaults to yesterday, JST); no-ops if the file already exists or the page isn't published yet
```

There is no test suite and no lint command configured. Type checking happens as part of `astro build` (and via `@astrojs/check`, which astro build runs internally); there is no separate `tsc`/`astro check` script defined, so run `npx astro check` directly if you need type checking without a full build.

The site is deployed to GitHub Pages as a project page; `astro.config.mjs` sets `site`/`base` accordingly (`base: "/pm-dousei-ndo"`). If the repo is ever renamed, `base` must be updated to match.

## CI (`.github/workflows/`)

- `deploy.yml`: builds and deploys to GitHub Pages on every push to `main` (requires the repo's Pages source set to "GitHub Actions" in its settings — a one-time manual step, not something this workflow can do itself).
- `update-daily-question.yml`: runs `scripts/update-daily-question.mjs` daily (07:30 JST, after kanteilog.com's ~07:00 JST data update) and commits+pushes the new question file straight to `main` if one was added.

## Architecture

- **Content collection (`src/content/questions/`)**: each quiz question is one JSON file named by its date (`YYYY-MM-DD.json`). The schema is defined in `src/content.config.ts` using Astro's `glob` loader + Zod: `{ date, text, stay }`. `src/content/questions/README.md` documents the data-sourcing rule in detail — see below.
- **Single page (`src/pages/index.astro`)**: loads all questions via `getCollection("questions")` at build time, passes them into the page as `window.__QUESTIONS__` via `define:vars`, then a client-side `<script>` (typed against `CollectionEntry<"questions">`) runs the entire quiz: shuffling the deck, revealing tiles, scoring, and the end screen. There is no client-side framework (React/Vue/etc.) and no separate game-logic module — all game state and DOM manipulation lives inline in this one script block.
- **Layout (`src/layouts/Layout.astro`)**: minimal HTML shell, imports `src/styles/global.css` globally. `lang="ja"`.
- Scoring: `pts = max(10, round(100 * (1 - revealCount / totalChars)))` on a correct guess; 0 on an incorrect guess. Revealing fewer characters before guessing yields a higher score.

### Data integrity rule (important when adding/editing question data)

Question `text` fields must be **original Japanese prose**, never direct quotes from source articles. Only *facts/numbers* may be used as the factual basis: `work_min` (public duty minutes), `residence_min` (time at residence), location, and per-category time breakdowns.

- `stay: true` requires `work_min == 0` AND location == 公邸 (official residence) for that date, and by convention its `text` is the fixed phrase `終日、公邸で過ごす。`
- `stay: false` is any other case (`work_min > 0`, or location other than 公邸).
- All `date` values must be real historical dates, and only dates within the current PM's tenure belong in this dataset (see `src/content/questions/README.md`).

**Two data sources, by date range:** GitHub `isamu/sori` structures 官邸ログ/kanteilog.com's version of Jiji/Nikkei/Asahi prime-minister-movement reports into `work_min`/`residence_min`/location facts, but it only covers each PM's first year in office. For dates after that window (for PM Takaichi: after 2026-10-20), there is no `isamu/sori` data — derive the same facts directly from the relevant https://kanteilog.com/day/YYYY-MM-DD page's structured stats instead, never from its prose. `src/pages/index.astro`'s result screen links to that same URL for the question's date.

For dates in the kanteilog.com era, `scripts/update-daily-question.mjs` automates this: it extracts the page's embedded `segments` array (`startTime`/`endTime`/`category`/`location` — never the page's own per-segment `description` string, which reads like a close paraphrase of the source news column) and generates `text` from a fixed category→phrase template. That output is intentionally more mechanical than the hand-written entries; keep the parsing/template logic in sync with this rule if kanteilog.com's markup changes.

This rule is also documented in `src/content/questions/README.md` — keep both in sync if it changes.
