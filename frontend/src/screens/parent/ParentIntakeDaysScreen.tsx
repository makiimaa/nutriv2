import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Alert,
  Pressable,
  StyleSheet,
  TextInput,
  RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosClient from "../../api/axiosClient";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/AppNavigator";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

type Nav = NativeStackNavigationProp<RootStackParamList, "ParentIntakeDays">;
type Row = { date: string; count: number };

type Student = {
  _id?: string;
  fullName?: string;
  name?: string;
};

type ParentMe = {
  _id: string;
  name?: string;
  fullName?: string;
  studentIds?: string[];
};

const STORAGE_KEY_CURRENT_CHILD = "parent.currentChildId";

export default function ParentIntakeDaysScreen() {
  const navigation = useNavigation<Nav>();

  const [childIds, setChildIds] = useState<string[]>([]);
  const [childMap, setChildMap] = useState<Record<string, Student>>({});
  const [currentId, setCurrentId] = useState<string | undefined>(undefined);

  const currentStudent: Student | undefined = currentId
    ? childMap[currentId]
    : undefined;
  const currentStudentName = useMemo(
    () => currentStudent?.fullName || currentStudent?.name || "—",
    [currentStudent]
  );

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  const fetchStudentsByIds = useCallback(async (ids: string[]) => {
    if (!ids.length) return {};
    try {
      const res = await axiosClient.get("/students/by-ids", {
        params: { ids: ids.join(",") },
      });
      const arr: Student[] = Array.isArray(res?.data) ? res.data : [];
      const map: Record<string, Student> = {};
      for (const s of arr) if (s && s._id) map[String(s._id)] = s;
      return map;
    } catch (e: any) {
      console.warn("[ParentIntakeDays] fetchStudentsByIds:", e?.message || e);
      return {};
    }
  }, []);

  const fetchParentAndInit = useCallback(async () => {
    try {
      const p = await axiosClient.get("/parents/me");
      const me: ParentMe = p?.data || {};
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
        setChildIds([]);
        setChildMap({});
        setCurrentId(undefined);
      }
    } catch (e: any) {
      console.warn("[ParentIntakeDays] init error:", e?.message || e);
      setChildIds([]);
      setChildMap({});
      setCurrentId(undefined);
    }
  }, [fetchStudentsByIds]);

  const load = useCallback(async (sid?: string) => {
    if (!sid) {
      setRows([]);
      return;
    }
    try {
      setLoading(true);
      const r = await axiosClient.get("/intake/dates-mine", {
        params: { studentId: sid },
      });
      setRows(r.data || []);
    } catch (e: any) {
      Alert.alert(
        "Lỗi",
        e?.response?.data?.message || "Không tải được dữ liệu"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchParentAndInit();
  }, [fetchParentAndInit]);

  useFocusEffect(
    useCallback(() => {
      if (currentId) load(currentId);
    }, [currentId, load])
  );

  useEffect(() => {
    if (currentId) load(currentId);
  }, [currentId, load]);

  const humanDate = (iso: string) => {
    try {
      const d = new Date(iso);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString(undefined, {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "2-digit",
        });
      }
    } catch {}
    return iso;
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const d = r.date.toLowerCase();
      if (d.includes(s)) return true;
      const human = humanDate(r.date).toLowerCase();
      return human.includes(s);
    });
  }, [q, rows]);

  const cycleChild = useCallback(() => {
    if (!childIds.length || !currentId) return;
    const idx = childIds.indexOf(currentId);
    const next = childIds[(idx + 1) % childIds.length];
    setCurrentId(next);
    AsyncStorage.setItem(STORAGE_KEY_CURRENT_CHILD, next).catch(() => {});
  }, [childIds, currentId]);

  const Item = ({ item }: { item: Row }) => (
    <Pressable
      onPress={() =>
        navigation.navigate("ParentIntakeByDate", {
          date: item.date,
          studentId: currentId,
        })
      }
      style={({ pressed }) => [
        styles.card,
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      <View style={styles.cardLeft}>
        <View style={styles.iconWrap}>
          <Ionicons name="fast-food-outline" size={20} color="#0f766e" />
        </View>
      </View>
      <View style={styles.cardMid}>
        <Text style={styles.cardTitle}>{humanDate(item.date)}</Text>
        <Text style={styles.cardSub}>{item.date}</Text>
      </View>
      <View style={styles.cardRight}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.count}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#334155" />
      </View>
    </Pressable>
  );

  return (
    <LinearGradient
      colors={["#eef7ff", "#f8fffb"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Bữa ăn — theo ngày</Text>
        <Pressable
          onPress={() => load(currentId)}
          style={({ pressed }) => [
            styles.reloadBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons name="refresh" size={18} color="#0b3d2e" />
          <Text style={styles.reloadText}>Tải lại</Text>
        </Pressable>
      </View>

      {/* Student switcher */}
      <View style={styles.studentBar}>
        <Text style={styles.studentText}>
          Học sinh: <Text style={styles.studentName}>{currentStudentName}</Text>
        </Text>
        {childIds.length > 1 && (
          <Pressable onPress={cycleChild} style={styles.switchBtn}>
            <Ionicons name="swap-horizontal" size={18} color="#0b3d2e" />
            <Text style={styles.switchText}>
              {childIds.indexOf(currentId || "") + 1 || 1}/{childIds.length}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color="#64748b" />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Tìm ngày (ví dụ 2025-09-08 hoặc 08/09/2025)"
          placeholderTextColor="#94a3b8"
          style={styles.searchInput}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {!!q && (
          <Pressable onPress={() => setQ("")} hitSlop={10}>
            <Ionicons name="close-circle" size={16} color="#94a3b8" />
          </Pressable>
        )}
      </View>

      {/* List */}
      <FlatList
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        data={filtered}
        keyExtractor={(i) => i.date}
        renderItem={Item}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => load(currentId)}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={22} color="#94a3b8" />
            <Text style={styles.emptyText}>
              {q ? "Không thấy ngày phù hợp." : "Chưa có dữ liệu."}
            </Text>
          </View>
        }
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0b3d2e",
    letterSpacing: 0.2,
  },
  reloadBtn: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(16,185,129,0.15)",
  },
  reloadText: { fontWeight: "700", color: "#0b3d2e" },

  studentBar: {
    marginHorizontal: 16,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    backgroundColor: "rgba(255,255,255,0.75)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  studentText: { color: "#334155" },
  studentName: { fontWeight: "800", color: "#0f172a" },
  switchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(59,130,246,0.12)",
  },
  switchText: { fontWeight: "700", color: "#0b3d2e", fontSize: 12 },

  searchWrap: {
    marginHorizontal: 16,
    marginBottom: 8,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    backgroundColor: "rgba(255,255,255,0.7)",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 14,
    color: "#0f172a",
  },

  card: {
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.75)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardLeft: { marginRight: 10 },
  iconWrap: {
    backgroundColor: "rgba(16,185,129,0.18)",
    borderRadius: 10,
    padding: 8,
  },
  cardMid: { flex: 1 },
  cardTitle: { fontWeight: "800", color: "#0f172a" },
  cardSub: { color: "#64748b", marginTop: 2, fontSize: 12 },
  cardRight: { alignItems: "flex-end", gap: 6, flexDirection: "row" },
  badge: {
    minWidth: 28,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: "rgba(59,130,246,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontWeight: "800", color: "#1d4ed8" },

  empty: { alignItems: "center", marginTop: 24, gap: 6 },
  emptyText: { color: "#94a3b8" },
});
