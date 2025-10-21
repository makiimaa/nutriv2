import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import axiosClient from "../api/axiosClient";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    studentId: string;
    height: number;
    weight: number;
    measurementDate: string;
    notes?: string;
  }) => void;
  studentId: string;
};

export default function MeasurementFormModal({
  visible,
  onClose,
  onSubmit,
  studentId,
}: Props) {
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [displayStudent, setDisplayStudent] = useState<string>("");
  const [loadingMeta, setLoadingMeta] = useState<boolean>(false);

  useEffect(() => {
    const run = async () => {
      if (!visible || !studentId) return;
      try {
        setLoadingMeta(true);
        console.log("[MeasurementFormModal] Fetch meta:", { studentId });
        const sRes = await axiosClient.get(`/students/${studentId}`);
        const s = sRes?.data || {};
        const fullName = s.fullName || s.name || "";
        let className = "";

        console.log("[MeasurementFormModal] Raw classId:", s.classId);

        if (s.classId?.name) {
          className = s.classId.name;
        } else if (s.classId) {
          const classIdStr =
            typeof s.classId === "string" ? s.classId : s.classId._id;
          if (classIdStr) {
            const cRes = await axiosClient.get(
              `/classes/${encodeURIComponent(classIdStr)}`
            );
            className = cRes?.data?.name || "";
          }
        }
        const label = className ? `${fullName} - ${className}` : fullName;
        setDisplayStudent(label);
        console.log("[MeasurementFormModal] Meta loaded:", {
          fullName,
          classId: s.classId,
          className,
        });
      } catch (e: any) {
        console.log(
          "[MeasurementFormModal] Meta error:",
          e?.response?.data || e
        );
        setDisplayStudent("");
      } finally {
        setLoadingMeta(false);
      }
    };
    run();
  }, [visible, studentId]);

  useEffect(() => {
    if (visible) {
      setHeight("");
      setWeight("");
      setNotes("");
      setDate(new Date().toISOString().slice(0, 10));
    }
  }, [visible]);

  const canSave = !!Number(height) && !!Number(weight) && !!date;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <LinearGradient colors={["#eef7ff", "#f8fffb"]} style={{ flex: 1 }}>
        <SafeAreaView style={s.safe}>
          {/* Header */}
          <View style={s.header}>
            <Text style={s.headerTitle}>Nhập số đo</Text>
            <Pressable onPress={onClose} style={s.closeBtn}>
              <Ionicons name="close" size={20} color="#0f172a" />
            </Pressable>
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <ScrollView
              contentContainerStyle={s.scroll}
              keyboardShouldPersistTaps="handled"
            >
              <View style={s.card}>
                <Text style={s.section}>Thông tin đo</Text>
                <Text style={s.meta}>
                  Học sinh:{" "}
                  <Text style={{ fontWeight: "700" }}>
                    {loadingMeta ? "Đang tải..." : displayStudent || "—"}
                  </Text>
                </Text>

                <View style={s.twoCols}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.label}>Chiều cao</Text>
                    <View style={s.inputRow}>
                      <Ionicons
                        name="accessibility-outline"
                        size={16}
                        color="#0f172a"
                      />
                      <TextInput
                        style={s.input}
                        keyboardType="numeric"
                        value={height}
                        onChangeText={setHeight}
                        placeholder="VD: 120"
                      />
                      <Text style={s.suffix}>cm</Text>
                    </View>
                  </View>
                  <View style={{ width: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.label}>Cân nặng</Text>
                    <View style={s.inputRow}>
                      <Ionicons
                        name="barbell-outline"
                        size={16}
                        color="#0f172a"
                      />
                      <TextInput
                        style={s.input}
                        keyboardType="numeric"
                        value={weight}
                        onChangeText={setWeight}
                        placeholder="VD: 25"
                      />
                      <Text style={s.suffix}>kg</Text>
                    </View>
                  </View>
                </View>

                <View style={{ marginTop: 10 }}>
                  <Text style={s.label}>Ngày đo</Text>
                  <View style={s.inputRow}>
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color="#0f172a"
                    />
                    <TextInput
                      style={s.input}
                      value={date}
                      onChangeText={setDate}
                      placeholder="YYYY-MM-DD"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={{ marginTop: 10 }}>
                  <Text style={s.label}>Ghi chú</Text>
                  <View
                    style={[
                      s.inputRow,
                      {
                        minHeight: 80,
                        alignItems: "flex-start",
                        paddingVertical: 10,
                      },
                    ]}
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={16}
                      color="#0f172a"
                      style={{ marginTop: 2 }}
                    />
                    <TextInput
                      style={[s.input, { height: 80 }]}
                      value={notes}
                      onChangeText={setNotes}
                      placeholder="Ghi chú thêm (nếu có)"
                      multiline
                    />
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Action bar */}
            <View style={s.actionBar}>
              <Pressable onPress={onClose} style={s.secondaryBtn}>
                <Text style={s.secondaryText}>Đóng</Text>
              </Pressable>
              <Pressable
                disabled={!canSave}
                onPress={() =>
                  onSubmit({
                    studentId,
                    height: Number(height),
                    weight: Number(weight),
                    measurementDate: date,
                    notes: notes?.trim() || undefined,
                  })
                }
                style={[s.primaryBtn, !canSave && { opacity: 0.6 }]}
              >
                <LinearGradient
                  colors={["#34d399", "#059669"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.primaryInner}
                >
                  <Ionicons name="save-outline" size={18} color="#fff" />
                  <Text style={s.primaryText}>Lưu</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  header: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    paddingTop: 2,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#0b3d2e" },
  closeBtn: {
    position: "absolute",
    right: 0,
    top: 0,
    padding: 8,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.06)",
  },

  scroll: { paddingBottom: 90 },
  card: {
    backgroundColor: "rgba(255,255,255,0.65)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },

  section: { fontWeight: "800", color: "#0f172a", marginBottom: 8 },
  meta: { color: "#475569", marginBottom: 10 },

  twoCols: { flexDirection: "row" },

  label: { fontWeight: "700", color: "#0f172a", marginBottom: 6 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  input: { flex: 1, color: "#0f172a" },
  suffix: { color: "#0f172a", fontWeight: "700" },

  actionBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: "rgba(248,255,251,0.92)",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    flexDirection: "row",
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  secondaryText: { color: "#0f172a", fontWeight: "700" },
  primaryBtn: { flex: 1 },
  primaryInner: {
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: "#059669",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  primaryText: { color: "#fff", fontWeight: "700" },
});
