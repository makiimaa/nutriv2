import React from "react";
import {
  View,
  Text,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Platform,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { Ionicons } from "@expo/vector-icons";

type P = NativeStackScreenProps<RootStackParamList, "AdminHome">;

type Action = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

export default function AdminHomeScreen({ navigation }: P) {
  const logout = async () => {
    await AsyncStorage.removeItem("token");
    navigation.replace("Login");
  };

  const actions: Action[] = [
    {
      key: "schools",
      label: "Quản lý trường",
      icon: "business-outline",
      onPress: () => navigation.navigate("Schools"),
    },
    {
      key: "classes",
      label: "Quản lý lớp",
      icon: "library-outline",
      onPress: () => navigation.navigate("Classes"),
    },
    {
      key: "teachers",
      label: "Giáo viên",
      icon: "people-circle-outline",
      onPress: () => navigation.navigate("Teachers"),
    },
    {
      key: "students",
      label: "Học sinh",
      icon: "happy-outline",
      onPress: () => navigation.navigate("Students"),
    },
    {
      key: "food",
      label: "Danh mục thực phẩm",
      icon: "fast-food-outline",
      onPress: () => navigation.navigate("FoodItems"),
    },
    {
      key: "menus",
      label: "Thực đơn theo ngày",
      icon: "calendar-outline",
      onPress: () => navigation.navigate("Menus"),
    },
    {
      key: "parents",
      label: "Phụ huynh",
      icon: "chatbubbles-outline",
      onPress: () => navigation.navigate("Parents"),
    },
  ];

  const rows: Action[][] = [];
  for (let i = 0; i < actions.length; i += 4)
    rows.push(actions.slice(i, i + 4));

  if (Platform.OS !== "web") {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <Text style={{ fontWeight: "800", fontSize: 18, marginBottom: 8 }}>
          Màn hình Admin chỉ dành cho Web
        </Text>
        <Text style={{ color: "#475569", textAlign: "center" }}>
          Vui lòng dùng trình duyệt trên máy tính để quản trị.
        </Text>
      </View>
    );
  }

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
          <View style={styles.logo}>
            <LinearGradient
              colors={["#d1fae5", "#93c5fd"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoInner}
            >
              <Ionicons name="settings-outline" size={26} color="#0b3d2e" />
            </LinearGradient>
          </View>
          <Text style={styles.brandTitle}>Bảng điều khiển</Text>
          <Text style={styles.brandSub}>Quản trị hệ thống</Text>
        </View>

        {/* Grid 4 cột cố định */}
        <View style={styles.grid}>
          {rows.map((row, rIdx) => (
            <View key={`r-${rIdx}`} style={styles.row}>
              {row.map((a) => (
                <Pressable
                  key={a.key}
                  onPress={a.onPress}
                  style={({ pressed }) => [
                    styles.tile,
                    pressed && { transform: [{ scale: 0.98 }] },
                  ]}
                >
                  <View style={styles.tileInner}>
                    <View style={styles.tileIconWrap}>
                      <Ionicons name={a.icon} size={22} color="#0f766e" />
                    </View>
                    <Text style={styles.tileText}>{a.label}</Text>
                  </View>
                </Pressable>
              ))}
              {/* nếu thiếu 4 ô, thêm ô “ảo” để căn khoảng cách đều */}
              {Array.from({ length: 4 - row.length }).map((_, i) => (
                <View key={`ghost-${rIdx}-${i}`} style={styles.tileGhost} />
              ))}
            </View>
          ))}
        </View>

        {/* Logout center */}
        <View style={styles.centerBar}>
          <Pressable
            onPress={logout}
            style={({ pressed }) => [
              styles.btn,
              pressed && { transform: [{ scale: 0.99 }] },
            ]}
          >
            <LinearGradient
              colors={["#ef4444", "#b91c1c"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.btnInner}
            >
              <Ionicons name="log-out-outline" size={16} color="#fff" />
              <Text style={styles.btnText}>Đăng xuất</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 24, paddingBottom: 16 },
  brand: { alignItems: "center", marginTop: 6, marginBottom: 8 },
  logo: {
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    ...(Platform.OS === "web"
      ? { boxShadow: "0 8px 12px rgba(0,0,0,.08)" }
      : {}),
  },
  logoInner: {
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
  brandSub: { marginTop: 2, color: "#475569", fontSize: 12 },

  grid: { marginTop: 10, gap: 12 },
  row: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
  },
  tile: {
    flexBasis: "23%",
    minWidth: 160,
    maxWidth: 320,
    ...(Platform.OS === "web" ? { cursor: "pointer" as const } : {}),
  },
  tileGhost: {
    flexBasis: "23%",
    minWidth: 160,
    maxWidth: 320,
    opacity: 0,
  },
  tileInner: {
    backgroundColor: "rgba(255,255,255,0.65)",
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
    textAlign: "center",
  },

  centerBar: {
    alignItems: "center",
    paddingVertical: 14,
    marginBottom: 6,
    marginTop: 12,
  },
  btn: {
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  btnInner: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  btnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
