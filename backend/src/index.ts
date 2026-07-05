import "dotenv/config";
import cors from "cors";
import express from "express";
import { chatRouter } from "./routes/chat";
import { flashcardsRouter } from "./routes/flashcards";
import { lessonsRouter } from "./routes/lessons";
import { pronunciationRouter } from "./routes/pronunciation";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/chat", chatRouter);
app.use("/api/lessons", lessonsRouter);
app.use("/api/pronunciation", pronunciationRouter);
app.use("/api/flashcards", flashcardsRouter);

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () => {
  console.log(`AI tutor backend listening on port ${port}`);
});
