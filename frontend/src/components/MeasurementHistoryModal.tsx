import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  SafeAreaView,
} from "react-native";
import axiosClient from "../api/axiosClient";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

type Row = {
  _id: string;
  height: number;
  weight: number;
  bmi: number;
  measurementDate: string;
  notes?: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  studentId: string;
};

export default function MeasurementHistoryModal({
  visible,
  onClose,
  studentId,
}: Props) {
  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get(`/measurements/student/${studentId}`);
      setData(
        (res.data || []).sort((a: Row, b: Row) =>
          b.measurementDate > a.measurementDate ? 1 : -1
        )
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) load();
  }, [visible]);

  const renderItem = ({ item }: { item: Row }) => (
    <View style={s.timelineRow}>
      <View style={s.dot} />
      <View style={s.card}>
        <View style={s.rowTop}>
          <Text style={s.rowDate}>{item.measurementDate?.slice(0, 10)}</Text>
          <View style={s.badge}>
            <Ionicons name="fitness-outline" size={14} color="#0f766e" />
            <Text style={s.badgeText}>BMI {item.bmi}</Text>
          </View>
        </View>
        <Text style={s.rowMeta}>
          Cao {item.height} cm • Nặng {item.weight} kg
        </Text>
        {!!item.notes && <Text style={s.rowNote}>Ghi chú: {item.notes}</Text>}
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <LinearGradient colors={["#eef7ff", "#f8fffb"]} style={{ flex: 1 }}>
        <SafeAreaView style={s.safe}>
          <View style={s.header}>
            <Text style={s.h}>Lịch sử đo đạc</Text>
            <Pressable onPress={onClose} style={s.close}>
              <Ionicons name="close" size={20} color="#0f172a" />
            </Pressable>
          </View>

          <FlatList
            data={data}
            keyExtractor={(i) => i._id}
            renderItem={renderItem}
            refreshing={loading}
            onRefresh={load}
            contentContainerStyle={{ paddingBottom: 24, paddingTop: 6 }}
            ListEmptyComponent={
              <Text style={{ textAlign: "center", color: "#64748b" }}>
                Chưa có dữ liệu.
              </Text>
            }
          />

          <Pressable onPress={onClose} style={s.secondaryBtn}>
            <Text style={s.secondaryText}>Đóng</Text>
          </Pressable>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  header: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
    paddingTop: 2,
  },
  h: { fontSize: 18, fontWeight: "800", color: "#0b3d2e" },
  close: {
    position: "absolute",
    right: 0,
    top: 0,
    padding: 8,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.06)",
  },

  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 12,
    backgroundColor: "rgba(16,185,129,0.9)",
    marginRight: 10,
  },
  card: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.65)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  rowTop: { flexDirection: "row", alignItems: "center" },
  rowDate: { fontWeight: "800", color: "#0f172a", flex: 1 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: "rgba(16,185,129,0.12)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.25)",
  },
  badgeText: { color: "#0f766e", fontWeight: "700" },

  rowMeta: { color: "#475569", marginTop: 4 },
  rowNote: { color: "#0f172a", marginTop: 6 },

  secondaryBtn: {
    marginTop: 6,
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  secondaryText: { color: "#0f172a", fontWeight: "700" },
});
