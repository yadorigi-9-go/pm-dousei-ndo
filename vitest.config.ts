import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // .claude/worktrees holds stale checkouts with their own copies of the tests
    exclude: [...configDefaults.exclude, ".claude/**", "dist/**"],
  },
});
