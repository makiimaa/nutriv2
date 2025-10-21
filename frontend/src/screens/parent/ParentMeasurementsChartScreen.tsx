import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Alert,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosClient from "../../api/axiosClient";
import SimpleLineChart from "../../components/SimpleLineChart";
import MultiLineChart from "../../components/MultiLineChart";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

type Row = {
  measurementDate: string | Date;
  height?: number;
  weight?: number;
  bmi?: number;
};

type Student = { _id?: string; fullName?: string; name?: string };
type ParentMe = { _id: string; studentIds?: string[] };

const STORAGE_KEY_CURRENT_CHILD = "parent.currentChildId";

export default function ParentMeasurementsChartScreen() {
  const [childIds, setChildIds] = useState<string[]>([]);
  const [childMap, setChildMap] = useState<Record<string, Student>>({});
  const [currentId, setCurrentId] = useState<string | undefined>(undefined);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const currentStudent = currentId ? childMap[currentId] : undefined;
  const currentStudentName = useMemo(
    () => currentStudent?.fullName || currentStudent?.name || "—",
    [currentStudent]
  );

  const fetchStudentsByIds = useCallback(async (ids: string[]) => {
    if (!ids.length) return {};
    try {
      const r = await axiosClient.get("/students/by-ids", {
        params: { ids: ids.join(",") },
      });
      const arr: Student[] = Array.isArray(r?.data) ? r.data : [];
      const map: Record<string, Student> = {};
      for (const s of arr) if (s && s._id) map[String(s._id)] = s;
      return map;
    } catch (e: any) {
      console.warn(
        "[ParentMeasurementsChart] fetchStudentsByIds:",
        e?.message || e
      );
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
        const firstValid = ids.find((x) => (map as any)[x]?._id) || ids[0];
        const chosen = ids.find((x) => x === saved && map[x]) || firstValid;
        setCurrentId(chosen);
        if (chosen)
          await AsyncStorage.setItem(STORAGE_KEY_CURRENT_CHILD, chosen);
      } else {
        setChildIds([]);
        setChildMap({});
        setCurrentId(undefined);
      }
    } catch (e: any) {
      console.warn("[ParentMeasurementsChart] init:", e?.message || e);
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
      const r = await axiosClient.get("/measurements/mine", {
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

  const [compare, setCompare] = useState<any>(null);

  const loadCompare = useCallback(async (sid?: string) => {
    if (!sid) {
      setCompare(null);
      return;
    }
    try {
      const r = await axiosClient.get("/measurements/mine/compare", {
        params: { studentId: sid },
      });
      setCompare(r.data);
    } catch (e: any) {
      console.warn("compare failed:", e?.message || e);
    }
  }, []);

  useEffect(() => {
    initStudents();
  }, [initStudents]);
  useEffect(() => {
    if (currentId) load(currentId);
    if (currentId) loadCompare(currentId);
  }, [currentId, load]);

  const cycleChild = useCallback(() => {
    if (!childIds.length || !currentId) return;
    const idx = childIds.indexOf(currentId);
    const next = childIds[(idx + 1) % childIds.length];
    setCurrentId(next);
    AsyncStorage.setItem(STORAGE_KEY_CURRENT_CHILD, next).catch(() => {});
  }, [childIds, currentId]);

  const toSeries = (key: "height" | "weight" | "bmi") =>
    rows
      .slice()
      .reverse()
      .map((r) => ({
        xLabel: String(r.measurementDate).slice(0, 10),
        y: Number((r as any)[key]),
      }))
      .filter((d) => Number.isFinite(d.y));

  const heightSeries = useMemo(() => toSeries("height"), [rows]);
  const weightSeries = useMemo(() => toSeries("weight"), [rows]);
  const bmiSeries = useMemo(() => toSeries("bmi"), [rows]);

  return (
    <LinearGradient
      colors={["#eef7ff", "#f8fffb"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.wrap}>
        <Text style={styles.title}>Biểu đồ phát triển của con</Text>

        {/* student switcher */}
        <View style={styles.studentBar}>
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
        </View>

        {loading && <ActivityIndicator style={{ marginVertical: 8 }} />}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Chiều cao (cm)</Text>
          <SimpleLineChart
            data={heightSeries}
            unit="cm"
            height={160}
            mode="line"
            showAvg
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cân nặng (kg)</Text>
          <SimpleLineChart
            data={weightSeries}
            unit="kg"
            height={160}
            mode="line"
            color="#10b981"
            showAvg
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>BMI</Text>
          <SimpleLineChart
            data={bmiSeries}
            unit=""
            height={160}
            mode="line"
            color="#f59e0b"
            showAvg
          />
        </View>

        {/* <View style={styles.card}>
          <Text style={styles.cardTitle}>Phát triển tổng hợp</Text>
          <MultiLineChart
            height={200}
            series={[
              { label: "Chiều cao (cm)", color: "#3b82f6", data: heightSeries },
              { label: "Cân nặng (kg)", color: "#10b981", data: weightSeries },
              { label: "BMI", color: "#f59e0b", data: bmiSeries },
            ]}
          />
        </View> */}

        {compare && (
          <View
            style={[styles.card, { marginTop: 16, backgroundColor: "#f0fdf4" }]}
          >
            <Text style={styles.cardTitle}>So sánh mới nhất</Text>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: 6,
              }}
            >
              <Text style={{ fontWeight: "700" }}>Chỉ số</Text>
              <Text style={{ fontWeight: "700" }}>Bé</Text>
              <Text style={{ fontWeight: "700" }}>Trung bình lớp</Text>
              <Text style={{ fontWeight: "700" }}>Chuẩn WHO</Text>
            </View>

            {["height", "weight", "bmi"].map((key) => (
              <View
                key={key}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 4,
                }}
              >
                <Text
                  style={{ width: "30%", fontWeight: "600", color: "#334155" }}
                >
                  {key === "height"
                    ? "Chiều cao (cm)"
                    : key === "weight"
                    ? "Cân nặng (kg)"
                    : "BMI"}
                </Text>
                <Text style={{ width: "20%", textAlign: "right" }}>
                  {compare.student?.[key]?.toFixed(1) ?? "—"}
                </Text>
                <Text style={{ width: "25%", textAlign: "right" }}>
                  {compare.classAvg?.[key]?.toFixed(1) ?? "—"}
                </Text>
                <Text style={{ width: "25%", textAlign: "right" }}>
                  {compare.who?.[`${key}Range`]
                    ? `${compare.who[`${key}Range`][0]}–${
                        compare.who[`${key}Range`][1]
                      }`
                    : "—"}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 24 },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0b3d2e",
    marginBottom: 8,
    letterSpacing: 0.2,
  },

  studentBar: {
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    backgroundColor: "rgba(255,255,255,0.8)",
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

  card: {
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    padding: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardTitle: { fontWeight: "800", color: "#0f172a", marginBottom: 6 },
});
