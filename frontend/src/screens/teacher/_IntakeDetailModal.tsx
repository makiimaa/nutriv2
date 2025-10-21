import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  SafeAreaView,
  StatusBar,
  Pressable,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import axiosClient from "../../api/axiosClient";
import { FoodItem } from "../../types";

const UI = {
  padX: 24,
  glass: "rgba(255,255,255,0.6)",
  border: "rgba(0,0,0,0.08)",
  radius: 14,
};

function PrimaryBtn({
  title,
  icon,
  onPress,
}: {
  title: string;
  icon?: any;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={st.btn}>
      <LinearGradient
        colors={["#34d399", "#059669"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={st.btnInner}
      >
        {icon && <Ionicons name={icon} size={16} color="#fff" />}
        <Text style={st.btnText}>{title}</Text>
      </LinearGradient>
    </Pressable>
  );
}
function GhostBtn({
  title,
  onPress,
  danger,
}: {
  title: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        st.ghostBtn,
        danger && { backgroundColor: "rgba(220,38,38,0.08)" },
      ]}
    >
      <Text style={[st.ghostText, danger && { color: "#b91c1c" }]}>
        {title}
      </Text>
    </Pressable>
  );
}

export default function IntakeDetailModal({
  visible,
  onClose,
  doc,
  foodItems,
  onSaved,
  onDeleted,
}: {
  visible: boolean;
  onClose: () => void;
  doc: any;
  foodItems: FoodItem[];
  onSaved: () => void;
  onDeleted?: () => void;
}) {
  const [state, setState] = useState<any>(null);
  useEffect(() => {
    if (visible) setState(doc);
  }, [visible, doc]);

  if (!state)
    return (
      <Modal visible={visible} onRequestClose={onClose}>
        <View />
      </Modal>
    );

  const rowsFor = (mealKey: "breakfast" | "lunch" | "snack") =>
    state?.mealIntakes?.[mealKey]?.actualIntake || [];
  const setRowsFor = (
    mealKey: "breakfast" | "lunch" | "snack",
    rows: any[]
  ) => {
    setState((p: any) => ({
      ...p,
      mealIntakes: {
        ...p.mealIntakes,
        [mealKey]: { ...(p.mealIntakes?.[mealKey] || {}), actualIntake: rows },
      },
    }));
  };
  const updateRow = (mealKey: any, idx: number, patch: any) => {
    const rows = rowsFor(mealKey).map((it: any, i: number) =>
      i === idx ? { ...it, ...patch } : it
    );
    setRowsFor(mealKey, rows);
  };

  const submit = async () => {
    try {
      await axiosClient.put(`/intake/${state._id}`, {
        mealIntakes: state.mealIntakes,
        notes: state.notes,
      });
      onSaved();
    } catch (e: any) {
      Alert.alert("Lỗi", e?.response?.data?.message || "Cập nhật thất bại");
    }
  };

  const remove = async () => {
    try {
      await axiosClient.delete(`/intake/${state._id}`);
    } catch (e: any) {
      Alert.alert("Lỗi", e?.response?.data?.message || "Xoá thất bại");
      return;
    }
    Alert.alert("OK", "Đã xoá bản ghi");
    onDeleted?.();
  };

  const Block = ({
    title,
    mealKey,
  }: {
    title: string;
    mealKey: "breakfast" | "lunch" | "snack";
  }) => (
    <View style={{ marginTop: 10 }}>
      <Text style={st.subh}>{title}</Text>
      {rowsFor(mealKey).map((row: any, idx: number) => (
        <View key={idx} style={st.itemCard}>
          <Text style={st.smallLabel}>Món</Text>
          <View style={st.pickerWrap}>
            <Picker
              selectedValue={row.foodItemId}
              onValueChange={(v) =>
                updateRow(mealKey, idx, { foodItemId: String(v) })
              }
            >
              {foodItems.map((fi) => (
                <Picker.Item
                  key={fi._id}
                  label={`${fi.name} (${fi.unit})`}
                  value={fi._id}
                />
              ))}
            </Picker>
          </View>
          <View style={st.twoCols}>
            <View style={{ flex: 1 }}>
              <Text style={st.smallLabel}>Dự kiến</Text>
              <TextInput
                style={st.input}
                keyboardType="numeric"
                placeholder="VD: 100"
                value={String(row.plannedQuantity ?? "")}
                onChangeText={(t) =>
                  updateRow(mealKey, idx, {
                    plannedQuantity: parseFloat(t) || 0,
                  })
                }
              />
            </View>
            <View style={{ width: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={st.smallLabel}>Thực tế</Text>
              <TextInput
                style={st.input}
                keyboardType="numeric"
                placeholder="VD: 80"
                value={String(row.actualQuantity ?? "")}
                onChangeText={(t) =>
                  updateRow(mealKey, idx, {
                    actualQuantity: parseFloat(t) || 0,
                  })
                }
              />
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <LinearGradient colors={["#eef7ff", "#f8fffb"]} style={{ flex: 1 }}>
        <StatusBar barStyle="dark-content" translucent />
        <SafeAreaView style={st.safe}>
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Brand/Header */}
            <View style={st.brand}>
              <Pressable onPress={onClose} style={st.closeBtn}>
                <Ionicons name="chevron-back" size={18} color="#0f172a" />
              </Pressable>
              <View style={st.logoWrap}>
                <LinearGradient
                  colors={["#d1fae5", "#93c5fd"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={st.logo}
                >
                  <Ionicons
                    name="clipboard-outline"
                    size={20}
                    color="#0b3d2e"
                  />
                </LinearGradient>
              </View>
              <Text style={st.brandTitle}>
                Chi tiết bữa ăn {(state.date || "").slice(0, 10)}
              </Text>
            </View>

            {/* Notes */}
            <View style={st.card}>
              <Text style={st.label}>Ghi chú</Text>
              <TextInput
                style={st.input}
                placeholder="Ghi chú cho bản ghi"
                placeholderTextColor="#94a3b8"
                value={state.notes || ""}
                onChangeText={(t) => setState({ ...state, notes: t })}
                multiline
              />
            </View>

            {/* Blocks */}
            <Block title="Bữa sáng" mealKey="breakfast" />
            <Block title="Bữa trưa" mealKey="lunch" />
            <Block title="Bữa xế" mealKey="snack" />

            <View style={st.footerBtns}>
              <PrimaryBtn
                title="Lưu thay đổi"
                icon="save-outline"
                onPress={submit}
              />
              <GhostBtn title="Xoá bản ghi" onPress={remove} danger />
              <GhostBtn title="Đóng" onPress={onClose} />
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: UI.padX, paddingTop: 8 },

  brand: { alignItems: "center", marginTop: 2, marginBottom: 8 },
  closeBtn: {
    position: "absolute",
    left: 0,
    top: 0,
    backgroundColor: "rgba(0,0,0,0.06)",
    padding: 8,
    borderRadius: 12,
  },
  logoWrap: {
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  logo: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: { fontSize: 18, fontWeight: "800", color: "#0b3d2e" },

  card: {
    backgroundColor: UI.glass,
    borderRadius: UI.radius,
    padding: 14,
    borderWidth: 1,
    borderColor: UI.border,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
    marginBottom: 10,
  },

  label: { fontWeight: "700", marginBottom: 6, color: "#0f172a" },
  smallLabel: { fontWeight: "600", marginBottom: 4, color: "#0f172a" },

  pickerWrap: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    padding: 10,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: "rgba(255,255,255,0.7)",
    color: "#0f172a",
  },

  subh: { fontWeight: "800", color: "#0f172a" },
  itemCard: {
    backgroundColor: UI.glass,
    borderRadius: UI.radius,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: UI.border,
  },
  twoCols: { flexDirection: "row", alignItems: "flex-start", marginTop: 6 },

  btn: { borderRadius: 12 },
  btnInner: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  btnText: { color: "#fff", fontWeight: "700" },

  ghostBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    marginTop: 8,
  },
  ghostText: { fontWeight: "700", color: "#0f172a" },

  footerBtns: { gap: 8, marginTop: 10 },
});
