import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  Alert,
  FlatList,
  StyleSheet,
  Image,
  Platform,
  SafeAreaView,
  StatusBar,
  Pressable,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axiosClient from "../../api/axiosClient";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

type RosterRow = { _id: string; fullName: string; embedding: number[] };

const UI = {
  padX: 24,
  radius: 14,
  gap: 12,
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

async function recognizeFaceMulti(imageUri: string, classId: string) {
  const form = new FormData();
  form.append("image", {
    uri: imageUri,
    name: "photo.jpg",
    type: "image/jpeg",
  } as any);
  form.append("classId", classId);
  const res = await axiosClient.post("/face/recognize-multi", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export default function FaceAttendanceScreen() {
  const [recognizedIds, setRecognizedIds] = useState<string[]>([]);
  const [recognizedDetail, setRecognizedDetail] = useState<
    { studentId: string; name: string; percent?: number }[]
  >([]);

  const [hasCamPerm, setHasCamPerm] = useState(false);
  const [hasLibPerm, setHasLibPerm] = useState(false);

  const [classId, setClassId] = useState<string>("");
  const [className, setClassName] = useState<string>("");
  const [roster, setRoster] = useState<RosterRow[]>([]);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      setHasCamPerm(cam.status === "granted");
      const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
      setHasLibPerm(lib.status === "granted");
    })();
  }, []);

  const loadMyClasses = async () => {
    try {
      const r = await axiosClient.get("/classes/mine");
      const rows: any[] = r.data || [];
      if (!rows.length) {
        Alert.alert("Chưa có lớp", "Tài khoản chưa được gán lớp");
        return;
      }

      setClassId(rows[0]._id);
      setClassName(rows[0].name || rows[0].title || rows[0]._id);
    } catch (e: any) {
      Alert.alert(
        "Lỗi",
        e?.response?.data?.message || "Không lấy được lớp của tôi"
      );
    }
  };

  const loadRosterEmbeddings = async (cid: string) => {
    try {
      const r = await axiosClient.get(`/classes/${cid}/roster-embeddings`);
      setRoster(r.data || []);
    } catch (e: any) {
      Alert.alert(
        "Lỗi",
        e?.response?.data?.message || "Không lấy được embeddings"
      );
    }
  };

  useEffect(() => {
    loadMyClasses();
  }, []);
  useEffect(() => {
    if (classId) loadRosterEmbeddings(classId);
  }, [classId]);

  const totalStudents = roster.length;

  const namesMap = useMemo(() => {
    const m = new Map<string, string>();
    roster.forEach((r) => m.set(r._id, r.fullName));
    return m;
  }, [roster]);

  const takeShot = async () => {
    if (!hasCamPerm)
      return Alert.alert("Thiếu quyền", "Cấp quyền Camera trong Cài đặt.");
    const res = await ImagePicker.launchCameraAsync({
      quality: 0.85,
      allowsEditing: false,
    });
    if (!res.canceled && res.assets?.length) setPhotoUri(res.assets[0].uri);
  };

  const pickFromLibrary = async () => {
    if (!hasLibPerm)
      return Alert.alert(
        "Thiếu quyền",
        "Cấp quyền Ảnh/Thư viện trong Cài đặt."
      );
    const res = await ImagePicker.launchImageLibraryAsync({
      quality: 0.9,
      allowsEditing: false,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (!res.canceled && res.assets?.length) setPhotoUri(res.assets[0].uri);
  };

  const runRecognition = async () => {
    if (!photoUri) return Alert.alert("Thiếu ảnh");
    if (!classId) return Alert.alert("Thiếu lớp");
    try {
      setBusy(true);
      const r = await recognizeFaceMulti(photoUri, classId);
      if (!r?.ok) return Alert.alert("Không khớp", r?.message || "—");

      const ids: string[] = [];
      const detail: { studentId: string; name: string; percent?: number }[] =
        [];

      for (const f of r.faces || []) {
        const best = f?.best;
        if (best?.studentId) {
          ids.push(best.studentId);

          let percent: number | undefined;
          const raw =
            best.confidence ?? best.score ?? best.similarity ?? undefined;
          if (typeof raw === "number") {
            if (raw >= 0 && raw <= 1) percent = Math.round(raw * 100);
            else if (raw > 1 && raw <= 100) percent = Math.round(raw);
          }
          detail.push({
            studentId: best.studentId,
            name: namesMap.get(best.studentId) || best.studentId,
            percent,
          });
        }
      }

      const uniqIds = Array.from(new Set(ids));
      setRecognizedIds(uniqIds);

      const seen = new Map<string, number | undefined>();
      detail.forEach((d) => {
        if (!seen.has(d.studentId)) seen.set(d.studentId, d.percent);
        else {
          const cur = seen.get(d.studentId);
          if (d.percent && (!cur || d.percent > cur))
            seen.set(d.studentId, d.percent);
        }
      });
      const merged = uniqIds.map((id) => ({
        studentId: id,
        name: namesMap.get(id) || id,
        percent: seen.get(id),
      }));
      setRecognizedDetail(merged);

      Alert.alert(
        "Nhận diện",
        uniqIds.length
          ? `Tìm thấy ${uniqIds.length} khuôn mặt`
          : "Không ai vượt ngưỡng"
      );
    } catch (e: any) {
      Alert.alert(
        "Lỗi",
        e?.response?.data?.message || e?.message || "Nhận diện thất bại"
      );
    } finally {
      setBusy(false);
    }
  };

  const saveAttendance = async () => {
    try {
      if (!recognizedIds.length) return Alert.alert("Chưa có kết quả để lưu");

      await axiosClient.post("/attendance/merge", {
        classId,
        rows: recognizedIds.map((id) => ({
          studentId: id,
          status: "present",
          arrivalTime: new Date().toISOString(),
        })),
      });

      Alert.alert("OK", "Đã lưu điểm danh");
      setRecognizedIds([]);
      setRecognizedDetail([]);
    } catch (e: any) {
      Alert.alert(
        "Lỗi",
        e?.response?.data?.message || "Lưu điểm danh thất bại"
      );
    }
  };

  const Card: React.FC<{ style?: any; children: any }> = ({
    style,
    children,
  }) => <View style={[st.card, style]}>{children}</View>;

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

  const Brand = () => (
    <View style={st.brandWrap}>
      <LinearGradient
        colors={["#d1fae5", "#93c5fd"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={st.brandLogo}
      >
        <Ionicons name="camera-outline" size={26} color="#0b3d2e" />
      </LinearGradient>
      <Text style={st.brandTitle}>Điểm danh bằng khuôn mặt</Text>
      <Text style={st.brandSub}>Chụp/chọn ảnh lớp → Nhận diện → Lưu</Text>
    </View>
  );

  const recognizedCount = recognizedIds.length;
  const ratio =
    totalStudents > 0 ? Math.round((recognizedCount / totalStudents) * 100) : 0;

  return (
    <LinearGradient colors={["#eef7ff", "#f8fffb"]} style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" translucent />
      <SafeAreaView style={st.safe}>
        <Brand />

        {/* Điều khiển nhận diện */}
        <Card>
          <View style={st.rowBetween}>
            <View style={st.tag}>
              <Ionicons name="school-outline" size={14} color="#0f766e" />
              <Text style={st.tagText}>Lớp: {className || "—"}</Text>
            </View>
            <GhostBtn title="Đổi lớp" onPress={loadMyClasses} />
          </View>

          <View style={st.btnRow}>
            <PrimaryBtn
              title="Chụp ảnh lớp"
              icon="aperture-outline"
              onPress={takeShot}
            />
            <PrimaryBtn
              title="Chọn ảnh"
              icon="images-outline"
              onPress={pickFromLibrary}
            />
            <PrimaryBtn
              title={busy ? "Đang nhận diện…" : "Nhận diện"}
              icon="scan-outline"
              onPress={runRecognition}
              disabled={!photoUri || busy}
            />
          </View>

          {!!recognizedIds.length && (
            <View style={{ marginTop: 8 }}>
              <PrimaryBtn
                title="Lưu vào điểm danh"
                icon="save-outline"
                onPress={saveAttendance}
              />
            </View>
          )}
        </Card>

        {/* Ảnh xem trước (nếu có) */}
        {!!photoUri && (
          <Card style={{ padding: 10 }}>
            <Image
              source={{ uri: photoUri }}
              style={st.preview}
              resizeMode="cover"
            />
            <View style={{ flexDirection: "row", gap: UI.gap, marginTop: 10 }}>
              <GhostBtn title="Bỏ ảnh này" onPress={() => setPhotoUri(null)} />
              <GhostBtn title="Chụp/Chọn ảnh khác" onPress={pickFromLibrary} />
            </View>
          </Card>
        )}

        {/* TÓM TẮT ĐIỂM DANH */}
        {(recognizedIds.length > 0 || totalStudents > 0) && (
          <Card>
            <Text style={st.sectionTitle}>Kết quả điểm danh</Text>
            <View style={st.summaryRow}>
              <View style={st.summaryBadge}>
                <Ionicons name="people-outline" size={16} color="#0f766e" />
                <Text style={st.summaryText}>
                  {recognizedCount}/{totalStudents || "?"} ({ratio}%)
                </Text>
              </View>
            </View>

            {/* Danh sách học sinh đã nhận diện + % */}
            <FlatList
              data={recognizedDetail}
              keyExtractor={(i) => i.studentId}
              renderItem={({ item, index }) => (
                <View style={st.resultRow}>
                  <Text style={st.resultName} numberOfLines={1}>
                    {index + 1}. {item.name}
                  </Text>
                  <View style={st.resultRight}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#059669"
                    />
                    <Text style={st.resultPercent}>
                      {typeof item.percent === "number"
                        ? `${item.percent}%`
                        : "—%"}
                    </Text>
                  </View>
                </View>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              ListEmptyComponent={
                <Text style={{ color: "#64748b" }}>
                  Chưa có ai được nhận diện.
                </Text>
              }
            />
          </Card>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: UI.padX, paddingTop: 8 },

  brandWrap: { alignItems: "center", marginTop: 8, marginBottom: 12 },
  brandLogo: {
    width: 58,
    height: 58,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    ...UI.shadow,
    marginBottom: 8,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0b3d2e",
    letterSpacing: 0.2,
  },
  brandSub: { marginTop: 2, color: "#475569", fontSize: 12 },

  card: {
    backgroundColor: UI.glass,
    borderRadius: UI.radius,
    padding: 14,
    borderWidth: 1,
    borderColor: UI.border,
    ...UI.shadow,
    marginBottom: 12,
  },

  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(16,185,129,0.12)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  tagText: { color: "#0f766e", fontWeight: "700", fontSize: 12.5 },

  btnRow: { flexDirection: "row", flexWrap: "wrap", gap: UI.gap },
  btn: { borderRadius: 12 },
  btnInner: {
    paddingVertical: 10,
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

  preview: {
    width: "100%",
    height: 220,
    borderRadius: 10,
    backgroundColor: "#f2f2f2",
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
    color: "#0b3d2e",
  },

  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  summaryBadge: {
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
  summaryText: { color: "#0f766e", fontWeight: "800" },

  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.55)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  resultName: { flex: 1, color: "#0f172a", fontWeight: "700" },
  resultRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  resultPercent: { color: "#0f172a", fontWeight: "700" },
});
