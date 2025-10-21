import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Switch,
  Pressable,
  SafeAreaView,
  StatusBar,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import axiosClient from "../../api/axiosClient";

const UI = {
  padX: 24,
  glass: "rgba(255,255,255,0.6)",
  border: "rgba(0,0,0,0.08)",
  radius: 16,
};

function PrimaryBtn({
  title,
  onPress,
  icon,
}: {
  title: string;
  onPress: () => void;
  icon?: any;
}) {
  return (
    <Pressable onPress={onPress} style={{ marginTop: 6 }}>
      <LinearGradient
        colors={["#34d399", "#059669"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={st.primaryBtn}
      >
        {icon && <Ionicons name={icon} size={16} color="#fff" />}
        <Text style={st.primaryText}>{title}</Text>
      </LinearGradient>
    </Pressable>
  );
}
function GhostBtn({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={st.ghostBtn}>
      <Text style={st.ghostText}>{title}</Text>
    </Pressable>
  );
}
function LogoBadge({ name = "heart-outline" }: { name?: any }) {
  return (
    <LinearGradient
      colors={["#d1fae5", "#93c5fd"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={st.logo}
    >
      <Ionicons name={name} size={20} color="#0b3d2e" />
    </LinearGradient>
  );
}

export default function BulkHealthModal({
  visible,
  onClose,
  onSaved,
  mode,
  classId,
  dateDefault,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  mode: "create" | "update";
  classId: string;
  dateDefault: string;
}) {
  const [date, setDate] = useState(dateDefault);
  const [temperature, setTemperature] = useState("37");
  const [mood, setMood] = useState("normal");
  const [appetite, setAppetite] = useState("normal");
  const [sleepQuality, setSleepQuality] = useState("normal");
  const [bowelMovement, setBowelMovement] = useState("normal");
  const [skinCondition, setSkinCondition] = useState("");
  const [unusual, setUnusual] = useState("");
  const [behaviorNotes, setBehaviorNotes] = useState("");
  const [activityLevel, setActivityLevel] = useState("normal");
  const [socialInteraction, setSocialInteraction] = useState("normal");
  const [parentNotified, setParentNotified] = useState(false);
  const [requiresAttention, setRequiresAttention] = useState(false);

  useEffect(() => {
    if (visible) {
      setDate(dateDefault);
      setTemperature("37");
      setMood("normal");
      setAppetite("normal");
      setSleepQuality("normal");
      setBowelMovement("normal");
      setSkinCondition("");
      setUnusual("");
      setBehaviorNotes("");
      setActivityLevel("normal");
      setSocialInteraction("normal");
      setParentNotified(false);
      setRequiresAttention(false);
    }
  }, [visible, dateDefault]);

  const submit = async () => {
    try {
      if (!classId) return Alert.alert("Lỗi", "Thiếu classId");
      const t = parseFloat(temperature);
      if (Number.isNaN(t)) return Alert.alert("Lỗi", "Nhiệt độ không hợp lệ");

      const healthStatus: any = {
        temperature: t,
        mood,
        appetite,
        sleepQuality,
        bowelMovement,
        skinCondition,
        unusualSymptoms: unusual
          ? unusual
              .split(",")
              .map((x) => x.trim())
              .filter(Boolean)
          : [],
      };
      const body: any = {
        date:
          date && /^\d{4}-\d{2}-\d{2}$/.test(date)
            ? date
            : new Date().toISOString().slice(0, 10),
        classId,
        healthStatus,
        behaviorNotes,
        activityLevel,
        socialInteraction,
        parentNotified,
        requiresAttention,
      };
      if (mode === "create") await axiosClient.post("/health/bulk", body);
      else await axiosClient.put("/health/bulk", body);
      onSaved();
      Alert.alert(
        "OK",
        mode === "create" ? "Đã tạo cho HS thiếu" : "Đã cập nhật cả lớp"
      );
    } catch (e: any) {
      Alert.alert("Lỗi", e?.response?.data?.message || "Thao tác thất bại");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <LinearGradient colors={["#eef7ff", "#f8fffb"]} style={{ flex: 1 }}>
        <StatusBar translucent barStyle="dark-content" />
        <SafeAreaView style={st.safe}>
          {/* Brand/Header */}
          <View style={st.brand}>
            <View style={st.logoWrap}>
              <LogoBadge name="fitness-outline" />
            </View>
            <Text style={st.brandTitle}>
              {mode === "create" ? "Thêm bản ghi cả lớp" : "Cập nhật cả lớp"}
            </Text>
            <Text style={st.brandSub}>Sức khỏe học sinh</Text>

            <Pressable onPress={onClose} style={st.closeBtn}>
              <Ionicons name="close" size={18} color="#0f172a" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
            {/* Card: ngày */}
            <View style={st.card}>
              <Text style={st.label}>Ngày</Text>
              <TextInput
                style={st.input}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                autoCapitalize="none"
                placeholderTextColor="#94a3b8"
              />
            </View>

            {/* Card: thông số sức khỏe */}
            <View style={st.card}>
              <View style={st.cardHead}>
                <Ionicons
                  name="thermometer-outline"
                  size={16}
                  color="#0f172a"
                />
                <Text style={st.section}>Thông số sức khỏe</Text>
              </View>

              <View style={st.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={st.small}>Nhiệt độ (℃)</Text>
                  <TextInput
                    style={st.input}
                    keyboardType="numeric"
                    value={temperature}
                    onChangeText={setTemperature}
                    placeholder="37"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={st.small}>Tâm trạng</Text>
                  <TextInput
                    style={st.input}
                    value={mood}
                    onChangeText={setMood}
                    placeholder="normal"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <View style={st.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={st.small}>Thèm ăn</Text>
                  <TextInput
                    style={st.input}
                    value={appetite}
                    onChangeText={setAppetite}
                    placeholder="normal"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={st.small}>Giấc ngủ</Text>
                  <TextInput
                    style={st.input}
                    value={sleepQuality}
                    onChangeText={setSleepQuality}
                    placeholder="normal"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <View style={st.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={st.small}>Đại tiện</Text>
                  <TextInput
                    style={st.input}
                    value={bowelMovement}
                    onChangeText={setBowelMovement}
                    placeholder="normal"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={st.small}>Da / Dị ứng</Text>
                  <TextInput
                    style={st.input}
                    value={skinCondition}
                    onChangeText={setSkinCondition}
                    placeholder=""
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <Text style={[st.small, { marginTop: 8 }]}>
                Triệu chứng bất thường (CSV)
              </Text>
              <TextInput
                style={st.input}
                value={unusual}
                onChangeText={setUnusual}
                placeholder="sổ mũi, ho nhẹ…"
                placeholderTextColor="#94a3b8"
              />
            </View>

            {/* Card: hành vi & tương tác */}
            <View style={st.card}>
              <View style={st.cardHead}>
                <Ionicons name="people-outline" size={16} color="#0f172a" />
                <Text style={st.section}>Hành vi & tương tác</Text>
              </View>

              <Text style={st.small}>Ghi chú hành vi</Text>
              <TextInput
                style={[st.input, { height: 90, textAlignVertical: "top" }]}
                multiline
                value={behaviorNotes}
                onChangeText={setBehaviorNotes}
              />

              <View style={st.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={st.small}>Mức độ hoạt động</Text>
                  <TextInput
                    style={st.input}
                    value={activityLevel}
                    onChangeText={setActivityLevel}
                    placeholder="normal"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={st.small}>Tương tác xã hội</Text>
                  <TextInput
                    style={st.input}
                    value={socialInteraction}
                    onChangeText={setSocialInteraction}
                    placeholder="normal"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <View style={st.switchRow}>
                <Text style={st.switchLabel}>Đã thông báo phụ huynh</Text>
                <Switch
                  value={parentNotified}
                  onValueChange={setParentNotified}
                />
              </View>
              <View style={st.switchRow}>
                <Text style={st.switchLabel}>Cần chú ý đặc biệt</Text>
                <Switch
                  value={requiresAttention}
                  onValueChange={setRequiresAttention}
                />
              </View>
            </View>

            {/* Footer */}
            <View style={st.footerBtns}>
              <PrimaryBtn
                title={
                  mode === "create" ? "Thêm (HS thiếu)" : "Cập nhật cả lớp"
                }
                onPress={submit}
                icon="checkmark-circle-outline"
              />
              <GhostBtn title="Đóng" onPress={onClose} />
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
}

const st = StyleSheet.create({
  safe: {
    flex: 1,
    paddingTop: Platform.select({ ios: 8, android: 4 }),
    paddingHorizontal: UI.padX,
  },

  brand: { alignItems: "center", marginTop: 2, marginBottom: 8 },
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
  closeBtn: {
    position: "absolute",
    right: 0,
    top: 4,
    backgroundColor: "rgba(0,0,0,0.06)",
    padding: 8,
    borderRadius: 12,
  },

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
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },

  label: { fontWeight: "700", color: "#0f172a", marginBottom: 6 },
  small: { fontWeight: "600", color: "#0f172a", marginBottom: 6 },

  input: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  row2: { flexDirection: "row", marginTop: 6 },

  switchRow: {
    marginTop: 8,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchLabel: { color: "#0f172a", fontWeight: "600" },

  primaryBtn: {
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: "#059669",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  primaryText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 0.3,
  },
  ghostBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    marginTop: 8,
  },
  ghostText: { fontWeight: "700", color: "#0f172a" },
  footerBtns: { gap: 8, marginTop: 12 },
  section: {
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 6,
  },
});
