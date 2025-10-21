import React, { useEffect, useState } from "react";
import { View, Text, Alert, ScrollView, StyleSheet } from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";
import axiosClient from "../../api/axiosClient";
import type { RootStackParamList } from "../../navigation/AppNavigator";
import { LinearGradient } from "expo-linear-gradient";

type R = RouteProp<RootStackParamList, "ParentHealthByDate">;

export default function ParentHealthByDateScreen() {
  const route = useRoute<R>();
  const { date, studentId } = route.params;

  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const r = await axiosClient.get(`/health/by-date-mine/${date}`, {
        params: { studentId },
      });
      setDoc(r.data?.doc || null);
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
    if (date) load();
  }, [date]);

  const get = (p: string, d: any = "") => {
    const parts = p.split(".");
    let cur: any = doc;
    for (const k of parts) {
      cur = cur?.[k];
      if (cur === undefined) return d;
    }
    return cur;
  };

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

  const Bool = ({ v }: { v: any }) => (
    <Text style={styles.rowVal}>{v ? "Có" : "Không"}</Text>
  );

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {typeof value === "string" || typeof value === "number" ? (
        <Text style={styles.rowVal}>{String(value)}</Text>
      ) : (
        value
      )}
    </View>
  );

  const ChipList = ({ items }: { items: string[] }) => (
    <View style={styles.chips}>
      {items.length === 0 ? (
        <Text style={styles.muted}>—</Text>
      ) : (
        items.map((t, i) => (
          <View key={i} style={styles.chip}>
            <Text style={styles.chipText}>{t}</Text>
          </View>
        ))
      )}
    </View>
  );

  return (
    <LinearGradient
      colors={["#eef7ff", "#f8fffb"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={styles.header}>
          <Text style={styles.title}>Sức khỏe ngày</Text>
          <Text style={styles.subtitle}>{humanDate(date)}</Text>
          <Text style={styles.caption}>{date}</Text>
        </View>

        {!doc && (
          <Text style={styles.muted}>Chưa có bản ghi cho ngày này.</Text>
        )}

        {!!doc && (
          <>
            {/* Tình trạng */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tình trạng</Text>
              <Row
                label="Nhiệt độ"
                value={`${get("healthStatus.temperature", "—")}℃`}
              />
              <Row label="Tâm trạng" value={get("healthStatus.mood", "—")} />
              <Row label="Thèm ăn" value={get("healthStatus.appetite", "—")} />
              <Row
                label="Giấc ngủ"
                value={get("healthStatus.sleepQuality", "—")}
              />
              <Row
                label="Đại tiện"
                value={get("healthStatus.bowelMovement", "—")}
              />
              <Row
                label="Da / Dị ứng"
                value={get("healthStatus.skinCondition", "—")}
              />
              <Text style={[styles.rowLabel, { marginTop: 8 }]}>
                Triệu chứng
              </Text>
              <ChipList
                items={
                  (get("healthStatus.unusualSymptoms", []) as string[]) || []
                }
              />
            </View>

            {/* Hoạt động */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Hoạt động</Text>
              <Row label="Activity" value={doc.activityLevel || "—"} />
              <Row label="Social" value={doc.socialInteraction || "—"} />
            </View>

            {/* Khác */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Khác</Text>
              <Row
                label="Đã thông báo PH"
                value={<Bool v={doc.parentNotified} />}
              />
              <Row
                label="Cần chú ý"
                value={<Bool v={doc.requiresAttention} />}
              />
            </View>

            {!!doc.behaviorNotes && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Ghi chú</Text>
                <Text style={styles.noteText}>{doc.behaviorNotes}</Text>
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

  row: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  rowLabel: { color: "#475569", fontWeight: "600" },
  rowVal: { color: "#0f172a", fontWeight: "700" },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  chip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: "rgba(59,130,246,0.12)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.25)",
  },
  chipText: { color: "#1d4ed8", fontWeight: "700", fontSize: 12 },

  muted: { color: "#64748b", marginTop: 6 },
  noteText: { color: "#0f172a" },
});
