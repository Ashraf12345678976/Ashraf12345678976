import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Screen from "@/components/Screen";
import StreakBadge from "@/components/StreakBadge";
import { colors } from "@/theme/colors";
import { useApp } from "@/context/AppContext";

interface QuickAction {
  emoji: string;
  title: string;
  subtitle: string;
  tab: string;
}

const ACTIONS: QuickAction[] = [
  { emoji: "💬", title: "Chat with your tutor", subtitle: "Practice a free-form conversation", tab: "Chat" },
  { emoji: "📚", title: "Continue lessons", subtitle: "Bite-sized structured practice", tab: "Lessons" },
  { emoji: "🎙️", title: "Practice speaking", subtitle: "Get pronunciation feedback", tab: "Speak" },
  { emoji: "🗂️", title: "Review flashcards", subtitle: "Spaced repetition vocab", tab: "Flashcards" },
];

export default function HomeScreen() {
  const { profile } = useApp();
  const navigation = useNavigation<any>();

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {profile.name ? `Hola, ${profile.name}!` : "Welcome back!"}
          </Text>
          <Text style={styles.subtitle}>Learning {profile.targetLanguage} · {profile.proficiency}</Text>
        </View>
      </View>

      <View style={styles.badgeRow}>
        <StreakBadge streak={profile.streak} xp={profile.xp} />
      </View>

      <Text style={styles.sectionTitle}>What do you want to do?</Text>
      <View style={styles.actions}>
        {ACTIONS.map((action) => (
          <Pressable
            key={action.tab}
            style={styles.card}
            onPress={() => navigation.navigate(action.tab)}
          >
            <Text style={styles.cardEmoji}>{action.emoji}</Text>
            <Text style={styles.cardTitle}>{action.title}</Text>
            <Text style={styles.cardSubtitle}>{action.subtitle}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.progressCard}>
        <Text style={styles.progressTitle}>Lessons completed</Text>
        <Text style={styles.progressValue}>{profile.completedLessonIds.length}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  greeting: { fontSize: 24, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  badgeRow: { marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: colors.text, marginTop: 28, marginBottom: 12 },
  actions: { gap: 12 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardEmoji: { fontSize: 26, marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  cardSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  progressCard: {
    marginTop: 20,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressTitle: { color: colors.textMuted, fontSize: 14 },
  progressValue: { color: colors.accent, fontSize: 22, fontWeight: "700" },
});
