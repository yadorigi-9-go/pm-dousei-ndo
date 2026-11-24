import { describe, expect, it } from "vitest";
import { calcScore, formatDate, formatShareDate, getYesterdayISO, pickDailyQuestion, shuffle } from "./quiz-utils";

describe("formatDate", () => {
  it("formats an ISO date with the correct Japanese weekday", () => {
    expect(formatDate("2026-11-21")).toBe("2026年11月21日（土）");
    expect(formatDate("2026-01-01")).toBe("2026年1月1日（木）");
    expect(formatDate("2026-12-25")).toBe("2026年12月25日（金）");
  });
});

describe("shuffle", () => {
  it("returns an array with the same elements in some order", () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input);
    expect(result).toHaveLength(input.length);
    expect([...result].sort()).toEqual([...input].sort());
  });

  it("does not mutate the input array", () => {
    const input = [1, 2, 3, 4, 5];
    const copy = [...input];
    shuffle(input);
    expect(input).toEqual(copy);
  });
});

describe("getYesterdayISO", () => {
  it("returns the day before the given date", () => {
    expect(getYesterdayISO(new Date(2026, 10, 22))).toBe("2026-11-21");
  });

  it("handles month and year boundaries", () => {
    expect(getYesterdayISO(new Date(2026, 0, 1))).toBe("2025-12-31");
  });
});

describe("formatShareDate", () => {
  it("formats a date as Y/M/D without zero-padding", () => {
    expect(formatShareDate(new Date(2026, 10, 22))).toBe("2026/11/22");
    expect(formatShareDate(new Date(2026, 0, 1))).toBe("2026/1/1");
  });
});

describe("calcScore", () => {
  it("awards fewer points as more characters are revealed", () => {
    expect(calcScore(10, 0)).toBe(100);
    expect(calcScore(10, 1)).toBe(90);
    expect(calcScore(10, 5)).toBe(50);
  });

  it("never drops below the 10-point floor", () => {
    expect(calcScore(100, 95)).toBe(10);
    expect(calcScore(100, 99)).toBe(10);
  });
});

describe("pickDailyQuestion", () => {
  const qs = [{ date: "2026-11-21" }, { date: "2026-11-23" }, { date: "2026-11-22" }];

  it("returns yesterday's question when present", () => {
    expect(pickDailyQuestion(qs, "2026-11-22")).toEqual({ date: "2026-11-22" });
  });

  it("falls back to the latest earlier question when yesterday's is missing", () => {
    expect(pickDailyQuestion(qs, "2026-11-24")).toEqual({ date: "2026-11-23" });
  });

  it("ignores questions dated after yesterday", () => {
    expect(pickDailyQuestion(qs, "2026-11-21")).toEqual({ date: "2026-11-21" });
  });

  it("returns undefined when nothing is on or before yesterday", () => {
    expect(pickDailyQuestion(qs, "2026-11-20")).toBeUndefined();
    expect(pickDailyQuestion([], "2026-11-24")).toBeUndefined();
  });
});
