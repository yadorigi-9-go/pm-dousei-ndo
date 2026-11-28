import { describe, expect, it } from "vitest";
import {
  CATEGORY_PHRASE,
  STAY_TEXT as EXPORTED_STAY_TEXT,
  TEXT_VARIANTS,
  buildQuestion,
  dateHash,
  extractMainSegments,
  parseTimeToMinutes,
  pickVariant,
  yesterdayInJst,
} from "./daily-question.mjs";

// Hard-coded on purpose: the README fixes this exact string for stay:true.
const STAY_TEXT = "終日、公邸で過ごす。";

// All texts a variant group can render for the given facts.
const textsFor = (group, args) => TEXT_VARIANTS[group].map((fill) => fill(args));

const seg = (startTime, endTime, category, location) => ({ startTime, endTime, category, location });

// Mimics how kanteilog.com embeds data: a JSON string inside an RSC
// `self.__next_f.push(...)` payload, so quotes are backslash-escaped.
function rscPage(...segmentArrays) {
  const chunks = segmentArrays.map(
    (segs, i) => `{\\"date\\":\\"d${i}\\",\\"segments\\":${JSON.stringify(segs).replace(/"/g, '\\"')}}`,
  );
  return `<html><script>self.__next_f.push([1,"[${chunks.join(",")}]"])</script></html>`;
}

describe("extractMainSegments", () => {
  it("parses the escaped segments array, including Japanese text", () => {
    const segs = [seg("00:00", "09:00", "residence", "公邸"), seg("09:00", "24:00", "office", "官邸")];
    expect(extractMainSegments(rscPage(segs))).toEqual(segs);
  });

  it("takes the FIRST segments array (the page's own day), not the history list below it", () => {
    const main = [seg("00:00", "24:00", "residence", "公邸")];
    const history = [{ startTime: "00:00", endTime: "24:00", category: "office" }];
    expect(extractMainSegments(rscPage(main, history))).toEqual(main);
  });

  it("returns null when the page has no segment data", () => {
    expect(extractMainSegments("<html>404</html>")).toBeNull();
  });

  it("returns null on a truncated array instead of throwing", () => {
    const html = rscPage([seg("00:00", "24:00", "residence", "公邸")]);
    const cut = html.slice(0, html.indexOf("]"));
    expect(extractMainSegments(cut)).toBeNull();
  });

  it("throws if kanteilog.com changes the segment shape", () => {
    const html = rscPage([{ start: "00:00", end: "24:00", category: "residence" }]);
    expect(() => extractMainSegments(html)).toThrow(/unexpected segment shape/);
  });
});

describe("buildQuestion", () => {
  const D = "2026-11-28";

  it("marks a full day at 公邸 as stay:true with the fixed text", () => {
    expect(buildQuestion(D, [seg("00:00", "24:00", "residence", "公邸")])).toEqual({
      date: D,
      text: STAY_TEXT,
      stay: true,
    });
  });

  it("marks a full day at another residence as stay:false and names the place", () => {
    const q = buildQuestion(D, [seg("00:00", "24:00", "residence", "衆院議員宿舎")]);
    expect(q.stay).toBe(false);
    expect(textsFor("fullDayElsewhere", { place: "衆院議員宿舎" })).toContain(q.text);
  });

  it("falls back to a generic place name when the full-day location is missing", () => {
    const q = buildQuestion(D, [seg("00:00", "24:00", "residence", "")]);
    expect(textsFor("fullDayElsewhere", { place: "別の場所" })).toContain(q.text);
    expect(q.stay).toBe(false);
  });

  it("describes a short (≤3h) outing with the dominant category", () => {
    const q = buildQuestion(D, [
      seg("00:00", "10:00", "residence", "公邸"),
      seg("10:00", "10:30", "travel", ""),
      seg("10:30", "12:30", "ceremony", "皇居"),
      seg("12:30", "13:00", "travel", ""),
      seg("13:00", "24:00", "residence", "公邸"),
    ]);
    expect(q.stay).toBe(false);
    expect(textsFor("shortOuting", { p: "式典への出席" })).toContain(q.text);
  });

  it("treats exactly 180 minutes away as short, 181 as not", () => {
    const at = (end) => [seg("00:00", "12:00", "residence", "公邸"), seg("12:00", end, "meeting", "官邸"), seg(end, "24:00", "residence", "公邸")];
    expect(textsFor("shortOuting", { p: "面会対応" })).toContain(buildQuestion(D, at("15:00")).text);
    expect(textsFor("partialStay", { p: "面会対応" })).toContain(buildQuestion(D, at("15:01")).text);
  });

  it("picks the category with the most total minutes, summed across segments", () => {
    const q = buildQuestion(D, [
      seg("00:00", "08:00", "residence", "公邸"),
      seg("08:00", "10:00", "meeting", "官邸"),
      seg("10:00", "13:00", "diet", "国会"),
      seg("13:00", "15:00", "meeting", "官邸"), // meeting total 4h beats diet 3h
      seg("15:00", "24:00", "residence", "公邸"),
    ]);
    expect(textsFor("partialStay", { p: "面会対応" })).toContain(q.text);
  });

  it("uses the no-公邸 phrasing when no time was spent at 公邸", () => {
    const q = buildQuestion(D, [seg("00:00", "06:00", "residence", "ホテル"), seg("06:00", "24:00", "diplomacy", "海外")]);
    expect(q.stay).toBe(false);
    expect(textsFor("noStay", { p: "外国訪問" })).toContain(q.text);
  });

  it("uses 公務 for unknown categories", () => {
    const q = buildQuestion(D, [seg("00:00", "08:00", "residence", "公邸"), seg("08:00", "24:00", "brand_new_category", "官邸")]);
    expect(textsFor("partialStay", { p: "公務" })).toContain(q.text);
  });

  it("never returns stay:true for a multi-segment day, even with zero work", () => {
    // Only the single full-day 公邸 segment may produce stay:true (README rule).
    const q = buildQuestion(D, [seg("00:00", "12:00", "residence", "公邸"), seg("12:00", "24:00", "residence", "公邸")]);
    expect(q.stay).toBe(false);
    expect(q.text).not.toBe(STAY_TEXT);
  });
});

describe("text variants", () => {
  const dates = Array.from({ length: 60 }, (_, i) => {
    const d = new Date(Date.UTC(2026, 10, 1) + i * 86400000);
    return d.toISOString().slice(0, 10);
  });
  const partialDay = [seg("00:00", "08:00", "residence", "公邸"), seg("08:00", "20:00", "diet", "国会"), seg("20:00", "24:00", "residence", "公邸")];

  it("keeps the stay:true text fixed on every date", () => {
    expect(EXPORTED_STAY_TEXT).toBe(STAY_TEXT);
    for (const d of dates) {
      expect(buildQuestion(d, [seg("00:00", "24:00", "residence", "公邸")]).text).toBe(STAY_TEXT);
    }
  });

  it("is deterministic: the same date always yields the same text", () => {
    for (const d of dates) {
      const a = buildQuestion(d, partialDay);
      const b = buildQuestion(d, structuredClone(partialDay));
      expect(b).toEqual(a);
    }
    expect(dateHash("2026-11-28")).toBe(dateHash("2026-11-28"));
  });

  it("pins the hash so the variant chosen for a date cannot silently change", () => {
    // If this fails, every future date would get a different phrasing than before.
    expect(dateHash("2026-11-01")).toBe(1897800060);
    expect(dates.slice(0, 10).map((d) => dateHash(d) % 3)).toEqual([0, 0, 1, 0, 1, 1, 2, 0, 1, 0]);
  });

  it("actually uses every variant across a range of dates", () => {
    for (const group of Object.keys(TEXT_VARIANTS)) {
      const used = new Set(dates.map((d) => TEXT_VARIANTS[group].indexOf(pickVariant(d, TEXT_VARIANTS[group]))));
      expect(used.size).toBe(TEXT_VARIANTS[group].length);
    }
  });

  it("offers more than one distinct phrasing per case", () => {
    for (const group of Object.keys(TEXT_VARIANTS)) {
      expect(new Set(textsFor(group, { p: "公務", place: "宿舎" })).size).toBeGreaterThan(1);
    }
  });

  it("every variant includes the given facts and nothing can collide with the stay text", () => {
    for (const p of new Set(Object.values(CATEGORY_PHRASE))) {
      for (const group of ["shortOuting", "partialStay", "noStay"]) {
        for (const text of textsFor(group, { p })) {
          expect(text).toContain(p);
          expect(text).toContain("公邸");
          expect(text).not.toBe(STAY_TEXT);
        }
      }
    }
    for (const text of textsFor("fullDayElsewhere", { place: "衆院議員宿舎" })) {
      expect(text).toContain("衆院議員宿舎");
      expect(text).toContain("公邸");
      expect(text).not.toBe(STAY_TEXT);
    }
  });

  it("only interpolates the documented inputs (no extra facts are invented)", () => {
    // Rendering with sentinel values must leave no other placeholders or undefineds.
    for (const group of Object.keys(TEXT_VARIANTS)) {
      for (const text of textsFor(group, { p: "〈P〉", place: "〈PLACE〉" })) {
        expect(text).not.toMatch(/undefined|null|\$\{/);
        const stripped = text.replace("〈P〉", "").replace("〈PLACE〉", "");
        expect(stripped).not.toMatch(/〈/);
      }
    }
  });
});

describe("parseTimeToMinutes", () => {
  it("handles 00:00 and the 24:00 end-of-day sentinel", () => {
    expect(parseTimeToMinutes("00:00")).toBe(0);
    expect(parseTimeToMinutes("09:30")).toBe(570);
    expect(parseTimeToMinutes("24:00")).toBe(1440);
  });
});

describe("yesterdayInJst", () => {
  it("uses the Tokyo calendar day, not UTC", () => {
    // 2026-11-27 22:30 UTC = 2026-11-28 07:30 JST (when the cron runs)
    expect(yesterdayInJst(new Date("2026-11-27T22:30:00Z"))).toBe("2026-11-27");
    // 2026-11-28 14:59 UTC = 23:59 JST on the 28th
    expect(yesterdayInJst(new Date("2026-11-28T14:59:00Z"))).toBe("2026-11-27");
    // one minute later it's the 29th in Tokyo
    expect(yesterdayInJst(new Date("2026-11-28T15:00:00Z"))).toBe("2026-11-28");
  });

  it("crosses month and year boundaries", () => {
    expect(yesterdayInJst(new Date("2026-01-01T00:00:00+09:00"))).toBe("2025-12-31");
    expect(yesterdayInJst(new Date("2028-03-01T12:00:00+09:00"))).toBe("2028-02-29");
  });
});
