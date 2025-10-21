import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosClient from "../../api/axiosClient";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

type Period = "day" | "week" | "month";
type Student = { _id?: string; fullName?: string; name?: string };
type ParentMe = { _id: string; studentIds?: string[] };

const STORAGE_KEY_CURRENT_CHILD = "parent.currentChildId";

export default function ParentStudentStatsScreen() {
  const [period, setPeriod] = useState<Period>("day");

  const [childIds, setChildIds] = useState<string[]>([]);
  const [childMap, setChildMap] = useState<Record<string, Student>>({});
  const [currentId, setCurrentId] = useState<string | undefined>(undefined);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const currentStudent = currentId ? childMap[currentId] : undefined;
  const currentStudentName = useMemo(
    () => currentStudent?.fullName || currentStudent?.name || "—",
    [currentStudent]
  );

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
      console.warn("[ParentStudentStats] fetchStudentsByIds:", e?.message || e);
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
      console.warn("[ParentStudentStats] init:", e?.message || e);
      setChildIds([]);
      setChildMap({});
      setCurrentId(undefined);
    }
  }, [fetchStudentsByIds]);

  const load = useCallback(
    async (sid?: string, p?: Period) => {
      if (!sid) {
        setData(null);
        return;
      }
      try {
        setLoading(true);
        const r = await axiosClient.get("/stats/student/overview", {
          params: { studentId: sid, period: p || period },
        });
        setData(r.data || null);
      } catch (e: any) {
        Alert.alert(
          "Lỗi",
          e?.response?.data?.message || "Không tải được dữ liệu"
        );
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [period]
  );

  useEffect(() => {
    initStudents();
  }, [initStudents]);
  useEffect(() => {
    if (currentId) load(currentId, period);
  }, [currentId, period, load]);

  const cycleChild = useCallback(() => {
    if (!childIds.length || !currentId) return;
    const idx = childIds.indexOf(currentId);
    const next = childIds[(idx + 1) % childIds.length];
    setCurrentId(next);
    AsyncStorage.setItem(STORAGE_KEY_CURRENT_CHILD, next).catch(() => {});
  }, [childIds, currentId]);

  const cards = useMemo(() => {
    const a = data?.anthro?.values || {};
    const t = data?.attendance?.values || {};
    const n = data?.nutrition?.values || {};
    return [
      {
        title: "Hình thái",
        rows: [
          ["Chiều cao mới nhất (cm)", a.latestHeight ?? "—"],
          ["Cân nặng mới nhất (kg)", a.latestWeight ?? "—"],
          ["Thời điểm đo", a.at ? new Date(a.at).toLocaleDateString() : "—"],
        ],
      },
      {
        title: "Điểm danh",
        rows: [
          ["Tổng bản ghi", t.total ?? 0],
          ["Có mặt", t.present ?? 0],
          ["Vắng", t.absent ?? 0],
          ["Đi muộn", t.late ?? 0],
          ["Về sớm", t.earlyLeave ?? 0],
          [
            "Tỉ lệ có mặt",
            t.ratePresent ? `${(t.ratePresent * 100).toFixed(1)}%` : "0%",
          ],
        ],
      },
      {
        title: "Dinh dưỡng / Sức khỏe",
        rows: [
          ["Số bữa có ghi nhận", n.mealsRecorded ?? 0],
          ["Calories (∑)", n.totals?.calories?.toFixed?.(0) ?? 0],
          ["Protein (∑ g)", n.totals?.protein?.toFixed?.(1) ?? 0],
          ["Fat (∑ g)", n.totals?.fat?.toFixed?.(1) ?? 0],
          ["Carb (∑ g)", n.totals?.carbohydrate?.toFixed?.(1) ?? 0],
          ["Số ca chú ý", n.issues ?? 0],
          [
            "Nhiệt độ TB",
            n.avgTemperature ? `${n.avgTemperature.toFixed(1)}°C` : "—",
          ],
        ],
      },
    ];
  }, [data]);

  return (
    <LinearGradient colors={["#eef7ff", "#f8fffb"]} style={{ flex: 1 }}>
      <View style={st.header}>
        {/* period pills */}
        <View style={st.periodRow}>
          {(["day", "week", "month"] as Period[]).map((p) => (
            <Pressable
              key={p}
              onPress={() => setPeriod(p)}
              style={[st.pill, period === p && st.pillOn]}
            >
              <Text style={[st.pillText, period === p && st.pillTextOn]}>
                {p === "day" ? "Ngày" : p === "week" ? "Tuần" : "Tháng"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* student switcher */}
        <View style={st.studentBar}>
          <Text style={st.studentTxt}>
            Học sinh: <Text style={st.studentName}>{currentStudentName}</Text>
          </Text>
          {childIds.length > 1 && (
            <Pressable onPress={cycleChild} style={st.switchBtn}>
              <Ionicons name="swap-horizontal" size={18} color="#0b3d2e" />
              <Text style={st.switchText}>
                {childIds.indexOf(currentId || "") + 1 || 1}/{childIds.length}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {loading && <ActivityIndicator style={{ marginTop: 12 }} />}

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        {cards.map((c, idx) => (
          <View key={idx} style={st.card}>
            <Text style={st.cardTitle}>{c.title}</Text>
            {c.rows.map(([k, v]) => (
              <View key={String(k)} style={st.row}>
                <Text style={st.key}>{k}</Text>
                <Text style={st.val}>{String(v)}</Text>
              </View>
            ))}
          </View>
        ))}
        {!loading && !data && (
          <Text style={{ textAlign: "center", color: "#64748b" }}>
            Chưa có dữ liệu thống kê cho kỳ này.
          </Text>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  header: { paddingTop: 10, paddingHorizontal: 16 },
  periodRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginBottom: 10,
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#f1f5f9",
  },
  pillOn: {
    backgroundColor: "rgba(16,185,129,0.15)",
    borderWidth: 1,
    borderColor: "#0f766e",
  },
  pillText: { color: "#0f172a", fontWeight: "700" },
  pillTextOn: { color: "#0b3d2e" },

  studentBar: {
    marginBottom: 8,
    marginTop: 2,
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
  studentTxt: { color: "#334155" },
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
  cardTitle: { fontWeight: "800", color: "#0f172a", marginBottom: 8 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  key: { color: "#0f172a" },
  val: { color: "#0b3d2e", fontWeight: "700" },
});
