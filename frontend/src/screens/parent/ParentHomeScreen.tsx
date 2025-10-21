import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosClient from "../../api/axiosClient";
import { LinearGradient } from "expo-linear-gradient";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

type P = NativeStackScreenProps<RootStackParamList, "ParentHome">;

type Student = {
  _id?: string;
  fullName?: string;
  name?: string;
  faceImages?: Array<{
    imageUrl?: string;
    encodedFace?: string;
    uploadedAt: string | Date;
  }>;
};

type ParentMe = {
  _id: string;
  name?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  studentIds?: string[];
};

function originFromBaseURL() {
  const base = (axiosClient.defaults.baseURL || "").replace(/\/+$/, "");
  const origin = base.replace(/\/api$/, "");

  return origin;
}
const ORIGIN = originFromBaseURL();

function ensureAbsoluteUrl(url?: string) {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  const abs = `${ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
  return abs;
}

const STORAGE_KEY_CURRENT_CHILD = "parent.currentChildId";

export default function ParentHomeScreen({ navigation }: P) {
  const [parentName, setParentName] = useState<string>("");

  const [childIds, setChildIds] = useState<string[]>([]);
  const [childMap, setChildMap] = useState<Record<string, Student>>({});
  const [currentId, setCurrentId] = useState<string | undefined>(undefined);

  const fetchStudentsByIds = useCallback(async (ids: string[]) => {
    if (!ids.length) return {};
    try {
      const qs = ids.join(",");
      const res = await axiosClient.get("/students/by-ids", {
        params: { ids: qs },
      });
      const arr: Student[] = Array.isArray(res?.data) ? res.data : [];
      const map: Record<string, Student> = {};
      for (const s of arr) {
        if (s && s._id) map[String(s._id)] = s;
      }

      const missing = ids.filter((id) => !map[id]);
      if (missing.length) {
        console.warn("[ParentHome] by-ids missing:", missing);
      }
      return map;
    } catch (e: any) {
      console.warn("[ParentHome] fetchStudentsByIds error:", e?.message || e);
      return {};
    }
  }, []);

  const fetchParentAndInit = useCallback(async () => {
    try {
      const p = await axiosClient.get("/parents/me");
      const me: ParentMe = p?.data || {};

      setParentName(me?.fullName || me?.name || "");

      const ids = Array.isArray(me.studentIds) ? me.studentIds : [];

      setChildIds(ids);

      if (ids.length) {
        const map = await fetchStudentsByIds(ids);
        setChildMap(map);

        const saved = await AsyncStorage.getItem(STORAGE_KEY_CURRENT_CHILD);
        const firstValid =
          ids.find((x) => (map as any)[x] && (map as any)[x]._id) || ids[0];
        const chosen = ids.find((x) => x === saved && map[x]) || firstValid;

        setCurrentId(chosen);
        if (chosen) {
          await AsyncStorage.setItem(STORAGE_KEY_CURRENT_CHILD, chosen);
        }
      } else {
        try {
          const s = await axiosClient.get("/students/me");
          const one: Student = s.data || {};

          if (one?._id) {
            setChildIds([String(one._id)]);
            setChildMap({ [String(one._id)]: one });
            setCurrentId(String(one._id));
            await AsyncStorage.setItem(
              STORAGE_KEY_CURRENT_CHILD,
              String(one._id)
            );
          } else {
            setChildIds([]);
            setChildMap({});
            setCurrentId(undefined);
          }
        } catch (e: any) {
          console.warn(
            "[ParentHome] fallback /students/me failed:",
            e?.message
          );
          setChildIds([]);
          setChildMap({});
          setCurrentId(undefined);
        }
      }
    } catch (e: any) {
      console.warn("[ParentHome] fetchParentAndInit error:", e?.message || e);
      setChildIds([]);
      setChildMap({});
      setCurrentId(undefined);
    }
  }, [fetchStudentsByIds]);

  useEffect(() => {
    fetchParentAndInit();
  }, [fetchParentAndInit]);

  useFocusEffect(
    useCallback(() => {
      fetchParentAndInit();
    }, [fetchParentAndInit])
  );

  const currentStudent: Student | undefined = currentId
    ? childMap[currentId]
    : undefined;
  const currentStudentName = useMemo(
    () => currentStudent?.fullName || currentStudent?.name || "",
    [currentStudent]
  );

  const initials = useMemo(() => {
    const parts = (currentStudentName || "").trim().split(/\s+/);
    if (!parts.length) return "—";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  }, [currentStudentName]);

  const avatarUri = useMemo(() => {
    const raw = currentStudent?.faceImages?.[0]?.imageUrl;
    const abs = ensureAbsoluteUrl(raw);

    return abs;
  }, [currentStudent]);

  const cycleChild = useCallback(() => {
    if (!childIds.length || !currentId) return;
    const idx = childIds.indexOf(currentId);
    const next = childIds[(idx + 1) % childIds.length];

    setCurrentId(next);
    AsyncStorage.setItem(STORAGE_KEY_CURRENT_CHILD, next).catch(() => {});
  }, [childIds, currentId]);

  const actions = [
    {
      key: "intakeDays",
      label: "Bữa ăn theo ngày",
      icon: "fast-food-outline" as const,
      onPress: () => navigation.navigate("ParentIntakeDays"),
    },
    {
      key: "healthDays",
      label: "Sức khỏe theo ngày",
      icon: "heart-outline" as const,
      onPress: () => navigation.navigate("ParentHealthDays"),
    },
    {
      key: "chat",
      label: "Trao đổi GV",
      icon: "chatbubble-ellipses-outline" as const,
      onPress: () => navigation.navigate("ParentChat"),
    },
    {
      key: "chart",
      label: "Biểu đồ phát triển",
      icon: "stats-chart-outline" as const,
      onPress: () => navigation.navigate("ParentMeasurementsChart"),
    },
    {
      key: "stats",
      label: "Thống kê của con",
      icon: "analytics-outline" as const,
      onPress: () => navigation.navigate("ParentStudentStats"),
    },
    {
      key: "account",
      label: "Tài khoản",
      icon: "person-circle-outline" as const,
      onPress: () => navigation.navigate("ParentAccount"),
    },
  ];

  const logout = async () => {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("parentName");
    navigation.replace("Login");
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
        {/* Greeting */}
        <View style={styles.brand}>
          <Text style={styles.greet}>
            Xin chào:{" "}
            <Text style={styles.greetName}>{parentName || "Phụ huynh"}</Text>
          </Text>

          {/* Avatar + nút đổi con */}
          <View style={styles.avatarWrap}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <LinearGradient
                colors={["#d1fae5", "#93c5fd"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>{initials}</Text>
              </LinearGradient>
            )}
            {childIds.length > 1 && (
              <Pressable onPress={cycleChild} style={styles.swapBtn}>
                <Ionicons name="refresh-outline" size={38} color="#0b3d2e" />
              </Pressable>
            )}
          </View>

          <Text style={styles.studentLabel}>
            Học sinh:{" "}
            <Text style={styles.studentName}>{currentStudentName || "—"}</Text>
          </Text>

          {childIds.length > 1 && currentId && (
            <Text style={{ marginTop: 4, color: "#64748b", fontSize: 12 }}>
              {childIds.indexOf(currentId) + 1}/{childIds.length}
            </Text>
          )}
        </View>

        {/* separator */}
        <View style={styles.separator} />

        {/* grid */}
        <View style={styles.grid}>
          {actions.map((a) => (
            <Pressable
              key={a.key}
              onPress={a.onPress}
              style={({ pressed }) => [
                styles.tile,
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
            >
              <View style={styles.tileInner}>
                <View style={styles.tileIconWrap}>
                  <Ionicons name={a.icon} size={22} color="#0f766e" />
                </View>
                <Text style={styles.tileText}>{a.label}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* logout */}
        <Pressable
          onPress={logout}
          style={({ pressed }) => [
            styles.logoutBtn,
            pressed && { transform: [{ scale: 0.99 }] },
          ]}
        >
          <LinearGradient
            colors={["#ef4444", "#b91c1c"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoutInner}
          >
            <Ionicons name="log-out-outline" size={18} color="#fff" />
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </LinearGradient>
        </Pressable>
      </SafeAreaView>
    </LinearGradient>
  );
}

const GAP = 14;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingTop: 8,
    paddingHorizontal: 24,
    paddingBottom: 16,
    justifyContent: "space-between",
  },
  brand: { alignItems: "center", marginTop: 8 },
  greet: { fontSize: 16, color: "#334155", marginBottom: 10 },
  greetName: { fontWeight: "800", color: "#0b3d2e" },

  avatarWrap: {
    width: 208,
    height: 208,
    borderRadius: 999,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    backgroundColor: "#fff",
  },
  avatar: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: { width: "100%", height: "100%" },
  swapBtn: {
    position: "absolute",
    right: -4,
    bottom: -4,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 999,
    padding: 6,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },

  avatarText: {
    fontSize: 58,
    fontWeight: "900",
    color: "#0b3d2e",
    letterSpacing: 0.5,
  },
  studentLabel: { marginTop: 8, color: "#475569", fontSize: 13 },
  studentName: { fontWeight: "700", color: "#0f172a" },

  separator: {
    height: 1,
    backgroundColor: "rgba(15, 23, 42, 0.08)",
    marginVertical: 12,
    borderRadius: 1,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    rowGap: GAP,
    marginTop: 8,
  },
  tile: { width: "45%", marginHorizontal: "2.5%" },
  tileInner: {
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  tileIconWrap: {
    backgroundColor: "rgba(16,185,129,0.18)",
    borderRadius: 10,
    padding: 8,
    marginBottom: 10,
  },
  tileText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: 0.2,
    textAlign: "center",
  },

  logoutBtn: { marginTop: 6 },
  logoutInner: {
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: "#b91c1c",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    width: "80%",
    marginHorizontal: "10%",
  },
  logoutText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
