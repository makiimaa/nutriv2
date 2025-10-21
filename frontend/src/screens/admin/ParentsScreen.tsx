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
import type { PressableProps } from "react-native";
import axiosClient from "../../api/axiosClient";
import { Picker } from "@react-native-picker/picker";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

/** ===== Types (không còn isActive) ===== */
type Parent = {
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  studentIds: string[];
};

type Student = {
  _id?: string;
  fullName?: string;
  name?: string;
  classId?: string;
};

type School = { _id?: string; name: string };
type Clazz = { _id?: string; name: string; schoolId: string };

export default function ParentsScreen() {
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

  /** ===== State ===== */
  const [rows, setRows] = useState<Parent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<Clazz[]>([]);
  const [loading, setLoading] = useState(false);

  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<Parent | null>(null);
  const [pwd, setPwd] = useState("");
  const [q, setQ] = useState("");

  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");

  /** ===== a11y helpers (web: Enter/Space kích hoạt) ===== */
  const withA11y = (handler: () => void): Partial<PressableProps> => ({
    accessibilityRole: "button",
    focusable: true,
    accessibilityActions: [{ name: "activate" }],
    onAccessibilityAction: (e) => {
      if (e.nativeEvent.actionName === "activate") handler();
    },
  });

  /** ===== Fetch ===== */
  const fetchAll = async () => {
    try {
      setLoading(true);
      const [p, s, sch, clz] = await Promise.all([
        axiosClient.get("/parents"),
        axiosClient.get("/students"),
        axiosClient.get("/schools"),
        axiosClient.get("/classes"),
      ]);
      setRows(p.data || []);
      setStudents(s.data || []);
      setSchools(sch.data || []);
      setClasses(clz.data || []);
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

  /** ===== Maps / Helpers ===== */
  const classMap = useMemo(() => {
    const m = new Map<string, Clazz>();
    classes.forEach((c) => c._id && m.set(c._id, c));
    return m;
  }, [classes]);

  const studentNameMap = useMemo(() => {
    const m = new Map<string, string>();
    students.forEach((s) => {
      if (s._id) m.set(s._id, s.fullName || s.name || s._id);
    });
    return m;
  }, [students]);

  /** ===== Filter bảng danh sách ===== */
  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return rows;
    return rows.filter((r) => {
      const stuNames = (r.studentIds || [])
        .map((id) => studentNameMap.get(id) || "")
        .join(" ");
      return (
        r.name?.toLowerCase().includes(qq) ||
        r.email?.toLowerCase().includes(qq) ||
        (r.phone || "").toLowerCase().includes(qq) ||
        (stuNames || "").toLowerCase().includes(qq)
      );
    });
  }, [q, rows, studentNameMap]);

  /** ===== Options cho form (lọc theo Trường/Lớp) ===== */
  const classesBySchool = useMemo(() => {
    return classes.filter(
      (c) => !selectedSchoolId || c.schoolId === selectedSchoolId
    );
  }, [classes, selectedSchoolId]);

  const studentsByFilter = useMemo(() => {
    if (selectedClassId) {
      return students.filter((s) => s.classId === selectedClassId);
    }
    if (selectedSchoolId) {
      const classIds = new Set(
        classes.filter((c) => c.schoolId === selectedSchoolId).map((c) => c._id)
      );
      return students.filter((s) => s.classId && classIds.has(s.classId));
    }
    return students;
  }, [students, selectedClassId, selectedSchoolId, classes]);

  /** ===== Open Modals ===== */
  const openAdd = () => {
    const schoolId = schools[0]?._id || "";
    const firstClasses = classes.filter(
      (c) => !schoolId || c.schoolId === schoolId
    );
    const classId = firstClasses[0]?._id || "";

    setSelectedSchoolId(schoolId);
    setSelectedClassId(classId);

    setEditing({
      name: "",
      email: "",
      phone: "",
      studentIds: [],
    });
    setPwd("");
    setVisible(true);
  };

  const openEdit = (p: Parent) => {
    let schoolId = "";
    let classId = "";
    const firstStuId = (p.studentIds || [])[0];
    if (firstStuId) {
      const stu = students.find((s) => s._id === firstStuId);
      if (stu?.classId) {
        classId = stu.classId;
        const clz = classMap.get(classId);
        if (clz?.schoolId) schoolId = clz.schoolId;
      }
    }
    if (!schoolId) schoolId = schools[0]?._id || "";
    if (!classId) {
      const firstCls = classes.find((c) => c.schoolId === schoolId);
      classId = firstCls?._id || "";
    }

    setSelectedSchoolId(schoolId);
    setSelectedClassId(classId);

    setEditing({
      ...p,
      studentIds: Array.isArray(p.studentIds) ? p.studentIds : [],
    });
    setPwd("");
    setVisible(true);
  };

  /** ===== Submit (không gửi isActive) ===== */
  const submit = async () => {
    try {
      if (!editing) return;

      const alertWeb = (msg: string) =>
        Platform.OS === "web"
          ? (globalThis as any).alert?.(msg)
          : Alert.alert("Lỗi", msg);

      if (!editing.name?.trim()) return alertWeb("Nhập tên phụ huynh");
      if (!editing.email?.trim()) return alertWeb("Nhập email");

      const kids = Array.from(
        new Set((editing.studentIds || []).filter(Boolean))
      );
      if (kids.length === 0) return alertWeb("Chọn ít nhất một học sinh");

      if (editing._id) {
        const patch: any = {
          name: editing.name.trim(),
          email: editing.email.trim().toLowerCase(),
          phone: editing.phone || undefined,
          studentIds: kids,
        };
        if (pwd) patch.password = pwd;
        await axiosClient.put(`/parents/${editing._id}`, patch);
      } else {
        await axiosClient.post("/parents", {
          name: editing.name.trim(),
          email: editing.email.trim().toLowerCase(),
          phone: editing.phone || undefined,
          studentIds: kids,
          password: pwd || "123456",
        });
      }

      setVisible(false);
      await fetchAll();
    } catch (e: any) {
      if (Platform.OS === "web") {
        (globalThis as any).alert?.(
          e?.response?.data?.message || "Lưu thất bại"
        );
      } else {
        Alert.alert("Lỗi", e?.response?.data?.message || "Lưu thất bại");
      }
    }
  };

  /** ===== Delete (confirm web) ===== */
  const remove = async (id?: string) => {
    if (!id) return;

    const doDelete = async () => {
      try {
        setLoading(true);
        await axiosClient.delete(`/parents/${id}`);
        await fetchAll();
      } catch (e: any) {
        if (Platform.OS === "web") {
          (globalThis as any).alert?.(
            e?.response?.data?.message || "Xoá thất bại"
          );
        } else {
          Alert.alert("Lỗi", e?.response?.data?.message || "Xoá thất bại");
        }
      } finally {
        setLoading(false);
      }
    };

    if (Platform.OS === "web") {
      const ok =
        typeof (globalThis as any).confirm === "function"
          ? (globalThis as any).confirm("Xác nhận xoá phụ huynh này?")
          : true;
      if (ok) await doDelete();
    } else {
      Alert.alert("Xoá", "Xác nhận xoá phụ huynh này?", [
        { text: "Hủy", style: "cancel" },
        { text: "Xoá", style: "destructive", onPress: () => void doDelete() },
      ]);
    }
  };

  /** ===== Table ===== */
  const TableHeader = () => (
    <View style={[styles.tr, styles.trHead]}>
      <Text style={[styles.td, styles.th, { flex: 1.6 }]}>Tên</Text>
      <Text style={[styles.td, styles.th, { flex: 1.8 }]}>Email</Text>
      <Text style={[styles.td, styles.th, { flex: 1.2 }]}>Điện thoại</Text>
      <Text style={[styles.td, styles.th, { flex: 1.8 }]}>Học sinh</Text>
      <Text style={[styles.td, styles.th, { width: 130 }]}>Hành động</Text>
    </View>
  );

  const Row = ({ item }: { item: Parent }) => {
    const childNames = (item.studentIds || [])
      .map((id) => studentNameMap.get(id))
      .filter(Boolean)
      .join("\n");
    return (
      <View style={styles.tr}>
        <Text
          style={[styles.td, { flex: 1.6, fontWeight: "700" }]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <Text style={[styles.td, { flex: 1.8 }]} numberOfLines={1}>
          {item.email}
        </Text>
        <Text style={[styles.td, { flex: 1.2 }]} numberOfLines={1}>
          {item.phone || "-"}
        </Text>
        <Text style={[styles.td, { flex: 1.8 }]} numberOfLines={4}>
          {childNames || "-"}
        </Text>
        <View style={[styles.cell, { width: 130 }]}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              {...withA11y(() => openEdit(item))}
              onPress={() => openEdit(item)}
              style={styles.iconBtn}
            >
              <Ionicons name="create-outline" size={18} color="#0f172a" />
            </Pressable>
            <Pressable
              {...withA11y(() => remove(item._id))}
              onPress={() => remove(item._id)}
              style={styles.iconBtn}
            >
              <Ionicons name="trash-outline" size={18} color="#b91c1c" />
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  /** ===== UI ===== */
  return (
    <LinearGradient
      colors={["#eef7ff", "#f8fffb"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quản lý phụ huynh</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            {...withA11y(fetchAll)}
            onPress={fetchAll}
            style={styles.btnGhost}
          >
            <Ionicons name="refresh-outline" size={16} color="#111827" />
            <Text style={styles.btnGhostText}>Làm mới</Text>
          </Pressable>
        </View>
      </View>

      {/* Search + Add */}
      <View style={styles.searchRow}>
        <TextInput
          placeholder="Tìm theo tên / email / SĐT / tên học sinh…"
          value={q}
          onChangeText={setQ}
          style={styles.input}
          placeholderTextColor="#64748b"
        />
        <Pressable
          {...withA11y(openAdd)}
          onPress={openAdd}
          style={styles.btnPrimary}
        >
          <Ionicons name="add-outline" size={16} color="#fff" />
          <Text style={styles.btnPrimaryText}>Thêm phụ huynh</Text>
        </Pressable>
      </View>

      {/* Table */}
      <View style={{ flex: 1, padding: 16, paddingTop: 8 }}>
        <View style={styles.tableWrap}>
          <TableHeader />
          <FlatList
            data={filtered}
            keyExtractor={(i, idx) => i._id ?? String(idx)}
            renderItem={({ item }) => <Row item={item} />}
            refreshing={loading}
            onRefresh={fetchAll}
            ListEmptyComponent={
              <Text
                style={{ textAlign: "center", color: "#64748b", padding: 24 }}
              >
                Chưa có phụ huynh.
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
              {editing?._id ? "Sửa phụ huynh" : "Thêm phụ huynh"}
            </Text>
            <ScrollView contentContainerStyle={{ paddingBottom: 10 }}>
              <View style={{ gap: 12 }}>
                {/* Hàng 0: Trường - Lớp (áp dụng lọc) */}
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Trường</Text>
                    <View style={styles.pickerWrap}>
                      <Picker
                        selectedValue={selectedSchoolId}
                        onValueChange={(v) => {
                          const sid = String(v);
                          setSelectedSchoolId(sid);
                          const firstCls = classes.find(
                            (c) => c.schoolId === sid
                          );
                          const cid = firstCls?._id || "";
                          setSelectedClassId(cid);
                          setEditing((p) =>
                            p
                              ? {
                                  ...p,
                                  studentIds: (p.studentIds || []).map(
                                    () => ""
                                  ),
                                }
                              : p
                          );
                        }}
                      >
                        {schools.length === 0 && (
                          <Picker.Item label="(Chưa có trường)" value="" />
                        )}
                        {schools.map((s) => (
                          <Picker.Item
                            key={s._id}
                            label={s.name}
                            value={s._id || ""}
                          />
                        ))}
                      </Picker>
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Lớp</Text>
                    <View style={styles.pickerWrap}>
                      <Picker
                        selectedValue={selectedClassId}
                        onValueChange={(v) => {
                          const cid = String(v);
                          setSelectedClassId(cid);
                          setEditing((p) =>
                            p
                              ? {
                                  ...p,
                                  studentIds: (p.studentIds || []).map(
                                    () => ""
                                  ),
                                }
                              : p
                          );
                        }}
                      >
                        {classesBySchool.length === 0 && (
                          <Picker.Item label="(Chưa có lớp)" value="" />
                        )}
                        {classesBySchool.map((c) => (
                          <Picker.Item
                            key={c._id}
                            label={c.name}
                            value={c._id || ""}
                          />
                        ))}
                      </Picker>
                    </View>
                  </View>
                </View>

                {/* Hàng 1: Tên - Email */}
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Tên</Text>
                    <TextInput
                      value={editing?.name || ""}
                      onChangeText={(t) =>
                        setEditing((p) => (p ? { ...p, name: t } : p))
                      }
                      style={styles.input}
                      placeholder="VD: Phạm Thị B"
                      placeholderTextColor="#64748b"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                      value={editing?.email || ""}
                      onChangeText={(t) =>
                        setEditing((p) => (p ? { ...p, email: t } : p))
                      }
                      style={styles.input}
                      autoCapitalize="none"
                      placeholder="email@domain.com"
                      placeholderTextColor="#64748b"
                    />
                  </View>
                </View>

                {/* Hàng 2: Điện thoại */}
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Điện thoại</Text>
                    <TextInput
                      value={editing?.phone || ""}
                      onChangeText={(t) =>
                        setEditing((p) => (p ? { ...p, phone: t } : p))
                      }
                      style={styles.input}
                      placeholder="VD: 09xxxxxxxx"
                      placeholderTextColor="#64748b"
                      keyboardType="phone-pad"
                    />
                  </View>
                  <View style={{ flex: 1 }} />
                </View>

                {/* Hàng 3: Danh sách con (nhiều pickers) */}
                <View style={{ gap: 8 }}>
                  <Text style={styles.label}>Học sinh (có thể chọn nhiều)</Text>

                  {(editing?.studentIds || []).map((val, idx) => {
                    const selectedSet = new Set(
                      (editing?.studentIds || []).filter((_, i) => i !== idx)
                    );
                    const filteredStudents = studentsByFilter.filter(
                      (s) => s._id && !selectedSet.has(s._id)
                    );

                    return (
                      <View
                        key={`kid-${idx}`}
                        style={{
                          flexDirection: "row",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <View style={[styles.pickerWrap, { flex: 1 }]}>
                          <Picker
                            selectedValue={val || ""}
                            onValueChange={(v) => {
                              const arr = [...(editing?.studentIds || [])];
                              arr[idx] = String(v);
                              setEditing((p) =>
                                p ? { ...p, studentIds: arr } : p
                              );
                            }}
                          >
                            <Picker.Item label="-- Chọn học sinh --" value="" />
                            {filteredStudents.map((s) => (
                              <Picker.Item
                                key={s._id}
                                label={s.fullName || s.name || s._id || ""}
                                value={s._id || ""}
                              />
                            ))}
                          </Picker>
                        </View>
                        <Pressable
                          {...withA11y(() => {
                            const arr = [...(editing?.studentIds || [])];
                            arr.splice(idx, 1);
                            setEditing((p) =>
                              p ? { ...p, studentIds: arr } : p
                            );
                          })}
                          onPress={() => {
                            const arr = [...(editing?.studentIds || [])];
                            arr.splice(idx, 1);
                            setEditing((p) =>
                              p ? { ...p, studentIds: arr } : p
                            );
                          }}
                          style={styles.iconBtn}
                        >
                          <Ionicons
                            name="remove-outline"
                            size={18}
                            color="#b91c1c"
                          />
                        </Pressable>
                      </View>
                    );
                  })}

                  <Pressable
                    {...withA11y(() =>
                      setEditing((p) =>
                        p
                          ? { ...p, studentIds: [...(p.studentIds || []), ""] }
                          : p
                      )
                    )}
                    onPress={() =>
                      setEditing((p) =>
                        p
                          ? { ...p, studentIds: [...(p.studentIds || []), ""] }
                          : p
                      )
                    }
                    style={[styles.btnGhost, { alignSelf: "flex-start" }]}
                  >
                    <Ionicons name="add-outline" size={16} color="#111827" />
                    <Text style={styles.btnGhostText}>Thêm con</Text>
                  </Pressable>
                </View>

                {/* Hàng 4: Mật khẩu */}
                <View>
                  <Text style={styles.label}>
                    Mật khẩu {editing?._id ? "(để trống nếu không đổi)" : ""}
                  </Text>
                  <TextInput
                    value={pwd}
                    onChangeText={setPwd}
                    style={styles.input}
                    secureTextEntry
                    placeholder={
                      editing?._id
                        ? "Không đổi thì để trống"
                        : "Mật khẩu ban đầu"
                    }
                    placeholderTextColor="#64748b"
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.footerRow}>
              <Pressable
                {...withA11y(() => setVisible(false))}
                onPress={() => setVisible(false)}
                style={styles.btnGhost}
              >
                <Ionicons name="close-outline" size={16} color="#111827" />
                <Text style={styles.btnGhostText}>Đóng</Text>
              </Pressable>
              <Pressable
                {...withA11y(submit)}
                onPress={submit}
                style={styles.btnPrimary}
              >
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

/** ===== Styles ===== */
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
  trHead: { backgroundColor: "rgba(99,102,241,0.08)" },

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
