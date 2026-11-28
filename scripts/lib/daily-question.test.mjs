import { describe, expect, it } from "vitest";
import { buildQuestion, extractMainSegments, parseTimeToMinutes, yesterdayInJst } from "./daily-question.mjs";

const STAY_TEXT = "終日、公邸で過ごす。";

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
    expect(q).toEqual({ date: D, text: "終日、衆院議員宿舎で過ごす。公邸には立ち寄らず。", stay: false });
  });

  it("falls back to a generic place name when the full-day location is missing", () => {
    const q = buildQuestion(D, [seg("00:00", "24:00", "residence", "")]);
    expect(q.text).toBe("終日、別の場所で過ごす。公邸には立ち寄らず。");
    expect(q.stay).toBe(false);
  });

  it("describes a short (≤3h) outing as 短時間 with the dominant category", () => {
    const q = buildQuestion(D, [
      seg("00:00", "10:00", "residence", "公邸"),
      seg("10:00", "10:30", "travel", ""),
      seg("10:30", "12:30", "ceremony", "皇居"),
      seg("12:30", "13:00", "travel", ""),
      seg("13:00", "24:00", "residence", "公邸"),
    ]);
    expect(q).toEqual({ date: D, text: "短時間、式典への出席のため外出。それ以外は公邸で過ごす。", stay: false });
  });

  it("treats exactly 180 minutes away as short, 181 as not", () => {
    const at = (end) => [seg("00:00", "12:00", "residence", "公邸"), seg("12:00", end, "meeting", "官邸"), seg(end, "24:00", "residence", "公邸")];
    expect(buildQuestion(D, at("15:00")).text).toMatch(/^短時間、/);
    expect(buildQuestion(D, at("15:01")).text).toBe("面会対応のため外出。公邸にも一部滞在する。");
  });

  it("picks the category with the most total minutes, summed across segments", () => {
    const q = buildQuestion(D, [
      seg("00:00", "08:00", "residence", "公邸"),
      seg("08:00", "10:00", "meeting", "官邸"),
      seg("10:00", "13:00", "diet", "国会"),
      seg("13:00", "15:00", "meeting", "官邸"), // meeting total 4h beats diet 3h
      seg("15:00", "24:00", "residence", "公邸"),
    ]);
    expect(q.text).toBe("面会対応のため外出。公邸にも一部滞在する。");
  });

  it("says 公邸には戻らず when no time was spent at 公邸", () => {
    const q = buildQuestion(D, [seg("00:00", "06:00", "residence", "ホテル"), seg("06:00", "24:00", "diplomacy", "海外")]);
    expect(q).toEqual({ date: D, text: "終日、外国訪問のため外出。公邸には戻らず。", stay: false });
  });

  it("uses 公務 for unknown categories", () => {
    const q = buildQuestion(D, [seg("00:00", "08:00", "residence", "公邸"), seg("08:00", "24:00", "brand_new_category", "官邸")]);
    expect(q.text).toBe("公務のため外出。公邸にも一部滞在する。");
  });

  it("never returns stay:true for a multi-segment day, even with zero work", () => {
    // Only the single full-day 公邸 segment may produce stay:true (README rule).
    const q = buildQuestion(D, [seg("00:00", "12:00", "residence", "公邸"), seg("12:00", "24:00", "residence", "公邸")]);
    expect(q.stay).toBe(false);
    expect(q.text).not.toBe(STAY_TEXT);
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
