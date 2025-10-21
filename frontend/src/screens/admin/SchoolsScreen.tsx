import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  TextInput,
  Platform,
} from "react-native";
import axiosClient from "../../api/axiosClient";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

type School = {
  _id?: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
};

function stripDiacritics(s: string) {
  if (!s) return "";
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}
function getAbbr(name?: string) {
  if (!name) return "";
  const words = stripDiacritics(name).trim().split(/\s+/);
  return words.map((w) => w[0]?.toUpperCase() ?? "").join("");
}

export default function SchoolsScreen() {
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

  const [list, setList] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<School | null>(null);
  const [form, setForm] = useState<School>({ name: "" });
  const [q, setQ] = useState("");

  const fetchAll = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get("/schools");
      setList(res.data || []);
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

  const filtered = list.filter(
    (s) =>
      !q ||
      s.name?.toLowerCase().includes(q.toLowerCase()) ||
      s.address?.toLowerCase().includes(q.toLowerCase())
  );

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "" });
    setVisible(true);
  };
  const openEdit = (s: School) => {
    setEditing(s);
    setForm({ ...s });
    setVisible(true);
  };

  const submit = async () => {
    try {
      if (!form.name?.trim()) return Alert.alert("Lỗi", "Nhập tên trường");
      if (editing && editing._id)
        await axiosClient.put(`/schools/${editing._id}`, form);
      else await axiosClient.post("/schools", form);
      setVisible(false);
      fetchAll();
    } catch (e: any) {
      Alert.alert("Lỗi", e?.response?.data?.message || "Lưu thất bại");
    }
  };

  const remove = (id?: string) => {
    if (!id) return;
    Alert.alert("Xoá", "Xác nhận xoá trường này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xoá",
        style: "destructive",
        onPress: async () => {
          try {
            await axiosClient.delete(`/schools/${id}`);
            fetchAll();
          } catch (e: any) {
            Alert.alert("Lỗi", e?.response?.data?.message || "Xoá thất bại");
          }
        },
      },
    ]);
  };

  const Row = ({ item }: { item: School }) => {
    const abbr = getAbbr(item.name || "");
    return (
      <View style={styles.rowWrap} /* 4:8 layout */>
        {/* LEFT 4: avatar with outer ring + shadow */}
        <View style={styles.leftCol}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{abbr || "?"}</Text>
            </View>
          </View>
        </View>

        {/* RIGHT 8: info + actions */}
        <View style={styles.rightCol}>
          <View style={styles.titleRow}>
            <Text numberOfLines={2} style={styles.cardTitle}>
              {item.name || "(Chưa đặt tên)"}
            </Text>
          </View>

          {!!item.address && (
            <Text style={styles.metaLine} numberOfLines={2}>
              Đ/c: {item.address}
            </Text>
          )}
          {!!item.phone && (
            <Text style={styles.metaLine} numberOfLines={2}>
              ĐT: {item.phone}
            </Text>
          )}
          {!!item.email && (
            <Text style={styles.metaLine} numberOfLines={2}>
              Email: {item.email}
            </Text>
          )}

          <View style={styles.actionsRow}>
            <Pressable
              onPress={() => openEdit(item)}
              accessibilityRole="button"
              style={styles.btnEdit}
            >
              <Ionicons name="create-outline" size={18} color="#0f172a" />
              <Text style={styles.btnEditText}>Chỉnh sửa</Text>
            </Pressable>

            <Pressable
              onPress={() => remove(item._id)}
              accessibilityRole="button"
              style={styles.btnDel}
            >
              <Ionicons name="trash-outline" size={18} color="#fff" />
              <Text style={styles.btnDelText}>Xoá</Text>
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
        <Text style={styles.headerTitle}>Danh sách trường</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={fetchAll}
            accessibilityRole="button"
            style={styles.btnGhost}
          >
            <Ionicons name="refresh-outline" size={16} color="#111827" />
            <Text style={styles.btnGhostText}>Làm mới</Text>
          </Pressable>
          <Pressable
            onPress={openAdd}
            accessibilityRole="button"
            style={styles.btnPrimary}
          >
            <Ionicons name="add-outline" size={16} color="#fff" />
            <Text style={styles.btnPrimaryText}>Thêm trường</Text>
          </Pressable>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          placeholder="Tìm theo tên/địa chỉ..."
          value={q}
          onChangeText={setQ}
          style={styles.input}
          placeholderTextColor="#64748b"
        />
      </View>

      {/* List: each card max 50% width */}
      <FlatList
        numColumns={2}
        columnWrapperStyle={{ gap: 16 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 80, gap: 16 }}
        data={filtered}
        keyExtractor={(i, idx) => i._id ?? `${i.name}-${idx}`}
        refreshing={loading}
        onRefresh={fetchAll}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", color: "#64748b" }}>
            Chưa có trường.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Row item={item} />
          </View>
        )}
      />

      {/* Modal form */}
      <Modal
        visible={visible}
        animationType="fade"
        onRequestClose={() => setVisible(false)}
        transparent
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.sheetTitle}>
              {editing ? "Sửa trường" : "Thêm trường"}
            </Text>

            <View style={{ gap: 10 }}>
              <View>
                <Text style={styles.label}>Tên trường</Text>
                <TextInput
                  value={form.name}
                  onChangeText={(t) => setForm({ ...form, name: t })}
                  placeholder="VD: Mầm non Hoa Sen"
                  style={styles.input}
                  placeholderTextColor="#64748b"
                />
              </View>
              <View>
                <Text style={styles.label}>Địa chỉ</Text>
                <TextInput
                  value={form.address || ""}
                  onChangeText={(t) => setForm({ ...form, address: t })}
                  placeholder="Số nhà, đường..."
                  style={styles.input}
                  placeholderTextColor="#64748b"
                />
              </View>
              <View>
                <Text style={styles.label}>Điện thoại</Text>
                <TextInput
                  value={form.phone || ""}
                  onChangeText={(t) => setForm({ ...form, phone: t })}
                  keyboardType="phone-pad"
                  placeholder="0xxx..."
                  style={styles.input}
                  placeholderTextColor="#64748b"
                />
              </View>
              <View>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  value={form.email || ""}
                  onChangeText={(t) => setForm({ ...form, email: t })}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                  placeholderTextColor="#64748b"
                />
              </View>
            </View>

            <View style={styles.footerRow}>
              <Pressable
                onPress={() => setVisible(false)}
                accessibilityRole="button"
                style={styles.btnGhost}
              >
                <Ionicons name="close-outline" size={16} color="#111827" />
                <Text style={styles.btnGhostText}>Đóng</Text>
              </Pressable>
              <Pressable
                onPress={submit}
                accessibilityRole="button"
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
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    backgroundColor: "rgba(255,255,255,0.85)",
    padding: 10,
    borderRadius: 10,
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

  card: {
    flex: 1,
    flexBasis: "48%",
    maxWidth: "50%",
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },

  rowWrap: {
    flexDirection: "row",
    padding: 14,
    gap: 12,
    alignItems: "stretch",
  },
  leftCol: { flex: 5, alignItems: "center", justifyContent: "center" },
  rightCol: { flex: 7, minHeight: 120 },

  avatarRing: {
    padding: 6,
    borderRadius: 999,
    backgroundColor: "rgba(16,185,129,0.14)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  avatar: {
    width: 244,
    height: 244,
    borderRadius: 999,
    backgroundColor: "rgba(16,185,129,0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  avatarText: {
    fontSize: 52,
    fontWeight: "900",
    color: "#0f766e",
    letterSpacing: 1,
  },

  titleRow: { flexDirection: "row", justifyContent: "flex-end" },
  cardTitle: {
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "right",
    marginBottom: 6,
    fontSize: 26,
  },
  metaLine: {
    color: "#475569",
    textAlign: "left",
    marginTop: 4,
    marginLeft: 10,
    fontSize: 20,
    fontWeight: "400",
  },

  actionsRow: {
    marginTop: "auto",
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    width: "100%",
  },
  btnEdit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    ...(Platform.OS === "web" ? { cursor: "pointer" as const } : {}),
  },
  btnEditText: {
    color: "#0f172a",
    fontWeight: "800",
    width: 120,
    fontFamily: "",
  },
  btnDel: {
    width: 160,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ef4444",
    borderWidth: 1,
    borderColor: "#ef4444",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    ...(Platform.OS === "web" ? { cursor: "pointer" as const } : {}),
  },
  btnDelText: { color: "#fff", fontWeight: "800", textAlign: "center" },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalSheet: {
    width: "100%",
    maxWidth: 560,
    backgroundColor: "white",
    borderRadius: 14,
    padding: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
  },
  label: { fontWeight: "700", marginBottom: 6, color: "#0f172a" },
  footerRow: {
    marginTop: 12,
    gap: 8,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
});
