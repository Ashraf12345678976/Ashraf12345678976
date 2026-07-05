import { Lesson } from "../types";

export const lessons: Lesson[] = [
  {
    id: "es-beg-1",
    title: "Greetings",
    description: "Learn how to say hello, goodbye, and introduce yourself.",
    language: "Spanish",
    level: "beginner",
    xp: 20,
    exercises: [
      {
        id: "es-beg-1-1",
        type: "multiple_choice",
        prompt: "How do you say 'Hello' in Spanish?",
        options: ["Hola", "Adiós", "Gracias", "Por favor"],
        answer: "Hola",
      },
      {
        id: "es-beg-1-2",
        type: "multiple_choice",
        prompt: "How do you say 'Good morning' in Spanish?",
        options: ["Buenas noches", "Buenos días", "Buenas tardes", "Hasta luego"],
        answer: "Buenos días",
      },
      {
        id: "es-beg-1-3",
        type: "fill_blank",
        prompt: "Me ___ Ana. (My name is Ana.)",
        answer: "llamo",
      },
      {
        id: "es-beg-1-4",
        type: "translate",
        prompt: "Translate: 'Nice to meet you'",
        answer: "Mucho gusto",
      },
    ],
  },
  {
    id: "es-beg-2",
    title: "Numbers 1-10",
    description: "Count from one to ten in Spanish.",
    language: "Spanish",
    level: "beginner",
    xp: 20,
    exercises: [
      {
        id: "es-beg-2-1",
        type: "multiple_choice",
        prompt: "What is 'five' in Spanish?",
        options: ["Cuatro", "Cinco", "Seis", "Siete"],
        answer: "Cinco",
      },
      {
        id: "es-beg-2-2",
        type: "fill_blank",
        prompt: "Uno, dos, ___, cuatro (fill in three)",
        answer: "tres",
      },
      {
        id: "es-beg-2-3",
        type: "translate",
        prompt: "Translate the number: 'ten'",
        answer: "diez",
      },
    ],
  },
  {
    id: "fr-beg-1",
    title: "Greetings",
    description: "Learn basic French greetings and introductions.",
    language: "French",
    level: "beginner",
    xp: 20,
    exercises: [
      {
        id: "fr-beg-1-1",
        type: "multiple_choice",
        prompt: "How do you say 'Hello' in French?",
        options: ["Bonjour", "Au revoir", "Merci", "S'il vous plaît"],
        answer: "Bonjour",
      },
      {
        id: "fr-beg-1-2",
        type: "fill_blank",
        prompt: "Je m'___ Marie. (My name is Marie.)",
        answer: "appelle",
      },
      {
        id: "fr-beg-1-3",
        type: "translate",
        prompt: "Translate: 'Thank you very much'",
        answer: "Merci beaucoup",
      },
    ],
  },
  {
    id: "ja-beg-1",
    title: "Greetings",
    description: "Learn basic Japanese greetings.",
    language: "Japanese",
    level: "beginner",
    xp: 25,
    exercises: [
      {
        id: "ja-beg-1-1",
        type: "multiple_choice",
        prompt: "How do you say 'Hello' in Japanese?",
        options: ["こんにちは", "さようなら", "ありがとう", "すみません"],
        answer: "こんにちは",
      },
      {
        id: "ja-beg-1-2",
        type: "translate",
        prompt: "Translate: 'Thank you'",
        answer: "ありがとう",
      },
    ],
  },
];

export function getLessonsForLanguage(language: string, level?: string): Lesson[] {
  return lessons.filter(
    (lesson) =>
      lesson.language.toLowerCase() === language.toLowerCase() &&
      (!level || lesson.level === level)
  );
}

export function getLessonById(id: string): Lesson | undefined {
  return lessons.find((lesson) => lesson.id === id);
}
