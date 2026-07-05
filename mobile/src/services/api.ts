import Constants from "expo-constants";
import {
  ChatMessage,
  Exercise,
  FlashcardItem,
  Lesson,
  Proficiency,
} from "@/types";

const API_BASE_URL: string =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) || "http://localhost:4000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed with status ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface ChatReplyResponse {
  reply: string;
  correction?: string;
  translation?: string;
}

export function sendChatMessage(params: {
  targetLanguage: string;
  proficiency: Proficiency;
  history: ChatMessage[];
  message: string;
}): Promise<ChatReplyResponse> {
  return request("/api/chat", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function fetchLessons(language: string, level?: Proficiency): Promise<Lesson[]> {
  const query = new URLSearchParams({ language, ...(level ? { level } : {}) });
  return request(`/api/lessons?${query.toString()}`);
}

export function fetchLessonById(id: string): Promise<Lesson> {
  return request(`/api/lessons/${id}`);
}

export interface PronunciationResult {
  score: number;
  feedback: string;
  tips: string[];
}

export function evaluatePronunciation(params: {
  targetLanguage: string;
  targetPhrase: string;
  transcript: string;
}): Promise<PronunciationResult> {
  return request("/api/pronunciation", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function generateFlashcards(params: {
  targetLanguage: string;
  topic: string;
  count?: number;
}): Promise<FlashcardItem[]> {
  return request("/api/flashcards/generate", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export type { Exercise };
