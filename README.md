# 首相動静 日めくりクイズ

実在の首相動静データをもとに、「その日は終日、公邸で過ごしたか？」を当てるミニクイズです。

**公開中:** https://yadorigi-9-go.github.io/pm-dousei-ndo/

## 遊び方

- タイルを1枚ずつめくって、その日の動静を要約した一文を少しずつ読んでいく
- 「過ごす」「過ごしてない」のどちらかを選んで回答（めくる文字数が少ないほど高得点）
- 通常は前日分の1問だけが出題され、回答後に「もっと解く」から過去問（ランダム10問）にも挑戦できる

## 開発

```bash
npm install
npm run dev       # ローカル開発サーバー
npm run build     # 型チェック + dist/ へ静的ビルド
npm run preview   # ビルド結果をローカルで確認
```

Node.js 22 以上が必要です（Astro 7の要件）。

## データについて

問題データは `src/content/questions/*.json` に1日1ファイルで保存しています（スキーマは `src/content.config.ts`）。
対象は高市首相の在任期間（2025-10-21〜）のみで、本文はすべて次の数値・事実だけを根拠にしたオリジナルの要約です（記事本文や分類ラベルの原文は引用していません）。

- [GitHub: isamu/sori](https://github.com/isamu/sori) — 各首相の就任1年目のみを収録した構造化データ
- [官邸ログ](https://kanteilog.com/) — それ以降の日付はこちらの該当日ページの数値データを直接参照

2026-11-01以降の分は `scripts/update-daily-question.mjs` で自動生成しています。詳しい出典ルールは `src/content/questions/README.md` を参照してください。

## デプロイ・自動化（`.github/workflows/`）

- `deploy.yml`: `main` へのpushごとにビルドしてGitHub Pagesへ自動デプロイ
- `update-daily-question.yml`: 毎日07:30 JSTに前日分の問題データを取得し、あればコミット・push

## 技術構成

Astro + TypeScript製の静的サイトで、クライアント側フレームワークは使用していません。詳しいアーキテクチャは [CLAUDE.md](./CLAUDE.md) を参照してください。
