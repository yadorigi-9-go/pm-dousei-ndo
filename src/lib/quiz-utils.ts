export const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  return `${y}年${m}月${d}日（${weekday}）`;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getYesterdayISO(now: Date = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Pick the "daily" question: yesterday's if present, otherwise the most recent
 * one dated on or before yesterday (yesterday's data is only collected the
 * following morning). Returns undefined if there is no such question.
 */
export function pickDailyQuestion<T extends { date: string }>(
  questions: T[],
  yesterday: string,
): T | undefined {
  let best: T | undefined;
  for (const q of questions) {
    if (q.date <= yesterday && (!best || q.date > best.date)) best = q;
  }
  return best;
}

export function calcScore(totalChars: number, revealCount: number): number {
  return Math.max(10, Math.round(100 * (1 - revealCount / totalChars)));
}

/**
 * Format the date shown at the top of the share text. Pass the question's ISO
 * date (YYYY-MM-DD) so the shared date is the day the question describes, not
 * the day it was played; with no date, falls back to today's local date.
 */
export function formatShareDate(iso?: string, now: Date = new Date()): string {
  if (iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return `${y}/${m}/${d}`;
  }
  return `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
}
