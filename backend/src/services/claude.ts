import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.warn("ANTHROPIC_API_KEY is not set — /api requests will fail until it is configured in .env");
}

export const anthropic = new Anthropic({ apiKey });

export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5";

export async function askClaude(system: string, messages: Anthropic.MessageParam[], maxTokens = 1024) {
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    system,
    messages,
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock && textBlock.type === "text" ? textBlock.text : "";
}

export function extractJson<T>(raw: string): T {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : raw;
  return JSON.parse(candidate.trim()) as T;
}
