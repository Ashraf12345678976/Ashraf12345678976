import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Screen from "@/components/Screen";
import MessageBubble from "@/components/MessageBubble";
import { colors } from "@/theme/colors";
import { useApp } from "@/context/AppContext";
import { sendChatMessage } from "@/services/api";
import { ChatMessage } from "@/types";

export default function ChatScreen() {
  const { profile, addXp } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `Hi ${profile.name || "there"}! Ready to practice some ${profile.targetLanguage}? Tell me about your day.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setError(null);
    const userMessage: ChatMessage = { role: "user", content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    try {
      const response = await sendChatMessage({
        targetLanguage: profile.targetLanguage,
        proficiency: profile.proficiency,
        history: nextMessages.slice(0, -1),
        message: text,
      });
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: response.reply,
          correction: response.correction,
          translation: response.translation,
        },
      ]);
      await addXp(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen style={styles.screen}>
      <Text style={styles.header}>AI Tutor · {profile.targetLanguage}</Text>
      <FlatList
        data={messages}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => <MessageBubble message={item} />}
        contentContainerStyle={styles.list}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={`Write in ${profile.targetLanguage}...`}
            placeholderTextColor={colors.textFaint}
            value={input}
            onChangeText={setInput}
            multiline
          />
          <Pressable style={styles.sendButton} onPress={handleSend} disabled={sending}>
            {sending ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.sendText}>Send</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 8 },
  header: { color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: 12 },
  list: { paddingBottom: 8 },
  error: { color: colors.danger, marginBottom: 8 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    color: colors.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  sendText: { color: colors.text, fontWeight: "700" },
});
