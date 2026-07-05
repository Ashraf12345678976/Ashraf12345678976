import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";
import { ChatMessage } from "@/types";

export default function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        <Text style={styles.text}>{message.content}</Text>
        {!!message.translation && (
          <Text style={styles.translation}>{message.translation}</Text>
        )}
        {!!message.correction && (
          <View style={styles.correctionBox}>
            <Text style={styles.correctionLabel}>Suggested correction</Text>
            <Text style={styles.correctionText}>{message.correction}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", marginVertical: 6 },
  rowUser: { justifyContent: "flex-end" },
  rowAssistant: { justifyContent: "flex-start" },
  bubble: { maxWidth: "82%", borderRadius: 16, padding: 12 },
  bubbleUser: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleAssistant: { backgroundColor: colors.surface, borderBottomLeftRadius: 4 },
  text: { color: colors.text, fontSize: 15, lineHeight: 21 },
  translation: { color: colors.textMuted, fontSize: 12, marginTop: 6, fontStyle: "italic" },
  correctionBox: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  correctionLabel: { color: colors.warning, fontSize: 11, fontWeight: "700", marginBottom: 2 },
  correctionText: { color: colors.text, fontSize: 13 },
});
