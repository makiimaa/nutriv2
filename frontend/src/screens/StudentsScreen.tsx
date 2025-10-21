import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Alert,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import axiosClient from "../api/axiosClient";
import MeasurementFormModal from "../components/MeasurementFormModal";
import MeasurementHistoryModal from "../components/MeasurementHistoryModal";
import StudentFormModal from "../components/StudentFormModal";
import HealthInfoModal from "../components/HealthInfoModal";
import { Student } from "../types";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

export default function StudentsScreen() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [canManageStudents, setCanManageStudents] = useState<boolean>(false);

  const [mFormVisible, setMFormVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [targetStudentId, setTargetStudentId] = useState<string>("");

  const [stuModalVisible, setStuModalVisible] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);

  const [healthVisible, setHealthVisible] = useState(false);
  const [healthStudentId, setHealthStudentId] = useState<string>("");

  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const me = await axiosClient.get("/auth/me");
      const role = (me?.data?.role as "admin" | "teacher") || "teacher";

      if (role === "admin") {
        const res = await axiosClient.get("/students");
        setStudents(res.data || []);
        setIsAdmin(true);
        setCanManageStudents(true);
      } else {
        const res = await axiosClient.get("/students/mine");
        setStudents(res.data || []);
        setIsAdmin(false);
        setCanManageStudents(true);
      }
    } catch (e) {
      console.log(e);
      Alert.alert("Lỗi", "Không lấy được danh sách học sinh");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    if (!kw) return students;
    return students.filter((s) => {
      const name = (s.fullName || s.name || "").toLowerCase();
      const dob = (s.dateOfBirth || s.dob || "").slice(0, 10);
      return name.includes(kw) || dob.includes(kw);
    });
  }, [q, students]);

  const openMeasure = (studentId?: string) => {
    if (!studentId) return;
    setTargetStudentId(studentId);
    setMFormVisible(true);
  };

  const openHistory = (studentId?: string) => {
    if (!studentId) return;
    setTargetStudentId(studentId);
    setHistoryVisible(true);
  };

  const openHealth = (studentId?: string) => {
    if (!studentId) return;
    setHealthStudentId(studentId);
    setHealthVisible(true);
  };

  const submitMeasurement = async (data: {
    studentId: string;
    height: number;
    weight: number;
    measurementDate: string;
    notes?: string;
  }) => {
    try {
      await axiosClient.post("/measurements", data);
      setMFormVisible(false);
      Alert.alert("OK", "Đã lưu số đo");
    } catch (e: any) {
      console.log(e?.response?.data || e);
      Alert.alert("Lỗi", e?.response?.data?.message || "Lưu số đo thất bại");
    }
  };

  const onAdd = () => {
    if (!canManageStudents) return;
    setEditing(null);
    setStuModalVisible(true);
  };

  const onEdit = (item: Student) => {
    if (!canManageStudents) return;
    setEditing(item);
    setStuModalVisible(true);
  };

  const onDelete = (id?: string) => {
    if (!isAdmin || !id) return;
    Alert.alert("Xác nhận", "Bạn muốn xóa học sinh này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await axiosClient.delete(`/students/${id}`);
            fetchStudents();
          } catch (e: any) {
            console.log(e?.response?.data || e);
            Alert.alert("Lỗi", e?.response?.data?.message || "Xóa thất bại");
          }
        },
      },
    ]);
  };

  const renderItem = ({ item, index }: { item: Student; index: number }) => {
    const displayName = item.fullName || item.name || "";
    const displayDob = (item.dateOfBirth || item.dob || "").slice(0, 10);
    const displayMhs = item.schoolProvidedId ?? "null";

    return (
      <Pressable
        onPress={() => openHistory(item._id)}
        style={({ pressed }) => [
          styles.card,
          pressed && { transform: [{ scale: 0.995 }] },
        ]}
      >
        <View style={styles.cardRow}>
          <View style={styles.avatar}>
            <Ionicons name="person-outline" size={20} color="#0f766e" />
          </View>
          <View style={{ flex: 1, paddingRight: 6 }}>
            <Text style={styles.name} numberOfLines={1}>
              {index + 1}. {displayName}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              Ngày sinh: {displayDob || "—"}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              MHS: {displayMhs}
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={() => openMeasure(item._id)}
              style={({ pressed }) => [
                styles.iconBtn,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="podium-outline" size={18} color="#0f766e" />
            </Pressable>
            <Pressable
              onPress={() => openHistory(item._id)}
              style={({ pressed }) => [
                styles.iconBtn,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="time-outline" size={18} color="#0f766e" />
            </Pressable>
          </View>
        </View>

        <View style={styles.actionRow}>
          {canManageStudents && (
            <>
              <Pressable
                onPress={() => onEdit(item)}
                style={({ pressed }) => [
                  styles.pillBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="create-outline" size={16} color="#0f766e" />
                <Text style={styles.pillText}>Sửa</Text>
              </Pressable>

              {isAdmin && (
                <Pressable
                  onPress={() => onDelete(item._id)}
                  style={({ pressed }) => [
                    styles.pillBtn,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name="trash-outline" size={16} color="#b91c1c" />
                  <Text style={[styles.pillText, { color: "#b91c1c" }]}>
                    Xoá
                  </Text>
                </Pressable>
              )}

              {/* 🔶 Nút sức khoẻ */}
              <Pressable
                onPress={() => openHealth(item._id)}
                style={({ pressed }) => [
                  styles.iconBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="medkit-outline" size={18} color="#0f766e" />
              </Pressable>
            </>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <LinearGradient
      colors={["#eef7ff", "#f8fffb"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <StatusBar barStyle="dark-content" translucent />
      <SafeAreaView style={styles.safe}>
        {/* Tiêu đề */}
        <View style={styles.brand}>
          <View style={styles.logoWrap}>
            <LinearGradient
              colors={["#d1fae5", "#93c5fd"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logo}
            >
              <Ionicons name="people-outline" size={24} color="#0b3d2e" />
            </LinearGradient>
          </View>

          <Text style={styles.brandTitle}>
            {isAdmin ? "Danh sách học sinh" : "Lớp của tôi"}
          </Text>
          <Text style={styles.brandSub}>
            Kéo xuống để làm mới — chạm thẻ để xem lịch sử
          </Text>
        </View>

        {/* Hàng Search + Add (add bên phải) */}
        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={18} color="#0f172a" />
            <TextInput
              ref={inputRef}
              style={styles.searchInput}
              placeholder="Tìm theo tên hoặc ngày sinh (YYYY-MM-DD)"
              value={q}
              onChangeText={(t) => {
                setSearching(true);
                setQ(t);
                setTimeout(() => setSearching(false), 150);
              }}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searching && <ActivityIndicator size="small" />}
            {!!q && (
              <Pressable onPress={() => setQ("")} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={18} color="#64748b" />
              </Pressable>
            )}
          </View>

          {canManageStudents && (
            <Pressable
              onPress={onAdd}
              style={({ pressed }) => [
                styles.addBtn,
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
            >
              <LinearGradient
                colors={["#34d399", "#059669"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.addInner}
              >
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
              </LinearGradient>
            </Pressable>
          )}
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(i, idx) => i._id || `${idx}`}
          renderItem={renderItem}
          refreshing={loading}
          onRefresh={fetchStudents}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", color: "#64748b" }}>
              {q ? "Không tìm thấy học sinh phù hợp." : "Chưa có học sinh nào."}
            </Text>
          }
        />
      </SafeAreaView>

      {/* Modals đo/thống kê */}
      <MeasurementFormModal
        visible={mFormVisible}
        onClose={() => setMFormVisible(false)}
        onSubmit={submitMeasurement}
        studentId={targetStudentId}
      />
      <MeasurementHistoryModal
        visible={historyVisible}
        onClose={() => setHistoryVisible(false)}
        studentId={targetStudentId}
      />

      {/* Modal thêm/sửa học sinh */}
      <StudentFormModal
        visible={stuModalVisible}
        onClose={() => setStuModalVisible(false)}
        initial={editing || undefined}
        onSaved={() => {
          setStuModalVisible(false);
          fetchStudents();
        }}
      />

      {/* 🔶 Modal sức khoẻ */}
      <HealthInfoModal
        visible={healthVisible}
        onClose={() => setHealthVisible(false)}
        studentId={healthStudentId}
        onSaved={() => {
          setHealthVisible(false);
        }}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingTop: 8,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  headerTitleWrap: { marginTop: 4, marginBottom: 8 },
  title: { fontSize: 18, fontWeight: "800", color: "#0b3d2e" },
  subtitle: { fontSize: 12, color: "#64748b", marginTop: 2 },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  searchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.6)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  searchInput: { flex: 1, color: "#0f172a" },
  clearBtn: { paddingLeft: 4 },

  addBtn: {},
  addInner: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#059669",
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  card: {
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
    marginBottom: 12,
  },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(16,185,129,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  meta: { color: "#475569", marginTop: 2, fontSize: 12 },

  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  iconBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  pillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  pillText: { color: "#0f766e", fontWeight: "600", fontSize: 12.5 },
  pressed: { transform: [{ scale: 0.98 }] },

  brand: { alignItems: "center", marginTop: 8, marginBottom: 8 },
  logoWrap: {
    marginBottom: 6,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0b3d2e",
    letterSpacing: 0.2,
  },
  brandSub: {
    marginTop: 2,
    color: "#475569",
    fontSize: 12,
  },
});
