import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  Platform,
  FlatList,
} from "react-native";
import axiosClient from "../../api/axiosClient";
import { FoodItem } from "../../types";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

export default function FoodItemsScreen() {
  if (Platform.OS !== "web") {
    return (
      <View style={styles.centerBlank}>
        <Text style={styles.blankTitle}>
          Màn hình Admin chỉ hỗ trợ trên Web
        </Text>
        <Text style={styles.blankSub}>
          Vui lòng dùng trình duyệt trên máy tính.
        </Text>
      </View>
    );
  }

  const [items, setItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  const [modal, setModal] = useState<{
    visible: boolean;
    data?: FoodItem | null;
  }>({
    visible: false,
    data: null,
  });

  const load = async () => {
    try {
      setLoading(true);
      const r = await axiosClient.get("/food-items");
      setItems(r.data || []);
    } catch (e: any) {
      Alert.alert("Lỗi", e?.response?.data?.message || "Không tải được");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const openAdd = () => setModal({ visible: true, data: null });
  const openEdit = (fi: FoodItem) => setModal({ visible: true, data: fi });

  const remove = (id?: string) => {
    if (!id) return;

    const doDelete = async () => {
      try {
        setLoading(true);
        await axiosClient.delete(`/food-items/${id}`);
        await load();
      } catch (e: any) {
        Alert.alert("Lỗi", e?.response?.data?.message || "Xóa thất bại");
      } finally {
        setLoading(false);
      }
    };

    if (Platform.OS === "web") {
      const canConfirm = typeof (globalThis as any).confirm === "function";
      if (!canConfirm) {
        void doDelete();
        return;
      }
      if ((globalThis as any).confirm("Xác nhận xoá thực phẩm này?")) {
        void doDelete();
      }
    } else {
      Alert.alert("Xác nhận", "Xóa thực phẩm này?", [
        { text: "Hủy", style: "cancel" },
        { text: "Xóa", style: "destructive", onPress: () => void doDelete() },
      ]);
    }
  };

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items;
    return items.filter((it) => {
      const name = it.name?.toLowerCase() || "";
      const cat = it.category?.toLowerCase() || "";
      const unit = it.unit?.toLowerCase() || "";
      return name.includes(qq) || cat.includes(qq) || unit.includes(qq);
    });
  }, [q, items]);

  const kcal = (it: FoodItem) => it?.nutrition?.calories ?? 0;

  const TableHeader = () => (
    <View style={[styles.tr, styles.trHead]}>
      <Text style={[styles.td, styles.th, { flex: 2 }]}>Tên</Text>
      <Text style={[styles.td, styles.th, { flex: 1.2 }]}>Nhóm</Text>
      <Text style={[styles.td, styles.th, { width: 90 }]}>Đơn vị</Text>
      <Text style={[styles.td, styles.th, { width: 150, textAlign: "right" }]}>
        Năng lượng
      </Text>
      <Text style={[styles.td, styles.th, { width: 120 }]}>Trạng thái</Text>
      <Text style={[styles.td, styles.th, { width: 130 }]}>Hành động</Text>
    </View>
  );

  const Row = ({ item }: { item: FoodItem }) => (
    <View style={styles.tr}>
      <Text
        style={[styles.td, { flex: 2, fontWeight: "700" }]}
        numberOfLines={1}
      >
        {item.name}
      </Text>
      <Text style={[styles.td, { flex: 1.2 }]} numberOfLines={1}>
        {item.category || "-"}
      </Text>
      <Text style={[styles.td, { width: 90 }]}>{item.unit || "-"}</Text>
      <Text style={[styles.td, { width: 150, textAlign: "right" }]}>
        {kcal(item)} kcal / 100{item.unit || "g"}
      </Text>

      <View style={[styles.cell, { width: 120 }]}>
        <View
          style={[
            styles.badge,
            { backgroundColor: item.isActive ? "#22c55e" : "#f43f5e" },
          ]}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>
            {item.isActive ? "Đang hoạt động" : "Ngưng"}
          </Text>
        </View>
      </View>

      <View style={[styles.cell, { width: 130 }]}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable style={styles.iconBtn} onPress={() => openEdit(item)}>
            <Ionicons name="create-outline" size={18} color="#0f172a" />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => remove(item._id)}>
            <Ionicons name="trash-outline" size={18} color="#b91c1c" />
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <LinearGradient
      colors={["#eef7ff", "#f8fffb"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Danh mục thực phẩm</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable onPress={load} style={styles.btnGhost}>
            <Ionicons name="refresh-outline" size={16} color="#111827" />
            <Text style={styles.btnGhostText}>Làm mới</Text>
          </Pressable>
        </View>
      </View>

      {/* Search + Add */}
      <View style={styles.searchRow}>
        <TextInput
          placeholder="Tìm theo tên / nhóm / đơn vị..."
          value={q}
          onChangeText={setQ}
          style={styles.input}
          placeholderTextColor="#64748b"
        />
        <Pressable onPress={openAdd} style={styles.btnPrimary}>
          <Ionicons name="add-outline" size={16} color="#fff" />
          <Text style={styles.btnPrimaryText}>Thêm thực phẩm</Text>
        </Pressable>
      </View>

      {/* Table */}
      <View style={{ flex: 1, padding: 16, paddingTop: 8 }}>
        <View style={styles.tableWrap}>
          <TableHeader />
          <FlatList
            data={filtered}
            keyExtractor={(i) => i._id || Math.random().toString()}
            renderItem={({ item }) => <Row item={item} />}
            refreshing={loading}
            onRefresh={load}
            ListEmptyComponent={
              <Text
                style={{ textAlign: "center", color: "#64748b", padding: 24 }}
              >
                Chưa có thực phẩm.
              </Text>
            }
          />
        </View>
      </View>

      {/* Modal */}
      <FoodItemModal
        visible={modal.visible}
        onClose={() => setModal({ visible: false })}
        initial={modal.data || undefined}
        onSaved={() => {
          setModal({ visible: false });
          load();
        }}
      />
    </LinearGradient>
  );
}

function FoodItemModal({
  visible,
  onClose,
  initial,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  initial?: FoodItem;
  onSaved: () => void;
}) {
  const BASE_NUTRITION = {
    calories: 0,
    protein: 0,
    fat: 0,
    carbohydrate: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
    calcium: 0,
    iron: 0,
    vitaminA: 0,
    vitaminC: 0,
    vitaminD: 0,
  };

  const [form, setForm] = useState<FoodItem>({
    name: "",
    category: "protein",
    unit: "g",
    nutrition: { ...BASE_NUTRITION },
    isVegetarian: false,
    isHalal: true,
    isActive: true,
  });

  useEffect(() => {
    if (!visible) return;
    if (initial?._id) {
      setForm({
        name: initial.name || "",
        category: initial.category || "protein",
        unit: initial.unit || "g",
        nutrition: { ...BASE_NUTRITION, ...(initial.nutrition || {}) },
        isVegetarian: !!initial.isVegetarian,
        isHalal: initial.isHalal !== false,
        isActive: initial.isActive !== false,
      } as FoodItem);
    } else {
      setForm({
        name: "",
        category: "protein",
        unit: "g",
        nutrition: { ...BASE_NUTRITION },
        isVegetarian: false,
        isHalal: true,
        isActive: true,
      });
    }
  }, [visible, initial?._id]);

  const num = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const submit = async () => {
    try {
      if (!form.name.trim()) return Alert.alert("Lỗi", "Nhập tên thực phẩm");

      const cleanedNutrition = Object.fromEntries(
        Object.entries(form.nutrition || {}).map(([k, v]) => [k, num(v as any)])
      );

      const payload: any = {
        name: form.name.trim(),
        category: (form.category || "").trim(),
        unit: (form.unit || "").trim(),
        nutrition: cleanedNutrition,
        isVegetarian: !!form.isVegetarian,
        isHalal: form.isHalal !== false,
        isActive: form.isActive !== false,
      };

      if (initial?._id) {
        await axiosClient.put(`/food-items/${initial._id}`, payload);
      } else {
        await axiosClient.post("/food-items", payload);
      }
      onSaved();
    } catch (e: any) {
      Alert.alert("Lỗi", e?.response?.data?.message || "Lưu thất bại");
    }
  };

  const nutritionKeys = [
    "calories",
    "protein",
    "fat",
    "carbohydrate",
    "fiber",
    "sugar",
    "sodium",
    "calcium",
    "iron",
    "vitaminA",
    "vitaminC",
    "vitaminD",
  ];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      transparent
    >
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalSheet, { maxWidth: 720 }]}>
          <Text style={styles.sheetTitle}>
            {initial?._id ? "Sửa thực phẩm" : "Thêm thực phẩm"}
          </Text>

          <ScrollView contentContainerStyle={{ paddingBottom: 10 }}>
            <View style={{ gap: 12 }}>
              {/* hàng 1 */}
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Tên</Text>
                  <TextInput
                    value={form.name}
                    onChangeText={(t) => setForm({ ...form, name: t })}
                    style={styles.input}
                    placeholderTextColor="#64748b"
                  />
                </View>
                <View style={{ width: 160 }}>
                  <Text style={styles.label}>Nhóm</Text>
                  <TextInput
                    value={form.category}
                    onChangeText={(t) => setForm({ ...form, category: t })}
                    style={styles.input}
                    placeholderTextColor="#64748b"
                  />
                </View>
                <View style={{ width: 120 }}>
                  <Text style={styles.label}>Đơn vị</Text>
                  <TextInput
                    value={form.unit}
                    onChangeText={(t) => setForm({ ...form, unit: t })}
                    style={styles.input}
                    placeholderTextColor="#64748b"
                  />
                </View>
              </View>

              {/* trạng thái */}
              <View
                style={{ flexDirection: "row", gap: 12, alignItems: "center" }}
              >
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: form.isActive ? "#22c55e" : "#f43f5e" },
                  ]}
                >
                  <Text style={{ color: "white", padding: 9 }}>
                    {form.isActive ? "Active" : "Inactive"}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setForm({ ...form, isActive: !form.isActive })}
                  style={styles.btnGhost}
                >
                  <Text style={styles.btnGhostText}>
                    {form.isActive ? "Khoá" : "Mở"}
                  </Text>
                </Pressable>
              </View>

              {/* tiêu đề dinh dưỡng */}
              <Text
                style={{
                  fontWeight: "800",
                  textAlign: "center",
                  marginTop: 6,
                }}
              >
                Thành phần dinh dưỡng / 100{form.unit || "g"}
              </Text>

              {/* lưới dinh dưỡng 2 cột */}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                {nutritionKeys.map((key) => (
                  <View
                    key={key}
                    style={{ width: "48%", minWidth: 220, flexGrow: 1 }}
                  >
                    <Text style={styles.label}>{key}</Text>
                    <TextInput
                      keyboardType="numeric"
                      value={String((form.nutrition as any)?.[key] ?? 0)}
                      onChangeText={(t) =>
                        setForm({
                          ...form,
                          nutrition: {
                            ...(form.nutrition || {}),
                            [key]: t,
                          } as any,
                        })
                      }
                      style={styles.input}
                      placeholderTextColor="#64748b"
                    />
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footerRow}>
            <Pressable onPress={onClose} style={styles.btnGhost}>
              <Ionicons name="close-outline" size={16} color="#111827" />
              <Text style={styles.btnGhostText}>Đóng</Text>
            </Pressable>
            <Pressable onPress={submit} style={styles.btnPrimary}>
              <Ionicons name="save-outline" size={16} color="#fff" />
              <Text style={styles.btnPrimaryText}>Lưu</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centerBlank: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  blankTitle: { fontWeight: "800", fontSize: 18, marginBottom: 8 },
  blankSub: { color: "#475569", textAlign: "center" },

  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#0b3d2e" },

  searchRow: {
    paddingHorizontal: 16,
    gap: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  tableWrap: {
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    overflow: "hidden",
  },

  tr: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  trHead: {
    backgroundColor: "rgba(59,130,246,0.08)",
  },

  td: {
    fontSize: 14,
    color: "#0f172a",
  },
  th: {
    fontWeight: "800",
  },

  cell: {
    justifyContent: "center",
  },

  iconBtn: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    ...(Platform.OS === "web" ? { cursor: "pointer" as const } : {}),
  },

  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    backgroundColor: "rgba(255,255,255,0.85)",
    padding: 10,
    borderRadius: 10,
  },
  label: { fontWeight: "700", marginBottom: 6, color: "#0f172a" },

  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: "flex-start",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalSheet: {
    width: "100%",
    maxWidth: 820,
    backgroundColor: "white",
    borderRadius: 14,
    padding: 16,
    maxHeight: "85%",
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
  },
  footerRow: {
    marginTop: 12,
    gap: 8,
    flexDirection: "row",
    justifyContent: "flex-end",
  },

  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#10b981",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    ...(Platform.OS === "web" ? { cursor: "pointer" as const } : {}),
  },
  btnPrimaryText: { color: "#fff", fontWeight: "800" },
  btnGhost: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f3f4f6",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    ...(Platform.OS === "web" ? { cursor: "pointer" as const } : {}),
  },
  btnGhostText: { color: "#111827", fontWeight: "800" },
});
