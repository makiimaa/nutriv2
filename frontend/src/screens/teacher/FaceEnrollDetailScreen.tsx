import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Alert,
  FlatList,
  Image,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axiosClient from "../../api/axiosClient";
import { useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

type FaceItem = {
  _id: string;
  imageUrl?: string;
  uploadedAt?: string;
  hasEmbedding: boolean;
};

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

function originFromBaseURL() {
  const base = (axiosClient.defaults.baseURL || "").replace(/\/+$/, "");
  return base.replace(/\/api$/, "");
}
const ORIGIN = originFromBaseURL();

const MEDIA_IMAGES: any =
  (ImagePicker as any).MediaType?.Images ??
  (ImagePicker as any).MediaTypeOptions?.Images ??
  ImagePicker.MediaTypeOptions.Images;

async function listFaces(studentId: string): Promise<FaceItem[]> {
  const r = await axiosClient.get(`/face/student/${studentId}/faces`);
  return r.data?.faces || [];
}
async function deleteFace(studentId: string, faceId: string) {
  const r = await axiosClient.delete(
    `/face/student/${studentId}/face/${faceId}`
  );
  return r.data;
}
async function deleteAllFaces(studentId: string, keepFiles = false) {
  const r = await axiosClient.delete(`/face/student/${studentId}/faces`, {
    params: { keepFiles: keepFiles ? "1" : "" },
  });
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

export default function FaceEnrollDetailScreen() {
  const route = useRoute<any>();
  const { studentId, fullName, schoolId } = route.params as {
    studentId: string;
    fullName: string;
    schoolId?: string;
  };

  const [loading, setLoading] = useState(true);
  const [faces, setFaces] = useState<FaceItem[]>([]);
  const [busy, setBusy] = useState(false);

  const [viewer, setViewer] = useState<{ visible: boolean; uri?: string }>({
    visible: false,
    uri: undefined,
  });

  const reload = async () => {
    setLoading(true);
    try {
      const list = await listFaces(studentId);
      setFaces(list);
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Không tải được danh sách enroll");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    reload();
  }, [studentId]);

  const onAdd = async () => {
    try {
      setBusy(true);
      const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (lib.status !== "granted") throw new Error("Thiếu quyền Thư viện");
      const res = await ImagePicker.launchImageLibraryAsync({
        quality: 0.9,
        allowsEditing: false,
        mediaTypes: MEDIA_IMAGES as any,
      });
      if (res.canceled || !res.assets?.length) return;
      await enrollOne(studentId, schoolId, res.assets[0].uri);
      await reload();
      Alert.alert("OK", "Đã enroll ảnh mới");
    } catch (e: any) {
      Alert.alert(
        "Lỗi",
        e?.response?.data?.message || e?.message || "Enroll thất bại"
      );
    } finally {
      setBusy(false);
    }
  };

  const onDeleteOne = async (faceId: string) => {
    try {
      setBusy(true);
      await deleteFace(studentId, faceId);
      await reload();
    } catch (e: any) {
      Alert.alert(
        "Lỗi",
        e?.response?.data?.message || e?.message || "Xoá thất bại"
      );
    } finally {
      setBusy(false);
    }
  };

  const onDeleteAll = async () => {
    Alert.alert("Xoá tất cả?", "Xoá toàn bộ enroll của học sinh này.", [
      { text: "Huỷ" },
      {
        text: "Xoá",
        style: "destructive",
        onPress: async () => {
          try {
            setBusy(true);
            await deleteAllFaces(studentId, false);
            await reload();
          } catch (e: any) {
            Alert.alert(
              "Lỗi",
              e?.response?.data?.message || e?.message || "Xoá thất bại"
            );
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const PrimaryBtn = ({
    title,
    icon,
    onPress,
    color = ["#34d399", "#059669"],
    disabled,
  }: {
    title: string;
    icon?: any;
    onPress: () => void;
    color?: string[];
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
        <Ionicons name="id-card-outline" size={26} color="#0b3d2e" />
      </LinearGradient>
      <Text style={st.brandTitle}>{fullName}</Text>
      <Text style={st.brandSub}>Ảnh enroll & trạng thái embedding</Text>
    </View>
  );

  const FaceCard = ({ item, single }: { item: FaceItem; single: boolean }) => {
    const uri = item.imageUrl
      ? item.imageUrl.startsWith("http")
        ? item.imageUrl
        : `${ORIGIN}${item.imageUrl}`
      : undefined;

    return (
      <View style={[st.faceCard, single && st.faceCardSingle]}>
        <Pressable
          onPress={() => uri && setViewer({ visible: true, uri })}
          style={{ borderRadius: 10, overflow: "hidden" }}
        >
          {!!uri ? (
            <Image source={{ uri }} style={st.faceImg} />
          ) : (
            <View style={st.faceEmpty}>
              <Text>(Không có ảnh gốc)</Text>
            </View>
          )}
        </Pressable>

        <View style={st.faceMetaRow}>
          <View
            style={[st.badge, item.hasEmbedding ? st.badgeOn : st.badgeOff]}
          >
            <Ionicons
              name={
                item.hasEmbedding ? "checkmark-circle" : "alert-circle-outline"
              }
              size={12}
              color={item.hasEmbedding ? "#059669" : "#64748b"}
            />
            <Text
              style={[
                st.badgeText,
                item.hasEmbedding && { color: "#059669", fontWeight: "800" },
              ]}
            >
              {item.hasEmbedding ? "Có embedding" : "Thiếu embedding"}
            </Text>
          </View>
          <GhostBtn title="Xoá" onPress={() => onDeleteOne(item._id)} />
        </View>
      </View>
    );
  };

  const single = faces.length === 1;

  return (
    <LinearGradient colors={["#eef7ff", "#f8fffb"]} style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" translucent />
      <SafeAreaView style={st.safe}>
        <Brand />

        {/* Actions */}
        <View style={st.actionRow}>
          <PrimaryBtn
            title="Thêm ảnh"
            icon="images-outline"
            onPress={onAdd}
            disabled={busy}
          />
          <PrimaryBtn
            title="Xoá tất cả"
            icon="trash-outline"
            color={["#ef4444", "#b91c1c"]}
            onPress={onDeleteAll}
            disabled={busy || faces.length === 0}
          />
        </View>

        {/* Content */}
        {loading ? (
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <ActivityIndicator />
            <Text style={{ marginTop: 6 }}>Đang tải…</Text>
          </View>
        ) : faces.length === 0 ? (
          <View style={st.emptyCard}>
            <Text style={{ color: "#64748b" }}>Chưa có ảnh enroll.</Text>
          </View>
        ) : (
          <FlatList
            data={faces}
            keyExtractor={(i) => i._id}
            numColumns={single ? 1 : 2}
            columnWrapperStyle={!single ? { gap: 12 } : undefined}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            contentContainerStyle={{ paddingBottom: 26 }}
            renderItem={({ item }) => <FaceCard item={item} single={single} />}
          />
        )}
      </SafeAreaView>

      {/* Image Viewer Modal */}
      <Modal
        visible={viewer.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setViewer({ visible: false })}
      >
        <View style={st.viewerBackdrop}>
          <View style={st.viewerHeader}>
            <Pressable
              onPress={() => setViewer({ visible: false })}
              style={st.viewerClose}
            >
              <Ionicons name="close" size={22} color="#fff" />
            </Pressable>
          </View>
          {/* iOS có pinch-zoom; Android sẽ scroll + tap để đóng */}
          <Pressable
            style={{ flex: 1 }}
            onPress={() => setViewer({ visible: false })}
          >
            <ScrollView
              maximumZoomScale={3}
              minimumZoomScale={1}
              contentContainerStyle={st.viewerContent}
              centerContent
            >
              {!!viewer.uri && (
                <Image
                  source={{ uri: viewer.uri }}
                  style={st.viewerImg}
                  resizeMode="contain"
                />
              )}
            </ScrollView>
          </Pressable>
        </View>
      </Modal>
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
    backgroundColor: "#fff",
  },
  brandTitle: { fontSize: 18, fontWeight: "800", color: "#0b3d2e" },
  brandSub: { fontSize: 12, color: "#64748b", marginTop: 2 },

  actionRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
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
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  ghostText: { fontWeight: "700", color: "#0f172a" },

  emptyCard: {
    backgroundColor: UI.glass,
    borderRadius: UI.radius,
    padding: 14,
    borderWidth: 1,
    borderColor: UI.border,
    ...UI.shadow,
  },
  faceCard: {
    flex: 1,
    backgroundColor: UI.glass,
    borderRadius: UI.radius,
    padding: 10,
    borderWidth: 1,
    borderColor: UI.border,
    ...UI.shadow,
  },
  faceCardSingle: { flex: 1, maxWidth: "100%" },

  faceImg: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    backgroundColor: "#f2f2f2",
  },
  faceEmpty: {
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fafafa",
    borderRadius: 10,
  },

  faceMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },

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

  viewerBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)" },
  viewerHeader: {
    height: 52,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  viewerClose: { padding: 6 },
  viewerContent: {
    minHeight: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerImg: { width: "100%", height: undefined, aspectRatio: 1 },
});
