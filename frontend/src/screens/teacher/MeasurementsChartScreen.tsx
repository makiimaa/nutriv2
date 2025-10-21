import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Alert,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import axiosClient from "../../api/axiosClient";
import { Picker } from "@react-native-picker/picker";
import SimpleLineChart from "../../components/SimpleLineChart";
import { Student } from "../../types";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

export default function MeasurementsChartScreen() {
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState<string>("");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRefs, setLoadingRefs] = useState(false);

  const loadRefs = async () => {
    try {
      setLoadingRefs(true);
      const me = await axiosClient.get("/auth/me");
      const isAdmin = me?.data?.role === "admin";
      const st = await axiosClient.get(
        isAdmin ? "/students" : "/students/mine"
      );
      const list: Student[] = st.data || [];
      setStudents(list);
      if (!studentId && list[0]?._id) setStudentId(list[0]._id);
    } catch (e: any) {
      Alert.alert(
        "Lỗi",
        e?.response?.data?.message || "Không tải được học sinh"
      );
    } finally {
      setLoadingRefs(false);
    }
  };

  const load = async () => {
    if (!studentId) return setRows([]);
    try {
      setLoading(true);
      const r = await axiosClient.get(`/measurements/student/${studentId}`);
      setRows(r.data || []);
    } catch (e: any) {
      Alert.alert(
        "Lỗi",
        e?.response?.data?.message || "Không tải được dữ liệu"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRefs();
  }, []);
  useEffect(() => {
    load();
  }, [studentId]);

  const heightSeries = useMemo(
    () =>
      rows
        .slice()
        .reverse()
        .map((r: any) => ({
          xLabel: String(r.measurementDate).slice(0, 10),
          y: Number(r.height),
        })),
    [rows]
  );
  const weightSeries = useMemo(
    () =>
      rows
        .slice()
        .reverse()
        .map((r: any) => ({
          xLabel: String(r.measurementDate).slice(0, 10),
          y: Number(r.weight),
        })),
    [rows]
  );
  const bmiSeries = useMemo(
    () =>
      rows
        .slice()
        .reverse()
        .map((r: any) => ({
          xLabel: String(r.measurementDate).slice(0, 10),
          y: Number(r.bmi),
        })),
    [rows]
  );

  return (
    <LinearGradient colors={["#eef7ff", "#f8fffb"]} style={{ flex: 1 }}>
      <SafeAreaView style={st.safe}>
        {/* Header */}
        <ScrollView
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={st.header}>
            <View style={st.headerIcon}>
              <LinearGradient
                colors={["#d1fae5", "#93c5fd"]}
                style={st.iconBadge}
              >
                <Ionicons
                  name="stats-chart-outline"
                  size={20}
                  color="#0b3d2e"
                />
              </LinearGradient>
            </View>
            <Text style={st.h}>Biểu đồ phát triển</Text>
            <Text style={st.sub}>Theo dõi chiều cao, cân nặng, BMI</Text>
          </View>

          {/* Picker Card */}
          <View style={st.card}>
            <Text style={st.label}>Chọn học sinh</Text>
            <View style={st.pickerWrap}>
              <Picker
                selectedValue={studentId}
                onValueChange={(v) => setStudentId(String(v))}
                enabled={!loadingRefs && students.length > 0}
              >
                {students.map((s) => (
                  <Picker.Item
                    key={s._id}
                    label={`${s.fullName || s.name} ${
                      s.studentId ? `(${s.studentId})` : ""
                    }`}
                    value={s._id}
                  />
                ))}
              </Picker>
            </View>
            {loadingRefs && (
              <View style={st.rowCenter}>
                <ActivityIndicator />
                <Text style={{ marginLeft: 8, color: "#64748b" }}>
                  Đang tải danh sách…
                </Text>
              </View>
            )}
          </View>

          {/* Charts */}
          <View style={st.chartCard}>
            <Text style={st.cardTitle}>Chiều cao (cm)</Text>
            <SimpleLineChart data={heightSeries} unit="cm" />
          </View>

          <View style={st.chartCard}>
            <Text style={st.cardTitle}>Cân nặng (kg)</Text>
            <SimpleLineChart data={weightSeries} unit="kg" color="#27ae60" />
          </View>

          <View style={st.chartCard}>
            <Text style={st.cardTitle}>BMI</Text>
            <SimpleLineChart data={bmiSeries} unit="" color="#f2994a" />
          </View>

          {!loading && rows.length === 0 && (
            <Text style={st.empty}>Chưa có dữ liệu đo đạc.</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  safe: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  header: { alignItems: "center", marginBottom: 8 },
  headerIcon: { marginBottom: 6 },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  h: { fontSize: 18, fontWeight: "800", color: "#0b3d2e", letterSpacing: 0.2 },
  sub: { marginTop: 2, color: "#475569", fontSize: 12 },

  card: {
    backgroundColor: "rgba(255,255,255,0.86)",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    marginTop: 8,
    marginBottom: 10,
  },
  label: { fontWeight: "700", marginBottom: 6, color: "#0f172a" },
  pickerWrap: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  rowCenter: { flexDirection: "row", alignItems: "center", marginTop: 10 },

  chartCard: {
    backgroundColor: "rgba(255,255,255,0.86)",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    marginBottom: 12,
  },
  cardTitle: { fontWeight: "700", marginBottom: 6, color: "#0f172a" },
  empty: { textAlign: "center", color: "#64748b", marginTop: 8 },
});
