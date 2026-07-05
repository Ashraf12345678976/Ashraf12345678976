export const pronunciationPhrases: Record<string, { phrase: string; translation: string }[]> = {
  Spanish: [
    { phrase: "Buenos días, ¿cómo estás?", translation: "Good morning, how are you?" },
    { phrase: "Me gustaría un café, por favor.", translation: "I would like a coffee, please." },
    { phrase: "¿Dónde está la estación de tren?", translation: "Where is the train station?" },
  ],
  French: [
    { phrase: "Bonjour, comment ça va?", translation: "Hello, how are you?" },
    { phrase: "Je voudrais un café, s'il vous plaît.", translation: "I would like a coffee, please." },
    { phrase: "Où est la gare?", translation: "Where is the train station?" },
  ],
  Japanese: [
    { phrase: "おはようございます", translation: "Good morning" },
    { phrase: "コーヒーをください", translation: "A coffee, please" },
    { phrase: "駅はどこですか", translation: "Where is the station?" },
  ],
};

const speechLocales: Record<string, string> = {
  Spanish: "es-ES",
  French: "fr-FR",
  Japanese: "ja-JP",
};

export function localeFor(language: string): string {
  return speechLocales[language] || "en-US";
}
