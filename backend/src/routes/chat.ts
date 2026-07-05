import { Router } from "express";
import { askClaude, extractJson } from "../services/claude";
import { ChatRequestBody, ChatResponseBody } from "../types";

export const chatRouter = Router();

chatRouter.post("/", async (req, res) => {
  const body = req.body as ChatRequestBody;
  if (!body.message || !body.targetLanguage) {
    return res.status(400).json({ error: "targetLanguage and message are required" });
  }

  const system = `You are a friendly, encouraging AI language tutor helping a ${body.proficiency || "beginner"} student practice ${body.targetLanguage}.
Reply naturally in ${body.targetLanguage} at a level the student can follow, keep replies short (1-3 sentences).
Then evaluate the student's last message for grammar/spelling mistakes.
Respond ONLY with JSON in this exact shape, no prose outside it:
{"reply": "your reply in the target language", "correction": "corrected version of the student's message, or empty string if it was correct", "translation": "English translation of your reply"}`;

  const history = (body.history || []).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  try {
    const raw = await askClaude(system, [...history, { role: "user", content: body.message }]);
    const parsed = extractJson<ChatResponseBody>(raw);
    res.json(parsed);
  } catch (err) {
    console.error("chat error", err);
    res.status(502).json({ error: "Failed to reach the AI tutor. Please try again." });
  }
});
