import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { UserProfile } from "@/types";
import { defaultProfile, loadProfile, recordActivity, saveProfile } from "@/services/storage";

interface AppContextValue {
  profile: UserProfile;
  loading: boolean;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
  completeOnboarding: (patch: Partial<UserProfile>) => Promise<void>;
  addXp: (amount: number) => Promise<void>;
  markLessonComplete: (lessonId: string, xp: number) => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile().then((p) => {
      setProfile(p);
      setLoading(false);
    });
  }, []);

  const persist = async (next: UserProfile) => {
    setProfile(next);
    await saveProfile(next);
  };

  const updateProfile = async (patch: Partial<UserProfile>) => {
    await persist({ ...profile, ...patch });
  };

  const completeOnboarding = async (patch: Partial<UserProfile>) => {
    await persist({ ...profile, ...patch, onboarded: true });
  };

  const addXp = async (amount: number) => {
    await persist(recordActivity(profile, amount));
  };

  const markLessonComplete = async (lessonId: string, xp: number) => {
    const withActivity = recordActivity(profile, xp);
    const completedLessonIds = withActivity.completedLessonIds.includes(lessonId)
      ? withActivity.completedLessonIds
      : [...withActivity.completedLessonIds, lessonId];
    await persist({ ...withActivity, completedLessonIds });
  };

  const value = useMemo(
    () => ({ profile, loading, updateProfile, completeOnboarding, addXp, markLessonComplete }),
    [profile, loading]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within an AppProvider");
  return ctx;
}
