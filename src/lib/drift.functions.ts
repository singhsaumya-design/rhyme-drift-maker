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
      "You are a minimal co-writing system. The user gave you 3 words. Generate exactly one short line — 3 to 6 words — that loosely rhymes with or phonetically echoes the input, slightly shifts the meaning, and feels like a fragment of a poem. Never explain. Never use random words. The line should feel intentional but slightly strange. Output the line only, nothing else.";

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

const FinalizeInput = z.object({
  lines: z.array(z.string().min(1)).length(3),
});

export const finalizeDrift = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => FinalizeInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const prompt = `Here are three lines from a co-writing experiment: ${data.lines[0]}, ${data.lines[1]}, ${data.lines[2]}. Reorder or very lightly edit them so they read as one coherent 3-line poem. Change as little as possible. Output only the three lines, one per line, nothing else.`;

    const { text } = await generateText({
      model,
      prompt,
      temperature: 0.6,
    });

    const lines = text
      .trim()
      .split("\n")
      .map((l) => l.replace(/^[-*•\d.)\s]+/, "").replace(/^["'`]+|["'`]+$/g, "").trim())
      .filter(Boolean)
      .slice(0, 3);

    return { lines };
  });