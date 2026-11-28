// Pure (network- and filesystem-free) logic for scripts/update-daily-question.mjs,
// split out so it can be unit-tested. See src/content/questions/README.md for
// the data rule this implements.

export const CATEGORY_PHRASE = {
  diplomacy: "外国訪問",
  ceremony: "式典への出席",
  meeting: "面会対応",
  meal: "会食",
  diet: "国会対応",
  office: "官邸での執務",
  party: "党務",
  inspection: "地方視察",
  personal: "私的な用務",
  media: "取材対応",
  duty_unknown: "公務",
  unknown: "公務",
};

export function jstDateString(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function yesterdayInJst(now = new Date()) {
  const todayStr = jstDateString(now);
  const todayMidnightJstMs = new Date(`${todayStr}T00:00:00+09:00`).getTime();
  return jstDateString(new Date(todayMidnightJstMs - 24 * 60 * 60 * 1000));
}

export function parseTimeToMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// The page embeds its data as a JSON-encoded string inside a React Server
// Components stream (self.__next_f.push(...)), so quotes are backslash-escaped
// but brackets/braces are literal — we bracket-match to pull out the array,
// then unescape it, then JSON.parse. The FIRST "segments" array on the page is
// the one for the page's own date (it carries `location`/`description`; the
// compact history list further down the page only has `category`).
export function extractMainSegments(html) {
  const key = '\\"segments\\":[';
  const idx = html.indexOf(key);
  if (idx === -1) return null;

  const arrStart = idx + key.length - 1; // position of the '['
  let depth = 0;
  let i = arrStart;
  for (; i < html.length; i++) {
    const c = html[i];
    if (c === "[") depth++;
    else if (c === "]") {
      depth--;
      if (depth === 0) break;
    }
  }
  if (depth !== 0) return null;

  const raw = html.slice(arrStart, i + 1).replace(/\\"/g, '"');
  const segments = JSON.parse(raw);
  for (const seg of segments) {
    if (typeof seg.startTime !== "string" || typeof seg.endTime !== "string" || typeof seg.category !== "string") {
      throw new Error("unexpected segment shape from kanteilog.com");
    }
  }
  return segments;
}

export function isFullDay(seg) {
  return seg.startTime === "00:00" && seg.endTime === "24:00";
}

export function buildQuestion(dateStr, segments) {
  if (segments.length === 1 && segments[0].category === "residence" && isFullDay(segments[0])) {
    if (segments[0].location === "公邸") {
      return { date: dateStr, text: "終日、公邸で過ごす。", stay: true };
    }
    const place = segments[0].location || "別の場所";
    return { date: dateStr, text: `終日、${place}で過ごす。公邸には立ち寄らず。`, stay: false };
  }

  let residenceAtKantei = 0;
  const categoryMinutes = {};
  for (const seg of segments) {
    const duration = parseTimeToMinutes(seg.endTime) - parseTimeToMinutes(seg.startTime);
    if (duration <= 0) continue;
    if (seg.category === "residence" && seg.location === "公邸") {
      residenceAtKantei += duration;
      continue;
    }
    if (seg.category === "residence" || seg.category === "travel") continue;
    categoryMinutes[seg.category] = (categoryMinutes[seg.category] || 0) + duration;
  }

  let dominantCategory = null;
  let dominantMinutes = -1;
  for (const [category, minutes] of Object.entries(categoryMinutes)) {
    if (minutes > dominantMinutes) {
      dominantCategory = category;
      dominantMinutes = minutes;
    }
  }

  const phrase = CATEGORY_PHRASE[dominantCategory] ?? "公務";
  const awayMinutes = 1440 - residenceAtKantei;

  let text;
  if (awayMinutes <= 180) {
    text = `短時間、${phrase}のため外出。それ以外は公邸で過ごす。`;
  } else if (residenceAtKantei > 0) {
    text = `${phrase}のため外出。公邸にも一部滞在する。`;
  } else {
    text = `終日、${phrase}のため外出。公邸には戻らず。`;
  }

  return { date: dateStr, text, stay: false };
}
