// Data-integrity checks over every real question file. These enforce the rules
// in src/content/questions/README.md, which the Zod schema in
// src/content.config.ts can't express on its own (cross-field rules, date
// ranges, filename/date agreement).
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const DIR = path.join(__dirname, "questions");
const STAY_TEXT = "終日、公邸で過ごす。";
const TENURE_START = "2025-10-21";

const todayInJst = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const files = readdirSync(DIR).filter((f) => f.endsWith(".json"));
const entries = files.map((file) => ({
  file,
  raw: readFileSync(path.join(DIR, file), "utf-8"),
}));

function isRealDate(iso: string): boolean {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

it("has question files", () => {
  expect(files.length).toBeGreaterThan(0);
});

describe.each(entries)("$file", ({ file, raw }) => {
  const q = JSON.parse(raw);

  it("has exactly the schema fields with the right types", () => {
    expect(Object.keys(q).sort()).toEqual(["date", "stay", "text"]);
    expect(q.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof q.text).toBe("string");
    expect(typeof q.stay).toBe("boolean");
  });

  it("is named after its date", () => {
    expect(file).toBe(`${q.date}.json`);
  });

  it("is a real calendar date within the current PM's tenure, not in the future", () => {
    expect(isRealDate(q.date)).toBe(true);
    expect(q.date >= TENURE_START).toBe(true);
    expect(q.date <= todayInJst).toBe(true);
  });

  it("follows the stay rule: stay:true ⇔ the fixed text", () => {
    // Either direction breaking makes the question unanswerable or a giveaway.
    expect(q.text === STAY_TEXT).toBe(q.stay);
  });

  it("has non-empty text without stray whitespace", () => {
    expect(q.text.length).toBeGreaterThan(0);
    expect(q.text).toBe(q.text.trim());
    expect(q.text).not.toMatch(/[\n\t]/);
  });
});
