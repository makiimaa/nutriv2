import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import axiosClient from "../../api/axiosClient";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

type Me = { name?: string; phone?: string; email?: string };

export default function ParentAccountScreen() {
  const [init, setInit] = useState<Me>({});
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const r = await axiosClient.get("/parents/me");
      const me: Me = {
        name: r.data?.fullName ?? r.data?.name ?? "",
        phone: r.data?.phone ?? "",
        email: r.data?.email ?? "",
      };
      setInit(me);
      setName(me.name || "");
      setPhone(me.phone || "");
      setEmail(me.email || "");
    } catch (e: any) {
      Alert.alert(
        "Lỗi",
        e?.response?.data?.message || "Không tải được tài khoản"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const emailOk = useMemo(() => {
    if (!email.trim()) return false;

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }, [email]);

  const phoneOk = useMemo(() => {
    if (!phone.trim()) return true;

    return /^(\+?\d{7,15})$/.test(phone.trim());
  }, [phone]);

  const nameOk = useMemo(() => name.trim().length >= 2, [name]);

  const changed = useMemo(() => {
    return (
      (init.name ?? "") !== name ||
      (init.phone ?? "") !== phone ||
      (init.email ?? "") !== email ||
      !!password.trim()
    );
  }, [init, name, phone, email, password]);

  const formOk = nameOk && emailOk && phoneOk;

  const save = async () => {
    if (!formOk) {
      Alert.alert("Lỗi", "Vui lòng kiểm tra lại thông tin.");
      return;
    }
    try {
      setSaving(true);
      const body: any = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
      };
      if (password.trim()) body.password = password;
      await axiosClient.put("/parents/me", body);
      Alert.alert("OK", "Đã cập nhật");
      setPassword("");

      setInit({ name: body.name, phone: body.phone, email: body.email });
    } catch (e: any) {
      Alert.alert("Lỗi", e?.response?.data?.message || "Cập nhật thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <LinearGradient
      colors={["#eef7ff", "#f8fffb"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: "padding", android: "height" })}
        keyboardVerticalOffset={Platform.select({ ios: 80, android: 0 })}
      >
        <ScrollView
          contentContainerStyle={s.wrap}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>Tài khoản phụ huynh</Text>
            {loading ? (
              <ActivityIndicator />
            ) : (
              <Pressable
                onPress={load}
                style={({ pressed }) => [
                  s.reloadBtn,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Ionicons name="refresh" size={16} color="#0b3d2e" />
                <Text style={s.reloadText}>Tải lại</Text>
              </Pressable>
            )}
          </View>

          {/* Card */}
          <View style={s.card}>
            {/* Họ tên */}
            <Label text="Họ tên" />
            <View style={[s.inputWrap, !nameOk && s.inputErr]}>
              <Ionicons name="person-outline" size={16} color="#64748b" />
              <TextInput
                style={s.input}
                value={name}
                onChangeText={setName}
                placeholder="VD: Nguyễn Văn A"
                placeholderTextColor="#94a3b8"
                autoCapitalize="words"
              />
            </View>
            {!nameOk && <Helper text="Họ tên tối thiểu 2 ký tự." />}

            {/* Điện thoại */}
            <Label text="Điện thoại" />
            <View style={[s.inputWrap, !phoneOk && s.inputErr]}>
              <Ionicons name="call-outline" size={16} color="#64748b" />
              <TextInput
                style={s.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="VD: 098xxxxxxx hoặc +8498xxxxxxx"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
              />
            </View>
            {!phoneOk && <Helper text="Chỉ số và dấu +, 7–15 chữ số." />}

            {/* Email */}
            <Label text="Email" />
            <View style={[s.inputWrap, !emailOk && s.inputErr]}>
              <Ionicons name="mail-outline" size={16} color="#64748b" />
              <TextInput
                style={s.input}
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            {!emailOk && <Helper text="Email không hợp lệ." />}

            {/* Mật khẩu */}
            <Label text="Mật khẩu (để trống nếu không đổi)" />
            <View style={s.inputWrap}>
              <Ionicons name="lock-closed-outline" size={16} color="#64748b" />
              <TextInput
                style={s.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showPw}
              />
              <Pressable onPress={() => setShowPw((v) => !v)} hitSlop={10}>
                <Ionicons
                  name={showPw ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color="#64748b"
                />
              </Pressable>
            </View>

            {/* Actions */}
            <Pressable
              onPress={save}
              disabled={!changed || !formOk || saving}
              style={({ pressed }) => [
                s.saveBtn,
                (!changed || !formOk || saving) && { opacity: 0.5 },
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={18} color="#fff" />
                  <Text style={s.saveText}>Lưu</Text>
                </>
              )}
            </Pressable>
            {!changed && <Helper text="Không có thay đổi để lưu." />}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={s.label}>{text}</Text>;
}
function Helper({ text }: { text: string }) {
  return <Text style={s.helper}>{text}</Text>;
}

const s = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 24 },
  header: {
    paddingTop: 10,
    paddingHorizontal: 4,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0b3d2e",
    letterSpacing: 0.2,
  },
  reloadBtn: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(16,185,129,0.15)",
  },
  reloadText: { fontWeight: "700", color: "#0b3d2e" },

  card: {
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },

  label: {
    marginTop: 10,
    marginBottom: 6,
    color: "#475569",
    fontWeight: "700",
  },
  inputWrap: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: { flex: 1, color: "#0f172a", paddingVertical: 8 },

  inputErr: { borderColor: "#ef4444" },
  helper: { color: "#ef4444", fontSize: 12, marginTop: 4 },

  saveBtn: {
    marginTop: 14,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#0ea5a4",
    shadowColor: "#0ea5a4",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  saveText: { color: "#fff", fontWeight: "800" },
});
