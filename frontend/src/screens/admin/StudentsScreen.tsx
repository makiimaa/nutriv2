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
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import type { Student, ClassEntity, School } from "../../types";

export default function AdminStudentsScreen() {
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

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);

  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState<
    Partial<Student> & {
      fullName?: string;
      dateOfBirth?: string;
      gender?: "male" | "female";
      schoolId?: string;
      classId?: string;
      isActive?: boolean;
      schoolProvidedId?: string;
    }
  >({
    fullName: "",
    dateOfBirth: "",
    gender: "male",
    schoolId: "",
    classId: "",
    isActive: true,
    schoolProvidedId: "",
  });

  const [q, setQ] = useState("");

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [stu, cls, sch] = await Promise.all([
        axiosClient.get("/students"),
        axiosClient.get("/classes"),
        axiosClient.get("/schools"),
      ]);
      setStudents(stu.data || []);
      setClasses(cls.data || []);
      setSchools(sch.data || []);
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

  const classMap = useMemo(() => {
    const m = new Map<string, ClassEntity>();
    classes.forEach((c) => c._id && m.set(c._id, c));
    return m;
  }, [classes]);

  const schoolMap = useMemo(() => {
    const m = new Map<string, School>();
    schools.forEach((s) => s._id && m.set(s._id, s));
    return m;
  }, [schools]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return students;
    return students.filter((s) => {
      const name = (s.fullName || (s as any).name || "").toLowerCase();
      const dob = (s.dateOfBirth || (s as any).dob || "")
        .slice(0, 10)
        .toLowerCase();
      const clz = s.classId
        ? classMap.get(s.classId)?.name?.toLowerCase() || ""
        : "";
      const sch = s.schoolId
        ? schoolMap.get(s.schoolId)?.name?.toLowerCase() || ""
        : "";
      const gender = (s.gender || "").toLowerCase();
      const mhs = (s.schoolProvidedId || "").toLowerCase();
      return (
        name.includes(qq) ||
        dob.includes(qq) ||
        clz.includes(qq) ||
        sch.includes(qq) ||
        gender.includes(qq) ||
        mhs.includes(qq)
      );
    });
  }, [q, students, classMap, schoolMap]);

  const openAdd = () => {
    setEditing(null);
    setForm({
      fullName: "",
      dateOfBirth: "",
      gender: "male",
      schoolId: schools[0]?._id || "",
      classId:
        classes.find((c) => !schools[0]?._id || c.schoolId === schools[0]?._id)
          ?._id || "",
      isActive: true,
      schoolProvidedId: "",
    });
    setVisible(true);
  };

  const openEdit = (s: Student) => {
    setEditing(s);
    setForm({
      _id: s._id,
      fullName: s.fullName || (s as any).name || "",
      dateOfBirth: (s.dateOfBirth || (s as any).dob || "").slice(0, 10),
      gender: (s.gender as any) || "male",
      schoolId: s.schoolId || "",
      classId: s.classId || "",
      isActive: (s as any).isActive ?? true,
      schoolProvidedId: s.schoolProvidedId || "",
    });
    setVisible(true);
  };

  const submit = async () => {
    try {
      if (!form.fullName?.trim()) return Alert.alert("Lỗi", "Nhập họ tên");
      if (!form.dateOfBirth?.trim())
        return Alert.alert("Lỗi", "Nhập ngày sinh (YYYY-MM-DD)");
      if (!form.classId) return Alert.alert("Lỗi", "Chọn lớp");
      if (!form.schoolId) return Alert.alert("Lỗi", "Chọn trường");
      if (!form.schoolProvidedId?.trim())
        return Alert.alert("Lỗi", "Nhập Mã học sinh (MHS)");

      const payload: any = {
        fullName: form.fullName.trim(),
        dateOfBirth: form.dateOfBirth.trim(),
        gender: form.gender || "male",
        classId: form.classId,
        schoolId: form.schoolId,
        isActive: form.isActive !== false,
        schoolProvidedId: form.schoolProvidedId.trim(),
      };

      if (editing && editing._id) {
        await axiosClient.put(`/students/${editing._id}`, payload);
      } else {
        await axiosClient.post(`/students`, payload);
      }

      setVisible(false);
      fetchAll();
    } catch (e: any) {
      Alert.alert("Lỗi", e?.response?.data?.message || "Lưu thất bại");
    }
  };

  const remove = async (id?: string) => {
    if (!id) return;

    const doDelete = async () => {
      try {
        setLoading(true);
        await axiosClient.delete(`/students/${id}`);
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
          ? (globalThis as any).confirm("Xác nhận xoá học sinh này?")
          : true;
      if (ok) await doDelete();
    } else {
      Alert.alert("Xoá", "Xác nhận xoá học sinh này?", [
        { text: "Hủy", style: "cancel" },
        { text: "Xoá", style: "destructive", onPress: () => void doDelete() },
      ]);
    }
  };

  const onChangeSchool = (schoolId: string) => {
    const firstInSchool =
      classes.find((c) => c.schoolId === schoolId)?._id || "";
    setForm((f) => ({ ...f, schoolId, classId: firstInSchool || "" }));
  };

  const classOptions = useMemo(() => {
    if (!form.schoolId) return classes;
    return classes.filter((c) => c.schoolId === form.schoolId);
  }, [classes, form.schoolId]);

  const TableHeader = () => (
    <View style={[styles.tr, styles.trHead]}>
      <Text style={[styles.td, styles.th, { flex: 1.6 }]}>Họ tên</Text>
      <Text style={[styles.td, styles.th, { width: 130 }]}>Ngày sinh</Text>
      <Text style={[styles.td, styles.th, { width: 160 }]}>MHS</Text>
      <Text style={[styles.td, styles.th, { width: 110 }]}>Giới tính</Text>
      <Text style={[styles.td, styles.th, { flex: 1.4 }]}>Lớp</Text>
      <Text style={[styles.td, styles.th, { flex: 1.6 }]}>Trường</Text>
      <Text style={[styles.td, styles.th, { width: 130 }]}>Hành động</Text>
    </View>
  );

  const Row = ({ item }: { item: Student }) => {
    const displayName = item.fullName || (item as any).name || "";
    const dob =
      (item.dateOfBirth || (item as any).dob || "").slice(0, 10) || "-";
    const clz = item.classId
      ? classMap.get(item.classId)?.name || item.classId
      : "-";
    const sch = item.schoolId
      ? schoolMap.get(item.schoolId)?.name || item.schoolId
      : "-";
    const mhs = item.schoolProvidedId || "-";
    return (
      <View style={styles.tr}>
        <Text
          style={[styles.td, { flex: 1.6, fontWeight: "700" }]}
          numberOfLines={1}
        >
          {displayName}
        </Text>
        <Text style={[styles.td, { width: 130 }]} numberOfLines={1}>
          {dob || "-"}
        </Text>
        <Text style={[styles.td, { width: 160 }]} numberOfLines={1}>
          {mhs}
        </Text>
        <View style={[styles.cell, { width: 110 }]}>
          <View
            style={[
              styles.badge,
              {
                backgroundColor:
                  item.gender === "female" ? "#f472b6" : "#38bdf8",
              },
            ]}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>
              {(item.gender || "male").toString().toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={[styles.td, { flex: 1.4 }]} numberOfLines={1}>
          {clz}
        </Text>
        <Text style={[styles.td, { flex: 1.6 }]} numberOfLines={1}>
          {sch}
        </Text>
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Danh sách học sinh</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable onPress={fetchAll} style={styles.btnGhost}>
            <Ionicons name="refresh-outline" size={16} color="#111827" />
            <Text style={styles.btnGhostText}>Làm mới</Text>
          </Pressable>
        </View>
      </View>

      {/* Search + Add */}
      <View style={styles.searchRow}>
        <TextInput
          placeholder="Tìm theo tên / ngày sinh / lớp / trường / giới tính…"
          value={q}
          onChangeText={setQ}
          style={styles.input}
          placeholderTextColor="#64748b"
        />
        <Pressable onPress={openAdd} style={styles.btnPrimary}>
          <Ionicons name="add-outline" size={16} color="#fff" />
          <Text style={styles.btnPrimaryText}>Thêm học sinh</Text>
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
            onRefresh={fetchAll}
            ListEmptyComponent={
              <Text
                style={{ textAlign: "center", color: "#64748b", padding: 24 }}
              >
                Chưa có học sinh.
              </Text>
            }
          />
        </View>
      </View>

      {/* Modal Add/Edit */}
      <Modal
        visible={visible}
        animationType="fade"
        onRequestClose={() => setVisible(false)}
        transparent
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.sheetTitle}>
              {editing ? "Sửa học sinh" : "Thêm học sinh"}
            </Text>
            <ScrollView contentContainerStyle={{ paddingBottom: 10 }}>
              <View style={{ gap: 12 }}>
                {/* Hàng 1 */}
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Họ tên</Text>
                    <TextInput
                      placeholder="VD: Nguyễn Văn A"
                      value={form.fullName || ""}
                      onChangeText={(t) => setForm({ ...form, fullName: t })}
                      style={styles.input}
                      placeholderTextColor="#64748b"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Ngày sinh (YYYY-MM-DD)</Text>
                    <TextInput
                      placeholder="YYYY-MM-DD"
                      value={form.dateOfBirth || ""}
                      onChangeText={(t) => setForm({ ...form, dateOfBirth: t })}
                      style={styles.input}
                      placeholderTextColor="#64748b"
                    />
                  </View>
                </View>

                <View>
                  <Text style={styles.label}>Mã học sinh (MHS)</Text>
                  <TextInput
                    placeholder="VD: HS-2025-000123"
                    value={form.schoolProvidedId || ""}
                    onChangeText={(t) =>
                      setForm({ ...form, schoolProvidedId: t })
                    }
                    style={styles.input}
                    placeholderTextColor="#64748b"
                    autoCapitalize="none"
                  />
                </View>

                {/* Hàng 2 */}
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Giới tính</Text>
                    <View style={styles.pickerWrap}>
                      <Picker
                        selectedValue={form.gender || "male"}
                        onValueChange={(v) =>
                          setForm({ ...form, gender: v as any })
                        }
                      >
                        <Picker.Item label="Nam" value="male" />
                        <Picker.Item label="Nữ" value="female" />
                      </Picker>
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Trường</Text>
                    <View style={styles.pickerWrap}>
                      <Picker
                        selectedValue={form.schoolId || ""}
                        onValueChange={(v) => onChangeSchool(String(v))}
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
                </View>

                {/* Hàng 3 */}
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Lớp</Text>
                    <View style={styles.pickerWrap}>
                      <Picker
                        selectedValue={form.classId || ""}
                        onValueChange={(v) =>
                          setForm({ ...form, classId: String(v) })
                        }
                      >
                        {classOptions.length === 0 && (
                          <Picker.Item label="(Chưa có lớp phù hợp)" value="" />
                        )}
                        {classOptions.map((c) => (
                          <Picker.Item
                            key={c._id}
                            label={c.name}
                            value={c._id}
                          />
                        ))}
                      </Picker>
                    </View>
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
    padding: 9,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.75)",
    marginBottom: 6,
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
