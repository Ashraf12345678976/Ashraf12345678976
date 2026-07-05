import { Router } from "express";
import { askClaude, extractJson } from "../services/claude";
import { PronunciationRequestBody, PronunciationResponseBody } from "../types";

export const pronunciationRouter = Router();

pronunciationRouter.post("/", async (req, res) => {
  const body = req.body as PronunciationRequestBody;
  if (!body.targetPhrase || !body.transcript || !body.targetLanguage) {
    return res.status(400).json({ error: "targetLanguage, targetPhrase, and transcript are required" });
  }

  const system = `You are a pronunciation coach for ${body.targetLanguage}.
The student was asked to say: "${body.targetPhrase}"
Speech-to-text captured: "${body.transcript}"
Compare the transcript to the target phrase, accounting for the fact that speech-to-text can misspell homophones.
Score how close the attempt is on a 0-100 scale, give brief encouraging feedback (1-2 sentences), and up to 3 short actionable tips (e.g. specific sounds to fix).
Respond ONLY with JSON in this exact shape:
{"score": 0-100 number, "feedback": "string", "tips": ["string", ...]}`;

  try {
    const raw = await askClaude(system, [{ role: "user", content: "Evaluate my attempt." }]);
    const parsed = extractJson<PronunciationResponseBody>(raw);
    res.json(parsed);
  } catch (err) {
    console.error("pronunciation error", err);
    res.status(502).json({ error: "Failed to evaluate pronunciation. Please try again." });
  }
});
