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
import { Picker } from "@react-native-picker/picker";
import { ClassEntity as ClassEntityBase, School, Teacher } from "../../types";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

type ClassEntity = ClassEntityBase & {
  studentCount?: number;
  assistantTeacherIds?: string[];
};

export default function ClassesScreen() {
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

  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);

  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<ClassEntity | null>(null);
  const [form, setForm] = useState<ClassEntity>({
    schoolId: "",
    name: "",
    teacherId: "",
    assistantTeacherIds: [],
    ageGroup: "",
    capacity: 30,
    academicYear: "",
    isActive: true,
  } as ClassEntity);

  const [q, setQ] = useState("");

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [clz, sch, tch] = await Promise.all([
        axiosClient.get("/classes"),
        axiosClient.get("/schools"),
        axiosClient.get("/teachers"),
      ]);
      setClasses(clz.data || []);
      setSchools(sch.data || []);
      setTeachers(tch.data || []);
    } catch (e: any) {
      Alert.alert(
        "Lỗi",
        e?.response?.data?.message || "Không tải được dữ liệu"
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchAll();
  }, []);

  const teacherMap = useMemo(() => {
    const m = new Map<string, Teacher>();
    teachers.forEach((t) => t._id && m.set(t._id, t));
    return m;
  }, [teachers]);

  const schoolMap = useMemo(() => {
    const m = new Map<string, School>();
    schools.forEach((s) => s._id && m.set(s._id, s));
    return m;
  }, [schools]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return classes;
    return classes.filter((c) => {
      const sName = schoolMap.get(c.schoolId)?.name?.toLowerCase() || "";
      const tName = teacherMap.get(c.teacherId)?.fullName?.toLowerCase() || "";
      const aNames = (c.assistantTeacherIds || [])
        .map((id) => teacherMap.get(id)?.fullName?.toLowerCase() || "")
        .join(" ");
      return (
        c.name?.toLowerCase().includes(qq) ||
        c.ageGroup?.toLowerCase().includes(qq) ||
        c.academicYear?.toLowerCase().includes(qq) ||
        sName.includes(qq) ||
        tName.includes(qq) ||
        aNames.includes(qq)
      );
    });
  }, [q, classes, schoolMap, teacherMap]);

  const eligibleTeachers = useMemo(
    () => teachers.filter((t) => t.role === "teacher"),
    [teachers]
  );

  const openAdd = () => {
    setEditing(null);
    setForm({
      schoolId: schools[0]?._id || "",
      name: "",
      teacherId: eligibleTeachers[0]?._id || "",
      assistantTeacherIds: [],
      ageGroup: "",
      capacity: 30,
      academicYear: "",
      isActive: true,
    } as ClassEntity);
    setVisible(true);
  };

  const openEdit = (c: ClassEntity) => {
    setEditing(c);
    setForm({
      _id: c._id,
      schoolId: c.schoolId,
      name: c.name,
      teacherId: c.teacherId,
      assistantTeacherIds: c.assistantTeacherIds || [],
      ageGroup: c.ageGroup || "",
      capacity: c.capacity ?? 30,
      academicYear: c.academicYear || "",
      isActive: c.isActive ?? true,
    } as ClassEntity);
    setVisible(true);
  };

  const submit = async () => {
    try {
      if (!form.schoolId) return Alert.alert("Lỗi", "Chọn trường");
      if (!form.name?.trim()) return Alert.alert("Lỗi", "Nhập tên lớp");
      if (!form.teacherId)
        return Alert.alert("Lỗi", "Chọn giáo viên chủ nhiệm");

      const assistants = (form.assistantTeacherIds || [])
        .filter(Boolean)
        .map(String)
        .filter((id) => id !== form.teacherId);

      const setA = new Set(assistants);
      if (setA.size !== assistants.length) {
        return Alert.alert("Lỗi", "2 giáo viên phụ trùng nhau");
      }

      const payload = {
        schoolId: form.schoolId,
        name: form.name.trim(),
        ageGroup: form.ageGroup?.trim() || undefined,
        teacherId: form.teacherId,
        assistantTeacherIds: assistants,
        capacity: Number(form.capacity) || 30,
        academicYear: form.academicYear?.trim() || undefined,
        isActive: !!form.isActive,
      };

      let res;
      if (editing && editing._id) {
        res = await axiosClient.put(`/classes/${editing._id}`, payload);
      } else {
        res = await axiosClient.post("/classes", payload);
      }

      setVisible(false);
      fetchAll();
    } catch (e: any) {
      Alert.alert("Lỗi", e?.response?.data?.message || "Lưu thất bại");
    }
  };

  const remove = (id?: string) => {
    if (!id) return;
    const doDelete = async () => {
      try {
        setLoading(true);
        await axiosClient.delete(`/classes/${id}`);
        await fetchAll();
      } catch (e: any) {
        Alert.alert("Lỗi", e?.response?.data?.message || "Xoá thất bại");
      } finally {
        setLoading(false);
      }
    };
    if (Platform.OS === "web") {
      const ok =
        typeof (globalThis as any).confirm === "function"
          ? (globalThis as any).confirm("Xác nhận xoá lớp này?")
          : true;
      if (ok) void doDelete();
    } else {
      Alert.alert("Xoá", "Xác nhận xoá lớp này?", [
        { text: "Hủy", style: "cancel" },
        { text: "Xoá", style: "destructive", onPress: () => void doDelete() },
      ]);
    }
  };

  const TableHeader = () => (
    <View style={[styles.tr, styles.trHead]}>
      <Text style={[styles.td, styles.th, { flex: 1.6 }]}>Tên lớp</Text>
      <Text style={[styles.td, styles.th, { flex: 1.6 }]}>Trường</Text>
      <Text style={[styles.td, styles.th, { flex: 1 }]}>Nhóm tuổi</Text>
      <Text style={[styles.td, styles.th, { flex: 1.4 }]}>GVCN</Text>
      <Text style={[styles.td, styles.th, { flex: 1.2 }]}>GV phụ</Text>
      <Text style={[styles.td, styles.th, { width: 110, textAlign: "center" }]}>
        Sĩ số
      </Text>
      <Text style={[styles.td, styles.th, { width: 120 }]}>Năm học</Text>
      <Text style={[styles.td, styles.th, { width: 120 }]}>Trạng thái</Text>
      <Text style={[styles.td, styles.th, { width: 130 }]}>Hành động</Text>
    </View>
  );

  const Row = ({ item }: { item: ClassEntity }) => {
    const t = teacherMap.get(item.teacherId);
    const assistantNames = (item.assistantTeacherIds || [])
      .map((id) => teacherMap.get(id)?.fullName)
      .filter(Boolean) as string[];
    const s = schoolMap.get(item.schoolId);
    return (
      <View style={styles.tr}>
        <Text style={[styles.td, { flex: 1.6, fontWeight: "700" }]}>
          {item.name}
          {item.academicYear ? ` (${item.academicYear})` : ""}
        </Text>
        <Text style={[styles.td, { flex: 1.6 }]} numberOfLines={1}>
          {s?.name || item.schoolId}
        </Text>
        <Text style={[styles.td, { flex: 1 }]}>{item.ageGroup || "-"}</Text>
        <Text style={[styles.td, { flex: 1.4 }]} numberOfLines={1}>
          {t?.fullName || item.teacherId}
        </Text>
        <Text style={[styles.td, { flex: 1.2 }]} numberOfLines={4}>
          {assistantNames.length ? assistantNames.join("\n") : "-"}
        </Text>
        <Text style={[styles.td, { width: 110, textAlign: "center" }]}>
          {item.studentCount ?? 0}/{item.capacity ?? 30}
        </Text>
        <Text style={[styles.td, { width: 120 }]}>
          {item.academicYear || "-"}
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
            <Pressable onPress={() => openEdit(item)} style={styles.iconBtn}>
              <Ionicons name="create-outline" size={18} color="#0f172a" />
            </Pressable>
            <Pressable onPress={() => remove(item._id)} style={styles.iconBtn}>
              <Ionicons name="trash-outline" size={18} color="#b91c1c" />
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={["#eef7ff", "#f8fffb"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Danh sách lớp</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable onPress={fetchAll} style={styles.btnGhost}>
            <Ionicons name="refresh-outline" size={16} color="#111827" />
            <Text style={styles.btnGhostText}>Làm mới</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          placeholder="Tìm theo tên lớp / trường / giáo viên / năm học..."
          value={q}
          onChangeText={setQ}
          style={styles.input}
          placeholderTextColor="#64748b"
        />
        <Pressable onPress={openAdd} style={styles.btnPrimary}>
          <Ionicons name="add-outline" size={16} color="#fff" />
          <Text style={styles.btnPrimaryText}>Thêm lớp</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1, padding: 16, paddingTop: 8 }}>
        <View style={styles.tableWrap}>
          <TableHeader />
          <FlatList
            data={filtered}
            keyExtractor={(i, idx) => i._id || `row-${idx}`}
            renderItem={({ item }) => <Row item={item} />}
            refreshing={loading}
            onRefresh={fetchAll}
            ListEmptyComponent={
              <Text
                style={{ textAlign: "center", color: "#64748b", padding: 24 }}
              >
                Chưa có lớp.
              </Text>
            }
          />
        </View>
      </View>

      <Modal
        visible={visible}
        animationType="fade"
        onRequestClose={() => setVisible(false)}
        transparent
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.sheetTitle}>
              {editing ? "Sửa lớp" : "Thêm lớp"}
            </Text>
            <ScrollView contentContainerStyle={{ paddingBottom: 10 }}>
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Trường</Text>
                    <View style={styles.pickerWrap}>
                      <Picker
                        selectedValue={form.schoolId}
                        onValueChange={(v) =>
                          setForm({ ...form, schoolId: String(v) })
                        }
                      >
                        {schools.map((s) => (
                          <Picker.Item
                            key={s._id}
                            label={s.name}
                            value={s._id}
                          />
                        ))}
                      </Picker>
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Tên lớp</Text>
                    <TextInput
                      placeholder="VD: Lớp Chồi A"
                      value={form.name}
                      onChangeText={(t) => setForm({ ...form, name: t })}
                      style={styles.input}
                      placeholderTextColor="#64748b"
                    />
                  </View>
                </View>

                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Nhóm tuổi</Text>
                    <TextInput
                      placeholder="VD: 3-4 tuổi"
                      value={form.ageGroup || ""}
                      onChangeText={(t) => setForm({ ...form, ageGroup: t })}
                      style={styles.input}
                      placeholderTextColor="#64748b"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Năm học</Text>
                    <TextInput
                      placeholder="VD: 2024-2025"
                      value={form.academicYear || ""}
                      onChangeText={(t) =>
                        setForm({ ...form, academicYear: t })
                      }
                      style={styles.input}
                      placeholderTextColor="#64748b"
                    />
                  </View>
                </View>

                <View style={{ flexDirection: "row", gap: 12 }}>
                  {/* GVCN */}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>GVCN</Text>
                    <View style={styles.pickerWrap}>
                      <Picker
                        selectedValue={form.teacherId}
                        onValueChange={(v) =>
                          setForm((prev) => ({
                            ...prev,
                            teacherId: String(v),

                            assistantTeacherIds: (
                              prev.assistantTeacherIds || []
                            ).filter((id) => id && id !== String(v)),
                          }))
                        }
                      >
                        {eligibleTeachers.map((t) => (
                          <Picker.Item
                            key={t._id}
                            label={`${t.fullName}`}
                            value={t._id}
                          />
                        ))}
                      </Picker>
                    </View>
                  </View>

                  {/* GV phụ */}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>GV phụ (tuỳ chọn)</Text>

                    {(form.assistantTeacherIds || []).map((val, idx) => {
                      const selectedSet = new Set(
                        (form.assistantTeacherIds || []).filter(
                          (_, i) => i !== idx
                        )
                      );
                      const filteredTeachers = eligibleTeachers.filter(
                        (t) =>
                          t._id !== form.teacherId &&
                          !selectedSet.has(t._id || "")
                      );

                      return (
                        <View key={idx} style={{ marginBottom: 6 }}>
                          <View style={styles.pickerWrap}>
                            <Picker
                              selectedValue={val || ""}
                              onValueChange={(v) => {
                                const arr = [
                                  ...(form.assistantTeacherIds || []),
                                ];
                                arr[idx] = String(v);
                                setForm({
                                  ...form,
                                  assistantTeacherIds: arr.filter(
                                    (id) => id && id !== form.teacherId
                                  ),
                                });
                              }}
                            >
                              <Picker.Item
                                label="-- Chọn --"
                                value=""
                                style={{ padding: 9 }}
                              />
                              {filteredTeachers.map((t) => (
                                <Picker.Item
                                  key={t._id}
                                  label={`${t.fullName}`}
                                  value={t._id}
                                />
                              ))}
                            </Picker>
                          </View>
                        </View>
                      );
                    })}

                    <Pressable
                      onPress={() =>
                        setForm({
                          ...form,
                          assistantTeacherIds: [
                            ...(form.assistantTeacherIds || []),
                            "",
                          ],
                        })
                      }
                      style={[
                        styles.btnGhost,
                        { alignSelf: "flex-start", marginTop: 4 },
                      ]}
                    >
                      <Ionicons name="add-outline" size={16} color="#111827" />
                      <Text style={styles.btnGhostText}>Thêm GV phụ</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Sức chứa tối đa</Text>
                    <TextInput
                      keyboardType="numeric"
                      value={String(form.capacity ?? 30)}
                      onChangeText={(t) =>
                        setForm({ ...form, capacity: Number(t) || 30 })
                      }
                      style={styles.input}
                      placeholderTextColor="#64748b"
                    />
                  </View>
                  <View style={{ flex: 1, justifyContent: "flex-end" }}>
                    <Text style={styles.label}>Trạng thái</Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <View
                        style={[
                          styles.badge,
                          {
                            backgroundColor: form.isActive
                              ? "#22c55e"
                              : "#f43f5e",
                          },
                        ]}
                      >
                        <Text style={{ color: "white", padding: 9 }}>
                          {form.isActive ? "Active" : "Inactive"}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() =>
                          setForm({ ...form, isActive: !form.isActive })
                        }
                        style={styles.btnGhost}
                      >
                        <Text style={styles.btnGhostText}>
                          {form.isActive ? "Khoá" : "Mở"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.footerRow}>
              <Pressable
                onPress={() => setVisible(false)}
                style={styles.btnGhost}
              >
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
    </LinearGradient>
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
  trHead: { backgroundColor: "rgba(16,185,129,0.08)" },

  td: { fontSize: 14, color: "#0f172a" },
  th: { fontWeight: "800" },
  cell: { justifyContent: "center" },

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
  pickerWrap: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.75)",
    marginBottom: 6,
    padding: 9,
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
});
