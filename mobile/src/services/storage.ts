import AsyncStorage from "@react-native-async-storage/async-storage";
import { FlashcardSrsState, UserProfile } from "@/types";

const PROFILE_KEY = "@lingua/profile";
const FLASHCARDS_KEY = "@lingua/flashcards";

export const defaultProfile: UserProfile = {
  name: "",
  targetLanguage: "Spanish",
  proficiency: "beginner",
  onboarded: false,
  xp: 0,
  streak: 0,
  lastActiveDate: null,
  completedLessonIds: [],
};

export async function loadProfile(): Promise<UserProfile> {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  if (!raw) return defaultProfile;
  return { ...defaultProfile, ...JSON.parse(raw) };
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export async function loadFlashcardDeck(): Promise<FlashcardSrsState[]> {
  const raw = await AsyncStorage.getItem(FLASHCARDS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveFlashcardDeck(deck: FlashcardSrsState[]): Promise<void> {
  await AsyncStorage.setItem(FLASHCARDS_KEY, JSON.stringify(deck));
}

export function isSameDay(a: string | null, b: Date): boolean {
  if (!a) return false;
  const date = new Date(a);
  return (
    date.getFullYear() === b.getFullYear() &&
    date.getMonth() === b.getMonth() &&
    date.getDate() === b.getDate()
  );
}

export function isYesterday(a: string | null, b: Date): boolean {
  if (!a) return false;
  const date = new Date(a);
  const yesterday = new Date(b);
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  );
}

export function recordActivity(profile: UserProfile, xpEarned: number): UserProfile {
  const now = new Date();
  let streak = profile.streak;
  if (isSameDay(profile.lastActiveDate, now)) {
    // already active today, streak unchanged
  } else if (isYesterday(profile.lastActiveDate, now)) {
    streak += 1;
  } else {
    streak = 1;
  }
  return {
    ...profile,
    xp: profile.xp + xpEarned,
    streak,
    lastActiveDate: now.toISOString(),
  };
}
