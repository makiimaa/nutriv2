import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  Alert,
  ScrollView,
  StyleSheet,
  Pressable,
} from "react-native";
import { RouteProp, useRoute, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosClient from "../../api/axiosClient";
import type { RootStackParamList } from "../../navigation/AppNavigator";
import { FoodItem } from "../../types";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

type R = RouteProp<RootStackParamList, "ParentIntakeByDate">;

type Student = {
  _id?: string;
  fullName?: string;
  name?: string;
};
type ParentMe = {
  _id: string;
  studentIds?: string[];
};

const STORAGE_KEY_CURRENT_CHILD = "parent.currentChildId";

export default function ParentIntakeByDateScreen() {
  const route = useRoute<R>();
  const date = route.params?.date as string;
  const studentId = (route.params as any)?.studentId as string | undefined;

  const [doc, setDoc] = useState<any>(null);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);

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

  const fiMap = useMemo(() => {
    const m = new Map<string, FoodItem>();
    for (const fi of foodItems || []) {
      const key = fi && fi._id ? String(fi._id) : "";
      if (key) m.set(key, fi);
    }
    return m;
  }, [foodItems]);

  const humanDate = (iso: string) => {
    try {
      const d = new Date(iso);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "2-digit",
        });
      }
    } catch {}
    return iso;
  };

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
      console.warn("[ParentIntakeByDate] fetchStudentsByIds:", e?.message || e);
      return {};
    }
  }, []);

  const initStudents = useCallback(async () => {
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
      console.warn("[ParentIntakeByDate] init error:", e?.message || e);
      setChildIds([]);
      setChildMap({});
      setCurrentId(undefined);
    }
  }, [fetchStudentsByIds]);

  const load = useCallback(
    async (sid?: string) => {
      if (!sid || !date) {
        setDoc(null);
        return;
      }
      try {
        setLoading(true);
        const [mine, fi] = await Promise.all([
          axiosClient.get(`/intake/by-date-mine/${date}`, {
            params: { studentId },
          }),
          axiosClient.get("/food-items"),
        ]);
        setDoc(mine.data?.doc || null);
        setFoodItems(fi.data || []);
      } catch (e: any) {
        Alert.alert(
          "Lỗi",
          e?.response?.data?.message || "Không tải được dữ liệu"
        );
      } finally {
        setLoading(false);
      }
    },
    [date]
  );

  useEffect(() => {
    initStudents();
  }, [initStudents]);

  useFocusEffect(
    useCallback(() => {
      if (currentId) load(currentId);
    }, [currentId, load])
  );
  useEffect(() => {
    if (currentId) load(currentId);
  }, [currentId, load]);

  const labelForRow = (r: any) => {
    if (r?.foodInfo?.name) {
      return `${r.foodInfo.name}${
        r.foodInfo.unit ? ` (${r.foodInfo.unit})` : ""
      }`;
    }
    const fi = fiMap.get(String(r?.foodItemId || ""));
    if (fi?.name) return `${fi.name}${fi.unit ? ` (${fi.unit})` : ""}`;
    return String(r?.foodItemId || "—");
  };

  const Section = ({ title, rows }: { title: string; rows: any[] }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {(!rows || rows.length === 0) && <Text style={styles.muted}>—</Text>}
      {rows?.map((r: any, idx: number) => (
        <View key={idx} style={styles.row}>
          <Text style={styles.rowName}>{labelForRow(r)}</Text>
          <Text style={styles.rowDetail}>
            Dự kiến: {r.plannedQuantity ?? 0} · Thực tế: {r.actualQuantity ?? 0}
          </Text>
        </View>
      ))}
    </View>
  );

  const meal = (key: "breakfast" | "lunch" | "snack") =>
    doc?.mealIntakes?.[key] || {};
  const rowsOf = (key: "breakfast" | "lunch" | "snack") =>
    meal(key).actualIntake || [];

  const cycleChild = useCallback(() => {
    if (!childIds.length || !currentId) return;
    const idx = childIds.indexOf(currentId);
    const next = childIds[(idx + 1) % childIds.length];
    setCurrentId(next);
    AsyncStorage.setItem(STORAGE_KEY_CURRENT_CHILD, next).catch(() => {});
  }, [childIds, currentId]);

  return (
    <LinearGradient
      colors={["#eef7ff", "#f8fffb"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={styles.header}>
          <Text style={styles.title}>Bữa ăn ngày</Text>
          <Text style={styles.subtitle}>{humanDate(date)}</Text>
          <Text style={styles.caption}>{date}</Text>
        </View>

        {/* Student switcher */}
        {/* <View style={styles.studentBar}>
          <Text style={styles.studentText}>
            Học sinh:{" "}
            <Text style={styles.studentName}>{currentStudentName}</Text>
          </Text>
          {childIds.length > 1 && (
            <Pressable onPress={cycleChild} style={styles.switchBtn}>
              <Ionicons name="swap-horizontal" size={18} color="#0b3d2e" />
              <Text style={styles.switchText}>
                {childIds.indexOf(currentId || "") + 1 || 1}/{childIds.length}
              </Text>
            </Pressable>
          )}
        </View> */}

        {!doc && (
          <Text style={styles.muted}>Chưa có bản ghi cho ngày này.</Text>
        )}

        {!!doc && (
          <>
            <Section title="Bữa sáng" rows={rowsOf("breakfast")} />
            <Section title="Bữa trưa" rows={rowsOf("lunch")} />
            <Section title="Bữa xế" rows={rowsOf("snack")} />

            <View style={styles.totals}>
              <Text style={styles.sectionTitle}>Tổng ngày</Text>
              <View style={styles.totalGrid}>
                <View style={styles.totalCard}>
                  <Text style={styles.totalLabel}>kcal</Text>
                  <Text style={styles.totalVal}>
                    {doc?.dailyTotalIntake?.calories ?? 0}
                  </Text>
                </View>
                <View style={styles.totalCard}>
                  <Text style={styles.totalLabel}>protein</Text>
                  <Text style={styles.totalVal}>
                    {doc?.dailyTotalIntake?.protein ?? 0}
                  </Text>
                </View>
                <View style={styles.totalCard}>
                  <Text style={styles.totalLabel}>fat</Text>
                  <Text style={styles.totalVal}>
                    {doc?.dailyTotalIntake?.fat ?? 0}
                  </Text>
                </View>
                <View style={styles.totalCard}>
                  <Text style={styles.totalLabel}>carb</Text>
                  <Text style={styles.totalVal}>
                    {doc?.dailyTotalIntake?.carbohydrate ?? 0}
                  </Text>
                </View>
              </View>
            </View>

            {!!doc?.notes && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Ghi chú</Text>
                <Text style={styles.noteText}>{doc.notes}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 8 },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0b3d2e",
    letterSpacing: 0.2,
  },
  subtitle: { marginTop: 2, color: "#0f172a", fontWeight: "700" },
  caption: { color: "#64748b", fontSize: 12 },

  studentBar: {
    marginTop: 6,
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

  section: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.75)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  sectionTitle: { fontWeight: "800", color: "#0f172a", marginBottom: 6 },
  muted: { color: "#64748b", marginTop: 6 },

  row: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  rowName: { fontWeight: "700", color: "#0f172a" },
  rowDetail: { color: "#475569", marginTop: 2 },
  noteText: { color: "#0f172a" },

  totals: { marginTop: 12 },
  totalGrid: {
    marginTop: 6,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  totalCard: {
    flexGrow: 1,
    minWidth: "46%",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "rgba(16,185,129,0.10)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  totalLabel: { fontSize: 12, color: "#0b3d2e" },
  totalVal: { fontSize: 16, fontWeight: "800", color: "#0b3d2e", marginTop: 2 },
});
