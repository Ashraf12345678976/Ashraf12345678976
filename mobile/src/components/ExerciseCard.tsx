import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "@/theme/colors";
import { Exercise } from "@/types";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export default function ExerciseCard({
  exercise,
  onResult,
}: {
  exercise: Exercise;
  onResult: (correct: boolean) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const isCorrect = (value: string) => normalize(value) === normalize(exercise.answer);

  const submitChoice = (option: string) => {
    if (submitted) return;
    setSelected(option);
    setSubmitted(true);
    onResult(isCorrect(option));
  };

  const submitText = () => {
    if (submitted || !textAnswer.trim()) return;
    setSubmitted(true);
    onResult(isCorrect(textAnswer));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>{exercise.prompt}</Text>

      {exercise.type === "multiple_choice" && exercise.options && (
        <View style={styles.options}>
          {exercise.options.map((option) => {
            const chosen = selected === option;
            const showAsCorrect = submitted && isCorrect(option);
            const showAsWrong = submitted && chosen && !isCorrect(option);
            return (
              <Pressable
                key={option}
                onPress={() => submitChoice(option)}
                style={[
                  styles.option,
                  showAsCorrect && styles.optionCorrect,
                  showAsWrong && styles.optionWrong,
                ]}
              >
                <Text style={styles.optionText}>{option}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {(exercise.type === "fill_blank" || exercise.type === "translate") && (
        <View>
          <TextInput
            style={[
              styles.input,
              submitted && (isCorrect(textAnswer) ? styles.optionCorrect : styles.optionWrong),
            ]}
            value={textAnswer}
            onChangeText={setTextAnswer}
            editable={!submitted}
            placeholder="Type your answer"
            placeholderTextColor={colors.textFaint}
          />
          {!submitted && (
            <Pressable style={styles.submitButton} onPress={submitText}>
              <Text style={styles.submitText}>Check</Text>
            </Pressable>
          )}
        </View>
      )}

      {submitted && (
        <Text style={styles.feedback}>
          {isCorrect(selected ?? textAnswer)
            ? "Correct! 🎉"
            : `Not quite — the answer is "${exercise.answer}"`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  prompt: { color: colors.text, fontSize: 18, fontWeight: "600", lineHeight: 26 },
  options: { gap: 10 },
  option: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionCorrect: { borderColor: colors.success, backgroundColor: "#0F3A2E" },
  optionWrong: { borderColor: colors.danger, backgroundColor: "#3A1414" },
  optionText: { color: colors.text, fontSize: 15 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    color: colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  submitButton: {
    marginTop: 10,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  submitText: { color: colors.text, fontWeight: "700" },
  feedback: { color: colors.textMuted, fontSize: 14 },
});
