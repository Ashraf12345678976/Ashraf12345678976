import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Screen from "@/components/Screen";
import { colors, languages } from "@/theme/colors";
import { useApp } from "@/context/AppContext";
import { Proficiency } from "@/types";

const PROFICIENCIES: { key: Proficiency; label: string }[] = [
  { key: "beginner", label: "Beginner" },
  { key: "intermediate", label: "Intermediate" },
  { key: "advanced", label: "Advanced" },
];

export default function OnboardingScreen() {
  const { completeOnboarding } = useApp();
  const [name, setName] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("Spanish");
  const [proficiency, setProficiency] = useState<Proficiency>("beginner");

  return (
    <Screen>
      <Text style={styles.title}>Welcome to Lingua 👋</Text>
      <Text style={styles.subtitle}>Your personal AI language tutor</Text>

      <Text style={styles.label}>What should we call you?</Text>
      <TextInput
        style={styles.input}
        placeholder="Your name"
        placeholderTextColor={colors.textFaint}
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>Which language do you want to learn?</Text>
      <View style={styles.optionsRow}>
        {languages.map((lang) => (
          <Pressable
            key={lang.code}
            onPress={() => setTargetLanguage(lang.code)}
            style={[styles.option, targetLanguage === lang.code && styles.optionSelected]}
          >
            <Text style={styles.optionEmoji}>{lang.flag}</Text>
            <Text style={styles.optionText}>{lang.code}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>What's your level?</Text>
      <View style={styles.optionsRow}>
        {PROFICIENCIES.map((p) => (
          <Pressable
            key={p.key}
            onPress={() => setProficiency(p.key)}
            style={[styles.pill, proficiency === p.key && styles.pillSelected]}
          >
            <Text
              style={[styles.pillText, proficiency === p.key && styles.pillTextSelected]}
            >
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={[styles.cta, !name.trim() && styles.ctaDisabled]}
        disabled={!name.trim()}
        onPress={() => completeOnboarding({ name: name.trim(), targetLanguage, proficiency })}
      >
        <Text style={styles.ctaText}>Start learning</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: "700", color: colors.text, marginTop: 24 },
  subtitle: { fontSize: 16, color: colors.textMuted, marginTop: 6, marginBottom: 32 },
  label: { fontSize: 14, color: colors.textMuted, marginBottom: 10, marginTop: 20 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
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
  cta: {
    marginTop: "auto",
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { color: colors.text, fontWeight: "700", fontSize: 16 },
});
