export type Proficiency = "beginner" | "intermediate" | "advanced";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
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
  level: Proficiency;
  xp: number;
  exercises: Exercise[];
}

export interface FlashcardItem {
  front: string;
  back: string;
  example?: string;
}

export interface FlashcardSrsState {
  id: string;
  card: FlashcardItem;
  interval: number;
  repetition: number;
  easeFactor: number;
  dueAt: string;
}

export interface UserProfile {
  name: string;
  targetLanguage: string;
  proficiency: Proficiency;
  onboarded: boolean;
  xp: number;
  streak: number;
  lastActiveDate: string | null;
  completedLessonIds: string[];
}
