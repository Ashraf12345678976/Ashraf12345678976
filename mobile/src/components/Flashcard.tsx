import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";
import { FlashcardItem } from "@/types";

export default function Flashcard({ card }: { card: FlashcardItem }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <Pressable style={styles.card} onPress={() => setFlipped((f) => !f)}>
      <Text style={styles.hint}>{flipped ? "Meaning" : "Tap to reveal"}</Text>
      <Text style={styles.word}>{flipped ? card.back : card.front}</Text>
      {flipped && card.example && <Text style={styles.example}>{card.example}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 20,
    padding: 28,
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  hint: { color: colors.textFaint, fontSize: 12, marginBottom: 12, textTransform: "uppercase" },
  word: { color: colors.text, fontSize: 26, fontWeight: "700", textAlign: "center" },
  example: { color: colors.textMuted, fontSize: 14, marginTop: 14, textAlign: "center" },
});
