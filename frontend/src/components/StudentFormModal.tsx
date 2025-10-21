import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  Pressable,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import axiosClient from "../api/axiosClient";
import type { ClassEntity, School, Student } from "../types";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial?: Student | null;
};

export default function StudentFormModal({
  visible,
  onClose,
  onSaved,
  initial,
}: Props) {
  const [role, setRole] = useState<"admin" | "teacher" | "unknown">("unknown");
  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<ClassEntity[]>([]);

  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [schoolId, setSchoolId] = useState<string | undefined>(undefined);
  const [classId, setClassId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [schoolProvidedId, setSchoolProvidedId] = useState("");

  useEffect(() => {
    if (!visible) return;
    (async () => {
      try {
        const me = await axiosClient.get("/auth/me");
        const r = (me?.data?.role as "admin" | "teacher") || "teacher";
        setRole(r);

        if (r === "admin") {
          const [sch, cls] = await Promise.all([
            axiosClient.get("/schools"),
            axiosClient.get("/classes"),
          ]);
          setSchools(sch.data || []);
          setClasses(cls.data || []);
        } else {
          const clsMine = await axiosClient.get("/classes/mine");
          setClasses(clsMine.data || []);
          setSchoolProvidedId((initial as any)?.schoolProvidedId || "");
        }
      } catch (e: any) {
        console.log("load refs err:", e?.response?.status, e?.response?.data);
        Alert.alert("Lỗi", "Không tải được dữ liệu tham chiếu (lớp/trường)");
      }
    })();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    setFullName(initial?.fullName || initial?.name || "");
    setDateOfBirth(
      (initial?.dateOfBirth || initial?.dob || "").slice(0, 10) || ""
    );
    setGender((initial?.gender as any) || "male");
    setClassId(initial?.classId || undefined);
    setSchoolId(initial?.schoolId || undefined);
  }, [visible, initial]);

  useEffect(() => {
    if (!visible) return;
    if (!initial?._id) {
      if (!classId && classes.length) setClassId(classes[0]._id);
      if (role === "admin" && !schoolId && schools.length)
        setSchoolId(schools[0]._id);
    }
  }, [visible, classes, schools, role]);

  const isAdmin = role === "admin";
  const canSubmit = useMemo(() => {
    return (
      !!fullName &&
      !!dateOfBirth &&
      !!classId &&
      !!schoolProvidedId &&
      (isAdmin ? !!schoolId : true)
    );
  }, [fullName, dateOfBirth, classId, schoolId, isAdmin, schoolProvidedId]);

  const save = async () => {
    if (!canSubmit) {
      Alert.alert(
        "Thiếu thông tin",
        "Vui lòng nhập Họ tên, Ngày sinh, Lớp (và Trường nếu là admin)."
      );
      return;
    }
    try {
      setLoading(true);
      const payload: any = {
        fullName,
        dateOfBirth,
        gender,
        classId,
        schoolProvidedId,
      };
      if (isAdmin && schoolId) payload.schoolId = schoolId;

      if (initial?._id)
        await axiosClient.put(`/students/${initial._id}`, payload);
      else await axiosClient.post("/students", payload);

      onSaved();
    } catch (e: any) {
      console.log("save student err:", e?.response?.data || e.message);
      Alert.alert("Lỗi", e?.response?.data?.message || "Lưu thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <LinearGradient colors={["#eef7ff", "#f8fffb"]} style={{ flex: 1 }}>
        <SafeAreaView style={st.safe}>
          {/* Header */}
          <View style={st.header}>
            <Text style={st.headerTitle}>
              {initial?._id ? "Cập nhật học sinh" : "Thêm học sinh"}
            </Text>
            <Pressable onPress={onClose} style={st.headerClose}>
              <Ionicons name="close" size={20} color="#0f172a" />
            </Pressable>
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <ScrollView contentContainerStyle={st.scroll}>
              {/* CARD */}
              <View style={st.card}>
                <Text style={st.section}>Thông tin cơ bản</Text>

                <View style={st.inputWrap}>
                  <Text style={st.label}>Họ tên</Text>
                  <View style={st.inputRow}>
                    <Ionicons name="person-outline" size={16} color="#0f172a" />
                    <TextInput
                      style={st.input}
                      value={fullName}
                      onChangeText={setFullName}
                      placeholder="VD: Nguyễn Văn A"
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                <View style={st.twoCols}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.label}>Ngày sinh</Text>
                    <View style={st.inputRow}>
                      <Ionicons
                        name="calendar-outline"
                        size={16}
                        color="#0f172a"
                      />
                      <TextInput
                        style={st.input}
                        value={dateOfBirth}
                        onChangeText={setDateOfBirth}
                        placeholder="YYYY-MM-DD"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                  <View style={{ width: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={st.label}>Giới tính</Text>
                    <View style={st.rowBtns}>
                      <Pressable
                        onPress={() => setGender("male")}
                        style={[st.choice, gender === "male" && st.choiceOn]}
                      >
                        <Text style={st.choiceText}>Nam</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setGender("female")}
                        style={[st.choice, gender === "female" && st.choiceOn]}
                      >
                        <Text style={st.choiceText}>Nữ</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>

                <View style={[st.inputWrap, { marginTop: 10 }]}>
                  <Text style={st.label}>Mã học sinh (MHS)</Text>
                  <View style={st.inputRow}>
                    <Ionicons
                      name="pricetag-outline"
                      size={16}
                      color="#0f172a"
                    />
                    <TextInput
                      style={st.input}
                      value={schoolProvidedId}
                      onChangeText={setSchoolProvidedId}
                      placeholder="VD: HS-2025-000123"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                {isAdmin && (
                  <>
                    <Text style={[st.section, { marginTop: 16 }]}>
                      Phân trường
                    </Text>
                    <View style={st.pillWrap}>
                      {schools.map((sc) => (
                        <Pressable
                          key={sc._id}
                          onPress={() => setSchoolId(sc._id!)}
                          style={[st.pill, schoolId === sc._id && st.pillOn]}
                        >
                          <Text numberOfLines={1} style={st.pillText}>
                            {sc.name}
                          </Text>
                        </Pressable>
                      ))}
                      {!schools.length && (
                        <Text style={{ color: "#777" }}>Chưa có trường</Text>
                      )}
                    </View>
                  </>
                )}

                <Text style={[st.section, { marginTop: 16 }]}>Phân lớp</Text>
                <View style={st.pillWrap}>
                  {classes.map((cl) => (
                    <Pressable
                      key={cl._id}
                      onPress={() => setClassId(cl._id!)}
                      style={[st.pill, classId === cl._id && st.pillOn]}
                    >
                      <Text numberOfLines={1} style={st.pillText}>
                        {cl.name}
                      </Text>
                    </Pressable>
                  ))}
                  {!classes.length && (
                    <Text style={{ color: "#777" }}>Chưa có lớp</Text>
                  )}
                </View>
              </View>
            </ScrollView>

            {/* ACTION BAR bottom */}
            <View style={st.actionBar}>
              <Pressable onPress={onClose} style={st.secondaryBtn}>
                <Text style={st.secondaryText}>Đóng</Text>
              </Pressable>
              <Pressable
                disabled={!canSubmit || loading}
                onPress={save}
                style={({ pressed }) => [
                  st.primaryBtn,
                  pressed && { transform: [{ scale: 0.98 }] },
                  (!canSubmit || loading) && { opacity: 0.6 },
                ]}
              >
                <LinearGradient
                  colors={["#34d399", "#059669"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={st.primaryInner}
                >
                  <Ionicons name="save-outline" size={18} color="#fff" />
                  <Text style={st.primaryText}>
                    {loading ? "Đang lưu..." : "Lưu"}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  header: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    paddingTop: 2,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#0b3d2e" },
  headerClose: {
    position: "absolute",
    right: 0,
    top: 0,
    padding: 8,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.06)",
  },

  scroll: { paddingBottom: 90 },
  card: {
    backgroundColor: "rgba(255,255,255,0.65)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },

  section: { fontWeight: "800", color: "#0f172a", marginBottom: 8 },
  inputWrap: { marginBottom: 10 },
  label: { fontWeight: "700", color: "#0f172a", marginBottom: 6 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  input: { flex: 1, color: "#0f172a" },

  twoCols: { flexDirection: "row", alignItems: "flex-start" },

  rowBtns: { flexDirection: "row", gap: 8 },
  choice: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 999,
    backgroundColor: "#f1f5f9",
  },
  choiceOn: {
    borderColor: "#0f766e",
    backgroundColor: "rgba(16,185,129,0.15)",
  },
  choiceText: { color: "#0f172a" },

  pillWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 999,
    backgroundColor: "#f1f5f9",
  },
  pillOn: { borderColor: "#0f766e", backgroundColor: "rgba(16,185,129,0.15)" },
  pillText: { color: "#0f172a" },

  actionBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: "rgba(248,255,251,0.92)",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    flexDirection: "row",
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  secondaryText: { color: "#0f172a", fontWeight: "700" },

  primaryBtn: { flex: 1 },
  primaryInner: {
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: "#059669",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  primaryText: { color: "#fff", fontWeight: "700" },
});
