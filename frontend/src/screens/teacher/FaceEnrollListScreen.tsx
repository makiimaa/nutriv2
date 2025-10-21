import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Pressable,
  TextInput,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axiosClient from "../../api/axiosClient";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

type StudentRow = {
  _id: string;
  fullName: string;
  schoolId?: string;
  hasEmbedding?: boolean;
  facesCount?: number;
};

type MyClass = { _id: string; name?: string; title?: string };

const UI = {
  padX: 24,
  radius: 14,
  glass: "rgba(255,255,255,0.6)",
  border: "rgba(0,0,0,0.08)",
  shadow: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  } as const,
};

const MEDIA_IMAGES: any =
  (ImagePicker as any).MediaType?.Images ??
  (ImagePicker as any).MediaTypeOptions?.Images ??
  ImagePicker.MediaTypeOptions.Images;

async function fetchMyClass(): Promise<MyClass> {
  const r = await axiosClient.get("/classes/mine");
  const rows: any[] = r.data || [];
  if (!rows.length) throw new Error("Tài khoản chưa có lớp");
  return { _id: rows[0]._id, name: rows[0].name, title: rows[0].title };
}
async function fetchStudentsOfClass(classId: string): Promise<StudentRow[]> {
  const r = await axiosClient.get(`/face/class/${classId}/status`);
  return r.data || [];
}
async function fetchFaces(studentId: string) {
  const r = await axiosClient.get(`/face/student/${studentId}/faces`);
  return r.data?.faces || [];
}
async function fetchStudent(studentId: string) {
  const r = await axiosClient.get(`/students/${studentId}`);
  return r.data;
}
async function enrollOne(
  studentId: string,
  schoolId: string | undefined,
  imageUri: string
) {
  const form = new FormData();
  if (schoolId) form.append("schoolId", String(schoolId));
  form.append("studentId", String(studentId));
  form.append("image", {
    uri: imageUri,
    name: "face.jpg",
    type: "image/jpeg",
  } as any);
  const res = await axiosClient.post("/face/enroll", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export default function FaceEnrollListScreen() {
  const nav = useNavigation<any>();
  const [klass, setKlass] = useState<MyClass | null>(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [pickBusy, setPickBusy] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "done" | "todo">("all");

  useEffect(() => {
    (async () => {
      try {
        const mc = await fetchMyClass();
        setKlass(mc);
        const list = await fetchStudentsOfClass(mc._id);
        setRows(list);
      } catch (e: any) {
        Alert.alert("Lỗi", e?.message || "Không tải được danh sách học sinh");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const refreshItem = async (sid: string) => {
    try {
      const faces = await fetchFaces(sid);
      setRows((prev) =>
        prev.map((r) =>
          r._id === sid
            ? {
                ...r,
                hasEmbedding: faces.some((f: any) => f.hasEmbedding),
                facesCount: faces.length,
              }
            : r
        )
      );
    } catch {}
  };

  const onEnrollPress = async (stu: StudentRow) => {
    try {
      setPickBusy(stu._id);
      const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (libPerm.status !== "granted")
        throw new Error("Thiếu quyền Thư viện ảnh");
      const res = await ImagePicker.launchImageLibraryAsync({
        quality: 0.9,
        allowsEditing: false,
        mediaTypes: MEDIA_IMAGES as any,
      });
      if (res.canceled || !res.assets?.length) return;

      let schoolId = stu.schoolId;
      if (!schoolId) {
        try {
          const info = await fetchStudent(stu._id);
          schoolId = info?.schoolId || undefined;
        } catch {}
      }
      await enrollOne(stu._id, schoolId, res.assets[0].uri);
      Alert.alert("Thành công", `Đã đăng ký cho ${stu.fullName}`);
      refreshItem(stu._id);
    } catch (e: any) {
      Alert.alert(
        "Lỗi",
        e?.response?.data?.message || e?.message || "Đăng ký thất bại"
      );
    } finally {
      setPickBusy(null);
    }
  };

  const goDetail = (stu: StudentRow) => {
    nav.navigate("FaceEnrollDetail", {
      studentId: stu._id,
      fullName: stu.fullName,
      schoolId: stu.schoolId,
    });
  };

  const SegBtn = ({
    on,
    title,
    onPress,
  }: {
    on: boolean;
    title: string;
    onPress: () => void;
  }) => (
    <Pressable onPress={onPress} style={[st.seg, on && st.segOn]}>
      <Text style={[st.segText, on && st.segTextOn]}>{title}</Text>
    </Pressable>
  );

  const PrimaryBtn = ({
    title,
    icon,
    onPress,
    disabled,
  }: {
    title: string;
    icon?: any;
    onPress: () => void;
    disabled?: boolean;
  }) => (
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
  const GhostBtn = ({
    title,
    onPress,
  }: {
    title: string;
    onPress: () => void;
  }) => (
    <Pressable onPress={onPress} style={st.ghostBtn}>
      <Text style={st.ghostText}>{title}</Text>
    </Pressable>
  );

  const filtered = useMemo(() => {
    let list = rows;
    if (filter === "done") list = rows.filter((r) => !!r.hasEmbedding);
    if (filter === "todo") list = rows.filter((r) => !r.hasEmbedding);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((r) => r.fullName?.toLowerCase().includes(q));
    }
    return list;
  }, [rows, query, filter]);

  if (loading) {
    return (
      <LinearGradient colors={["#eef7ff", "#f8fffb"]} style={{ flex: 1 }}>
        <SafeAreaView style={st.safeCenter}>
          <ActivityIndicator />
          <Text style={{ marginTop: 6 }}>Đang tải học sinh…</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const Brand = () => (
    <View style={st.brandWrap}>
      <LinearGradient
        colors={["#d1fae5", "#93c5fd"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={st.brandLogo}
      >
        <Ionicons name="people-outline" size={26} color="#0b3d2e" />
      </LinearGradient>
      <Text style={st.brandTitle}>Đăng ký khuôn mặt</Text>
      <Text style={st.brandSub}>Chọn ảnh → tạo embedding cho học sinh</Text>
      {!!klass && (
        <View style={[st.tag, { marginTop: 8 }]}>
          <Ionicons name="school-outline" size={14} color="#0f766e" />
          <Text style={st.tagText}>
            Lớp: {klass.name || klass.title || klass._id}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <LinearGradient colors={["#eef7ff", "#f8fffb"]} style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" translucent />
      <SafeAreaView style={st.safe}>
        <Brand />

        {/* Search + Segmented filter */}
        <View style={st.searchCard}>
          <View style={st.searchRow}>
            <Ionicons name="search-outline" size={16} color="#64748b" />
            <TextInput
              placeholder="Tìm theo tên học sinh…"
              placeholderTextColor="#94a3b8"
              style={st.searchInput}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {!!query && (
              <Pressable onPress={() => setQuery("")}>
                <Ionicons name="close-circle" size={18} color="#94a3b8" />
              </Pressable>
            )}
          </View>
          <View style={st.segRow}>
            <SegBtn
              title="Tất cả"
              on={filter === "all"}
              onPress={() => setFilter("all")}
            />
            <SegBtn
              title="Đã đăng ký"
              on={filter === "done"}
              onPress={() => setFilter("done")}
            />
            <SegBtn
              title="Chưa đăng ký"
              on={filter === "todo"}
              onPress={() => setFilter("todo")}
            />
          </View>
        </View>

        {/* List đẹp hơn */}
        <FlatList
          data={filtered}
          keyExtractor={(i) => i._id}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          contentContainerStyle={{ paddingBottom: 26 }}
          renderItem={({ item }) => (
            <View style={st.cardRow}>
              <View style={st.avatar}>
                <Ionicons name="person-outline" size={18} color="#0f766e" />
              </View>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={st.name} numberOfLines={1}>
                  {item.fullName}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 2,
                  }}
                >
                  <View
                    style={[
                      st.badge,
                      item.hasEmbedding ? st.badgeOn : st.badgeOff,
                    ]}
                  >
                    <Ionicons
                      name={
                        item.hasEmbedding
                          ? "checkmark-circle"
                          : "ellipse-outline"
                      }
                      size={12}
                      color={item.hasEmbedding ? "#059669" : "#64748b"}
                    />
                    <Text
                      style={[
                        st.badgeText,
                        item.hasEmbedding && {
                          color: "#059669",
                          fontWeight: "800",
                        },
                      ]}
                    >
                      {item.hasEmbedding ? "ĐÃ ĐĂNG KÝ" : "Chưa đăng ký"}
                      {item.hasEmbedding && typeof item.facesCount === "number"
                        ? ` (${item.facesCount})`
                        : ""}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <GhostBtn title="Xem" onPress={() => goDetail(item)} />
                <PrimaryBtn
                  title={pickBusy === item._id ? "Đang chọn…" : "Đăng ký"}
                  icon="images-outline"
                  onPress={() => onEnrollPress(item)}
                  disabled={!!pickBusy}
                />
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", color: "#64748b" }}>
              Không có học sinh.
            </Text>
          }
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: UI.padX, paddingTop: 8 },
  safeCenter: { flex: 1, alignItems: "center", justifyContent: "center" },

  brandWrap: { alignItems: "center", marginTop: 8, marginBottom: 12 },
  brandLogo: {
    width: 58,
    height: 58,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    ...UI.shadow,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  brandTitle: { fontSize: 18, fontWeight: "800", color: "#0b3d2e" },
  brandSub: { fontSize: 12, color: "#64748b", marginTop: 2 },

  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(16,185,129,0.12)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.25)",
  },
  tagText: { color: "#0f766e", fontWeight: "700", fontSize: 12.5 },

  searchCard: {
    backgroundColor: UI.glass,
    borderRadius: UI.radius,
    padding: 12,
    borderWidth: 1,
    borderColor: UI.border,
    ...UI.shadow,
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 42,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  searchInput: { flex: 1, color: "#0f172a" },
  segRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  seg: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  segOn: {
    backgroundColor: "rgba(16,185,129,0.18)",
    borderColor: "rgba(16,185,129,0.25)",
  },
  segText: { color: "#0f172a", fontWeight: "600" },
  segTextOn: { color: "#0b3d2e" },

  cardRow: {
    backgroundColor: UI.glass,
    borderRadius: UI.radius,
    padding: 12,
    borderWidth: 1,
    borderColor: UI.border,
    ...UI.shadow,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    marginRight: 10,
    backgroundColor: "rgba(16,185,129,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontWeight: "800", color: "#0f172a" },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeOn: {
    backgroundColor: "rgba(16,185,129,0.12)",
    borderColor: "rgba(16,185,129,0.25)",
  },
  badgeOff: {
    backgroundColor: "rgba(148,163,184,0.15)",
    borderColor: "rgba(148,163,184,0.35)",
  },
  badgeText: { color: "#475569", fontWeight: "700" },

  btn: { borderRadius: 12 },
  btnInner: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700" },
  ghostBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  ghostText: { fontWeight: "700", color: "#0f172a" },
});
