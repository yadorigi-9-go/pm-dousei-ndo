#!/usr/bin/env node
// Fetches the previous day's structured 首相動静 data from kanteilog.com and
// writes src/content/questions/YYYY-MM-DD.json, following the project's data
// rule (see src/content/questions/README.md): only the raw category/location/
// time facts are used, never the site's own per-event description strings.
//
// Usage: node scripts/update-daily-question.mjs [YYYY-MM-DD]
// With no argument, targets "yesterday" in Asia/Tokyo time.

import { mkdir, writeFile, appendFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildQuestion, extractMainSegments, yesterdayInJst } from "./lib/daily-question.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUESTIONS_DIR = path.join(__dirname, "..", "src", "content", "questions");

async function setGithubOutput(name, value) {
  if (!process.env.GITHUB_OUTPUT) return;
  await appendFile(process.env.GITHUB_OUTPUT, `${name}=${value}\n`, "utf-8");
}

async function main() {
  const targetDate = process.argv[2] ?? yesterdayInJst();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    throw new Error(`invalid date argument: ${targetDate}`);
  }
  await setGithubOutput("date", targetDate);

  const outPath = path.join(QUESTIONS_DIR, `${targetDate}.json`);
  if (existsSync(outPath)) {
    console.log(`${targetDate}: already have a question file, skipping.`);
    await setGithubOutput("wrote", "false");
    return;
  }

  const url = `https://kanteilog.com/day/${targetDate}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.log(`${targetDate}: ${url} returned ${res.status}, no data yet — skipping.`);
    await setGithubOutput("wrote", "false");
    return;
  }
  const html = await res.text();

  const segments = extractMainSegments(html);
  if (!segments || segments.length === 0) {
    console.log(`${targetDate}: could not find segment data on the page — skipping.`);
    await setGithubOutput("wrote", "false");
    return;
  }

  const question = buildQuestion(targetDate, segments);

  await mkdir(QUESTIONS_DIR, { recursive: true });
  await writeFile(outPath, JSON.stringify(question, null, 2) + "\n", "utf-8");
  console.log(`${targetDate}: wrote ${outPath} (stay: ${question.stay})`);
  await setGithubOutput("wrote", "true");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
