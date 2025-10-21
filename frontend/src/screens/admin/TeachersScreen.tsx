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
import { Teacher, School } from "../../types";

export default function TeachersScreen() {
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

  const [list, setList] = useState<Teacher[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);

  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [form, setForm] = useState<Partial<Teacher> & { password?: string }>({
    employeeId: "",
    fullName: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    role: "teacher",
    isActive: true,
    schoolId: "",
  });

  const [q, setQ] = useState("");

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [t, s] = await Promise.all([
        axiosClient.get("/teachers"),
        axiosClient.get("/schools"),
      ]);
      setList(t.data || []);
      setSchools(s.data || []);
    } catch (e: any) {
      Alert.alert(
        "Lỗi",
        e?.response?.data?.message || "Không tải được danh sách"
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchAll();
  }, []);

  const schoolMap = useMemo(() => {
    const m = new Map<string, School>();
    schools.forEach((s) => s._id && m.set(s._id, s));
    return m;
  }, [schools]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return list;
    return list.filter((t) => {
      const sName =
        (t.schoolId && schoolMap.get(t.schoolId)?.name?.toLowerCase()) || "";
      return (
        t.fullName?.toLowerCase().includes(qq) ||
        t.email?.toLowerCase().includes(qq) ||
        (t.phone || "").toLowerCase().includes(qq) ||
        (t.address || "").toLowerCase().includes(qq) ||
        sName.includes(qq) ||
        (t.role || "").toLowerCase().includes(qq)
      );
    });
  }, [q, list, schoolMap]);

  const openAdd = () => {
    setEditing(null);
    setForm({
      employeeId: "",
      fullName: "",
      email: "",
      password: "",
      phone: "",
      address: "",
      role: "teacher",
      isActive: true,
      schoolId: schools[0]?._id || "",
    });
    setVisible(true);
  };
  const openEdit = (t: Teacher) => {
    setEditing(t);

    setForm({ ...t, password: undefined, schoolId: t.schoolId || "" });
    setVisible(true);
  };

  const submit = async () => {
    try {
      if (!form.fullName?.trim()) return Alert.alert("Lỗi", "Nhập họ tên");

      if (!editing) {
        if (!form.employeeId?.trim())
          return Alert.alert("Lỗi", "Nhập mã nhân viên");
        if (!form.email?.trim()) return Alert.alert("Lỗi", "Nhập email");
        if (!form.password?.trim()) return Alert.alert("Lỗi", "Nhập mật khẩu");
        const payload = {
          employeeId: form.employeeId.trim(),
          fullName: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          phone: form.phone || undefined,
          address: form.address || undefined,
          role: form.role || "teacher",
          isActive: form.isActive !== false,
          schoolId: form.schoolId || undefined,
        };
        await axiosClient.post("/teachers", payload);
      } else {
        const payload = {
          employeeId: form.employeeId,
          fullName: form.fullName?.trim(),
          email: form.email?.trim()?.toLowerCase(),
          phone: form.phone || undefined,
          address: form.address || undefined,
          role: form.role || "teacher",
          isActive: form.isActive !== false,
          schoolId: form.schoolId || undefined,
        };
        await axiosClient.put(`/teachers/${editing._id}`, payload);
      }
      setVisible(false);
      fetchAll();
    } catch (e: any) {
      Alert.alert("Lỗi", e?.response?.data?.message || "Lưu thất bại");
    }
  };

  const remove = async (id?: string) => {
    if (!id) return;
    if (Platform.OS === "web") {
      const ok = window.confirm("Xác nhận xoá giáo viên này?");
      if (!ok) return;
      try {
        await axiosClient.delete(`/teachers/${id}`);
        fetchAll();
      } catch (e: any) {
        Alert.alert("Lỗi", e?.response?.data?.message || "Xoá thất bại");
      }
    } else {
      Alert.alert("Xoá", "Xác nhận xoá giáo viên này?", [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xoá",
          style: "destructive",
          onPress: async () => {
            try {
              await axiosClient.delete(`/teachers/${id}`);
              fetchAll();
            } catch (e: any) {
              Alert.alert("Lỗi", e?.response?.data?.message || "Xoá thất bại");
            }
          },
        },
      ]);
    }
  };

  const TableHeader = () => (
    <View style={[styles.tr, styles.trHead]}>
      <Text style={[styles.td, styles.th, { flex: 1.6 }]}>Họ tên</Text>
      <Text style={[styles.td, styles.th, { flex: 1.8 }]}>Email</Text>
      <Text style={[styles.td, styles.th, { flex: 1.2 }]}>Điện thoại</Text>
      <Text style={[styles.td, styles.th, { flex: 1.6 }]}>Trường</Text>
      <Text style={[styles.td, styles.th, { width: 110 }]}>Vai trò</Text>
      <Text style={[styles.td, styles.th, { width: 140 }]}>Trạng thái</Text>
      <Text style={[styles.td, styles.th, { width: 130 }]}>Hành động</Text>
    </View>
  );

  const Row = ({ item }: { item: Teacher }) => {
    const s = item.schoolId ? schoolMap.get(item.schoolId) : undefined;
    return (
      <View style={styles.tr}>
        <Text
          style={[styles.td, { flex: 1.6, fontWeight: "700" }]}
          numberOfLines={1}
        >
          {item.fullName}
        </Text>
        <Text style={[styles.td, { flex: 1.8 }]} numberOfLines={1}>
          {item.email}
        </Text>
        <Text style={[styles.td, { flex: 1.2 }]} numberOfLines={1}>
          {item.phone || "-"}
        </Text>
        <Text style={[styles.td, { flex: 1.6 }]} numberOfLines={1}>
          {s?.name || "-"}
        </Text>

        <View style={[styles.cell, { width: 110 }]}>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: item.role === "admin" ? "#0ea5e9" : "#22c55e",
              },
            ]}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>
              {item.role?.toUpperCase() || "TEACHER"}
            </Text>
          </View>
        </View>

        <View style={[styles.cell, { width: 140 }]}>
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
            <Pressable
              onPress={() => openEdit(item)}
              style={styles.iconBtn}
              accessibilityRole="button"
            >
              <Ionicons name="create-outline" size={18} color="#0f172a" />
            </Pressable>
            <Pressable
              onPress={() => remove(item._id)}
              style={styles.iconBtn}
              accessibilityRole="button"
            >
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
        <Text style={styles.headerTitle}>Danh sách giáo viên</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={fetchAll}
            style={styles.btnGhost}
            accessibilityRole="button"
          >
            <Ionicons name="refresh-outline" size={16} color="#111827" />
            <Text style={styles.btnGhostText}>Làm mới</Text>
          </Pressable>
          <Pressable
            onPress={openAdd}
            style={styles.btnPrimary}
            accessibilityRole="button"
          >
            <Ionicons name="add-outline" size={16} color="#fff" />
            <Text style={styles.btnPrimaryText}>Thêm giáo viên</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          placeholder="Tìm theo tên / email / SĐT / trường / vai trò…"
          value={q}
          onChangeText={setQ}
          style={styles.input}
          placeholderTextColor="#64748b"
        />
      </View>

      <View style={{ flex: 1, padding: 16, paddingTop: 8 }}>
        <View style={styles.tableWrap}>
          <TableHeader />
          <FlatList
            data={filtered}
            keyExtractor={(i, idx) => i._id || `${i.email}-${idx}`}
            renderItem={({ item }) => <Row item={item} />}
            refreshing={loading}
            onRefresh={fetchAll}
            ListEmptyComponent={
              <Text
                style={{ textAlign: "center", color: "#64748b", padding: 24 }}
              >
                Chưa có giáo viên.
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
              {editing ? "Sửa giáo viên" : "Thêm giáo viên"}
            </Text>
            <ScrollView contentContainerStyle={{ paddingBottom: 10 }}>
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Mã nhân viên</Text>
                    <TextInput
                      value={form.employeeId || ""}
                      onChangeText={(t) => setForm({ ...form, employeeId: t })}
                      style={styles.input}
                      editable={!editing}
                      placeholder="VD: GV001"
                      placeholderTextColor="#64748b"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Họ tên</Text>
                    <TextInput
                      value={form.fullName || ""}
                      onChangeText={(t) => setForm({ ...form, fullName: t })}
                      style={styles.input}
                      placeholder="VD: Nguyễn Văn A"
                      placeholderTextColor="#64748b"
                    />
                  </View>
                </View>

                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                      value={form.email || ""}
                      onChangeText={(t) => setForm({ ...form, email: t })}
                      style={styles.input}
                      autoCapitalize="none"
                      editable={true}
                      placeholder="email@domain.com"
                      placeholderTextColor="#64748b"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Điện thoại</Text>
                    <TextInput
                      value={form.phone || ""}
                      onChangeText={(t) => setForm({ ...form, phone: t })}
                      style={styles.input}
                      placeholder="VD: 09xxxxxxxx"
                      placeholderTextColor="#64748b"
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                {!editing && (
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Mật khẩu</Text>
                      <TextInput
                        value={form.password || ""}
                        onChangeText={(t) => setForm({ ...form, password: t })}
                        style={styles.input}
                        placeholder="Mật khẩu ban đầu"
                        placeholderTextColor="#64748b"
                        secureTextEntry
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Địa chỉ</Text>
                      <TextInput
                        value={form.address || ""}
                        onChangeText={(t) => setForm({ ...form, address: t })}
                        style={styles.input}
                        placeholder="Số nhà, đường..."
                        placeholderTextColor="#64748b"
                      />
                    </View>
                  </View>
                )}
                {editing && (
                  <View>
                    <Text style={styles.label}>Địa chỉ</Text>
                    <TextInput
                      value={form.address || ""}
                      onChangeText={(t) => setForm({ ...form, address: t })}
                      style={styles.input}
                      placeholder="Số nhà, đường..."
                      placeholderTextColor="#64748b"
                    />
                  </View>
                )}

                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Trường</Text>
                    <View style={styles.pickerWrap}>
                      <Picker
                        selectedValue={form.schoolId || ""}
                        onValueChange={(v) =>
                          setForm({ ...form, schoolId: String(v) })
                        }
                      >
                        <Picker.Item label="-- Chưa gán --" value="" />
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
                    <Text style={styles.label}>Role</Text>
                    <View style={styles.pickerWrap}>
                      <Picker
                        selectedValue={form.role || "teacher"}
                        onValueChange={(v) =>
                          setForm({ ...form, role: v as any })
                        }
                      >
                        <Picker.Item label="Teacher" value="teacher" />
                        <Picker.Item label="Admin" value="admin" />
                      </Picker>
                    </View>
                  </View>
                </View>

                <View style={{ flexDirection: "row", gap: 12 }}>
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
                        <Text style={{ color: "white", padding: 10 }}>
                          {form.isActive ? "Active" : "Inactive"}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() =>
                          setForm({ ...form, isActive: !form.isActive })
                        }
                        style={styles.btnGhost}
                        accessibilityRole="button"
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
                accessibilityRole="button"
              >
                <Ionicons name="close-outline" size={16} color="#111827" />
                <Text style={styles.btnGhostText}>Đóng</Text>
              </Pressable>
              <Pressable
                onPress={submit}
                style={styles.btnPrimary}
                accessibilityRole="button"
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
  trHead: { backgroundColor: "rgba(59,130,246,0.08)" },

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
    padding: 8,
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
