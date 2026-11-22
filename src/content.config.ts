import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "zod";

const questions = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/questions" }),
  schema: z.object({
    // 実在の日付 (YYYY-MM-DD)
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    // オリジナルで書き下ろした文章（原文は引用していない）
    text: z.string().min(1),
    // true = その日は work_min=0 かつ居所が「公邸」だった
    stay: z.boolean(),
  }),
});

export const collections = { questions };
