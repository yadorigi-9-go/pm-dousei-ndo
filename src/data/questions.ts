export interface Question {
  /** 実在の日付 (YYYY-MM-DD) */
  date: string;
  /** オリジナルで書き下ろした文章（原文は引用していない） */
  text: string;
  /** true = その日は work_min=0 かつ居所が「公邸」だった */
  stay: boolean;
}

// 日付はすべて実在の日付。歴代首相動静を構造化した公開データ（GitHub: isamu/sori、
// 元データは官邸ログ/kanteilog.comが時事通信・日本経済新聞・朝日新聞の動静を数値化したもの）
// の「公務時間(work_min)」「居所滞在時間(residence_min)」「場所」「分類ごとの時間」
// といった数値・事実のみを根拠にしている。個々の記事や分類ラベルの原文は引用せず、
// 文章はすべてオリジナルで書き下ろした。
//
// stay=true: work_min=0 かつ居所が「公邸」だった日 → 定型句で統一。
// stay=false: それ以外（work_min>0、または居所が公邸以外だった日）。
export const QUESTIONS: Question[] = [
  { date: "2026-07-20", text: "終日、公邸で過ごす。", stay: true },
  { date: "2026-03-07", text: "終日、公邸で過ごす。", stay: true },
  { date: "2026-04-05", text: "終日、公邸で過ごす。", stay: true },
  { date: "2026-05-09", text: "終日、公邸で過ごす。", stay: true },
  { date: "2026-11-21", text: "終日、公邸で過ごす。", stay: true },
  { date: "2022-09-10", text: "終日、公邸で過ごす。", stay: true },
  { date: "2023-08-16", text: "終日、公邸で過ごす。", stay: true },
  { date: "2012-08-12", text: "終日、公邸で過ごす。", stay: true },
  { date: "2011-07-10", text: "終日、公邸で過ごす。", stay: true },
  { date: "2025-02-11", text: "終日、公邸で過ごす。", stay: true },
  { date: "2025-05-17", text: "終日、公邸で過ごす。", stay: true },

  { date: "2017-10-29", text: "終日、私邸で過ごす。公邸には戻らず。", stay: false },
  { date: "2014-07-21", text: "終日、ゴルフ場に滞在。公邸には戻らず。", stay: false },
  { date: "2025-12-13", text: "終日、衆院議員宿舎で過ごす。公邸には立ち寄らず。", stay: false },
  { date: "2025-01-03", text: "年始を都内のホテルで過ごす。公邸には戻らず。", stay: false },

  { date: "2022-05-02", text: "終日、外国を訪問中。現地で首脳会談に臨む。", stay: false },
  { date: "2016-11-19", text: "外国訪問中。現地で各国首脳と相次ぎ会談。", stay: false },
  { date: "2022-01-31", text: "国会に出席。委員会対応にあたる。", stay: false },
  { date: "2026-07-04", text: "短時間、式典に出席するため外出。それ以外は公邸で過ごす。", stay: false },
  { date: "2024-12-08", text: "党本部で党務にあたる一日。", stay: false },
  { date: "2014-07-13", text: "記者会見やインタビュー対応が相次いだ一日。", stay: false },
  { date: "2021-08-01", text: "公邸で面会・会談に応じる。外出はわずか。", stay: false },
  { date: "2011-09-09", text: "現地視察のため外出。関係者から説明を受ける。", stay: false },
  { date: "2015-04-25", text: "ほぼ終日を公邸で過ごす中、わずかに外出して私的な用事に当たる。", stay: false },
  { date: "2019-12-14", text: "夜、会食のため外出。それ以外は公邸で過ごす。", stay: false },
  { date: "2024-03-01", text: "官邸で執務。国会対応にも多くの時間を割く。", stay: false },
  { date: "2025-09-27", text: "終日、地方視察のため移動。現地で説明を受ける。", stay: false },
];
