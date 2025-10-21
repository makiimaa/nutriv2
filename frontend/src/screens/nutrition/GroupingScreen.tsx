import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  findNodeHandle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import {
  analyzeGrouping,
  saveGrouping,
  listGroupings,
} from "../../api/nutrition.planner.api";
import axiosClient from "../../api/axiosClient";
import { Picker } from "@react-native-picker/picker";

function ymd(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function GroupingScreen() {
  const [engine, setEngine] = useState<"gemini" | "ollama">("gemini");
  const [classId, setClassId] = useState("");
  const [groupCount, setGroupCount] = useState<number | undefined>(undefined);
  const [teacherHint, setTeacherHint] = useState("");
  const [groups, setGroups] = useState<any[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [hist, setHist] = useState<{
    items: any[];
    total: number;
    page: number;
  }>({
    items: [],
    total: 0,
    page: 1,
  });
  const [customName, setCustomName] = useState("");
  const [loading, setLoading] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const resultAnchorRef = useRef<View>(null);

  async function getMyClass() {
    try {
      setLoading(true);
      const r = await axiosClient.get("/classes/mine");
      if (!r.data?.length) throw new Error("Chưa gán lớp");
      setClassId(r.data[0]._id);
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Không tải được lớp");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void getMyClass();
  }, []);

  async function doAnalyze() {
    if (!classId) return Alert.alert("Thiếu classId");
    try {
      setLoading(true);
      const r = await analyzeGrouping({
        classId,
        engine,
        teacherHint: (teacherHint || "").trim() || undefined,
        groupCount,
      });
      if (!r?.ok && !Array.isArray(r?.groups)) {
        throw new Error(r?.message || "Phân tích không thành công");
      }
      const arr = r.groups || [];
      setGroups(arr);
      if (!arr.length) {
        Alert.alert("Thông báo", "AI không đề xuất được nhóm phù hợp.");
      } else {
        setTimeout(() => {
          if (resultAnchorRef.current && scrollRef.current) {
            const handle = findNodeHandle(resultAnchorRef.current);
            (scrollRef.current as any)?.scrollTo({ y: 350, animated: true });
          }
        }, 50);
      }
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        e?.message ||
        "Không phân tích được. Kiểm tra BE-Py có route /nutrition/group/analyze chưa.";
      Alert.alert("Lỗi", msg);
    } finally {
      setLoading(false);
    }
  }
  async function doRegen() {
    await doAnalyze();
  }

  async function doSave() {
    if (!classId || !groups.length) return Alert.alert("Chưa có nhóm để lưu");
    try {
      setLoading(true);
      const name = (customName || "").trim() || `Phân nhóm - ${ymd()}`;
      const payload = {
        classId,
        name,
        engine,
        groupCount: groups.length,
        teacherHint,
        groups: groups.map((g: any) => ({
          key: g.key,
          name: g.name,
          description: g.description || "",
          criteriaSummary: g.criteriaSummary || {},
          studentIds: g.studentIds || [],
        })),
      };
      const r = await saveGrouping(payload);
      if (!r?.ok) throw new Error(r?.message || "Lưu thất bại");
      Alert.alert("Đã lưu", "Phân nhóm đã được lưu");
      setCustomName("");
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        e?.message ||
        "Không lưu được. Kiểm tra BE-Py có route /nutrition/group/save chưa.";
      Alert.alert("Lỗi", msg);
    } finally {
      setLoading(false);
    }
  }

  async function loadHist(p = 1) {
    if (!classId) return;
    try {
      setLoading(true);
      const r = await listGroupings(classId, p, 10);
      setHist({ items: r.items || [], total: r.total || 0, page: p });
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        e?.message ||
        "Không tải lịch sử. Kiểm tra BE-Py có route /nutrition/group/list chưa.";
      Alert.alert("Lỗi", msg);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (historyOpen && classId) void loadHist(1);
  }, [historyOpen, classId]);

  return (
    <LinearGradient colors={["#eef7ff", "#f8fffb"]} style={{ flex: 1 }}>
      <SafeAreaView style={st.safe}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {/* Header */}
          <View style={st.brand}>
            <View style={st.logo}>
              <Ionicons name="people-outline" size={22} color="#0b3d2e" />
            </View>
            <Text style={st.brandTitle}>Phân nhóm học sinh</Text>
            <Text style={st.brandSub}>
              Chọn engine • tối đa 5 nhóm • có thể lưu để tái sử dụng
            </Text>
          </View>

          {/* Engine & Options */}
          <View style={st.card}>
            <Text style={st.label}>Engine</Text>
            <Pressable
              disabled={loading}
              onPress={() =>
                setEngine(engine === "gemini" ? "ollama" : "gemini")
              }
              style={[st.toggle, loading && { opacity: 0.6 }]}
            >
              <Text style={st.toggleText}>
                {engine === "gemini" ? "Gemini" : "Local"}
              </Text>
              <Ionicons
                name="swap-horizontal"
                size={16}
                color="#0f766e"
                style={{ marginLeft: 6 }}
              />
            </Pressable>

            <Text style={[st.label, { marginTop: 10 }]}>
              Số nhóm (≤5, bỏ trống: AI quyết)
            </Text>
            <View style={st.pickerWrap}>
              <Picker
                enabled={!loading}
                selectedValue={String(groupCount || "")}
                onValueChange={(v) => setGroupCount(v ? Number(v) : undefined)}
              >
                <Picker.Item label="— để AI quyết định —" value="" />
                {[1, 2, 3, 4, 5].map((n) => (
                  <Picker.Item key={n} label={`${n}`} value={String(n)} />
                ))}
              </Picker>
            </View>

            <Text style={[st.label, { marginTop: 10 }]}>
              Mong muốn của giáo viên (tuỳ chọn)
            </Text>
            <TextInput
              editable={!loading}
              placeholder="VD: tránh nhóm quá đông; ưu tiên dị ứng sữa; cân bằng BMI…"
              multiline
              style={st.input}
              value={teacherHint}
              onChangeText={setTeacherHint}
            />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
              <Pressable
                disabled={loading}
                onPress={doAnalyze}
                style={[st.primary, loading && { opacity: 0.6 }]}
              >
                <Text style={st.primaryText}>Phân tích</Text>
              </Pressable>
              <Pressable
                disabled={loading}
                onPress={doRegen}
                style={[st.ghost, loading && { opacity: 0.6 }]}
              >
                <Text style={st.ghostText}>Regen</Text>
              </Pressable>
            </View>
          </View>

          {/* anchor để cuộn tới kết quả */}
          <View ref={resultAnchorRef} />

          {/* Result */}
          {!!groups.length && (
            <View style={st.card}>
              <Text style={st.cardTitle}>Kết quả ({groups.length} nhóm)</Text>
              {groups.map((g: any, idx: number) => (
                <View key={g.key || idx} style={st.rowCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.rowTitle}>
                      {g.name || `Nhóm #${idx + 1}`}
                    </Text>
                    {!!g.description && (
                      <Text style={st.meta}>{g.description}</Text>
                    )}
                    <Text style={st.meta}>
                      HS: {(g.studentIds || []).length}
                    </Text>
                    {!!g.criteriaSummary && (
                      <Text style={st.meta}>
                        Tiêu chí:{" "}
                        {Object.entries(g.criteriaSummary)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(" • ")}
                      </Text>
                    )}
                  </View>
                </View>
              ))}

              <Text style={[st.label, { marginTop: 6 }]}>
                Tên phân nhóm (tuỳ chọn)
              </Text>
              <TextInput
                editable={!loading}
                placeholder="Nếu trống: Tên lớp - YYYY-MM-DD"
                value={customName}
                onChangeText={setCustomName}
                style={st.input}
              />
              <Pressable
                disabled={loading}
                onPress={doSave}
                style={[
                  st.primary,
                  { marginTop: 8 },
                  loading && { opacity: 0.6 },
                ]}
              >
                <Text style={st.primaryText}>Lưu phân nhóm</Text>
              </Pressable>
            </View>
          )}

          {/* History */}
          <View style={st.card}>
            <Pressable
              onPress={() => setHistoryOpen(!historyOpen)}
              style={st.rowBetween}
            >
              <Text style={st.cardTitle}>Lịch sử phân nhóm</Text>
              <Ionicons
                name={historyOpen ? "chevron-up" : "chevron-down"}
                size={18}
                color="#0f172a"
              />
            </Pressable>
            {historyOpen && (
              <>
                {hist.items.map((it: any) => (
                  <View key={it._id} style={st.rowCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={st.rowTitle}>{it.name}</Text>
                      <Text style={st.meta}>
                        Engine: {it.engine} •{" "}
                        {new Date(it.createdAt).toISOString().slice(0, 10)}
                      </Text>
                      <Text style={st.meta}>Số nhóm: {it.groupCount}</Text>
                    </View>
                  </View>
                ))}
                <View style={st.pager}>
                  <Pressable
                    disabled={loading || hist.page <= 1}
                    onPress={() => loadHist(hist.page - 1)}
                    style={[
                      st.ghost,
                      (loading || hist.page <= 1) && { opacity: 0.6 },
                    ]}
                  >
                    <Text style={st.ghostText}>‹ Trước</Text>
                  </Pressable>
                  <Pressable
                    disabled={loading || hist.page * 10 >= hist.total}
                    onPress={() => loadHist(hist.page + 1)}
                    style={[
                      st.ghost,
                      (loading || hist.page * 10 >= hist.total) && {
                        opacity: 0.6,
                      },
                    ]}
                  >
                    <Text style={st.ghostText}>Sau ›</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </ScrollView>

        {/* Loading overlay */}
        {loading && (
          <View style={st.overlay}>
            <ActivityIndicator size="large" />
            <Text style={{ color: "#fff", marginTop: 8 }}>Đang xử lý…</Text>
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
  brand: { alignItems: "center", marginVertical: 6 },
  logo: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#d1fae5",
  },
  brandTitle: { fontWeight: "800", fontSize: 18, color: "#0f172a" },
  brandSub: { color: "#475569", fontSize: 12, marginTop: 2 },

  card: {
    backgroundColor: "rgba(255,255,255,0.86)",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  cardTitle: { fontWeight: "800", color: "#0f172a" },
  label: { fontWeight: "700", color: "#0f172a" },

  toggle: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "rgba(16,185,129,0.12)",
    flexDirection: "row",
    alignItems: "center",
  },
  toggleText: { color: "#0f766e", fontWeight: "700" },

  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: 10,
    minHeight: 42,
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.9)",
    marginTop: 6,
  },
  primary: {
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    backgroundColor: "#059669",
  },
  primaryText: { color: "#fff", fontWeight: "800" },
  ghost: {
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  ghostText: { fontWeight: "700", color: "#0f172a" },

  rowCard: {
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    marginTop: 8,
  },
  rowTitle: { fontWeight: "800", color: "#0f172a" },
  meta: { color: "#64748b", marginTop: 2 },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pager: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    marginTop: 8,
  },

  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
});
