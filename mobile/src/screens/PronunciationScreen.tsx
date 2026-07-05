import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Audio } from "expo-av";
import * as Speech from "expo-speech";
import Screen from "@/components/Screen";
import { colors } from "@/theme/colors";
import { useApp } from "@/context/AppContext";
import { evaluatePronunciation, PronunciationResult } from "@/services/api";
import { localeFor, pronunciationPhrases } from "@/data/pronunciationPhrases";

export default function PronunciationScreen() {
  const { profile, addXp } = useApp();
  const phrases = pronunciationPhrases[profile.targetLanguage] || [];
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const current = phrases[phraseIndex];

  const playTarget = () => {
    if (!current) return;
    Speech.speak(current.phrase, { language: localeFor(profile.targetLanguage) });
  };

  const startRecording = async () => {
    try {
      setError(null);
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setError("Microphone permission is required to practice speaking.");
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      setIsRecording(true);
      setHasRecorded(false);
      setResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start recording");
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      setIsRecording(false);
      setHasRecorded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not stop recording");
    } finally {
      setRecording(null);
    }
  };

  const submit = async () => {
    if (!current || !transcript.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const evaluation = await evaluatePronunciation({
        targetLanguage: profile.targetLanguage,
        targetPhrase: current.phrase,
        transcript: transcript.trim(),
      });
      setResult(evaluation);
      if (evaluation.score >= 70) await addXp(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not evaluate pronunciation");
    } finally {
      setLoading(false);
    }
  };

  const nextPhrase = () => {
    setPhraseIndex((i) => (i + 1) % phrases.length);
    setHasRecorded(false);
    setTranscript("");
    setResult(null);
  };

  if (!current) {
    return (
      <Screen>
        <Text style={styles.title}>No phrases available for {profile.targetLanguage} yet.</Text>
      </Screen>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <Screen>
        <Text style={styles.title}>Speaking Practice</Text>
        <View style={styles.phraseCard}>
          <Text style={styles.phrase}>{current.phrase}</Text>
          <Text style={styles.translation}>{current.translation}</Text>
          <Pressable style={styles.listenButton} onPress={playTarget}>
            <Text style={styles.listenText}>🔊 Listen</Text>
          </Pressable>
        </View>

        <Pressable
          style={[styles.recordButton, isRecording && styles.recordButtonActive]}
          onPress={isRecording ? stopRecording : startRecording}
        >
          <Text style={styles.recordEmoji}>{isRecording ? "⏹️" : "🎙️"}</Text>
          <Text style={styles.recordText}>{isRecording ? "Stop recording" : "Record yourself"}</Text>
        </Pressable>

        {hasRecorded && (
          <View style={styles.transcriptBox}>
            <Text style={styles.label}>
              What did you say? (Type it below so the AI tutor can score it — on-device speech-to-text
              can be wired in later; this lets you try the feature now.)
            </Text>
            <TextInput
              style={styles.input}
              value={transcript}
              onChangeText={setTranscript}
              placeholder={`Type what you said in ${profile.targetLanguage}`}
              placeholderTextColor={colors.textFaint}
              multiline
            />
            <Pressable style={styles.cta} onPress={submit} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.text} /> : <Text style={styles.ctaText}>Get feedback</Text>}
            </Pressable>
          </View>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        {result && (
          <View style={styles.resultBox}>
            <Text style={styles.score}>{result.score}/100</Text>
            <Text style={styles.feedback}>{result.feedback}</Text>
            {result.tips.map((tip, i) => (
              <Text key={i} style={styles.tip}>• {tip}</Text>
            ))}
            <Pressable style={styles.nextButton} onPress={nextPhrase}>
              <Text style={styles.nextText}>Next phrase</Text>
            </Pressable>
          </View>
        )}
      </Screen>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "700", color: colors.text, marginVertical: 12 },
  phraseCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  phrase: { fontSize: 20, fontWeight: "700", color: colors.text, textAlign: "center" },
  translation: { fontSize: 14, color: colors.textMuted, marginTop: 6 },
  listenButton: {
    marginTop: 14,
    backgroundColor: colors.primaryMuted,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  listenText: { color: colors.text, fontWeight: "600" },
  recordButton: {
    marginTop: 20,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  recordButtonActive: { borderColor: colors.danger, backgroundColor: "#3A1414" },
  recordEmoji: { fontSize: 28 },
  recordText: { color: colors.text, fontWeight: "600", marginTop: 6 },
  transcriptBox: { marginTop: 20 },
  label: { color: colors.textMuted, fontSize: 13, marginBottom: 10, lineHeight: 18 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    color: colors.text,
    minHeight: 60,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cta: {
    marginTop: 12,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  ctaText: { color: colors.text, fontWeight: "700" },
  error: { color: colors.danger, marginTop: 12 },
  resultBox: {
    marginTop: 20,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  score: { color: colors.accent, fontSize: 28, fontWeight: "800" },
  feedback: { color: colors.text, fontSize: 14, marginTop: 8 },
  tip: { color: colors.textMuted, fontSize: 13, marginTop: 6 },
  nextButton: { marginTop: 16, alignSelf: "flex-start" },
  nextText: { color: colors.primary, fontWeight: "700" },
});
