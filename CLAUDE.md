# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

「動静めくりクイズ」(public residence stay-day quiz) — an Astro + TypeScript single-page quiz app. The player taps tiles to reveal a Japanese sentence describing a real historical date one character at a time, then guesses whether that day was a "stayed at official residence all day" day (`stay: true`) or not, trading unrevealed characters for a higher score.

## Commands

```bash
npm run dev       # astro dev — local dev server
npm run build     # astro build — type-checks via astro sync + outputs static site to dist/
npm run preview   # astro preview — serve the built dist/ locally
```

There is no test suite and no lint command configured. Type checking happens as part of `astro build` (and via `@astrojs/check`, which astro build runs internally); there is no separate `tsc`/`astro check` script defined, so run `npx astro check` directly if you need type checking without a full build.

The site is deployed to GitHub Pages as a project page; `astro.config.mjs` sets `site`/`base` accordingly (`base: "/pm-dousei-ndo"`). If the repo is ever renamed, `base` must be updated to match.

## Architecture

- **Content collection (`src/content/questions/`)**: each quiz question is one JSON file named by its date (`YYYY-MM-DD.json`). The schema is defined in `src/content.config.ts` using Astro's `glob` loader + Zod: `{ date, text, stay }`. `src/content/questions/README.md` documents the data-sourcing rule in detail — see below.
- **Single page (`src/pages/index.astro`)**: loads all questions via `getCollection("questions")` at build time, passes them into the page as `window.__QUESTIONS__` via `define:vars`, then a client-side `<script>` (typed against `CollectionEntry<"questions">`) runs the entire quiz: shuffling the deck, revealing tiles, scoring, and the end screen. There is no client-side framework (React/Vue/etc.) and no separate game-logic module — all game state and DOM manipulation lives inline in this one script block.
- **Layout (`src/layouts/Layout.astro`)**: minimal HTML shell, imports `src/styles/global.css` globally. `lang="ja"`.
- Scoring: `pts = max(10, round(100 * (1 - revealCount / totalChars)))` on a correct guess; 0 on an incorrect guess. Revealing fewer characters before guessing yields a higher score.

### Data integrity rule (important when adding/editing question data)

Question `text` fields must be **original Japanese prose**, never direct quotes from source articles. Only the following *facts/numbers* from the public dataset (GitHub `isamu/sori`, originally sourced from 官邸ログ/kanteilog.com's structured version of Jiji/Nikkei/Asahi prime-minister-movement reports) may be used as the factual basis: `work_min` (public duty minutes), `residence_min` (time at residence), location, and per-category time breakdowns.

- `stay: true` requires `work_min == 0` AND location == 公邸 (official residence) for that date, and by convention its `text` is the fixed phrase `終日、公邸で過ごす。`
- `stay: false` is any other case (`work_min > 0`, or location other than 公邸).
- All `date` values must be real historical dates.

This rule is also documented in `src/content/questions/README.md` — keep both in sync if it changes.
