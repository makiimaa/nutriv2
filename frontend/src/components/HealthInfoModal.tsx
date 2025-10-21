import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
  Keyboard,
} from "react-native";
import axiosClient from "../api/axiosClient";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

function normalizeTag(s: string) {
  const rmDiacritics = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const lower = rmDiacritics.trim().toLowerCase();
  const replaced = lower.replace(/[^a-z0-9\s_\-\/]/g, " ").replace(/\s+/g, "_");
  return replaced.replace(/^_+|_+$/g, "");
}

function upsert(
  list: string[],
  raw: string,
  { prefix }: { prefix?: string } = {}
) {
  const base = normalizeTag(raw);
  if (!base) return list;
  const val = prefix ? `${prefix}${base}` : base;
  const set = new Set(list);
  set.add(val);
  return Array.from(set).slice(0, 50);
}

function removeAt(list: string[], idx: number) {
  return list.filter((_, i) => i !== idx);
}

export default function HealthInfoModal({
  visible,
  onClose,
  studentId,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  studentId?: string;
  onSaved: () => void;
}) {
  const [allergies, setAllergies] = useState<string[]>([]);
  const [foodRestrictions, setFoodRestrictions] = useState<string[]>([]);
  const [medicalHistory, setMedicalHistory] = useState("");
  const [specialNeeds, setSpecialNeeds] = useState("");
  const [saving, setSaving] = useState(false);

  const [alInput, setAlInput] = useState("");
  const [frInput, setFrInput] = useState("");

  useEffect(() => {
    if (!visible || !studentId) return;
    (async () => {
      try {
        const res = await axiosClient.get(`/students/${studentId}/health-info`);
        const d = res.data || {};
        setAllergies(Array.isArray(d.allergies) ? d.allergies : []);
        setFoodRestrictions(
          Array.isArray(d.foodRestrictions) ? d.foodRestrictions : []
        );
        setMedicalHistory(d.medicalHistory || "");
        setSpecialNeeds(d.specialNeeds || "");
      } catch (e: any) {
        console.log("load health info", e?.response?.data || e);
      }
    })();
  }, [visible, studentId]);

  const addAllergy = () => {
    if (!alInput.trim()) return;
    setAllergies((prev) => upsert(prev, alInput));
    setAlInput("");
    Keyboard.dismiss();
  };
  const addRestriction = () => {
    if (!frInput.trim()) return;
    setFoodRestrictions((prev) => upsert(prev, frInput));
    setFrInput("");
    Keyboard.dismiss();
  };

  const save = async () => {
    if (!studentId) return;
    try {
      setSaving(true);

      const normAllergies = allergies
        .map(normalizeTag)
        .filter(Boolean)
        .slice(0, 50);
      const normRestrict = foodRestrictions
        .map(normalizeTag)
        .filter(Boolean)
        .slice(0, 50);

      await axiosClient.put(`/students/${studentId}/health-info`, {
        allergies: normAllergies,
        foodRestrictions: normRestrict,
        medicalHistory,
        specialNeeds,
      });
      onSaved();
    } catch (e: any) {
      console.log(e?.response?.data || e);
      Alert.alert("Lỗi", e?.response?.data?.message || "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  const suggestions = useMemo(() => {
    return [] as string[];
  }, [allergies, foodRestrictions]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <LinearGradient colors={["#eef7ff", "#f8fffb"]} style={{ flex: 1 }}>
        <View style={st.header}>
          <Text style={st.title}>Tình trạng sức khoẻ</Text>
          <Pressable onPress={onClose} style={st.closeBtn}>
            <Ionicons name="close" size={18} color="#0f172a" />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>
          {/* Allergies */}
          <Text style={st.section}>Dị ứng (nhập tự do)</Text>
          <View style={st.rowInput}>
            <Ionicons name="warning-outline" size={16} color="#0f172a" />
            <TextInput
              style={st.input}
              placeholder="VD: milk, egg, peanut..."
              value={alInput}
              onChangeText={setAlInput}
              onSubmitEditing={addAllergy}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
            />
            <Pressable onPress={addAllergy} style={st.addBtn}>
              <Ionicons name="add" size={18} color="#fff" />
            </Pressable>
          </View>
          <View style={st.chips}>
            {allergies.map((a, idx) => (
              <View key={`${a}-${idx}`} style={st.chip}>
                <Text style={st.chipText}>{a}</Text>
                <Pressable
                  onPress={() => setAllergies((prev) => removeAt(prev, idx))}
                >
                  <Ionicons name="close" size={14} color="#0f172a" />
                </Pressable>
              </View>
            ))}
            {!allergies.length && (
              <Text style={st.hint}>Chưa có mục dị ứng</Text>
            )}
          </View>

          {/* Restrictions */}
          <Text style={[st.section, { marginTop: 16 }]}>
            Hạn chế ăn (nhập tự do)
          </Text>
          <View style={st.rowInput}>
            <Ionicons name="remove-circle-outline" size={16} color="#0f172a" />
            <TextInput
              style={st.input}
              placeholder="VD: pork, spicy, gluten_free..."
              value={frInput}
              onChangeText={setFrInput}
              onSubmitEditing={addRestriction}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
            />
            <Pressable onPress={addRestriction} style={st.addBtn}>
              <Ionicons name="add" size={18} color="#fff" />
            </Pressable>
          </View>
          <View style={st.chips}>
            {foodRestrictions.map((a, idx) => (
              <View key={`${a}-${idx}`} style={st.chip}>
                <Text style={st.chipText}>{a}</Text>
                <Pressable
                  onPress={() =>
                    setFoodRestrictions((prev) => removeAt(prev, idx))
                  }
                >
                  <Ionicons name="close" size={14} color="#0f172a" />
                </Pressable>
              </View>
            ))}
            {!foodRestrictions.length && (
              <Text style={st.hint}>Chưa có mục hạn chế</Text>
            )}
          </View>

          {/* Medical & Special */}
          <Text style={[st.section, { marginTop: 16 }]}>Tiền sử bệnh</Text>
          <TextInput
            style={st.inputArea}
            value={medicalHistory}
            onChangeText={setMedicalHistory}
            placeholder="Ví dụ: hen suyễn, dị ứng phấn hoa..."
            multiline
          />

          <Text style={[st.section, { marginTop: 16 }]}>Nhu cầu đặc biệt</Text>
          <TextInput
            style={st.inputArea}
            value={specialNeeds}
            onChangeText={setSpecialNeeds}
            placeholder="Ví dụ: cần cắt nhỏ đồ ăn, quan sát sát sao khi ăn..."
            multiline
          />
        </ScrollView>

        <View style={st.actionBar}>
          <Pressable onPress={onClose} style={st.secondaryBtn}>
            <Text style={st.secondaryText}>Đóng</Text>
          </Pressable>
          <Pressable disabled={saving} onPress={save} style={st.primaryBtn}>
            <LinearGradient
              colors={["#34d399", "#059669"]}
              style={st.primaryInner}
            >
              <Ionicons name="save-outline" size={18} color="#fff" />
              <Text style={st.primaryText}>
                {saving ? "Đang lưu..." : "Lưu"}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      </LinearGradient>
    </Modal>
  );
}

const st = StyleSheet.create({
  header: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 10,
    paddingBottom: 6,
  },
  title: { fontSize: 18, fontWeight: "800", color: "#0b3d2e" },
  closeBtn: {
    position: "absolute",
    right: 10,
    top: 10,
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.06)",
    borderRadius: 10,
  },
  section: { fontWeight: "800", color: "#0f172a", marginBottom: 8 },

  rowInput: {
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
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#059669",
    shadowColor: "#059669",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  chipText: { color: "#0f172a" },
  hint: { color: "#64748b" },

  inputArea: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.6)",
    textAlignVertical: "top",
    color: "#0f172a",
  },

  actionBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
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
  },
  primaryText: { color: "#fff", fontWeight: "700" },
});
