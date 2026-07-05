export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequestBody {
  targetLanguage: string;
  proficiency: "beginner" | "intermediate" | "advanced";
  history: ChatMessage[];
  message: string;
}

export interface ChatResponseBody {
  reply: string;
  correction?: string;
  translation?: string;
}

export interface Exercise {
  id: string;
  type: "multiple_choice" | "fill_blank" | "translate";
  prompt: string;
  options?: string[];
  answer: string;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  language: string;
  level: "beginner" | "intermediate" | "advanced";
  xp: number;
  exercises: Exercise[];
}

export interface PronunciationRequestBody {
  targetLanguage: string;
  targetPhrase: string;
  transcript: string;
}

export interface PronunciationResponseBody {
  score: number;
  feedback: string;
  tips: string[];
}

export interface FlashcardGenerateRequestBody {
  targetLanguage: string;
  topic: string;
  count?: number;
}

export interface FlashcardItem {
  front: string;
  back: string;
  example?: string;
}
