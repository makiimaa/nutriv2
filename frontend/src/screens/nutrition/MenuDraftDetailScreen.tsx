import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  Alert,
  SafeAreaView,
  StyleSheet,
} from "react-native";
import axiosClient from "../../api/axiosClient";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

type MealKey = "breakfast" | "lunch" | "snack";

const MEAL_META: Record<
  MealKey,
  { title: string; icon: any; iconColor: string }
> = {
  breakfast: {
    title: "Breakfast",
    icon: "sunny-outline",
    iconColor: "#b45309",
  },
  lunch: { title: "Lunch", icon: "restaurant-outline", iconColor: "#065f46" },
  snack: { title: "Snack", icon: "ice-cream-outline", iconColor: "#7c3aed" },
};

function fmtDate(d?: any) {
  if (!d) return "—";
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return String(d);
  }
}

function qtyStr(q?: any, unit?: string) {
  const v = Number(q);
  if (!isFinite(v) || v <= 0) return "—";
  return `${v}${unit || "g"}`;
}

export default function MenuDraftDetailScreen({ route }: any) {
  const recId = route?.params?.recId;
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(true);

  async function load() {
    try {
      setBusy(true);
      const r = await axiosClient.get(`/nutrition/detail/${recId}`, {
        timeout: 0,
      });
      if (!r.data?.ok)
        throw new Error(r.data?.message || "Không tìm thấy draft");
      const d = r.data.item || r.data.data || r.data;
      const meals = d.meals ||
        d.recommendations?.meals || {
          breakfast: { items: [] },
          lunch: { items: [] },
          snack: { items: [] },
        };
      setData({ ...d, meals });
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Không tải được");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    load();
  }, [recId]);

  if (busy)
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text>Đang tải…</Text>
      </View>
    );
  if (!data)
    return (
      <View style={{ padding: 16 }}>
        <Text>Không có dữ liệu</Text>
      </View>
    );

  const meals = data.meals || {};
  const sg = data.studentGroup || {};
  const when = data.date || data.generatedDate || data.createdAt || null;
  const dateStr = fmtDate(when);

  const MealCard = ({ mealKey }: { mealKey: MealKey }) => {
    const meta = MEAL_META[mealKey];
    const items: any[] = meals?.[mealKey]?.items || [];
    const stats = useMemo(() => {
      const total = items.reduce((s, x) => s + (Number(x.quantity) || 0), 0);
      return {
        count: items.length,
        total,
      };
    }, [items]);

    return (
      <View style={st.mealCard}>
        {/* Header */}
        <View style={st.mealHead}>
          <View style={st.mealTitleRow}>
            <Ionicons name={meta.icon} size={18} color={meta.iconColor} />
            <Text style={st.mealTitle}>{meta.title}</Text>
          </View>
          <View style={st.statPill}>
            <Text style={st.statText}>
              {stats.count} món • ~{Math.round(stats.total)}g
            </Text>
          </View>
        </View>

        {/* Items */}
        {items.length === 0 ? (
          <Text style={{ color: "#64748b" }}>Chưa có món.</Text>
        ) : (
          items.map((x, i) => {
            const name =
              x.name || x.foodName || x.foodItemId || `Món #${i + 1}`;
            const unit = x.unit || "g";
            const allergens: string[] = Array.isArray(x.allergens)
              ? x.allergens
              : [];
            const note: string | undefined = x.note || x.notes;

            return (
              <View key={`${name}-${i}`} style={st.itemRow}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={st.itemName}>{name}</Text>
                  <View style={st.metaRow}>
                    <Text style={st.itemMeta}>
                      Dự kiến: {qtyStr(x.plannedQuantity, unit)}
                    </Text>
                    <Text style={st.dot}>•</Text>
                    <Text style={st.itemMeta}>
                      Thực tế: {qtyStr(x.quantity ?? x.actualQuantity, unit)}
                    </Text>
                  </View>

                  {!!note && (
                    <Text style={st.itemNote} numberOfLines={3}>
                      “{note}”
                    </Text>
                  )}

                  {!!allergens.length && (
                    <View style={st.tagsRow}>
                      {allergens.slice(0, 4).map((a, j) => (
                        <View key={j} style={st.tag}>
                          <Text style={st.tagText}>{a}</Text>
                        </View>
                      ))}
                      {allergens.length > 4 && (
                        <View
                          style={[
                            st.tag,
                            { backgroundColor: "rgba(0,0,0,0.06)" },
                          ]}
                        >
                          <Text style={[st.tagText, { color: "#0f172a" }]}>
                            +{allergens.length - 4}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                <View style={st.qtyBadge}>
                  <Text style={st.qtyText}>
                    {qtyStr(x.quantity ?? x.actualQuantity, unit)}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    );
  };

  return (
    <LinearGradient colors={["#eef7ff", "#f8fffb"]} style={{ flex: 1 }}>
      <SafeAreaView style={st.safe}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 24 }}
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
                <Ionicons name="reader-outline" size={22} color="#0b3d2e" />
              </LinearGradient>
            </View>
            <Text style={st.brandTitle}>Chi tiết draft</Text>
            <Text style={st.brandSub}>
              {dateStr} — {sg.name || "nhóm"} • Model: {data.aiModel || "—"}
            </Text>
          </View>

          {/* Meal cards */}
          <MealCard mealKey="breakfast" />
          <MealCard mealKey="lunch" />
          <MealCard mealKey="snack" />
        </ScrollView>
      </SafeAreaView>
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
  brandTitle: { fontWeight: "800", fontSize: 18, color: "#0f172a" },
  brandSub: { marginTop: 2, color: "#475569", fontSize: 12 },

  mealCard: {
    backgroundColor: "rgba(255,255,255,0.9)",
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
  mealHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  mealTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  mealTitle: { fontWeight: "800", color: "#0f172a" },

  statPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(16,185,129,0.12)",
  },
  statText: { color: "#065f46", fontWeight: "700", fontSize: 12 },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  itemName: { fontWeight: "700", color: "#0f172a" },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 2, gap: 6 },
  itemMeta: { color: "#64748b", fontSize: 12 },
  dot: { color: "#94a3b8", fontSize: 12 },

  itemNote: {
    marginTop: 4,
    fontStyle: "italic",
    color: "#334155",
  },

  qtyBadge: {
    backgroundColor: "rgba(0,0,0,0.06)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  qtyText: { fontWeight: "800", color: "#0f172a" },

  tagsRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 6 },
  tag: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: "rgba(244,63,94,0.12)",
  },
  tagText: { color: "#be123c", fontWeight: "700", fontSize: 11 },
});
