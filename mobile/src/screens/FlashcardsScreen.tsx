import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Screen from "@/components/Screen";
import Flashcard from "@/components/Flashcard";
import { colors } from "@/theme/colors";
import { useApp } from "@/context/AppContext";
import { generateFlashcards } from "@/services/api";
import { loadFlashcardDeck, saveFlashcardDeck } from "@/services/storage";
import { dueCards, Grade, newCardState, reviewCard } from "@/services/srs";
import { FlashcardSrsState } from "@/types";

export default function FlashcardsScreen() {
  const { profile, addXp } = useApp();
  const [deck, setDeck] = useState<FlashcardSrsState[]>([]);
  const [queue, setQueue] = useState<FlashcardSrsState[]>([]);
  const [topic, setTopic] = useState("food");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deckLoaded, setDeckLoaded] = useState(false);

  useEffect(() => {
    loadFlashcardDeck().then((stored) => {
      setDeck(stored);
      setQueue(dueCards(stored));
      setDeckLoaded(true);
    });
  }, []);

  const persist = async (nextDeck: FlashcardSrsState[]) => {
    setDeck(nextDeck);
    await saveFlashcardDeck(nextDeck);
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const cards = await generateFlashcards({ targetLanguage: profile.targetLanguage, topic: topic.trim(), count: 8 });
      const newStates = cards.map((card, i) =>
        newCardState(`${profile.targetLanguage}-${topic}-${Date.now()}-${i}`, card)
      );
      const nextDeck = [...deck, ...newStates];
      await persist(nextDeck);
      setQueue((q) => [...q, ...newStates]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate flashcards");
    } finally {
      setLoading(false);
    }
  };

  const handleGrade = async (grade: Grade) => {
    const [current, ...rest] = queue;
    if (!current) return;
    const updated = reviewCard(current, grade);
    const nextDeck = deck.map((c) => (c.id === updated.id ? updated : c));
    await persist(nextDeck);
    setQueue(rest);
    if (grade !== "again") await addXp(1);
  };

  if (!deckLoaded) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  const current = queue[0];

  return (
    <Screen>
      <Text style={styles.title}>Flashcards</Text>
      <Text style={styles.subtitle}>
        {deck.length} cards in your deck · {queue.length} due for review
      </Text>

      {current ? (
        <View style={styles.reviewArea}>
          <Flashcard card={current.card} />
          <View style={styles.gradeRow}>
            <GradeButton label="Again" color={colors.danger} onPress={() => handleGrade("again")} />
            <GradeButton label="Hard" color={colors.warning} onPress={() => handleGrade("hard")} />
            <GradeButton label="Good" color={colors.success} onPress={() => handleGrade("good")} />
            <GradeButton label="Easy" color={colors.accent} onPress={() => handleGrade("easy")} />
          </View>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            {deck.length === 0
              ? "No flashcards yet. Generate a deck below to get started."
              : "You're all caught up! Come back later or add a new topic."}
          </Text>
        </View>
      )}

      <View style={styles.generateBox}>
        <Text style={styles.label}>Generate new cards for a topic</Text>
        <View style={styles.generateRow}>
          <TextInput
            style={styles.input}
            value={topic}
            onChangeText={setTopic}
            placeholder="e.g. travel, food, greetings"
            placeholderTextColor={colors.textFaint}
          />
          <Pressable style={styles.generateButton} onPress={handleGenerate} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.text} /> : <Text style={styles.generateText}>Add</Text>}
          </Pressable>
        </View>
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    </Screen>
  );
}

function GradeButton({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return (
    <Pressable style={[styles.gradeButton, { borderColor: color }]} onPress={onPress}>
      <Text style={[styles.gradeText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "700", color: colors.text, marginTop: 12 },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: 16 },
  reviewArea: { gap: 16 },
  gradeRow: { flexDirection: "row", gap: 8 },
  gradeButton: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  gradeText: { fontWeight: "700", fontSize: 13 },
  emptyState: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  generateBox: { marginTop: 24 },
  label: { color: colors.textMuted, fontSize: 13, marginBottom: 10 },
  generateRow: { flexDirection: "row", gap: 8 },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  generateButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  generateText: { color: colors.text, fontWeight: "700" },
  error: { color: colors.danger, marginTop: 10 },
});
