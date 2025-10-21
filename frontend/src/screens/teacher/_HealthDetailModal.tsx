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
function DestructiveBtn({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={{ marginTop: 8 }}>
      <LinearGradient
        colors={["#ef4444", "#b91c1c"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={st.primaryBtn}
      >
        <Ionicons name="trash-outline" size={16} color="#fff" />
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

export default function HealthDetailModal({
  visible,
  onClose,
  onSaved,
  onDeleted,
  doc,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
  doc: any;
}) {
  const [state, setState] = useState<any>(null);
  useEffect(() => {
    if (visible) setState(doc);
  }, [visible, doc]);

  if (!state)
    return (
      <Modal visible={visible} onRequestClose={onClose}>
        <View />
      </Modal>
    );

  const get = (p: string, d: any = "") => {
    const parts = p.split(".");
    let cur: any = state;
    for (const k of parts) {
      cur = cur?.[k];
      if (cur === undefined) return d;
    }
    return cur;
  };
  const set = (p: string, v: any) => {
    setState((prev: any) => {
      const parts = p.split(".");
      const next = { ...prev };
      let cur: any = next;
      for (let i = 0; i < parts.length - 1; i++) {
        const k = parts[i];
        cur[k] = cur[k] ? { ...cur[k] } : {};
        cur = cur[k];
      }
      cur[parts[parts.length - 1]] = v;
      return next;
    });
  };

  const submit = async () => {
    try {
      const payload = {
        healthStatus: state.healthStatus,
        behaviorNotes: state.behaviorNotes,
        activityLevel: state.activityLevel,
        socialInteraction: state.socialInteraction,
        parentNotified: !!state.parentNotified,
        requiresAttention: !!state.requiresAttention,
      };
      await axiosClient.put(`/health/${state._id}`, payload);
      onSaved();
    } catch (e: any) {
      Alert.alert("Lỗi", e?.response?.data?.message || "Cập nhật thất bại");
    }
  };

  const remove = async () => {
    try {
      await axiosClient.delete(`/health/${state._id}`);
      Alert.alert("OK", "Đã xoá bản ghi");
      onDeleted?.();
    } catch (e: any) {
      Alert.alert("Lỗi", e?.response?.data?.message || "Xoá thất bại");
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
              <LogoBadge name="medkit-outline" />
            </View>
            <Text style={st.brandTitle}>
              Chi tiết sức khỏe {(state.date || "").slice(0, 10)}
            </Text>
            <Pressable onPress={onClose} style={st.closeBtn}>
              <Ionicons name="chevron-down" size={18} color="#0f172a" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
            {/* Card: thông số */}
            <View style={st.card}>
              <View style={st.cardHead}>
                <Ionicons
                  name="thermometer-outline"
                  size={16}
                  color="#0f172a"
                />
                <Text style={st.section}>Thông số</Text>
              </View>

              <View style={st.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={st.small}>Nhiệt độ (℃)</Text>
                  <TextInput
                    style={st.input}
                    keyboardType="numeric"
                    value={String(get("healthStatus.temperature", 37))}
                    onChangeText={(t) =>
                      set("healthStatus.temperature", parseFloat(t) || 37)
                    }
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={st.small}>Tâm trạng</Text>
                  <TextInput
                    style={st.input}
                    value={get("healthStatus.mood", "normal")}
                    onChangeText={(t) => set("healthStatus.mood", t)}
                  />
                </View>
              </View>

              <View style={st.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={st.small}>Thèm ăn</Text>
                  <TextInput
                    style={st.input}
                    value={get("healthStatus.appetite", "normal")}
                    onChangeText={(t) => set("healthStatus.appetite", t)}
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={st.small}>Giấc ngủ</Text>
                  <TextInput
                    style={st.input}
                    value={get("healthStatus.sleepQuality", "normal")}
                    onChangeText={(t) => set("healthStatus.sleepQuality", t)}
                  />
                </View>
              </View>

              <View style={st.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={st.small}>Đại tiện</Text>
                  <TextInput
                    style={st.input}
                    value={get("healthStatus.bowelMovement", "normal")}
                    onChangeText={(t) => set("healthStatus.bowelMovement", t)}
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={st.small}>Da / Dị ứng</Text>
                  <TextInput
                    style={st.input}
                    value={get("healthStatus.skinCondition", "")}
                    onChangeText={(t) => set("healthStatus.skinCondition", t)}
                  />
                </View>
              </View>

              <Text style={[st.small, { marginTop: 8 }]}>
                Triệu chứng bất thường (CSV)
              </Text>
              <TextInput
                style={st.input}
                value={(
                  get("healthStatus.unusualSymptoms", []) as string[]
                ).join(", ")}
                onChangeText={(t) =>
                  set(
                    "healthStatus.unusualSymptoms",
                    t
                      .split(",")
                      .map((x) => x.trim())
                      .filter(Boolean)
                  )
                }
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
                value={state.behaviorNotes || ""}
                onChangeText={(t) => setState({ ...state, behaviorNotes: t })}
              />

              <View style={st.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={st.small}>Mức độ hoạt động</Text>
                  <TextInput
                    style={st.input}
                    value={state.activityLevel || "normal"}
                    onChangeText={(t) =>
                      setState({ ...state, activityLevel: t })
                    }
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={st.small}>Tương tác xã hội</Text>
                  <TextInput
                    style={st.input}
                    value={state.socialInteraction || "normal"}
                    onChangeText={(t) =>
                      setState({ ...state, socialInteraction: t })
                    }
                  />
                </View>
              </View>

              <View style={st.switchRow}>
                <Text style={st.switchLabel}>Đã thông báo phụ huynh</Text>
                <Switch
                  value={!!state.parentNotified}
                  onValueChange={(v) =>
                    setState({ ...state, parentNotified: v })
                  }
                />
              </View>
              <View style={st.switchRow}>
                <Text style={st.switchLabel}>Cần chú ý đặc biệt</Text>
                <Switch
                  value={!!state.requiresAttention}
                  onValueChange={(v) =>
                    setState({ ...state, requiresAttention: v })
                  }
                />
              </View>
            </View>

            {/* Footer */}
            <View style={st.footerBtns}>
              <PrimaryBtn
                title="Lưu thay đổi"
                onPress={submit}
                icon="save-outline"
              />
              <DestructiveBtn title="Xoá bản ghi" onPress={remove} />
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

  section: { fontWeight: "800", color: "#0f172a" },
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
});
