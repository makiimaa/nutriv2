import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import axiosClient from "../../api/axiosClient";
import { useNavigation } from "@react-navigation/native";
import BulkHealthModal from "./_BulkHealthModal";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";

const UI = {
  padX: 24,
  glass: "rgba(255,255,255,0.6)",
  border: "rgba(0,0,0,0.08)",
  radius: 14,
};

type DayRow = { date: string; count: number };
type MyClass = { _id: string; name: string };

function ymdLocal(d: Date) {
  const yy = d.getFullYear();
  const mm = `${d.getMonth() + 1}`.padStart(2, "0");
  const dd = `${d.getDate()}`.padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
function addDays(d: Date, delta: number) {
  const nd = new Date(d);
  nd.setDate(d.getDate() + delta);
  return nd;
}
function formatWeekday(d: string) {
  try {
    const dt = new Date(d);
    const w = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][dt.getDay()];
    return w;
  } catch {
    return "";
  }
}

export default function HealthDaysScreen() {
  const nav = useNavigation<any>();

  const [myClass, setMyClass] = useState<MyClass | null>(null);

  const today = useMemo(() => new Date(), []);
  const [fromDate, setFromDate] = useState<Date>(addDays(today, -14));
  const [toDate, setToDate] = useState<Date>(today);
  const [showFromIOS, setShowFromIOS] = useState(false);
  const [showToIOS, setShowToIOS] = useState(false);

  const [days, setDays] = useState<DayRow[]>([]);
  const [bulkVisible, setBulkVisible] = useState(false);

  const loadMyClass = async () => {
    try {
      const r = await axiosClient.get("/classes/mine");
      const rows: MyClass[] = r.data || [];
      if (!rows?.length) throw new Error("Tài khoản chưa được gán lớp.");
      setMyClass({ _id: rows[0]._id, name: rows[0].name });
    } catch (e: any) {
      Alert.alert(
        "Lỗi",
        e?.response?.data?.message || e?.message || "Không lấy được lớp của tôi"
      );
    }
  };

  const loadDays = async () => {
    try {
      if (!myClass?._id) return;
      const q = `?classId=${encodeURIComponent(myClass._id)}&from=${ymdLocal(
        fromDate
      )}&to=${ymdLocal(toDate)}`;
      const r = await axiosClient.get(`/health/dates${q}`);
      setDays(r.data || []);
    } catch (e: any) {
      Alert.alert(
        "Lỗi",
        e?.response?.data?.message || "Không tải được danh sách ngày"
      );
    }
  };

  useEffect(() => {
    loadMyClass();
  }, []);
  useEffect(() => {
    if (myClass?._id) loadDays();
  }, [myClass?._id]);
  useEffect(() => {
    if (myClass?._id) loadDays();
  }, [fromDate, toDate]);

  const openDateAndroid = (which: "from" | "to") => {
    const value = which === "from" ? fromDate : toDate;
    DateTimePickerAndroid.open({
      mode: "date",
      value,
      onChange: (_, d) => {
        if (!d) return;
        if (which === "from") setFromDate(d);
        else setToDate(d);
      },
      is24Hour: true,
    });
  };

  const gotoDate = (d: string) =>
    nav.navigate("HealthByDate", { date: d, classId: myClass?._id });

  const totalRecords = days.reduce((s, it) => s + (it.count || 0), 0);

  return (
    <LinearGradient colors={["#eef7ff", "#f8fffb"]} style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" translucent />
      <SafeAreaView style={st.safe}>
        {/* Brand / Header */}
        <View style={st.brand}>
          <View style={st.logoWrap}>
            <LinearGradient
              colors={["#d1fae5", "#93c5fd"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={st.logo}
            >
              <Ionicons name="fitness-outline" size={22} color="#0b3d2e" />
            </LinearGradient>
          </View>
          <Text style={st.brandTitle}>Sức khỏe theo ngày</Text>
          <Text style={st.brandSub}>
            {myClass ? `Lớp: ${myClass.name}` : "Đang tải lớp…"}
          </Text>
        </View>

        {/* Bộ lọc: chọn khoảng ngày */}
        <View style={st.card}>
          <Text style={st.label}>Khoảng ngày</Text>

          <View style={st.row}>
            {/* FROM */}
            <Pressable
              style={[st.dateInput]}
              onPress={() =>
                Platform.OS === "ios"
                  ? setShowFromIOS(true)
                  : openDateAndroid("from")
              }
            >
              <Ionicons name="calendar-outline" size={16} color="#0f172a" />
              <Text style={st.dateText}>{ymdLocal(fromDate)}</Text>
            </Pressable>

            <Text style={{ color: "#64748b" }}>—</Text>

            {/* TO */}
            <Pressable
              style={[st.dateInput]}
              onPress={() =>
                Platform.OS === "ios"
                  ? setShowToIOS(true)
                  : openDateAndroid("to")
              }
            >
              <Ionicons name="calendar-outline" size={16} color="#0f172a" />
              <Text style={st.dateText}>{ymdLocal(toDate)}</Text>
            </Pressable>
          </View>

          {/* iOS inline pickers */}
          {Platform.OS === "ios" && (showFromIOS || showToIOS) && (
            <View style={{ marginTop: 8, gap: 10 }}>
              {showFromIOS && (
                <DateTimePicker
                  value={fromDate}
                  mode="date"
                  display="inline"
                  onChange={(_, d) => {
                    if (d) setFromDate(d);
                  }}
                />
              )}
              {showToIOS && (
                <DateTimePicker
                  value={toDate}
                  mode="date"
                  display="inline"
                  onChange={(_, d) => {
                    if (d) setToDate(d);
                  }}
                />
              )}
              <Pressable
                onPress={() => {
                  setShowFromIOS(false);
                  setShowToIOS(false);
                }}
                style={st.closePicker}
              >
                <Text style={{ fontWeight: "700", color: "#0f172a" }}>
                  Đóng chọn ngày
                </Text>
              </Pressable>
            </View>
          )}

          {/* Quick ranges */}
          <View style={st.quickRow}>
            <Pressable
              onPress={() => {
                setFromDate(today);
                setToDate(today);
              }}
              style={st.quick}
            >
              <Text style={st.quickText}>Hôm nay</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setFromDate(addDays(today, -6));
                setToDate(today);
              }}
              style={st.quick}
            >
              <Text style={st.quickText}>7 ngày</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setFromDate(addDays(today, -29));
                setToDate(today);
              }}
              style={st.quick}
            >
              <Text style={st.quickText}>30 ngày</Text>
            </Pressable>
            <Pressable
              onPress={loadDays}
              style={[st.quick, { backgroundColor: "rgba(16,185,129,0.18)" }]}
            >
              <Text
                style={[st.quickText, { color: "#065f46", fontWeight: "800" }]}
              >
                Làm mới
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Thêm bản ghi cả lớp (Hôm nay) */}
        <Pressable onPress={() => setBulkVisible(true)} style={st.addBtn}>
          <LinearGradient
            colors={["#34d399", "#059669"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={st.addInner}
          >
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={st.addText}>Thêm bản ghi cả lớp (Hôm nay)</Text>
          </LinearGradient>
        </Pressable>

        {/* Summary */}
        <View style={[st.summary]}>
          <Text style={st.summaryText}>
            Có {days.length} ngày • Tổng {totalRecords} bản ghi
          </Text>
        </View>

        {/* Danh sách ngày */}
        <FlatList
          style={{ marginTop: 10 }}
          data={days}
          keyExtractor={(i) => i.date}
          contentContainerStyle={{ paddingBottom: 26 }}
          renderItem={({ item }) => (
            <Pressable onPress={() => gotoDate(item.date)} style={st.rowCard}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={st.rowTitle}>
                  {item.date} ({formatWeekday(item.date)})
                </Text>
                <View style={st.badge}>
                  <Text style={st.badgeText}>{item.count} bản ghi</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#0f172a" />
            </Pressable>
          )}
          ListEmptyComponent={
            <Text
              style={{ textAlign: "center", color: "#64748b", marginTop: 12 }}
            >
              Chưa có dữ liệu trong khoảng chọn.
            </Text>
          }
        />

        {/* Modal thêm nhanh hôm nay */}
        <BulkHealthModal
          visible={bulkVisible}
          onClose={() => setBulkVisible(false)}
          mode="create"
          classId={myClass?._id || ""}
          dateDefault={ymdLocal(today)}
          onSaved={async () => {
            setBulkVisible(false);
            await loadDays();
          }}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: UI.padX, paddingTop: 8 },

  brand: { alignItems: "center", marginBottom: 8, marginTop: 2 },
  logoWrap: {
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  logo: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: { fontSize: 18, fontWeight: "800", color: "#0b3d2e" },
  brandSub: { marginTop: 2, color: "#475569", fontSize: 12 },

  card: {
    backgroundColor: UI.glass,
    borderRadius: UI.radius,
    padding: 14,
    borderWidth: 1,
    borderColor: UI.border,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
    marginBottom: 10,
  },

  label: { fontWeight: "800", color: "#0f172a", marginBottom: 6 },

  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  dateInput: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    backgroundColor: "rgba(255,255,255,0.7)",
    paddingHorizontal: 10,
    height: 42,
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  dateText: { color: "#0f172a", fontWeight: "700" },

  closePicker: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(0,0,0,0.06)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },

  quickRow: { flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" },
  quick: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  quickText: { color: "#0f172a", fontWeight: "700" },

  addBtn: { marginTop: 4 },
  addInner: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    shadowColor: "#059669",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  addText: { color: "#fff", fontWeight: "800" },

  summary: {
    marginTop: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "rgba(16,185,129,0.12)",
  },
  summaryText: { color: "#065f46", fontWeight: "700" },

  rowCard: {
    backgroundColor: UI.glass,
    borderRadius: UI.radius,
    padding: 12,
    borderWidth: 1,
    borderColor: UI.border,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  rowTitle: { fontWeight: "800", color: "#0f172a" },
  badge: {
    marginTop: 6,
    paddingVertical: 2,
    paddingHorizontal: 8,
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "rgba(16,185,129,0.18)",
  },
  badgeText: { color: "#065f46", fontWeight: "700", fontSize: 12.5 },
});
