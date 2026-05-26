import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const Input = z.object({
  words: z.string().min(1),
  previousLines: z.array(z.string()).default([]),
  round: z.number().int().min(1).max(3),
});

export const driftLine = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const system =
      "You are Rhyme Drift, a minimal poetic engine. Given three user words, return EXACTLY ONE short line (max 8 words). The line should loosely rhyme or phonetically echo the user's words, slightly shift meaning, and feel intentional but slightly off. Tone: minimal, poetic, slightly imperfect. Prioritize rhyme, sound, and rhythm over correctness. No explanations, no quotes, no punctuation at the end other than a period if natural. Maintain continuity with previous lines if provided.";

    const context =
      data.previousLines.length > 0
        ? `Previous lines:\n${data.previousLines.map((l, i) => `${i + 1}. ${l}`).join("\n")}\n\n`
        : "";

    const prompt = `${context}Round ${data.round} input words: ${data.words}\n\nReturn one line only.`;

    const { text } = await generateText({
      model,
      system,
      prompt,
      temperature: 0.95,
    });

    const line = text
      .trim()
      .split("\n")[0]
      .replace(/^["'`]+|["'`]+$/g, "")
      .trim();

    return { line };
  });