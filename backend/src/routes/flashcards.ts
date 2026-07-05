import { Router } from "express";
import { askClaude, extractJson } from "../services/claude";
import { FlashcardGenerateRequestBody, FlashcardItem } from "../types";

export const flashcardsRouter = Router();

flashcardsRouter.post("/generate", async (req, res) => {
  const body = req.body as FlashcardGenerateRequestBody;
  if (!body.targetLanguage || !body.topic) {
    return res.status(400).json({ error: "targetLanguage and topic are required" });
  }
  const count = Math.min(Math.max(body.count || 8, 1), 20);

  const system = `You are a language-learning content generator.
Create ${count} vocabulary flashcards for a student learning ${body.targetLanguage}, on the topic "${body.topic}".
Each card has: "front" (the word/phrase in ${body.targetLanguage}), "back" (English meaning), and "example" (a short example sentence in ${body.targetLanguage}).
Respond ONLY with a JSON array in this exact shape, no prose outside it:
[{"front": "string", "back": "string", "example": "string"}, ...]`;

  try {
    const raw = await askClaude(system, [{ role: "user", content: "Generate the flashcards." }], 2048);
    const parsed = extractJson<FlashcardItem[]>(raw);
    res.json(parsed);
  } catch (err) {
    console.error("flashcards error", err);
    res.status(502).json({ error: "Failed to generate flashcards. Please try again." });
  }
});
