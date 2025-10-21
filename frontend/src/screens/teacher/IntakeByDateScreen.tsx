import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useRoute } from "@react-navigation/native";
import axiosClient from "../../api/axiosClient";
import { FoodItem } from "../../types";
import IntakeDetailModal from "./_IntakeDetailModal";
import BulkIntakeModal from "./_BulkIntakeModal";
import SingleIntakeModal from "./_SingleIntakeModal";

const UI = {
  padX: 24,
  glass: "rgba(255,255,255,0.6)",
  border: "rgba(0,0,0,0.08)",
  radius: 14,
};

function PrimaryBtn({
  title,
  icon,
  onPress,
}: {
  title: string;
  icon?: any;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={st.btn}>
      <LinearGradient
        colors={["#34d399", "#059669"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={st.btnInner}
      >
        {icon && <Ionicons name={icon} size={16} color="#fff" />}
        <Text style={st.btnText}>{title}</Text>
      </LinearGradient>
    </Pressable>
  );
}

type Row = {
  hasRecord: boolean;
  doc?: any;
  student: { _id: string; name: string; studentId?: string };
};

export default function IntakeByDateScreen() {
  const route = useRoute<RouteProp<any>>();
  const { date, classId } = route.params as { date: string; classId: string };

  const [rows, setRows] = useState<Row[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailDoc, setDetailDoc] = useState<any>(null);

  const [bulkCreateVisible, setBulkCreateVisible] = useState(false);
  const [bulkUpdateVisible, setBulkUpdateVisible] = useState(false);

  const [singleVisible, setSingleVisible] = useState(false);
  const [singleStudent, setSingleStudent] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const openAddSingle = (row: Row) => {
    setSingleStudent({ id: row.student._id, name: row.student.name });
    setSingleVisible(true);
  };

  const load = async () => {
    try {
      const [r, fi] = await Promise.all([
        axiosClient.get(`/intake/by-date/${date}?classId=${classId}`),
        axiosClient.get("/food-items"),
      ]);
      setRows(r.data || []);
      setFoodItems(fi.data || []);
    } catch (e: any) {
      Alert.alert(
        "Lỗi",
        e?.response?.data?.message || "Không tải được dữ liệu"
      );
    }
  };
  useEffect(() => {
    load();
  }, []);

  const openStudent = (row: Row) => {
    if (row.doc) {
      setDetailDoc(row.doc);
      setDetailVisible(true);
    } else {
      Alert.alert("Chưa có", "Học sinh chưa có bản ghi hôm nay.");
    }
  };

  const total = rows.length;
  const done = useMemo(() => rows.filter((r) => r.hasRecord).length, [rows]);

  return (
    <LinearGradient colors={["#eef7ff", "#f8fffb"]} style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" translucent />
      <SafeAreaView style={st.safe}>
        {/* Brand/Header */}
        <View style={st.brand}>
          <View style={st.logoWrap}>
            <LinearGradient
              colors={["#d1fae5", "#93c5fd"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={st.logo}
            >
              <Ionicons
                name="calendar-number-outline"
                size={22}
                color="#0b3d2e"
              />
            </LinearGradient>
          </View>
          <Text style={st.brandTitle}>Chi tiết ngày {date}</Text>
          <Text style={st.brandSub}>
            {done}/{total} học sinh đã có bản ghi
          </Text>
        </View>

        {/* Actions */}
        <View style={st.inlineBtns}>
          <PrimaryBtn
            title="Tạo cho HS thiếu"
            icon="add-circle-outline"
            onPress={() => setBulkCreateVisible(true)}
          />
          <PrimaryBtn
            title="Cập nhật cả lớp"
            icon="create-outline"
            onPress={() => setBulkUpdateVisible(true)}
          />
        </View>

        {/* List */}
        <FlatList
          style={{ marginTop: 12 }}
          data={rows}
          keyExtractor={(i) => i.student._id}
          contentContainerStyle={{ paddingBottom: 26 }}
          renderItem={({ item }) => (
            <View style={st.rowCard}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={st.rowTitle}>
                  {item.student.name}
                  {item.student.studentId ? ` (${item.student.studentId})` : ""}
                </Text>

                <View
                  style={[
                    st.statusPill,
                    item.hasRecord ? st.pillOk : st.pillWarn,
                  ]}
                >
                  <Ionicons
                    name={item.hasRecord ? "checkmark-circle" : "alert-circle"}
                    size={14}
                    color={item.hasRecord ? "#065f46" : "#7c5800"}
                  />
                  <Text
                    style={[
                      st.pillText,
                      { color: item.hasRecord ? "#065f46" : "#7c5800" },
                    ]}
                  >
                    {item.hasRecord ? "ĐÃ CÓ" : "CHƯA CÓ"}
                  </Text>
                </View>
              </View>

              {item.hasRecord ? (
                <TouchableOpacity
                  onPress={() => openStudent(item)}
                  style={st.actionPill}
                >
                  <Ionicons name="open-outline" size={14} color="#0f172a" />
                  <Text style={st.actionPillText}>Xem / Cập nhật</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => openAddSingle(item)}
                  style={st.actionPill}
                >
                  <Ionicons name="add-outline" size={14} color="#0f172a" />
                  <Text style={st.actionPillText}>Thêm mới</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          ListEmptyComponent={
            <Text
              style={{ textAlign: "center", color: "#64748b", marginTop: 12 }}
            >
              Không có học sinh.
            </Text>
          }
        />

        {/* Modals */}
        <IntakeDetailModal
          visible={detailVisible}
          onClose={() => setDetailVisible(false)}
          doc={detailDoc}
          foodItems={foodItems}
          onSaved={() => {
            setDetailVisible(false);
            load();
          }}
          onDeleted={() => {
            setDetailVisible(false);
            load();
          }}
        />

        <BulkIntakeModal
          visible={bulkCreateVisible}
          onClose={() => setBulkCreateVisible(false)}
          mode="create"
          classId={classId}
          dateDefault={date}
          onSaved={async () => {
            setBulkCreateVisible(false);
            await load();
          }}
        />

        <BulkIntakeModal
          visible={bulkUpdateVisible}
          onClose={() => setBulkUpdateVisible(false)}
          mode="update"
          classId={classId}
          dateDefault={date}
          onSaved={async () => {
            setBulkUpdateVisible(false);
            await load();
          }}
        />

        <SingleIntakeModal
          visible={singleVisible}
          onClose={() => setSingleVisible(false)}
          onSaved={() => {
            setSingleVisible(false);
            load();
          }}
          studentId={singleStudent?.id || ""}
          classId={classId}
          date={date}
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

  inlineBtns: { gap: 8 },

  btn: { borderRadius: 12 },
  btnInner: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  btnText: { color: "#fff", fontWeight: "700" },

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
    marginTop: 10,
  },
  rowTitle: { fontWeight: "800", color: "#0f172a" },

  statusPill: {
    marginTop: 6,
    alignSelf: "flex-start",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pillOk: { backgroundColor: "rgba(16,185,129,0.18)" },
  pillWarn: { backgroundColor: "rgba(250,204,21,0.22)" },
  pillText: { fontWeight: "700", fontSize: 12.5 },

  actionPill: {
    backgroundColor: "rgba(0,0,0,0.06)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionPillText: { color: "#0f172a", fontWeight: "700" },
});
