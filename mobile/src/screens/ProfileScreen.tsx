import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Screen from "@/components/Screen";
import StreakBadge from "@/components/StreakBadge";
import { colors, languages } from "@/theme/colors";
import { useApp } from "@/context/AppContext";
import { Proficiency } from "@/types";

const PROFICIENCIES: { key: Proficiency; label: string }[] = [
  { key: "beginner", label: "Beginner" },
  { key: "intermediate", label: "Intermediate" },
  { key: "advanced", label: "Advanced" },
];

export default function ProfileScreen() {
  const { profile, updateProfile } = useApp();

  return (
    <Screen>
      <Text style={styles.title}>{profile.name}</Text>
      <View style={styles.badgeRow}>
        <StreakBadge streak={profile.streak} xp={profile.xp} />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{profile.completedLessonIds.length}</Text>
          <Text style={styles.statLabel}>Lessons done</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{profile.streak}</Text>
          <Text style={styles.statLabel}>Day streak</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{profile.xp}</Text>
          <Text style={styles.statLabel}>Total XP</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Learning language</Text>
      <View style={styles.optionsRow}>
        {languages.map((lang) => (
          <Pressable
            key={lang.code}
            onPress={() => updateProfile({ targetLanguage: lang.code })}
            style={[styles.option, profile.targetLanguage === lang.code && styles.optionSelected]}
          >
            <Text style={styles.optionEmoji}>{lang.flag}</Text>
            <Text style={styles.optionText}>{lang.code}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Proficiency</Text>
      <View style={styles.optionsRow}>
        {PROFICIENCIES.map((p) => (
          <Pressable
            key={p.key}
            onPress={() => updateProfile({ proficiency: p.key })}
            style={[styles.pill, profile.proficiency === p.key && styles.pillSelected]}
          >
            <Text style={[styles.pillText, profile.proficiency === p.key && styles.pillTextSelected]}>
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: "700", color: colors.text, marginTop: 12 },
  badgeRow: { marginTop: 16 },
  statsRow: { flexDirection: "row", gap: 10, marginTop: 24 },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { color: colors.accent, fontSize: 20, fontWeight: "800" },
  statLabel: { color: colors.textMuted, fontSize: 11, marginTop: 4, textAlign: "center" },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: "600", marginTop: 28, marginBottom: 12 },
  optionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  option: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 90,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
  optionEmoji: { fontSize: 24, marginBottom: 4 },
  optionText: { color: colors.text, fontWeight: "600" },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { color: colors.textMuted, fontWeight: "600" },
  pillTextSelected: { color: colors.text },
});
