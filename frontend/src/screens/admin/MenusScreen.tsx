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
import {
  FoodItem,
  Menu,
  MenuMealItem,
  School,
  ClassEntity,
  Teacher,
} from "../../types";
import { Picker } from "@react-native-picker/picker";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

type MenuRow = Partial<Menu> & {
  _id?: string;
  classId?: any;
  schoolId?: any;
  groupName?: string;
  specialNotes?: string;
};

export default function MenusScreen() {
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

  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);

  const [selectedSchool, setSelectedSchool] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");

  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const [menus, setMenus] = useState<MenuRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [detail, setDetail] = useState<{
    visible: boolean;
    data?: MenuRow | null;
  }>({
    visible: false,
    data: null,
  });

  const loadRefs = async () => {
    try {
      const [sch, fi, tch, clz] = await Promise.all([
        axiosClient.get("/schools"),
        axiosClient.get("/food-items"),
        axiosClient.get("/teachers"),
        axiosClient.get("/classes"),
      ]);
      setSchools(sch.data || []);
      setFoodItems(fi.data || []);
      setTeachers(tch.data || []);
      setClasses(clz.data || []);
      if (sch.data?.[0]?._id) setSelectedSchool(String(sch.data[0]._id));
    } catch (e: any) {
      Alert.alert(
        "Lỗi",
        e?.response?.data?.message || "Không tải được tham chiếu"
      );
    }
  };

  const buildQuery = () => {
    if (!dateFrom && !dateTo) return "";
    const p = new URLSearchParams();
    if (dateFrom) p.set("from", dateFrom);
    if (dateTo) p.set("to", dateTo);
    return `?${p.toString()}`;
  };

  const loadMenus = async () => {
    if (!selectedSchool) return;
    try {
      setLoading(true);
      const query = buildQuery();

      let res: MenuRow[] = [];
      if (selectedClass) {
        const r = await axiosClient.get(
          `/menus/for-class/${selectedClass}${query}`
        );
        res = r.data || [];
      } else {
        const r = await axiosClient.get(
          `/menus/school/${selectedSchool}${query}`
        );
        res = r.data || [];
      }

      const schoolIdStr = String(selectedSchool || "");
      const classIdStr = String(selectedClass || "");

      let normalized = (res || []).map((m: any) => ({
        ...m,
        schoolId: m.schoolId,
        classId: m.classId,
      })) as MenuRow[];

      normalized = normalized.filter((m) => {
        const okSchool =
          !schoolIdStr || String(m.schoolId || "") === schoolIdStr;
        const okClass = !classIdStr || String(m.classId || "") === classIdStr;
        return okSchool && okClass;
      });

      normalized.sort((a, b) => {
        const da = new Date(String(a.date || 0)).getTime() || 0;
        const db = new Date(String(b.date || 0)).getTime() || 0;
        return da - db;
      });

      const seen = new Set<string>();
      const unique = normalized.filter((m) => {
        const key = String(m._id || `${String(m.date)}::${String(m.classId)}`);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setMenus(unique);
    } catch (e: any) {
      Alert.alert(
        "Lỗi",
        e?.response?.data?.message || "Không tải được thực đơn"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRefs();
  }, []);
  useEffect(() => {
    setSelectedClass("");
    loadMenus();
  }, [selectedSchool]);
  useEffect(() => {
    if (selectedSchool) loadMenus();
  }, [selectedClass]);

  const classMap = useMemo(() => {
    const m = new Map<string, ClassEntity>();
    classes.forEach((c) => c._id && m.set(String(c._id), c));
    return m;
  }, [classes]);

  const kcal = (m?: any) => m?.totalNutrition?.calories ?? 0;

  const TableHeader = () => (
    <View style={[styles.tr, styles.trHead]}>
      <Text style={[styles.td, styles.th, { width: 120 }]}>Ngày</Text>
      <Text style={[styles.td, styles.th, { flex: 1.6 }]}>Lớp</Text>
      <Text style={[styles.td, styles.th, { width: 120 }]}>Loại</Text>
      <Text style={[styles.td, styles.th, { flex: 1 }]}>Nhóm</Text>
      <Text style={[styles.td, styles.th, { width: 120, textAlign: "right" }]}>
        Sáng kcal
      </Text>
      <Text style={[styles.td, styles.th, { width: 120, textAlign: "right" }]}>
        Trưa kcal
      </Text>
      <Text style={[styles.td, styles.th, { width: 120, textAlign: "right" }]}>
        Xế kcal
      </Text>
      <Text style={[styles.td, styles.th, { width: 140, textAlign: "right" }]}>
        Tổng ngày
      </Text>
      <Text style={[styles.td, styles.th, { width: 150 }]}>Hành động</Text>
    </View>
  );

  const Row = ({ item }: { item: MenuRow }) => {
    const cls = classMap.get(String(item.classId || ""));
    return (
      <View style={styles.tr}>
        <Text style={[styles.td, { width: 120 }]}>
          {String(item.date || "").slice(0, 10)}
        </Text>
        <Text style={[styles.td, { flex: 1.6 }]} numberOfLines={1}>
          {cls?.name || String(item.classId || "")}
        </Text>
        <Text style={[styles.td, { width: 120 }]}>
          {item.menuType || "regular"}
        </Text>
        <Text style={[styles.td, { flex: 1 }]} numberOfLines={1}>
          {item.groupName || item.targetAgeGroup || "-"}
        </Text>
        <Text style={[styles.td, { width: 120, textAlign: "right" }]}>
          {kcal(item.meals?.breakfast)}
        </Text>
        <Text style={[styles.td, { width: 120, textAlign: "right" }]}>
          {kcal(item.meals?.lunch)}
        </Text>
        <Text style={[styles.td, { width: 120, textAlign: "right" }]}>
          {kcal(item.meals?.snack)}
        </Text>
        <Text
          style={[
            styles.td,
            { width: 140, textAlign: "right", fontWeight: "700" },
          ]}
        >
          {item.dailyTotalNutrition?.calories ?? 0}
        </Text>
        <View style={[styles.cell, { width: 150 }]}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              style={styles.iconBtn}
              onPress={() => setDetail({ visible: true, data: item })}
            >
              <Ionicons name="eye-outline" size={18} color="#0f172a" />
            </Pressable>
            <Pressable
              style={styles.iconBtn}
              onPress={() => setDetail({ visible: true, data: item })}
            >
              <Ionicons name="create-outline" size={18} color="#0f172a" />
            </Pressable>
            <Pressable
              style={styles.iconBtn}
              onPress={() => deleteMenu(item._id)}
            >
              <Ionicons name="trash-outline" size={18} color="#b91c1c" />
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  const deleteMenu = async (id?: string) => {
    if (!id) return;
    try {
      if (Platform.OS === "web") {
        const ok = (window as any).confirm?.("Xoá thực đơn này?");
        if (!ok) return;
        await axiosClient.delete(`/menus/${id}`);
        await loadMenus();
      } else {
        Alert.alert("Xác nhận", "Xoá thực đơn này?", [
          { text: "Hủy", style: "cancel" },
          {
            text: "Xoá",
            style: "destructive",
            onPress: async () => {
              try {
                await axiosClient.delete(`/menus/${id}`);
                await loadMenus();
              } catch (e: any) {
                Alert.alert(
                  "Lỗi",
                  e?.response?.data?.message || "Xóa thất bại"
                );
              }
            },
          },
        ]);
      }
    } catch (e: any) {
      Alert.alert("Lỗi", e?.response?.data?.message || "Xóa thất bại");
    }
  };

  return (
    <LinearGradient
      colors={["#eef7ff", "#f8fffb"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Thực đơn theo ngày</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable onPress={loadMenus} style={styles.btnGhost}>
            <Ionicons name="refresh-outline" size={16} color="#111827" />
            <Text style={styles.btnGhostText}>Làm mới</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.filterWrap}>
        <LinearGradient
          colors={["#ffffff", "#f8fafc"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.filterCard}
        >
          {/* Header nhỏ */}
          <View style={styles.filterHeader}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Ionicons name="options-outline" size={16} color="#0b3d2e" />
              <Text style={styles.filterTitle}>Bộ lọc</Text>
            </View>
          </View>

          {/* Hàng 1: Trường - Từ ngày - Lọc */}
          <View style={styles.filterRow}>
            <View style={styles.filterCol}>
              <Text style={styles.inlineLabel}>Trường</Text>
              <View style={styles.pickerWrap}>
                <Picker
                  selectedValue={selectedSchool}
                  onValueChange={(v) => setSelectedSchool(String(v))}
                >
                  {schools.map((s) => (
                    <Picker.Item
                      key={s._id}
                      label={s.name}
                      value={String(s._id)}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.filterCol}>
              <Text style={styles.inlineLabel}>Từ ngày</Text>
              <DateInput
                value={dateFrom}
                onChange={setDateFrom}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View style={styles.filterColAction}>
              <Pressable onPress={loadMenus} style={styles.btnPrimaryLg}>
                <Ionicons name="funnel-outline" size={16} color="#fff" />
                <Text style={styles.btnPrimaryText}>Lọc</Text>
              </Pressable>
            </View>
          </View>

          {/* Hàng 2: Lớp - Đến ngày - Thêm */}
          <View style={styles.filterRow}>
            <View style={styles.filterCol}>
              <Text style={styles.inlineLabel}>Lớp (tuỳ chọn)</Text>
              <View style={styles.pickerWrap}>
                <Picker
                  selectedValue={selectedClass}
                  onValueChange={(v) => setSelectedClass(String(v))}
                >
                  <Picker.Item label="-- Tất cả lớp --" value="" />
                  {classes
                    .filter(
                      (c) => String(c.schoolId) === String(selectedSchool)
                    )
                    .map((c) => (
                      <Picker.Item
                        key={c._id}
                        label={c.name}
                        value={String(c._id)}
                      />
                    ))}
                </Picker>
              </View>
            </View>

            <View style={styles.filterCol}>
              <Text style={styles.inlineLabel}>Đến ngày</Text>
              <DateInput
                value={dateTo}
                onChange={setDateTo}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View style={styles.filterColAction}>
              <Pressable
                onPress={() => setDetail({ visible: true, data: null })}
                style={styles.btnPrimaryLine}
              >
                <Ionicons name="add-outline" size={16} color="#10b981" />
                <Text style={styles.btnPrimaryLineText}>Thêm</Text>
              </Pressable>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Table */}
      <View style={{ flex: 1, padding: 16, paddingTop: 8 }}>
        <View style={styles.tableWrap}>
          <TableHeader />
          <FlatList
            data={menus}
            keyExtractor={(i) =>
              String(i._id || `${String(i.date)}::${String(i.classId)}`)
            }
            renderItem={({ item }) => <Row item={item} />}
            refreshing={loading}
            onRefresh={loadMenus}
            ListEmptyComponent={
              <Text
                style={{ textAlign: "center", color: "#64748b", padding: 24 }}
              >
                Chưa có thực đơn.
              </Text>
            }
          />
        </View>
      </View>

      {/* Modal create/view/edit */}
      <MenuFormModal
        visible={detail.visible}
        onClose={() => setDetail({ visible: false })}
        onSaved={() => {
          setDetail({ visible: false });
          loadMenus();
        }}
        foodItems={foodItems}
        classes={classes.filter(
          (c) => String(c.schoolId) === String(selectedSchool)
        )}
        schoolId={selectedSchool}
        initial={detail.data || undefined}
      />
    </LinearGradient>
  );
}

function DateInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  if (Platform.OS === "web") {
    return (
      <input
        type="date"
        value={value}
        onChange={(e: any) => onChange(e.target.value)}
        style={{
          width: "100%",
          border: "1px solid rgba(0,0,0,0.1)",
          background: "rgba(255,255,255,0.85)",
          padding: 10,
          borderRadius: 10,
          height: 40,
        }}
      />
    );
  }
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder || "YYYY-MM-DD"}
      style={styles.input}
      placeholderTextColor="#64748b"
    />
  );
}

function MenuFormModal({
  visible,
  onClose,
  onSaved,
  foodItems,
  classes,
  schoolId,
  initial,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  foodItems: FoodItem[];
  classes: ClassEntity[];
  schoolId: string;
  initial?: MenuRow;
}) {
  const [date, setDate] = useState("");
  const [menuType, setMenuType] = useState<
    "regular" | "vegetarian" | "allergy_free"
  >("regular");
  const [targetAgeGroup, setTargetAgeGroup] = useState("");
  const [groupName, setGroupName] = useState("");
  const [specialNotes, setSpecialNotes] = useState("");
  const [classId, setClassId] = useState<string>("");

  const [breakfast, setBreakfast] = useState<MenuMealItem[]>([]);
  const [lunch, setLunch] = useState<MenuMealItem[]>([]);
  const [snack, setSnack] = useState<MenuMealItem[]>([]);

  useEffect(() => {
    if (!visible) return;
    if (initial?._id) {
      setDate(String(initial.date || "").slice(0, 10));
      setMenuType((initial.menuType as any) || "regular");
      setTargetAgeGroup(initial.targetAgeGroup || "");
      setGroupName(initial?.groupName || "");
      setSpecialNotes(initial?.specialNotes || "");
      setClassId(String(initial?.classId || ""));
      setBreakfast(initial.meals?.breakfast?.items || []);
      setLunch(initial.meals?.lunch?.items || []);
      setSnack(initial.meals?.snack?.items || []);
    } else {
      setDate("");
      setMenuType("regular");
      setTargetAgeGroup("");
      setGroupName("");
      setSpecialNotes("");
      setClassId(classes[0]?._id ? String(classes[0]._id) : "");
      setBreakfast([]);
      setLunch([]);
      setSnack([]);
    }
  }, [visible]);

  const addRow = (
    setter: React.Dispatch<React.SetStateAction<MenuMealItem[]>>
  ) =>
    setter((prev) => [
      ...prev,
      { foodItemId: foodItems[0]?._id || "", quantity: 100 },
    ]);

  const updateRow = (
    setter: React.Dispatch<React.SetStateAction<MenuMealItem[]>>,
    idx: number,
    patch: Partial<MenuMealItem>
  ) => {
    setter((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, ...patch } : it))
    );
  };

  const removeRow = (
    setter: React.Dispatch<React.SetStateAction<MenuMealItem[]>>,
    idx: number
  ) => {
    setter((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    try {
      if (!schoolId) return Alert.alert("Lỗi", "Chọn trường");
      if (!classId) return Alert.alert("Lỗi", "Chọn lớp");
      if (!date.match(/^\d{4}-\d{2}-\d{2}$/))
        return Alert.alert("Lỗi", "Chọn ngày hợp lệ");

      const body: Partial<Menu> = {
        schoolId,
        classId,
        date,
        menuType,
        targetAgeGroup,
        specialNotes,
        groupName,
        meals: {
          breakfast: { items: breakfast },
          lunch: { items: lunch },
          snack: { items: snack },
        },
      };

      if (initial?._id) await axiosClient.put(`/menus/${initial._id}`, body);
      else await axiosClient.post("/menus", body);

      onSaved();
    } catch (e: any) {
      Alert.alert("Lỗi", e?.response?.data?.message || "Lưu thất bại");
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      transparent
    >
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalSheet, { maxWidth: 900 }]}>
          <Text style={styles.sheetTitle}>
            {initial?._id ? "Xem / Sửa thực đơn" : "Tạo thực đơn"}
          </Text>

          <ScrollView contentContainerStyle={{ paddingBottom: 10 }}>
            <View style={{ gap: 12 }}>
              {/* Hàng 1 */}
              <View
                style={{
                  flexDirection: "row",
                  gap: 12,
                  alignItems: "flex-end",
                  flexWrap: "wrap",
                }}
              >
                <View style={{ width: 180 }}>
                  <Text style={styles.label}>Ngày áp dụng</Text>
                  <DatePicker value={date} onChange={setDate} />
                </View>

                <View style={{ flex: 1, minWidth: 220 }}>
                  <Text style={styles.label}>Lớp</Text>
                  <View style={styles.pickerWrap}>
                    <Picker
                      selectedValue={classId}
                      onValueChange={(v) => setClassId(String(v))}
                    >
                      {classes.map((c) => (
                        <Picker.Item
                          key={c._id}
                          label={c.name}
                          value={String(c._id)}
                        />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={{ width: 200 }}>
                  <Text style={styles.label}>Loại</Text>
                  <View style={styles.pickerWrap}>
                    <Picker
                      selectedValue={menuType}
                      onValueChange={(v) => setMenuType(v as any)}
                    >
                      <Picker.Item label="regular" value="regular" />
                      <Picker.Item label="vegetarian" value="vegetarian" />
                      <Picker.Item label="allergy_free" value="allergy_free" />
                    </Picker>
                  </View>
                </View>
              </View>

              {/* Hàng 2 */}
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Nhóm tuổi (vd 3-4)</Text>
                  <TextInput
                    value={targetAgeGroup}
                    onChangeText={setTargetAgeGroup}
                    placeholder="3-4"
                    style={styles.input}
                    placeholderTextColor="#64748b"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Tên nhóm (groupName)</Text>
                  <TextInput
                    value={groupName}
                    onChangeText={setGroupName}
                    placeholder="nhóm A, nhóm dị ứng sữa..."
                    style={styles.input}
                    placeholderTextColor="#64748b"
                  />
                </View>
              </View>

              <View>
                <Text style={styles.label}>Ghi chú đặc biệt</Text>
                <TextInput
                  value={specialNotes}
                  onChangeText={setSpecialNotes}
                  placeholder="Ghi chú"
                  style={styles.input}
                  placeholderTextColor="#64748b"
                />
              </View>

              {/* Khối bữa ăn */}
              <MealBlock
                title="Bữa sáng"
                rows={breakfast}
                setRows={setBreakfast}
                foodItems={foodItems}
                addRow={() => addRow(setBreakfast)}
                updateRow={(i, p) => updateRow(setBreakfast, i, p)}
                removeRow={(i) => removeRow(setBreakfast, i)}
              />
              <MealBlock
                title="Bữa trưa"
                rows={lunch}
                setRows={setLunch}
                foodItems={foodItems}
                addRow={() => addRow(setLunch)}
                updateRow={(i, p) => updateRow(setLunch, i, p)}
                removeRow={(i) => removeRow(setLunch, i)}
              />
              <MealBlock
                title="Bữa xế"
                rows={snack}
                setRows={setSnack}
                foodItems={foodItems}
                addRow={() => addRow(setSnack)}
                updateRow={(i, p) => updateRow(setSnack, i, p)}
                removeRow={(i) => removeRow(setSnack, i)}
              />
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

function DatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  if (Platform.OS === "web") {
    return (
      <input
        type="date"
        value={value}
        onChange={(e: any) => onChange(e.target.value)}
        style={{
          width: "100%",
          border: "1px solid rgba(0,0,0,0.1)",
          background: "rgba(255,255,255,0.85)",
          padding: 10,
          borderRadius: 10,
          height: 40,
        }}
      />
    );
  }
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder="YYYY-MM-DD"
      style={styles.input}
      placeholderTextColor="#64748b"
    />
  );
}

function MealBlock({
  title,
  rows,
  setRows,
  foodItems,
  addRow,
  updateRow,
  removeRow,
}: {
  title: string;
  rows: MenuMealItem[];
  setRows: React.Dispatch<React.SetStateAction<MenuMealItem[]>>;
  foodItems: FoodItem[];
  addRow: () => void;
  updateRow: (i: number, p: Partial<MenuMealItem>) => void;
  removeRow: (i: number) => void;
}) {
  return (
    <View style={styles.block}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={styles.subh}>{title}</Text>
        <Pressable onPress={addRow} style={styles.plus}>
          <Text>＋</Text>
        </Pressable>
      </View>
      {rows.length === 0 && <Text style={{ color: "#666" }}>Chưa có món</Text>}
      {rows.map((row, idx) => (
        <View key={idx} style={styles.mealCard}>
          <Text style={styles.label}>Món</Text>
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={row.foodItemId}
              onValueChange={(v) => updateRow(idx, { foodItemId: String(v) })}
            >
              {foodItems.map((fi) => (
                <Picker.Item
                  key={fi._id}
                  label={`${fi.name} (${fi.unit})`}
                  value={String(fi._id)}
                />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Khối lượng (theo đơn vị món)</Text>
          <TextInput
            keyboardType="numeric"
            placeholder="VD: 120"
            value={String(row.quantity ?? "")}
            onChangeText={(t) =>
              updateRow(idx, { quantity: parseFloat(t) || 0 })
            }
            style={styles.input}
            placeholderTextColor="#64748b"
          />

          <Text style={styles.label}>Cách chế biến</Text>
          <TextInput
            placeholder="Hấp/luộc/xào..."
            value={row.preparationMethod || ""}
            onChangeText={(t) => updateRow(idx, { preparationMethod: t })}
            style={styles.input}
            placeholderTextColor="#64748b"
          />

          <View style={{ alignItems: "flex-end" }}>
            <Pressable
              onPress={() => removeRow(idx)}
              style={[styles.iconBtn, { backgroundColor: "#fde6e6" }]}
            >
              <Ionicons name="trash-outline" size={18} color="#b91c1c" />
            </Pressable>
          </View>
        </View>
      ))}
    </View>
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
  trHead: { backgroundColor: "rgba(99,102,241,0.08)" },

  td: { fontSize: 14, color: "#0f172a" },
  th: { fontWeight: "800" },
  cell: { justifyContent: "center" },

  pickerWrap: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 10,
    marginBottom: 6,
  },

  input: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    backgroundColor: "rgba(255,255,255,0.85)",
    padding: 10,
    borderRadius: 10,
  },
  label: { fontWeight: "700", marginBottom: 6, color: "#0f172a" },

  plus: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#eef",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    ...(Platform.OS === "web" ? { cursor: "pointer" as const } : {}),
  },
  block: { marginTop: 8, marginBottom: 12 },
  subh: { fontWeight: "800", marginTop: 8, marginBottom: 6, color: "#0f172a" },

  mealCard: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
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

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalSheet: {
    width: "100%",
    backgroundColor: "white",
    borderRadius: 14,
    padding: 16,
    maxHeight: "90%",
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

  filterWrap: {
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  filterCard: {
    width: "100%",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(2,6,23,0.06)",
    shadowColor: "#0b3d2e",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    ...(Platform.OS === "web" ? ({ backdropFilter: "blur(6px)" } as any) : {}),
  },
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(2,6,23,0.06)",
    marginBottom: 10,
  },
  filterTitle: { fontSize: 14, fontWeight: "800", color: "#0b3d2e" },

  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  filterCol: {
    flex: 0.5,
    width: 300,
  },
  filterColAction: {
    width: 320,
    alignItems: "flex-end",
    paddingTop: 18,
  },

  inlineLabel: { fontWeight: "700", marginBottom: 6, color: "#0f172a" },

  btnGhostSm: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f3f4f6",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as const) : {}),
  },
  btnGhostSmText: { color: "#111827", fontWeight: "800", fontSize: 13 },

  btnPrimaryLg: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#10b981",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as const) : {}),
  },

  btnPrimaryLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "transparent",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#10b981",
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as const) : {}),
  },
  btnPrimaryLineText: { color: "#10b981", fontWeight: "800" },
});
