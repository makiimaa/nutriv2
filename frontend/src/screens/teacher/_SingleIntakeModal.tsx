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
import { FoodItem, Menu, School } from "../../types";

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
  disabled,
}: {
  title: string;
  icon?: any;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[st.btn, disabled && { opacity: 0.6 }]}
    >
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
function GhostBtn({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={st.ghostBtn}>
      <Text style={st.ghostText}>{title}</Text>
    </Pressable>
  );
}

function MealBlock({
  title,
  rows,
  foodItems,
  setRows,
}: {
  title: string;
  rows: any[];
  foodItems: FoodItem[];
  setRows: (rows: any[]) => void;
}) {
  const addRow = () =>
    setRows([
      ...(rows || []),
      {
        foodItemId: foodItems[0]?._id || "",
        plannedQuantity: 100,
        actualQuantity: 80,
      },
    ]);
  const updateRow = (idx: number, patch: any) =>
    setRows(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const removeRow = (idx: number) => setRows(rows.filter((_, i) => i !== idx));

  return (
    <View style={{ marginTop: 10 }}>
      <View style={st.blockHead}>
        <Text style={st.subh}>{title}</Text>
        <Pressable onPress={addRow} style={st.addIcon}>
          <Ionicons name="add" size={16} color="#0f172a" />
        </Pressable>
      </View>

      {(!rows || rows.length === 0) && (
        <Text style={{ color: "#64748b" }}>Chưa có món</Text>
      )}

      {rows.map((row, idx) => (
        <View key={idx} style={st.itemCard}>
          <Text style={st.smallLabel}>Món</Text>
          <View style={st.pickerWrap}>
            <Picker
              selectedValue={row.foodItemId}
              onValueChange={(v) => updateRow(idx, { foodItemId: String(v) })}
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
                  updateRow(idx, { plannedQuantity: parseFloat(t) || 0 })
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
                  updateRow(idx, { actualQuantity: parseFloat(t) || 0 })
                }
              />
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <GhostBtn title="Xoá món" onPress={() => removeRow(idx)} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function SingleIntakeModal({
  visible,
  onClose,
  onSaved,
  studentId,
  classId,
  date,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  studentId: string;
  classId: string;
  date: string;
}) {
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolId, setSchoolId] = useState<string>("");
  const [menus, setMenus] = useState<Menu[]>([]);
  const [menuId, setMenuId] = useState<string>("");

  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [bf, setBf] = useState<any[]>([]);
  const [lu, setLu] = useState<any[]>([]);
  const [sn, setSn] = useState<any[]>([]);
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    const boot = async () => {
      try {
        const [sch, fi] = await Promise.all([
          axiosClient.get("/schools"),
          axiosClient.get("/food-items"),
        ]);
        setSchools(sch.data || []);
        setFoodItems(fi.data || []);
        setSchoolId(sch.data?.[0]?._id || "");
      } catch (e: any) {
        Alert.alert(
          "Lỗi",
          e?.response?.data?.message || "Không tải được tham chiếu"
        );
      }
    };
    if (visible) {
      setNotes("");
      setMenus([]);
      setMenuId("");
      setBf([]);
      setLu([]);
      setSn([]);
      boot();
    }
  }, [visible]);

  const prefillFromMenu = (m: Menu) => {
    const pick = (arr: any[]) =>
      (arr || []).map((it: any) => ({
        foodItemId: it.foodItemId,
        plannedQuantity: it.quantity || 0,
        actualQuantity: it.quantity || 0,
      }));
    setBf(pick(m?.meals?.breakfast?.items || []));
    setLu(pick(m?.meals?.lunch?.items || []));
    setSn(pick(m?.meals?.snack?.items || []));
  };

  const loadMenus = async () => {
    try {
      if (!schoolId) return Alert.alert("Lỗi", "Chọn trường");
      const q = date ? `?from=${date}&to=${date}` : "";
      const r = await axiosClient.get(`/menus/school/${schoolId}${q}`);
      const list = r.data || [];
      setMenus(list);
      if (list[0]?._id) {
        setMenuId(list[0]._id);
        prefillFromMenu(list[0]);
      } else {
        setMenuId("");
        setBf([]);
        setLu([]);
        setSn([]);
      }
    } catch (e: any) {
      Alert.alert(
        "Lỗi",
        e?.response?.data?.message || "Không tải được thực đơn"
      );
    }
  };
  useEffect(() => {
    if (visible && schoolId) loadMenus();
  }, [visible, schoolId, date]);

  const submit = async () => {
    try {
      if (!studentId || !classId)
        return Alert.alert("Lỗi", "Thiếu studentId/classId");
      const body = {
        studentId,
        classId,
        date,
        notes,
        mealIntakes: {
          breakfast: { actualIntake: bf },
          lunch: { actualIntake: lu },
          snack: { actualIntake: sn },
        },
      };
      await axiosClient.post("/intake", body);
      Alert.alert("OK", "Đã tạo bản ghi");
      onSaved();
    } catch (e: any) {
      Alert.alert("Lỗi", e?.response?.data?.message || "Lưu thất bại");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <LinearGradient colors={["#eef7ff", "#f8fffb"]} style={{ flex: 1 }}>
        <StatusBar barStyle="dark-content" translucent />
        <SafeAreaView style={st.safe}>
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Brand/Header */}
            <View style={st.brand}>
              <Pressable onPress={onClose} style={st.closeBtn}>
                <Ionicons name="close" size={18} color="#0f172a" />
              </Pressable>
              <View style={st.logoWrap}>
                <LinearGradient
                  colors={["#d1fae5", "#93c5fd"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={st.logo}
                >
                  <Ionicons
                    name="person-add-outline"
                    size={20}
                    color="#0b3d2e"
                  />
                </LinearGradient>
              </View>
              <Text style={st.brandTitle}>Thêm bữa ăn cho học sinh</Text>
            </View>

            {/* Form */}
            <View style={st.card}>
              <Text style={st.label}>Trường</Text>
              <View style={st.pickerWrap}>
                <Picker
                  selectedValue={schoolId}
                  onValueChange={(v) => setSchoolId(String(v))}
                >
                  {schools.map((x) => (
                    <Picker.Item key={x._id} label={x.name} value={x._id} />
                  ))}
                </Picker>
              </View>

              <View style={st.inlineRow}>
                <PrimaryBtn
                  title="Tải thực đơn"
                  icon="cloud-download-outline"
                  onPress={loadMenus}
                  disabled={!schoolId}
                />
                <Text style={st.hint}>
                  {menus.length
                    ? `Có ${menus.length} thực đơn`
                    : "Không có thực đơn"}
                </Text>
              </View>

              {!!menus.length && (
                <>
                  <Text style={st.label}>Chọn thực đơn</Text>
                  <View style={st.pickerWrap}>
                    <Picker
                      selectedValue={menuId}
                      onValueChange={(v) => {
                        const id = String(v);
                        setMenuId(id);
                        const m = menus.find((x) => x._id === id);
                        if (m) prefillFromMenu(m);
                      }}
                    >
                      {menus.map((m) => (
                        <Picker.Item
                          key={m._id}
                          label={`${(m.date || "").slice(0, 10)} · ${
                            m.menuType
                          }`}
                          value={m._id}
                        />
                      ))}
                    </Picker>
                  </View>
                </>
              )}

              <Text style={st.label}>Ghi chú</Text>
              <TextInput
                style={st.input}
                placeholder="Ghi chú"
                placeholderTextColor="#94a3b8"
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            <MealBlock
              title="Bữa sáng"
              rows={bf}
              foodItems={foodItems}
              setRows={setBf}
            />
            <MealBlock
              title="Bữa trưa"
              rows={lu}
              foodItems={foodItems}
              setRows={setLu}
            />
            <MealBlock
              title="Bữa xế"
              rows={sn}
              foodItems={foodItems}
              setRows={setSn}
            />

            <View style={st.footerBtns}>
              <PrimaryBtn
                title="Lưu"
                icon="checkmark-circle-outline"
                onPress={submit}
              />
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
  hint: { marginLeft: 10, color: "#64748b", flex: 1 },

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

  blockHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  subh: { fontWeight: "800", color: "#0f172a" },
  addIcon: {
    backgroundColor: "rgba(16,185,129,0.12)",
    padding: 8,
    borderRadius: 10,
  },

  itemCard: {
    backgroundColor: UI.glass,
    borderRadius: UI.radius,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: UI.border,
  },
  twoCols: { flexDirection: "row", alignItems: "flex-start", marginTop: 6 },
  inlineRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },

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
