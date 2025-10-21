import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

type P = NativeStackScreenProps<RootStackParamList, "TeacherHome">;

export default function TeacherHomeScreen({ navigation }: P) {
  const logout = async () => {
    await AsyncStorage.removeItem("token");
    navigation.replace("Login");
  };

  const actions = [
    {
      key: "students",
      label: "Lớp của tôi",
      icon: "people-outline" as const,
      onPress: () => navigation.navigate("Students"),
    },
    {
      key: "attendance",
      label: "Điểm danh",
      icon: "camera-outline" as const,
      onPress: () => navigation.navigate("FaceAttendance"),
    },
    {
      key: "enroll",
      label: "Đăng ký khuôn mặt",
      icon: "person-add-outline" as const,
      onPress: () => navigation.navigate("FaceEnrollList"),
    },
    {
      key: "chat",
      label: "Hội thoại PH",
      icon: "chatbubble-ellipses-outline" as const,
      onPress: () => navigation.navigate("TeacherChatList"),
    },
    {
      key: "intakeDays",
      label: "Bữa ăn theo ngày",
      icon: "fast-food-outline" as const,
      onPress: () => navigation.navigate("IntakeDays"),
    },
    {
      key: "healthDays",
      label: "Sức khỏe theo ngày",
      icon: "heart-outline" as const,
      onPress: () => navigation.navigate("HealthDays"),
    },
    {
      key: "planner",
      label: "Lập thực đơn (AI)",
      icon: "sparkles-outline" as const,
      onPress: () => navigation.navigate("NutritionPlanner"),
    },
    {
      key: "chart",
      label: "Biểu đồ phát triển",
      icon: "stats-chart-outline" as const,
      onPress: () => navigation.navigate("MeasurementsChart"),
    },
    {
      key: "stats",
      label: "Thống kê",
      icon: "analytics-outline" as const,
      onPress: () => navigation.navigate("Stats"),
    },

    {
      key: "account",
      label: "Tài khoản",
      icon: "person-circle-outline" as const,
      onPress: () => navigation.navigate("TeacherAccount"),
    },
  ];

  return (
    <LinearGradient
      colors={["#eef7ff", "#f8fffb"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <StatusBar barStyle="dark-content" translucent />
      <SafeAreaView style={styles.safe}>
        {/* Brand */}
        <View style={styles.brand}>
          <View style={styles.logoWrap}>
            <LinearGradient
              colors={["#d1fae5", "#93c5fd"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logo}
            >
              <Ionicons name="school-outline" size={26} color="#0b3d2e" />
            </LinearGradient>
          </View>
          <Text style={styles.brandTitle}>Bảng điều khiển</Text>
          <Text style={styles.brandSub}>Giáo viên</Text>
        </View>

        {/* Lưới 2 cột, có khoảng cách 2 bên */}
        <View style={styles.grid}>
          {actions.map((a) => (
            <Pressable
              key={a.key}
              onPress={a.onPress}
              style={({ pressed }) => [
                styles.tile,
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
            >
              {/* Nút trong suốt ~60% */}
              <View style={styles.tileInner}>
                <View style={styles.tileIconWrap}>
                  <Ionicons name={a.icon} size={22} color="#0f766e" />
                </View>
                <Text style={styles.tileText}>{a.label}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={logout}
          style={({ pressed }) => [
            styles.logoutBtn,
            pressed && { transform: [{ scale: 0.99 }] },
          ]}
        >
          <LinearGradient
            colors={["#ef4444", "#b91c1c"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoutInner}
          >
            <Ionicons name="log-out-outline" size={18} color="#fff" />
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </LinearGradient>
        </Pressable>
      </SafeAreaView>
    </LinearGradient>
  );
}

const GAP = 14;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingTop: 8,
    paddingHorizontal: 24,
    paddingBottom: 16,
    justifyContent: "space-between",
  },
  brand: { alignItems: "center", marginTop: 8 },
  logoWrap: {
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  logo: {
    width: 58,
    height: 58,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0b3d2e",
    letterSpacing: 0.2,
  },
  brandSub: {
    marginTop: 2,
    color: "#475569",
    fontSize: 12,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    rowGap: GAP,

    marginTop: 8,
  },
  tile: {
    width: "45%",
    marginHorizontal: "2.5%",
  },
  tileInner: {
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.1,

    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  tileIconWrap: {
    backgroundColor: "rgba(16,185,129,0.18)",
    borderRadius: 10,
    padding: 8,
    marginBottom: 10,
  },
  tileText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: 0.2,
  },

  logoutBtn: { marginTop: 6 },
  logoutInner: {
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: "#b91c1c",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    width: "80%",
    marginHorizontal: "10%",
  },
  logoutText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
