import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Screen from "@/components/Screen";
import ExerciseCard from "@/components/ExerciseCard";
import { colors } from "@/theme/colors";
import { useApp } from "@/context/AppContext";
import { fetchLessonById } from "@/services/api";
import { Lesson } from "@/types";

export default function LessonPlayerScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { markLessonComplete } = useApp();
  const { lessonId } = route.params as { lessonId: string };

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [index, setIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    fetchLessonById(lessonId).then(setLesson);
  }, [lessonId]);

  if (!lesson) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  if (finished) {
    const passed = correctCount >= Math.ceil(lesson.exercises.length * 0.6);
    return (
      <Screen style={styles.center}>
        <Text style={styles.resultEmoji}>{passed ? "🎉" : "💪"}</Text>
        <Text style={styles.resultTitle}>
          {correctCount} / {lesson.exercises.length} correct
        </Text>
        <Text style={styles.resultSubtitle}>
          {passed ? `You earned ${lesson.xp} XP!` : "Keep practicing — you'll get there!"}
        </Text>
        <Pressable style={styles.cta} onPress={() => navigation.goBack()}>
          <Text style={styles.ctaText}>Back to lessons</Text>
        </Pressable>
      </Screen>
    );
  }

  const exercise = lesson.exercises[index];
  const isLast = index === lesson.exercises.length - 1;

  const handleResult = (correct: boolean) => {
    if (answered) return;
    setAnswered(true);
    if (correct) setCorrectCount((c) => c + 1);
  };

  const handleNext = async () => {
    if (isLast) {
      const finalCorrect = correctCount;
      const passed = finalCorrect >= Math.ceil(lesson.exercises.length * 0.6);
      if (passed) await markLessonComplete(lesson.id, lesson.xp);
      setFinished(true);
    } else {
      setIndex((i) => i + 1);
      setAnswered(false);
    }
  };

  return (
    <Screen>
      <View style={styles.progressRow}>
        {lesson.exercises.map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              i <= index ? styles.progressDotActive : undefined,
            ]}
          />
        ))}
      </View>
      <Text style={styles.title}>{lesson.title}</Text>
      <View style={styles.card}>
        <ExerciseCard key={exercise.id} exercise={exercise} onResult={handleResult} />
      </View>
      {answered && (
        <Pressable style={styles.cta} onPress={handleNext}>
          <Text style={styles.ctaText}>{isLast ? "Finish lesson" : "Continue"}</Text>
        </Pressable>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  progressRow: { flexDirection: "row", gap: 6, marginBottom: 16, marginTop: 8 },
  progressDot: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.surface },
  progressDotActive: { backgroundColor: colors.primary },
  title: { color: colors.textMuted, fontSize: 14, marginBottom: 16 },
  card: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cta: {
    marginTop: 24,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  ctaText: { color: colors.text, fontWeight: "700", fontSize: 16 },
  resultEmoji: { fontSize: 56, marginBottom: 12 },
  resultTitle: { color: colors.text, fontSize: 22, fontWeight: "700" },
  resultSubtitle: { color: colors.textMuted, fontSize: 15, marginTop: 8, marginBottom: 24 },
});
