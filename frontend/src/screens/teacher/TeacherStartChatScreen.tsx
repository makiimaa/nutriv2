import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Alert,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Pressable,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import axiosClient from "../../api/axiosClient";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const UI = {
  padX: 24,
  glass: "rgba(255,255,255,0.6)",
  border: "rgba(0,0,0,0.08)",
  radius: 14,
  shadow: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  } as const,
};

export default function TeacherStartChatScreen() {
  const nav = useNavigation<any>();
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classId, setClassId] = useState<string>("");
  const [studentId, setStudentId] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const cls = await axiosClient.get("/classes/mine");
        const rows = cls.data || [];
        setClasses(rows);
        if (rows?.[0]?._id) {
          const firstId = rows[0]._id;
          setClassId(firstId);
          const st = await axiosClient
            .get(`/students/mine?classId=${firstId}`)
            .catch(() => ({ data: [] }));
          setStudents(st.data || []);
        }
      } catch (e: any) {
        Alert.alert("Lỗi", e?.response?.data?.message || "Không tải được lớp");
      }
    })();
  }, []);

  const onChangeClass = async (id: string) => {
    setClassId(id);
    setStudentId("");
    try {
      const st = await axiosClient.get(`/students/mine?classId=${id}`);
      setStudents(st.data || []);
    } catch (e: any) {
      Alert.alert(
        "Lỗi",
        e?.response?.data?.message || "Không tải được học sinh"
      );
    }
  };

  const start = async () => {
    try {
      if (!studentId) return Alert.alert("Lỗi", "Chọn học sinh");
      const r = await axiosClient.post("/conversations/thread/init", {
        studentId,
      });
      const threadId = r.data?._id;
      if (!threadId) return Alert.alert("Lỗi", "Không khởi tạo được hội thoại");
      nav.replace("TeacherChatDetail", { threadId });
    } catch (e: any) {
      Alert.alert("Lỗi", e?.response?.data?.message || "Khởi tạo thất bại");
    }
  };

  const Brand = () => (
    <View style={st.brandWrap}>
      <LinearGradient
        colors={["#d1fae5", "#93c5fd"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={st.brandLogo}
      >
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={26}
          color="#0b3d2e"
        />
      </LinearGradient>
      <Text style={st.brandTitle}>Bắt đầu hội thoại</Text>
      <Text style={st.brandSub}>Chọn lớp → Chọn học sinh → Khởi tạo</Text>
    </View>
  );

  const PrimaryBtn = ({
    title,
    icon,
    onPress,
    disabled,
  }: {
    title: string;
    icon?: any;
    onPress: () => void;
    disabled?: boolean;
  }) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[st.btn, disabled && { opacity: 0.6 }]}
    >
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

  return (
    <LinearGradient colors={["#eef7ff", "#f8fffb"]} style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" translucent />
      <SafeAreaView style={st.safe}>
        <Brand />
        <View style={st.card}>
          <Text style={st.label}>Chọn lớp</Text>
          <View style={st.pickerWrap}>
            <Picker
              selectedValue={classId}
              onValueChange={(v) => onChangeClass(String(v))}
            >
              {classes.map((c) => (
                <Picker.Item
                  key={c._id}
                  label={c.name || c.title || c._id}
                  value={c._id}
                />
              ))}
            </Picker>
          </View>

          <Text style={st.label}>Chọn học sinh</Text>
          <View style={st.pickerWrap}>
            <Picker
              selectedValue={studentId}
              onValueChange={(v) => setStudentId(String(v))}
            >
              <Picker.Item label="-- chọn học sinh --" value="" />
              {students.map((s) => (
                <Picker.Item
                  key={s._id}
                  label={s.fullName || s.name || s._id}
                  value={s._id}
                />
              ))}
            </Picker>
          </View>

          <PrimaryBtn
            title="Bắt đầu hội thoại"
            icon="send-outline"
            onPress={start}
            disabled={!studentId}
          />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: UI.padX, paddingTop: 8 },

  brandWrap: { alignItems: "center", marginTop: 8, marginBottom: 12 },
  brandLogo: {
    width: 58,
    height: 58,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    ...UI.shadow,
    marginBottom: 8,
  },
  brandTitle: { fontSize: 18, fontWeight: "800", color: "#0b3d2e" },
  brandSub: { fontSize: 12, color: "#64748b", marginTop: 2 },

  card: {
    backgroundColor: UI.glass,
    borderRadius: UI.radius,
    padding: 14,
    borderWidth: 1,
    borderColor: UI.border,
    ...UI.shadow,
  },
  label: { fontWeight: "700", marginTop: 8, marginBottom: 6, color: "#0f172a" },
  pickerWrap: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "rgba(255,255,255,0.7)",
  },

  btn: { alignSelf: "center", marginTop: 10, borderRadius: 12 },
  btnInner: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  btnText: { color: "#fff", fontWeight: "700" },
});
