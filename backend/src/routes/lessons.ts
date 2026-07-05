import { Router } from "express";
import { getLessonById, getLessonsForLanguage, lessons } from "../data/lessons";

export const lessonsRouter = Router();

lessonsRouter.get("/", (req, res) => {
  const { language, level } = req.query;
  if (!language) {
    return res.json(lessons);
  }
  res.json(getLessonsForLanguage(String(language), level ? String(level) : undefined));
});

lessonsRouter.get("/:id", (req, res) => {
  const lesson = getLessonById(req.params.id);
  if (!lesson) {
    return res.status(404).json({ error: "Lesson not found" });
  }
  res.json(lesson);
});
