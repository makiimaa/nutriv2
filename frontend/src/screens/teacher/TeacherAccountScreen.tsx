import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from "react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import axiosClient from "../../api/axiosClient";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

function ymd(d?: Date) {
  if (!d) return "";
  const yy = d.getFullYear();
  const mm = `${d.getMonth() + 1}`.padStart(2, "0");
  const dd = `${d.getDate()}`.padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
function parseDate(s?: string) {
  if (!s) return null;
  const t = Date.parse(s);
  if (Number.isNaN(t)) return null;
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function initials(name?: string) {
  if (!name) return "GV";
  const parts = name.trim().split(/\s+/).slice(-2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "GV";
}

const UI = {
  glass: "rgba(255,255,255,0.86)",
  border: "rgba(0,0,0,0.06)",
};

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
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[st.btnWrap, disabled && { opacity: 0.6 }]}
    >
      <LinearGradient
        colors={["#34d399", "#059669"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={st.btn}
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
  danger,
  icon,
}: {
  title: string;
  onPress: () => void;
  danger?: boolean;
  icon?: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        st.ghostBtn,
        danger && { backgroundColor: "rgba(220,38,38,0.08)" },
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={16}
          color={danger ? "#b91c1c" : "#0f172a"}
          style={{ marginRight: 6 }}
        />
      )}
      <Text style={[st.ghostText, danger && { color: "#b91c1c" }]}>
        {title}
      </Text>
    </Pressable>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  keyboardType = "default",
  secureTextEntry,
  right,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  icon?: any;
  keyboardType?: any;
  secureTextEntry?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={st.label}>{label}</Text>
      <View style={st.inputRow}>
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color="#64748b"
            style={{ marginRight: 8 }}
          />
        )}
        <TextInput
          style={[st.input, { flex: 1 }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          keyboardType={keyboardType}
          placeholderTextColor="#94a3b8"
          secureTextEntry={secureTextEntry}
        />
        {right}
      </View>
    </View>
  );
}

export default function TeacherAccountScreen() {
  const [me, setMe] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [dobObj, setDobObj] = useState<Date | null>(null);
  const [showDOBiOS, setShowDOBiOS] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [busyLoad, setBusyLoad] = useState(false);
  const [busySave, setBusySave] = useState(false);

  const roleChip = useMemo(() => {
    const r = me?.role || "teacher";
    const map: Record<string, string> = {
      admin: "Quản trị",
      teacher: "Giáo viên",
      parent: "Phụ huynh",
    };
    return map[r] || r;
  }, [me?.role]);

  const load = async () => {
    try {
      setBusyLoad(true);
      const res = await axiosClient.get("/auth/me");
      setMe(res.data);
      setForm(res.data || {});
      setDobObj(parseDate(res.data?.dateOfBirth) || null);
    } catch (e: any) {
      Alert.alert(
        "Lỗi",
        e?.response?.data?.message || "Không tải được thông tin"
      );
    } finally {
      setBusyLoad(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const openDOBAndroid = () =>
    DateTimePickerAndroid.open({
      mode: "date",
      value: dobObj || new Date(),
      onChange: (_, d) => {
        if (!d) return;
        const nd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        setDobObj(nd);
        setForm((p: any) => ({ ...p, dateOfBirth: ymd(nd) }));
      },
      is24Hour: true,
    });

  const changeEmail = async () => {
    try {
      const email = newEmail.trim();
      if (!email || !/^\S+@\S+\.\S+$/.test(email))
        return Alert.alert("Lỗi", "Email không hợp lệ");
      await axiosClient.put("/teachers/me/email", { email });
      Alert.alert("OK", "Đã đổi email");
      setNewEmail("");
      await load();
    } catch (e: any) {
      Alert.alert("Lỗi", e?.response?.data?.message || "Đổi email thất bại");
    }
  };

  const changePassword = async () => {
    try {
      if (!oldPassword || !newPassword || newPassword.length < 6) {
        return Alert.alert("Lỗi", "Mật khẩu mới tối thiểu 6 ký tự");
      }
      await axiosClient.put("/teachers/me/password", {
        oldPassword,
        newPassword,
      });
      Alert.alert("OK", "Đã đổi mật khẩu");
      setOldPassword("");
      setNewPassword("");
      setShowPw(false);
    } catch (e: any) {
      Alert.alert("Lỗi", e?.response?.data?.message || "Đổi mật khẩu thất bại");
    }
  };

  const save = async () => {
    try {
      setBusySave(true);
      const patch: any = {
        fullName: form.fullName,
        phone: form.phone,
        address: form.address,
        dateOfBirth: dobObj ? ymd(dobObj) : form.dateOfBirth,
      };
      const res = await axiosClient.put("/teachers/me", patch);
      setMe(res.data);
      Alert.alert("OK", "Đã lưu");
    } catch (e: any) {
      Alert.alert("Lỗi", e?.response?.data?.message || "Lưu thất bại");
    } finally {
      setBusySave(false);
    }
  };

  const emailStr = me?.email || "—";
  const avatarText = initials(form.fullName || me?.fullName || me?.name);

  return (
    <LinearGradient colors={["#eef7ff", "#f8fffb"]} style={{ flex: 1 }}>
      <SafeAreaView style={st.safe}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={st.header}>
            <View style={st.headerIcon}>
              <LinearGradient
                colors={["#d1fae5", "#93c5fd"]}
                style={st.iconBadge}
              >
                <Ionicons
                  name="person-circle-outline"
                  size={20}
                  color="#0b3d2e"
                />
              </LinearGradient>
            </View>
            <Text style={st.h}>Tài khoản</Text>
            <Text style={st.sub}>Thông tin & bảo mật</Text>
          </View>

          {/* Profile card */}
          <View
            style={[st.card, { flexDirection: "row", alignItems: "center" }]}
          >
            <View style={st.avatar}>
              <Text style={st.avatarText}>{avatarText}</Text>
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={st.nameLine}>
                {form.fullName || me?.fullName || "—"}
              </Text>
              <View style={st.emailRow}>
                <Ionicons name="mail-outline" size={14} color="#0f172a" />
                <Text style={st.emailTxt}>{emailStr}</Text>
              </View>
              <View style={st.roleChip}>
                <Text style={st.roleTxt}>{roleChip}</Text>
              </View>
            </View>
          </View>

          {busyLoad && (
            <View style={[st.card, { alignItems: "center" }]}>
              <ActivityIndicator />
              <Text style={{ marginTop: 6, color: "#64748b" }}>Đang tải…</Text>
            </View>
          )}

          {/* Thông tin cá nhân */}
          <View style={st.card}>
            <Text style={st.cardTitle}>Thông tin cá nhân</Text>

            <LabeledInput
              label="Họ tên"
              icon="person-outline"
              value={form.fullName || ""}
              onChangeText={(t) => setForm({ ...form, fullName: t })}
              placeholder="VD: Nguyễn Văn A"
            />
            <LabeledInput
              label="Điện thoại"
              icon="call-outline"
              value={form.phone || ""}
              onChangeText={(t) => setForm({ ...form, phone: t })}
              keyboardType="phone-pad"
              placeholder="VD: 09xxxxxxxx"
            />
            <LabeledInput
              label="Địa chỉ"
              icon="location-outline"
              value={form.address || ""}
              onChangeText={(t) => setForm({ ...form, address: t })}
              placeholder="Số nhà, đường, phường…"
            />

            {/* Ngày sinh */}
            <Text style={st.label}>Ngày sinh</Text>
            <Pressable
              onPress={() =>
                Platform.OS === "ios" ? setShowDOBiOS(true) : openDOBAndroid()
              }
              style={st.dateBtn}
            >
              <Ionicons name="calendar-outline" size={16} color="#0f172a" />
              <Text style={st.dateBtnText}>
                {dobObj
                  ? ymd(dobObj)
                  : (form.dateOfBirth || "").slice(0, 10) || "YYYY-MM-DD"}
              </Text>
            </Pressable>
            {Platform.OS === "ios" && showDOBiOS && (
              <View style={{ marginTop: 8 }}>
                <DateTimePicker
                  mode="date"
                  display="inline"
                  value={dobObj || new Date()}
                  onChange={(_, d) => {
                    if (d) {
                      const nd = new Date(
                        d.getFullYear(),
                        d.getMonth(),
                        d.getDate()
                      );
                      setDobObj(nd);
                      setForm((p: any) => ({ ...p, dateOfBirth: ymd(nd) }));
                    }
                  }}
                />
                <GhostBtn
                  title="Đóng chọn ngày"
                  onPress={() => setShowDOBiOS(false)}
                />
              </View>
            )}

            <PrimaryBtn
              title={busySave ? "Đang lưu…" : "Lưu thay đổi"}
              onPress={save}
              disabled={busySave}
              icon="save-outline"
            />
          </View>

          {/* Đổi email */}
          <View style={st.card}>
            <Text style={st.cardTitle}>Đổi email</Text>
            <LabeledInput
              label="Email mới"
              icon="mail-open-outline"
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="nhap@email.com"
              keyboardType="email-address"
              right={
                <View style={st.inputRight}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={14}
                    color="#0f172a"
                  />
                  <Text style={st.inputRightTxt}>Xác thực lại sau khi đổi</Text>
                </View>
              }
            />
            <PrimaryBtn
              title="Đổi email"
              onPress={changeEmail}
              icon="swap-horizontal-outline"
            />
          </View>

          {/* Đổi mật khẩu */}
          <View style={st.card}>
            <Text style={st.cardTitle}>Đổi mật khẩu</Text>

            <LabeledInput
              label="Mật khẩu hiện tại"
              icon="lock-closed-outline"
              value={oldPassword}
              onChangeText={setOldPassword}
              placeholder="••••••"
              secureTextEntry={!showPw}
              right={
                <Pressable
                  onPress={() => setShowPw((v) => !v)}
                  style={{ paddingLeft: 8 }}
                >
                  <Ionicons
                    name={showPw ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color="#64748b"
                  />
                </Pressable>
              }
            />
            <LabeledInput
              label="Mật khẩu mới (≥ 6 ký tự)"
              icon="key-outline"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="••••••"
              secureTextEntry={!showPw}
            />

            <PrimaryBtn
              title="Đổi mật khẩu"
              onPress={changePassword}
              icon="refresh-outline"
            />
          </View>
        </ScrollView>

        {/* Busy overlay khi lưu */}
        {busySave && (
          <View style={st.overlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={{ color: "#fff", marginTop: 8 }}>Đang lưu…</Text>
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  safe: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  header: { alignItems: "center", marginBottom: 8 },
  headerIcon: { marginBottom: 6 },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  h: { fontSize: 18, fontWeight: "800", color: "#0b3d2e", letterSpacing: 0.2 },
  sub: { marginTop: 2, color: "#475569", fontSize: 12 },

  card: {
    backgroundColor: UI.glass,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: UI.border,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    marginBottom: 12,
  },
  cardTitle: { fontWeight: "800", marginBottom: 8, color: "#0f172a" },

  avatar: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: "rgba(16,185,129,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontWeight: "800",
    color: "#065f46",
    fontSize: 18,
    letterSpacing: 0.5,
  },
  nameLine: { fontWeight: "800", color: "#0f172a" },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 6,
  },
  emailTxt: { color: "#0f172a", fontWeight: "700" },
  roleChip: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  roleTxt: { color: "#0f172a", fontWeight: "700", fontSize: 12 },

  label: { fontWeight: "700", marginBottom: 6, color: "#0f172a" },
  inputRow: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  input: { color: "#0f172a", paddingVertical: 6 },
  inputRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: 8,
  },
  inputRightTxt: { fontSize: 11, color: "#0f172a", fontWeight: "700" },

  dateBtn: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 10,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  dateBtnText: { color: "#0f172a", fontWeight: "700" },

  btnWrap: { marginTop: 6 },
  btn: {
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    shadowColor: "#059669",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  btnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 0.3,
  },
  ghostBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    flexDirection: "row",
    alignSelf: "flex-start",
    marginTop: 6,
  },
  ghostText: { fontWeight: "700", color: "#0f172a" },

  overlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
});
