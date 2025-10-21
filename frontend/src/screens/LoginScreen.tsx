import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  Pressable,
} from "react-native";
import axiosClient from "../api/axiosClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

const IS_WEB = Platform.OS === "web";

export default function LoginScreen({ navigation }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    if (!username || !password) {
      Alert.alert("Nhắc", "Nhập email và password");
      return;
    }
    try {
      setLoading(true);
      const res = await axiosClient.post("/auth/login", {
        email: username.trim(),
        password,
      });
      const token = res.data?.token;
      if (token) {
        await AsyncStorage.setItem("token", token);
        const me = await axiosClient.get("/auth/me");
        const role = me.data?.role || "teacher";
        await AsyncStorage.setItem("role", role);
        if (role === "admin") navigation.replace("AdminHome");
        else if (role === "teacher") navigation.replace("TeacherHome");
        else if (role === "parent") navigation.replace("ParentHome");
      } else Alert.alert("Lỗi", "Không nhận được token");
    } catch (e: any) {
      Alert.alert(
        "Đăng nhập thất bại",
        e?.response?.data?.message || "Kiểm tra thông tin"
      );
    } finally {
      setLoading(false);
    }
  };

  const Content = (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        {/* Brand */}
        <View style={[styles.brand, styles.centerBlock]}>
          <View style={styles.logoWrap}>
            <LinearGradient
              colors={["#a7f3d0", "#60a5fa"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logo}
            >
              <Ionicons name="nutrition-outline" size={28} color="#0b3d2e" />
            </LinearGradient>
          </View>
          <Text style={styles.appName}>Nutrition for Kid</Text>
          <Text style={styles.tagline}>bữa ăn thông minh cho bé</Text>
        </View>

        {/* Card */}
        <View style={[styles.card, styles.centerBlock]}>
          <View style={styles.inputGroup}>
            <Ionicons
              name="mail-outline"
              size={18}
              color="#6b7280"
              style={styles.inputIcon}
            />
            <TextInput
              placeholder="Email"
              placeholderTextColor="#9ca3af"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              returnKeyType="next"
              autoComplete="email"
              inputMode="email"
            />
          </View>

          <View style={styles.inputGroup}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color="#6b7280"
              style={styles.inputIcon}
            />
            <TextInput
              placeholder="Mật khẩu"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              returnKeyType="go"
              onSubmitEditing={onLogin}
              autoComplete="current-password"
            />
          </View>

          <Pressable
            onPress={onLogin}
            disabled={loading}
            style={({ pressed }) => [
              styles.btn,
              pressed && { transform: [{ scale: 0.99 }] },
            ]}
          >
            <LinearGradient
              colors={["#34d399", "#059669"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.btnGrad}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Đăng nhập</Text>
              )}
            </LinearGradient>
          </Pressable>
        </View>

        <Text style={styles.footer}>
          © {new Date().getFullYear()} Nutrition for Kid
        </Text>
      </View>
    </KeyboardAvoidingView>
  );

  return (
    <LinearGradient
      colors={["#eaf5ff", "#f7fff8"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.flex}
    >
      <StatusBar style="dark" translucent />
      {/* Trên web: KHÔNG bọc TouchableWithoutFeedback để tránh blur input */}
      {IS_WEB ? (
        Content
      ) : (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          {Content}
        </TouchableWithoutFeedback>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  container: {
    flex: 1,

    justifyContent: IS_WEB ? "center" : "space-between",
    alignItems: "stretch",
    paddingHorizontal: IS_WEB ? 0 : 20,
    paddingTop: IS_WEB ? 0 : Platform.OS === "ios" ? 72 : 48,
    paddingBottom: IS_WEB ? 0 : 32,
  },

  centerBlock: {
    alignSelf: "center",
    width: "100%",
    maxWidth: IS_WEB ? 380 : 420,
  },

  brand: { alignItems: "center", marginBottom: IS_WEB ? 12 : 16 },

  logoWrap: {
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  appName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0b3d2e",
    letterSpacing: 0.3,
  },
  tagline: {
    marginTop: 4,
    color: "#4b5563",
    fontSize: 12,
  },

  card: {
    backgroundColor: "rgba(255,255,255,0.86)",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,

    ...(IS_WEB
      ? {
          marginTop: 12,
          marginBottom: 16,
        }
      : {}),
  },

  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  inputIcon: { marginRight: 8 },

  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",

    ...(IS_WEB
      ? {
          outlineWidth: 0 as any,
        }
      : {}),
  },

  btn: { marginTop: 6 },
  btnGrad: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#059669",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  btnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.3,
  },

  footer: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: 12,
    marginTop: IS_WEB ? 4 : 0,
    marginBottom: IS_WEB ? 8 : 0,
  },
});
