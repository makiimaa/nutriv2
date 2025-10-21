import React, { useEffect, useState } from "react";
import { Modal, View, Text, TextInput, Button, StyleSheet } from "react-native";
import { Menu } from "../types";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    date: string;
    items: {
      mealType: "breakfast" | "lunch" | "snack";
      name: string;
      notes?: string;
    }[];
  }) => void;
  initial?: Menu | null;
};

export default function MenuFormModal({
  visible,
  onClose,
  onSubmit,
  initial,
}: Props) {
  const [date, setDate] = useState("");
  const [breakfast, setBreakfast] = useState("");
  const [lunch, setLunch] = useState("");
  const [snack, setSnack] = useState("");
  const [bNotes, setBNotes] = useState("");
  const [lNotes, setLNotes] = useState("");
  const [sNotes, setSNotes] = useState("");

  useEffect(() => {
    if (initial) {
      setDate((initial.date || "").slice(0, 10));
      setBreakfast(
        initial.items.find((i) => i.mealType === "breakfast")?.name || ""
      );
      setLunch(initial.items.find((i) => i.mealType === "lunch")?.name || "");
      setSnack(initial.items.find((i) => i.mealType === "snack")?.name || "");
      setBNotes(
        initial.items.find((i) => i.mealType === "breakfast")?.notes || ""
      );
      setLNotes(initial.items.find((i) => i.mealType === "lunch")?.notes || "");
      setSNotes(initial.items.find((i) => i.mealType === "snack")?.notes || "");
    } else {
      setDate("");
      setBreakfast("");
      setLunch("");
      setSnack("");
      setBNotes("");
      setLNotes("");
      setSNotes("");
    }
  }, [initial, visible]);

  const submit = () => {
    const items = [
      breakfast.trim()
        ? {
            mealType: "breakfast",
            name: breakfast.trim(),
            notes: bNotes?.trim() || undefined,
          }
        : null,
      lunch.trim()
        ? {
            mealType: "lunch",
            name: lunch.trim(),
            notes: lNotes?.trim() || undefined,
          }
        : null,
      snack.trim()
        ? {
            mealType: "snack",
            name: snack.trim(),
            notes: sNotes?.trim() || undefined,
          }
        : null,
    ].filter(Boolean) as {
      mealType: "breakfast" | "lunch" | "snack";
      name: string;
      notes?: string;
    }[];

    onSubmit({ date: date.trim(), items });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <Text style={styles.h}>Thực đơn</Text>
        <TextInput
          placeholder="Ngày (YYYY-MM-DD)"
          value={date}
          onChangeText={setDate}
          style={styles.input}
        />
        <Text style={styles.label}>Bữa sáng</Text>
        <TextInput
          placeholder="Món sáng"
          value={breakfast}
          onChangeText={setBreakfast}
          style={styles.input}
        />
        <TextInput
          placeholder="Ghi chú sáng"
          value={bNotes}
          onChangeText={setBNotes}
          style={styles.input}
        />
        <Text style={styles.label}>Bữa trưa</Text>
        <TextInput
          placeholder="Món trưa"
          value={lunch}
          onChangeText={setLunch}
          style={styles.input}
        />
        <TextInput
          placeholder="Ghi chú trưa"
          value={lNotes}
          onChangeText={setLNotes}
          style={styles.input}
        />
        <Text style={styles.label}>Bữa xế</Text>
        <TextInput
          placeholder="Món xế"
          value={snack}
          onChangeText={setSnack}
          style={styles.input}
        />
        <TextInput
          placeholder="Ghi chú xế"
          value={sNotes}
          onChangeText={setSNotes}
          style={styles.input}
        />
        <Button title="Lưu" onPress={submit} />
        <View style={{ height: 8 }} />
        <Button title="Hủy" onPress={onClose} color="#888" />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: "center" },
  h: { fontSize: 18, fontWeight: "700", marginBottom: 12, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  label: { marginTop: 8, marginBottom: 4, fontWeight: "600" },
});
