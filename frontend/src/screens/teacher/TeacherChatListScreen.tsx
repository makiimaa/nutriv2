import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Alert,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Pressable,
  RefreshControl,
} from "react-native";
import axiosClient from "../../api/axiosClient";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const UI = {
  padX: 24,
  glass: "rgba(255,255,255,0.6)",
  border: "rgba(0,0,0,0.08)",
  radius: 14,
  shadow: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  } as const,
};

function fmtDate(d?: string) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
}

export default function TeacherChatListScreen() {
  const nav = useNavigation<any>();
  const [threads, setThreads] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const r = await axiosClient.get("/conversations/my-threads");
      setThreads(r.data || []);
    } catch (e: any) {
      Alert.alert(
        "Lỗi",
        e?.response?.data?.message || "Không tải được danh sách"
      );
    }
  };
  useEffect(() => {
    load();
  }, []);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, []);

  const Brand = () => (
    <View style={st.brandWrap}>
      <LinearGradient
        colors={["#d1fae5", "#93c5fd"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={st.brandLogo}
      >
        <Ionicons name="chatbubbles-outline" size={26} color="#0b3d2e" />
      </LinearGradient>
      <Text style={st.brandTitle}>Hội thoại với phụ huynh</Text>
      <Text style={st.brandSub}>Trao đổi nhanh – rõ ràng – lịch sử đầy đủ</Text>
    </View>
  );

  const StartBtn = () => (
    <Pressable
      onPress={() => nav.navigate("TeacherStartChat")}
      style={st.startBtn}
    >
      <LinearGradient
        colors={["#34d399", "#059669"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={st.startInner}
      >
        <Ionicons name="add-outline" size={16} color="#fff" />
        <Text style={st.startText}>Bắt đầu hội thoại</Text>
      </LinearGradient>
    </Pressable>
  );

  const Row = ({ item }: { item: any }) => (
    <Pressable
      onPress={() => nav.navigate("TeacherChatDetail", { threadId: item._id })}
      style={st.card}
    >
      <View style={st.avatar}>
        <Ionicons name="person-outline" size={18} color="#0f766e" />
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={st.name}>
          {item.studentName ?? item.studentId}
        </Text>
        <Text numberOfLines={1} style={st.meta}>
          Cập nhật: {fmtDate(item.lastMessageAt)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#0f172a" />
    </Pressable>
  );

  return (
    <LinearGradient colors={["#eef7ff", "#f8fffb"]} style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" translucent />
      <SafeAreaView style={st.safe}>
        <Brand />
        <StartBtn />

        <FlatList
          style={{ marginTop: 12 }}
          data={threads}
          keyExtractor={(i) => i._id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={Row}
          ListEmptyComponent={
            <Text
              style={{ textAlign: "center", color: "#64748b", marginTop: 12 }}
            >
              Chưa có hội thoại.
            </Text>
          }
          contentContainerStyle={{ paddingBottom: 26 }}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: UI.padX, paddingTop: 8 },

  brandWrap: { alignItems: "center", marginTop: 8, marginBottom: 10 },
  brandLogo: {
    width: 58,
    height: 58,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    ...UI.shadow,
    marginBottom: 8,
  },
  brandTitle: { fontSize: 18, fontWeight: "800", color: "#0b3d2e" },
  brandSub: { fontSize: 12, color: "#64748b", marginTop: 2 },

  startBtn: { alignSelf: "center" },
  startInner: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  startText: { color: "#fff", fontWeight: "700", fontSize: 13.5 },

  card: {
    backgroundColor: UI.glass,
    borderRadius: UI.radius,
    padding: 12,
    borderWidth: 1,
    borderColor: UI.border,
    ...UI.shadow,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(16,185,129,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontWeight: "800", color: "#0f172a" },
  meta: { color: "#64748b", marginTop: 2, fontSize: 12.5 },
});
