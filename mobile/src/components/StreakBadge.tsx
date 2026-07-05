import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";

export default function StreakBadge({ streak, xp }: { streak: number; xp: number }) {
  return (
    <View style={styles.row}>
      <View style={styles.badge}>
        <Text style={styles.emoji}>🔥</Text>
        <Text style={styles.value}>{streak}</Text>
      </View>
      <View style={styles.badge}>
        <Text style={styles.emoji}>⭐</Text>
        <Text style={styles.value}>{xp} XP</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 12 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  emoji: { fontSize: 16 },
  value: { color: colors.text, fontWeight: "600" },
});
