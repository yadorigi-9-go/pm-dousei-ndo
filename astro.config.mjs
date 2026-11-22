import { defineConfig } from "astro/config";

// GitHub Pages (project page) 用の設定。
// リポジトリ名が pm-dousei-ndo と異なる場合は base を合わせて変更してください。
export default defineConfig({
  site: "https://yadorigi-9-go.github.io",
  base: "/pm-dousei-ndo",
});
