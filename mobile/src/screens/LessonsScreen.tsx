import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Screen from "@/components/Screen";
import { colors } from "@/theme/colors";
import { useApp } from "@/context/AppContext";
import { fetchLessons } from "@/services/api";
import { Lesson } from "@/types";

export default function LessonsScreen() {
  const { profile } = useApp();
  const navigation = useNavigation<any>();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchLessons(profile.targetLanguage)
      .then((data) => {
        if (!cancelled) setLessons(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load lessons");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profile.targetLanguage]);

  return (
    <Screen>
      <Text style={styles.title}>{profile.targetLanguage} Lessons</Text>
      {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />}
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={lessons}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
        renderItem={({ item }) => {
          const done = profile.completedLessonIds.includes(item.id);
          return (
            <Pressable
              style={styles.card}
              onPress={() => navigation.navigate("LessonPlayer", { lessonId: item.id })}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                {done && <Text style={styles.doneBadge}>✓ Done</Text>}
              </View>
              <Text style={styles.cardDesc}>{item.description}</Text>
              <Text style={styles.cardMeta}>{item.level} · {item.xp} XP · {item.exercises.length} exercises</Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          !loading ? <Text style={styles.error}>No lessons yet for this language.</Text> : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "700", color: colors.text, marginVertical: 12 },
  error: { color: colors.danger, marginTop: 12 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  doneBadge: { color: colors.success, fontSize: 12, fontWeight: "700" },
  cardDesc: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  cardMeta: { color: colors.textFaint, fontSize: 12, marginTop: 8 },
});
