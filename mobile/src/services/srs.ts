import { FlashcardItem, FlashcardSrsState } from "@/types";

export type Grade = "again" | "hard" | "good" | "easy";

const GRADE_QUALITY: Record<Grade, number> = {
  again: 1,
  hard: 3,
  good: 4,
  easy: 5,
};

export function newCardState(id: string, card: FlashcardItem): FlashcardSrsState {
  return {
    id,
    card,
    interval: 0,
    repetition: 0,
    easeFactor: 2.5,
    dueAt: new Date().toISOString(),
  };
}

/** SM-2 spaced repetition scheduling. */
export function reviewCard(state: FlashcardSrsState, grade: Grade): FlashcardSrsState {
  const quality = GRADE_QUALITY[grade];
  let { repetition, easeFactor, interval } = state;

  if (quality < 3) {
    repetition = 0;
    interval = 1;
  } else {
    repetition += 1;
    if (repetition === 1) interval = 1;
    else if (repetition === 2) interval = 6;
    else interval = Math.round(interval * easeFactor);

    easeFactor = Math.max(
      1.3,
      easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    );
  }

  const dueAt = new Date();
  dueAt.setDate(dueAt.getDate() + interval);

  return {
    ...state,
    repetition,
    easeFactor,
    interval,
    dueAt: dueAt.toISOString(),
  };
}

export function dueCards(deck: FlashcardSrsState[]): FlashcardSrsState[] {
  const now = Date.now();
  return deck.filter((card) => new Date(card.dueAt).getTime() <= now);
}
