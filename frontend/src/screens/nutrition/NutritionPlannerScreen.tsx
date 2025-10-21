/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Alert,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import {
  planMenusForClass,
  planMenusForStudent,
  listDrafts,
  saveMenusFromDrafts,
  listGroupings,
} from "../../api/nutrition.planner.api";
import type {
  PlanClassResp,
  PlanStudentResp,
  ListDraftsResp,
} from "../../api/nutrition.planner.api";
import axiosClient from "../../api/axiosClient";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

type Student = {
  _id: string;
  fullName?: string;
  name?: string;
  studentId?: string;
};

function isObjectId(s?: string) {
  return !!s && /^[a-f\d]{24}$/i.test(s);
}
function ymdLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function getMyClass(): Promise<{ classId: string; schoolId: string }> {
  const r = await axiosClient.get("/classes/mine");
  const rows: any[] = r.data || [];
  if (!rows.length) throw new Error("Chưa gán lớp");
  return { classId: rows[0]._id, schoolId: rows[0].schoolId };
}
async function getStudentsByClass(classId: string): Promise<Student[]> {
  try {
    const r = await axiosClient.get(`/students/by-class`, {
      params: { classId },
    });
    return (r.data || []).map((x: any) => ({
      _id: x._id,
      fullName: x.fullName || x.name,
      name: x.name,
      studentId: x.studentId,
    }));
  } catch {
    const r = await axiosClient.get(`/classes/${classId}/roster-embeddings`);
    return (r.data || []).map((x: any) => ({
      _id: x._id,
      fullName: x.fullName || x.name,
      name: x.name,
      studentId: x.studentId,
    }));
  }
}

function PrimaryBtn({
  title,
  onPress,
  disabled,
  icon,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: any;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={{ marginTop: 8 }}>
      <LinearGradient
        colors={["#34d399", "#059669"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[st.btn, disabled && { opacity: 0.6 }]}
      >
        {icon && <Ionicons name={icon} size={16} color="#fff" />}
        <Text style={st.btnText}>{title}</Text>
      </LinearGradient>
    </Pressable>
  );
}
function GhostBtn({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[st.ghostBtn, disabled && { opacity: 0.5 }]}
    >
      <Text style={st.ghostText}>{title}</Text>
    </Pressable>
  );
}

export default function NutritionPlannerScreen() {
  const navigation = useNavigation<any>();

  const [engine, setEngine] = useState<"gemini" | "local">("gemini");
  const [days, setDays] = useState(2);
  const [startDateObj, setStartDateObj] = useState<Date>(new Date());
  const [showIOSPicker, setShowIOSPicker] = useState(false);

  const [classId, setClassId] = useState<string>("");
  const [schoolId, setSchoolId] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState<string>("");

  const [previews, setPreviews] = useState<any[]>([]);
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [history, setHistory] = useState<{ items: any[]; total: number }>({
    items: [],
    total: 0,
  });

  const [groupingId, setGroupingId] = useState<string>("");
  const [groupingList, setGroupingList] = useState<any[]>([]);
  const [showGroupingHist, setShowGroupingHist] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { classId: cid, schoolId: sid } = await getMyClass();
        setClassId(cid);
        setSchoolId(sid);
        const roster = await getStudentsByClass(cid);
        setStudents(roster);
        if (roster.length) setStudentId(roster[0]._id);
      } catch (e: any) {
        Alert.alert("Lỗi", e?.message || "Không tải được lớp/học sinh");
      }
    })();
  }, []);

  useEffect(() => {
    if (classId) {
      void loadHistory(1);

      (async () => {
        try {
          const r = await listGroupings(classId, 1, 50);
          setGroupingList(r.items || []);
        } catch {}
      })();
    }
  }, [classId]);

  async function loadHistory(p = 1) {
    setLoading(true);
    try {
      const r: ListDraftsResp = await listDrafts(classId, p, 10);
      setHistory({ items: r.items || [], total: r.total || 0 });
      setPage(p);
    } finally {
      setLoading(false);
    }
  }

  async function doPlanClass() {
    if (!classId) return Alert.alert("Thiếu classId");
    try {
      setLoading(true);
      const r: PlanClassResp = await planMenusForClass({
        classId,
        startDate: ymdLocal(startDateObj),
        days,
        engine,

        groupId: groupingId || undefined,
      } as any);
      setPreviews(r.previews || []);
      setDraftIds(r.draftIds || []);
      Alert.alert("Xong", `Đã sinh ${r.previews?.length || 0} menu (draft)`);
    } catch (e: any) {
      Alert.alert(
        "Lỗi",
        e?.response?.data?.detail || e?.message || "Không sinh được menu"
      );
    } finally {
      setLoading(false);
    }
  }

  async function doPlanStudent() {
    if (!isObjectId(studentId)) return Alert.alert("Chọn học sinh");
    try {
      setLoading(true);
      const r: PlanStudentResp = await planMenusForStudent({
        studentId,
        startDate: ymdLocal(startDateObj),
        days,
        engine,
      });
      setPreviews(r.previews || []);
      setDraftIds(r.draftIds || []);
      Alert.alert(
        "Xong",
        `Đã sinh ${r.previews?.length || 0} menu (draft) cho học sinh`
      );
    } catch (e: any) {
      Alert.alert(
        "Lỗi",
        e?.response?.data?.detail || e?.message || "Không sinh được"
      );
    } finally {
      setLoading(false);
    }
  }

  async function doSaveAll() {
    if (!draftIds.length) return Alert.alert("Không có draft để lưu");
    if (!schoolId) return Alert.alert("Thiếu schoolId");
    try {
      setLoading(true);
      const r = await saveMenusFromDrafts({
        recIds: draftIds,
        classId,
        schoolId,
      });
      Alert.alert("Đã lưu", `Đã chèn ${r.inserted || 0} menu vào CSDL`);
      setDraftIds([]);
      setPreviews([]);
      void loadHistory(1);
    } catch (e: any) {
      Alert.alert(
        "Lỗi",
        e?.response?.data?.message || e?.message || "Lưu thất bại"
      );
    } finally {
      setLoading(false);
    }
  }

  const openDraftDetail = (recId: string) => {
    navigation.navigate("MenuDraftDetail", { recId });
  };

  const openDatePicker = () => {
    if (Platform.OS === "ios") {
      setShowIOSPicker(true);
    } else {
      DateTimePickerAndroid.open({
        mode: "date",
        value: startDateObj,
        onChange: (_, d) => d && setStartDateObj(d),
        is24Hour: true,
      });
    }
  };

  const LoadingOverlay = () =>
    loading ? (
      <View pointerEvents="auto" style={st.overlay}>
        <ActivityIndicator size="large" />
        <Text style={{ color: "#fff", marginTop: 8 }}>Đang xử lý…</Text>
      </View>
    ) : null;

  const dayOptions = [1, 2, 3, 4, 5];

  return (
    <LinearGradient colors={["#eef7ff", "#f8fffb"]} style={{ flex: 1 }}>
      <SafeAreaView style={st.safe}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand/Header */}
          <View style={st.brand}>
            <View style={st.logoWrap}>
              <LinearGradient
                colors={["#d1fae5", "#93c5fd"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={st.logo}
              >
                <Ionicons name="sparkles-outline" size={22} color="#0b3d2e" />
              </LinearGradient>
            </View>
            <Text style={st.brandTitle}>Lập thực đơn thông minh</Text>
            <Text style={st.brandSub}>AI sinh thực đơn theo lớp/học sinh</Text>
          </View>

          {/* Card: Thiết lập */}
          <View style={st.card}>
            <Text style={st.cardTitle}>Thiết lập</Text>

            {/* Engine toggle */}
            <View style={st.rowBetween}>
              <Text style={st.label}>Engine</Text>
              <Pressable
                onPress={() =>
                  setEngine(engine === "gemini" ? "local" : "gemini")
                }
                style={st.toggle}
              >
                <Text style={st.toggleText}>
                  {engine === "gemini" ? "Gemini" : "Local"}
                </Text>
                <Ionicons
                  name="reload"
                  size={16}
                  color="#0f766e"
                  style={{ marginLeft: 6 }}
                />
              </Pressable>
            </View>

            {/* Date picker */}
            <Text style={[st.label, { marginTop: 10 }]}>Ngày bắt đầu</Text>
            <Pressable onPress={openDatePicker} style={st.dateInput}>
              <Ionicons name="calendar-outline" size={16} color="#0f172a" />
              <Text style={st.dateText}>{ymdLocal(startDateObj)}</Text>
            </Pressable>

            {/* iOS inline picker */}
            {Platform.OS === "ios" && showIOSPicker && (
              <View style={{ marginTop: 8, gap: 10 }}>
                <DateTimePicker
                  value={startDateObj}
                  mode="date"
                  display="inline"
                  onChange={(_, d) => d && setStartDateObj(d)}
                />
                <Pressable
                  onPress={() => setShowIOSPicker(false)}
                  style={st.closePicker}
                >
                  <Text style={{ fontWeight: "700", color: "#0f172a" }}>
                    Đóng chọn ngày
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Days */}
            <Text style={[st.label, { marginTop: 10 }]}>Số ngày</Text>
            <View style={st.daysRow}>
              {dayOptions.map((d) => {
                const active = d === days;
                return (
                  <Pressable
                    key={d}
                    onPress={() => setDays(d)}
                    style={[st.dayChip, active && st.dayChipActive]}
                  >
                    <Text
                      style={[
                        st.dayChipText,
                        active && { color: "#065f46", fontWeight: "800" },
                      ]}
                    >
                      {d}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Student (optional) */}
            <Text style={[st.label, { marginTop: 12 }]}>
              Chọn học sinh (tuỳ chọn)
            </Text>
            <View style={st.pickerWrap}>
              <Picker
                selectedValue={studentId}
                onValueChange={(v) => setStudentId(String(v))}
              >
                <Picker.Item label="-- chọn học sinh --" value="" />
                {students.map((s) => (
                  <Picker.Item
                    key={s._id}
                    label={`${s.fullName || s.name} (${s.studentId || "—"})`}
                    value={s._id}
                  />
                ))}
              </Picker>
            </View>

            {/* ✅ NEW: Chọn phân nhóm đã lưu (optional) */}
            <Text style={[st.label, { marginTop: 10 }]}>
              Chọn phân nhóm (tuỳ chọn)
            </Text>
            <View style={st.pickerWrap}>
              <Picker
                selectedValue={groupingId}
                onValueChange={(v) => setGroupingId(String(v))}
              >
                <Picker.Item label="— không dùng phân nhóm đã lưu —" value="" />
                {groupingList.map((g: any) => (
                  <Picker.Item
                    key={g._id}
                    label={`${g.name} (${g.groupCount} nhóm)`}
                    value={g._id}
                  />
                ))}
              </Picker>
            </View>

            <Pressable
              onPress={() => navigation.navigate("Grouping")}
              style={[st.ghostBtn, { marginTop: 6, alignSelf: "flex-start" }]}
            >
              <Text style={st.ghostText}>Mở màn hình PHÂN NHÓM</Text>
            </Pressable>

            <PrimaryBtn
              title="Sinh menu cho CẢ LỚP"
              onPress={doPlanClass}
              icon="sparkles"
            />
            <PrimaryBtn
              title="Sinh menu cho 1 HỌC SINH"
              onPress={doPlanStudent}
              icon="person"
            />
          </View>

          {/* Preview */}
          {!!previews.length && (
            <View style={st.card}>
              <Text style={st.cardTitle}>Preview (chưa lưu)</Text>
              {previews.map((item) => (
                <Pressable
                  key={item.recId}
                  onPress={() => openDraftDetail(item.recId)}
                  style={st.rowCard}
                >
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={st.rowTitle}>
                      {item.date} — {item.groupName} • {item.studentCount} HS
                    </Text>
                    <Text style={st.meta}>
                      Breakfast:{" "}
                      {(item.meals?.breakfast?.items || [])
                        .map((x: any) => x.name)
                        .join(", ")}
                    </Text>
                    <Text style={st.meta}>
                      Lunch:{" "}
                      {(item.meals?.lunch?.items || [])
                        .map((x: any) => x.name)
                        .join(", ")}
                    </Text>
                    <Text style={st.meta}>
                      Snack:{" "}
                      {(item.meals?.snack?.items || [])
                        .map((x: any) => x.name)
                        .join(", ")}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#0f172a" />
                </Pressable>
              ))}
              <PrimaryBtn
                title="LƯU TẤT CẢ vào menus"
                onPress={doSaveAll}
                icon="save-outline"
              />
            </View>
          )}

          {/* Lịch sử draft */}
          <View style={st.card}>
            <Text style={st.cardTitle}>Lịch sử draft</Text>
            {history.items.length === 0 && (
              <Text style={st.meta}>Chưa có draft.</Text>
            )}
            {history.items.map((item: any) => {
              const dt =
                item.date || item.generatedDate || item.createdAt || null;
              const dateStr = dt
                ? new Date(dt).toISOString().slice(0, 10)
                : "—";
              return (
                <Pressable
                  key={item._id}
                  onPress={() => openDraftDetail(item._id)}
                  style={st.rowCard}
                >
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={st.rowTitle}>
                      {dateStr} — {item.studentGroup?.name || "nhóm"}
                    </Text>
                    <Text style={st.meta}>
                      Model: {item.aiModel} • Đã áp dụng:{" "}
                      {item.appliedToMenu ? "✔" : "✗"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#0f172a" />
                </Pressable>
              );
            })}
            <View style={st.pager}>
              <GhostBtn
                title="‹ Trước"
                onPress={() => page > 1 && loadHistory(page - 1)}
                disabled={page <= 1}
              />
              <GhostBtn
                title="Sau ›"
                onPress={() =>
                  page * 10 < (history.total || 0) && loadHistory(page + 1)
                }
                disabled={page * 10 >= (history.total || 0)}
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      <LoadingOverlay />
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
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
  cardTitle: { fontWeight: "800", marginBottom: 8, color: "#0f172a" },
  label: { fontWeight: "700", color: "#0f172a" },

  rowBetween: {
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "rgba(16,185,129,0.12)",
  },
  toggleText: { color: "#0f766e", fontWeight: "700" },

  dateInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    backgroundColor: "rgba(255,255,255,0.7)",
    paddingHorizontal: 10,
    height: 42,
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  dateText: { color: "#0f172a", fontWeight: "700" },
  closePicker: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(0,0,0,0.06)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },

  daysRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  dayChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  dayChipActive: { backgroundColor: "rgba(16,185,129,0.18)" },
  dayChipText: { color: "#0f172a", fontWeight: "700" },

  pickerWrap: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.9)",
    marginTop: 6,
    marginBottom: 8,
  },

  rowCard: {
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  rowTitle: { fontWeight: "800", color: "#0f172a" },
  meta: { color: "#64748b", marginTop: 2 },

  btn: {
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#059669",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    flexDirection: "row",
    gap: 6,
  },
  btnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 0.3,
  },

  pager: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
    justifyContent: "space-between",
  },

  ghostBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
  },
  ghostText: { fontWeight: "700", color: "#0f172a" },

  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
});
