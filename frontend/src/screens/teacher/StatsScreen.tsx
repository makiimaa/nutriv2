import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Modal,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import axiosClient from "../../api/axiosClient";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import type { Student, ClassEntity } from "../../types";

type Period = "day" | "week" | "month";
type Scope = "student" | "class";

export default function StatsScreen() {
  const [scope, setScope] = useState<Scope>("student");
  const [period, setPeriod] = useState<Period>("day");

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassEntity[]>([]);

  const [selStudent, setSelStudent] = useState<Student | null>(null);
  const [selClass, setSelClass] = useState<ClassEntity | null>(null);

  const [studentPickerOpen, setStudentPickerOpen] = useState(false);
  const [classPickerOpen, setClassPickerOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const [clsRes, stuRes] = await Promise.all([
          axiosClient.get("/classes/mine"),
          axiosClient.get("/students/mine"),
        ]);
        const cls = clsRes.data || [];
        const stu = stuRes.data || [];
        setClasses(cls);
        setStudents(stu);
        if (!selClass && cls.length) setSelClass(cls[0]);
        if (!selStudent && stu.length) setSelStudent(stu[0]);
      } catch (e) {}
    })();
  }, []);

  useEffect(() => {
    const run = async () => {
      if (scope === "student" && !selStudent?._id) return;
      if (scope === "class" && !selClass?._id) return;

      setLoading(true);
      try {
        if (scope === "student") {
          const r = await axiosClient.get("/stats/student/overview", {
            params: { studentId: selStudent!._id, period },
          });
          setData(r.data || null);
        } else {
          const r = await axiosClient.get("/stats/class/overview", {
            params: { classId: selClass!._id, period },
          });
          setData(r.data || null);
        }
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [scope, period, selStudent?._id, selClass?._id]);

  const cards = useMemo(() => {
    if (!data) return [];
    if (scope === "student") {
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
          title: "Dinh dưỡng",
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
    }

    const a = data?.anthro?.values || {};
    const t = data?.attendance?.values || {};
    const n = data?.nutrition?.values || {};
    return [
      {
        title: "Hình thái (TB lớp)",
        rows: [
          ["Chiều cao TB (cm)", a.avgHeight ? a.avgHeight.toFixed?.(1) : "—"],
          ["Cân nặng TB (kg)", a.avgWeight ? a.avgWeight.toFixed?.(1) : "—"],
          ["Số HS có số đo", a.sampleSize ?? 0],
        ],
      },
      {
        title: "Điểm danh (lớp)",
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
          ["Số ngày có điểm danh", t.daysCount ?? 0],
        ],
      },
      {
        title: "Dinh dưỡng (lớp)",
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
  }, [data, scope]);

  return (
    <LinearGradient colors={["#eef7ff", "#f8fffb"]} style={{ flex: 1 }}>
      {/* Header: scope + period + picker */}
      <View style={st.header}>
        <View style={st.scopeRow}>
          {(["student", "class"] as Scope[]).map((s) => (
            <Pressable
              key={s}
              onPress={() => setScope(s)}
              style={[st.pill, scope === s && st.pillOn]}
            >
              <Text style={[st.pillText, scope === s && st.pillTextOn]}>
                {s === "student" ? "Học sinh" : "Cả lớp"}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={[st.periodRow, { marginTop: 6 }]}>
          {(["day", "week", "month"] as Period[]).map((p) => (
            <Pressable
              key={p}
              onPress={() => setPeriod(p)}
              style={[st.pillSmall, period === p && st.pillOn]}
            >
              <Text style={[st.pillText, period === p && st.pillTextOn]}>
                {p === "day" ? "Ngày" : p === "week" ? "Tuần" : "Tháng"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* picker theo scope */}
        {scope === "student" ? (
          <Pressable
            onPress={() => setStudentPickerOpen(true)}
            style={[st.pickerBtn, { marginTop: 8 }]}
          >
            <Ionicons name="person-outline" size={16} color="#0f172a" />
            <Text style={st.pickerText} numberOfLines={1}>
              {selStudent?.fullName || selStudent?.name || "Chọn học sinh"}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#0f172a" />
          </Pressable>
        ) : (
          <Pressable
            onPress={() => setClassPickerOpen(true)}
            style={[st.pickerBtn, { marginTop: 8 }]}
          >
            <Ionicons name="people-outline" size={16} color="#0f172a" />
            <Text style={st.pickerText} numberOfLines={1}>
              {selClass?.name || "Chọn lớp"}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#0f172a" />
          </Pressable>
        )}
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
            Chưa có dữ liệu thống kê cho lựa chọn hiện tại.
          </Text>
        )}
      </ScrollView>

      {/* Student Picker */}
      <Modal
        visible={studentPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setStudentPickerOpen(false)}
      >
        <View style={st.modalBackdrop}>
          <View style={st.modalCard}>
            <Text style={st.modalTitle}>Chọn học sinh</Text>
            <FlatList
              data={students}
              keyExtractor={(i, idx) => i._id || `${idx}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={st.itemRow}
                  onPress={() => {
                    setSelStudent(item);
                    setStudentPickerOpen(false);
                  }}
                >
                  <Text style={st.itemText} numberOfLines={1}>
                    {item.fullName || item.name}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={{ textAlign: "center", color: "#64748b" }}>
                  Chưa có học sinh.
                </Text>
              }
            />
            <Pressable
              onPress={() => setStudentPickerOpen(false)}
              style={st.closeBtn}
            >
              <Text style={st.closeText}>Đóng</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Class Picker */}
      <Modal
        visible={classPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setClassPickerOpen(false)}
      >
        <View style={st.modalBackdrop}>
          <View style={st.modalCard}>
            <Text style={st.modalTitle}>Chọn lớp</Text>
            <FlatList
              data={classes}
              keyExtractor={(i, idx) => i._id || `${idx}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={st.itemRow}
                  onPress={() => {
                    setSelClass(item);
                    setClassPickerOpen(false);
                  }}
                >
                  <Text style={st.itemText} numberOfLines={1}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={{ textAlign: "center", color: "#64748b" }}>
                  Chưa có lớp.
                </Text>
              }
            />
            <Pressable
              onPress={() => setClassPickerOpen(false)}
              style={st.closeBtn}
            >
              <Text style={st.closeText}>Đóng</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  header: { paddingTop: 10, paddingHorizontal: 16 },
  scopeRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginBottom: 6,
  },
  periodRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#f1f5f9",
  },
  pillSmall: {
    paddingVertical: 6,
    paddingHorizontal: 10,
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

  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.6)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pickerText: { flex: 1, color: "#0f172a", fontWeight: "700" },

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

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    maxHeight: "70%",
  },
  modalTitle: {
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 8,
    textAlign: "center",
  },
  itemRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#e2e8f0",
  },
  itemText: { color: "#0f172a" },
  closeBtn: {
    marginTop: 8,
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  closeText: { color: "#0f172a", fontWeight: "700" },
});
