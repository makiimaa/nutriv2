// src/navigation/AppNavigator.tsx
import React from "react";
import { Platform, View, Text } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer } from "@react-navigation/native";
import * as Linking from "expo-linking";
import axiosClient from "../api/axiosClient";

// Auth / Login
import LoginScreen from "../screens/LoginScreen";

// Admin (web-only)
import HomeAdminScreen from "../screens/admin/HomeAdminScreen";
import SchoolsScreen from "../screens/admin/SchoolsScreen";
import ClassesScreen from "../screens/admin/ClassesScreen";
import TeachersScreen from "../screens/admin/TeachersScreen";
import FoodItemsScreen from "../screens/admin/FoodItemsScreen";
import MenusScreen from "../screens/admin/MenusScreen";
import ParentsScreen from "../screens/admin/ParentsScreen";
import AdminStudentsScreen from "../screens/admin/StudentsScreen";

import StudentsScreen from "../screens/StudentsScreen";

// Teacher / Parent (mobile-only)
import TeacherHomeScreen from "../screens/teacher/HomeTeacherScreen";
import TeacherAccountScreen from "../screens/teacher/TeacherAccountScreen";
import ParentHomeScreen from "../screens/parent/ParentHomeScreen";
import ParentAccountScreen from "../screens/parent/ParentAccountScreen";
import FaceAttendanceScreen from "../screens/teacher/FaceAttendanceScreen";
import FaceEnrollListScreen from "../screens/teacher/FaceEnrollListScreen";
import FaceEnrollDetailScreen from "../screens/teacher/FaceEnrollDetailScreen";
import IntakeDaysScreen from "../screens/teacher/IntakeDaysScreen";
import IntakeByDateScreen from "../screens/teacher/IntakeByDateScreen";
import HealthDaysScreen from "../screens/teacher/HealthDaysScreen";
import HealthByDateScreen from "../screens/teacher/HealthByDateScreen";
import ParentIntakeDaysScreen from "../screens/parent/ParentIntakeDaysScreen";
import ParentIntakeByDateScreen from "../screens/parent/ParentIntakeByDateScreen";
import ParentHealthDaysScreen from "../screens/parent/ParentHealthDaysScreen";
import ParentHealthByDateScreen from "../screens/parent/ParentHealthByDateScreen";
import ParentChatScreen from "../screens/parent/ParentChatScreen";
import TeacherChatListScreen from "../screens/teacher/TeacherChatListScreen";
import TeacherChatDetailScreen from "../screens/teacher/TeacherChatDetailScreen";
import MeasurementsChartScreen from "../screens/teacher/MeasurementsChartScreen";
import ParentMeasurementsChartScreen from "../screens/parent/ParentMeasurementsChartScreen";
import TeacherStartChatScreen from "../screens/teacher/TeacherStartChatScreen";
import NutritionPlannerScreen from "../screens/nutrition/NutritionPlannerScreen";
import MenuDraftDetailScreen from "../screens/nutrition/MenuDraftDetailScreen";
import StatsScreen from "../screens/teacher/StatsScreen";
import ParentStudentStatsScreen from "../screens/parent/ParentStudentStatsScreen";
import GroupingScreen from "../screens/nutrition/GroupingScreen";

const linking = {
  prefixes: [Linking.createURL("/"), "frontend://"],
  config: {
    screens: {
      Login: "login",
      AdminHome: "admin",
      Schools: "admin/schools",
      Classes: "admin/classes",
      Teachers: "admin/teachers",
      Students: "admin/students",
      FoodItems: "admin/foods",
      Menus: "admin/menus",
      Parents: "admin/parents",
    },
  },
};

export type RootStackParamList = {
  Login: undefined;

  // admin
  AdminHome: undefined;
  Schools: undefined;
  Classes: undefined;
  Teachers: undefined;
  FoodItems: undefined;
  Menus: undefined;
  Parents: undefined;

  Students: undefined;

  // teacher / parent (mobile)
  TeacherHome: undefined;
  TeacherAccount: undefined;

  ParentHome: undefined;
  ParentAccount: undefined;

  FaceAttendance: undefined;

  NutritionAI: undefined;
  NutritionAIDetail: { id: string };
  NutritionAIHistory: undefined;

  FaceEnrollList: undefined;
  FaceEnrollDetail: { studentId: string; fullName: string; schoolId?: string };

  IntakeDays: undefined;
  IntakeByDate: undefined;

  HealthDays: undefined;
  HealthByDate: undefined;

  ParentIntakeDays: undefined;
  ParentIntakeByDate: { date: string; studentId?: string };

  ParentHealthDays: undefined;
  ParentHealthByDate: { date: string; studentId?: string };

  ParentChat: undefined;
  TeacherChatList: undefined;
  TeacherChatDetail: { threadId: string; studentName?: string };
  MeasurementsChart: { studentId?: string } | undefined;
  ParentMeasurementsChart: { studentId?: string } | undefined;
  TeacherStartChat: undefined;
  Stats: undefined;
  ParentStudentStats: undefined;

  NutritionPlanner: undefined;
  MenuDraftDetail: { recId: string };
  Grouping: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function NotSupportedWeb() {
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
        Không hỗ trợ trên web
      </Text>
      <Text style={{ color: "#475569", textAlign: "center" }}>
        Vui lòng dùng ứng dụng trên điện thoại cho tài khoản giáo viên/phụ
        huynh.
      </Text>
    </View>
  );
}

function withAdminGuard(ScreenComp: React.ComponentType<any>) {
  return function Guarded(props: any) {
    const [role, setRole] = React.useState<
      "admin" | "teacher" | "parent" | null
    >(null);
    const [ready, setReady] = React.useState(false);

    React.useEffect(() => {
      (async () => {
        try {
          const me = await axiosClient.get("/auth/me");
          setRole(me?.data?.role ?? null);
        } catch {
          setRole(null);
        } finally {
          setReady(true);
        }
      })();
    }, []);

    if (!ready) return null;
    return role === "admin" ? <ScreenComp {...props} /> : <NotSupportedWeb />;
  };
}

export default function AppNavigator() {
  const [role, setRole] = React.useState<"admin" | "teacher" | "parent" | null>(
    null
  );
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const me = await axiosClient.get("/auth/me");
        const r = (me?.data?.role as "admin" | "teacher" | "parent") || null;
        setRole(r);
      } catch {
        setRole(null);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  if (!ready) return null;

  // WEB: admin
  if (Platform.OS === "web") {
    return (
      <NavigationContainer linking={linking}>
        <Stack.Navigator initialRouteName="Login">
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ title: "Đăng nhập" }}
          />
          <Stack.Screen
            name="AdminHome"
            component={withAdminGuard(HomeAdminScreen)}
            options={{ title: "Bảng điều khiển (Admin)" }}
          />
          <Stack.Screen
            name="Schools"
            component={withAdminGuard(SchoolsScreen)}
            options={{ title: "Quản lý trường" }}
          />
          <Stack.Screen
            name="Classes"
            component={withAdminGuard(ClassesScreen)}
            options={{ title: "Quản lý lớp" }}
          />
          <Stack.Screen
            name="Teachers"
            component={withAdminGuard(TeachersScreen)}
            options={{ title: "Quản lý giáo viên" }}
          />
          <Stack.Screen
            name="FoodItems"
            component={withAdminGuard(FoodItemsScreen)}
            options={{ title: "Danh mục thực phẩm" }}
          />
          <Stack.Screen
            name="Menus"
            component={withAdminGuard(MenusScreen)}
            options={{ title: "Thực đơn theo ngày" }}
          />
          <Stack.Screen
            name="Parents"
            component={withAdminGuard(ParentsScreen)}
            options={{ title: "Quản lý phụ huynh" }}
          />
          <Stack.Screen
            name="Students"
            component={withAdminGuard(AdminStudentsScreen)}
            options={{ title: "Quản lý học sinh" }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        key={`nav-${role ?? "guest"}`}
        initialRouteName={
          role ? (role === "parent" ? "ParentHome" : "TeacherHome") : "Login"
        }
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ title: "Đăng nhập" }}
        />

        {/* Teacher */}
        <Stack.Screen
          name="TeacherHome"
          component={TeacherHomeScreen}
          options={{ title: "Bảng điều khiển (Giáo viên)" }}
        />
        <Stack.Screen
          name="TeacherAccount"
          component={TeacherAccountScreen}
          options={{ title: "Tài khoản giáo viên" }}
        />
        <Stack.Screen
          name="FaceAttendance"
          component={FaceAttendanceScreen}
          options={{ title: "Điểm danh bằng khuôn mặt" }}
        />
        <Stack.Screen
          name="FaceEnrollList"
          component={FaceEnrollListScreen}
          options={{ title: "Enroll khuôn mặt" }}
        />
        <Stack.Screen
          name="FaceEnrollDetail"
          component={FaceEnrollDetailScreen}
          options={{ title: "Chi tiết enroll" }}
        />
        <Stack.Screen
          name="IntakeDays"
          component={IntakeDaysScreen}
          options={{ title: "Lịch sử theo ngày" }}
        />
        <Stack.Screen
          name="IntakeByDate"
          component={IntakeByDateScreen}
          options={{ title: "Chi tiết theo ngày" }}
        />
        <Stack.Screen
          name="HealthDays"
          component={HealthDaysScreen}
          options={{ title: "Lịch sử theo ngày" }}
        />
        <Stack.Screen
          name="HealthByDate"
          component={HealthByDateScreen}
          options={{ title: "Chi tiết theo ngày" }}
        />
        <Stack.Screen
          name="TeacherChatList"
          component={TeacherChatListScreen}
          options={{ title: "Hội thoại với phụ huynh" }}
        />
        <Stack.Screen
          name="TeacherChatDetail"
          component={TeacherChatDetailScreen}
          options={{ title: "Chi tiết hội thoại" }}
        />
        <Stack.Screen
          name="TeacherStartChat"
          component={TeacherStartChatScreen}
          options={{ title: "Bắt đầu hội thoại" }}
        />
        <Stack.Screen
          name="MeasurementsChart"
          component={MeasurementsChartScreen}
          options={{ title: "Biểu đồ phát triển" }}
        />

        {/* Parent */}
        <Stack.Screen
          name="ParentHome"
          component={ParentHomeScreen}
          options={{ title: "Phụ huynh — Con của tôi" }}
        />
        <Stack.Screen
          name="ParentAccount"
          component={ParentAccountScreen}
          options={{ title: "Tài khoản phụ huynh" }}
        />
        <Stack.Screen
          name="ParentIntakeDays"
          component={ParentIntakeDaysScreen}
          options={{ title: "Lịch sử theo ngày" }}
        />
        <Stack.Screen
          name="ParentIntakeByDate"
          component={ParentIntakeByDateScreen}
          options={{ title: "Chi tiết theo ngày" }}
        />
        <Stack.Screen
          name="ParentHealthDays"
          component={ParentHealthDaysScreen}
          options={{ title: "Lịch sử theo ngày" }}
        />
        <Stack.Screen
          name="ParentHealthByDate"
          component={ParentHealthByDateScreen}
          options={{ title: "Chi tiết theo ngày" }}
        />
        <Stack.Screen
          name="ParentChat"
          component={ParentChatScreen}
          options={{ title: "Trao đổi với giáo viên" }}
        />
        <Stack.Screen
          name="ParentMeasurementsChart"
          component={ParentMeasurementsChartScreen}
          options={{ title: "Biểu đồ phát triển của con" }}
        />

        <Stack.Screen
          name="Students"
          component={StudentsScreen}
          options={{ title: "Quản lý học sinh" }}
        />

        {/* Planner */}
        <Stack.Screen
          name="NutritionPlanner"
          component={NutritionPlannerScreen}
          options={{ title: "Lập thực đơn thông minh" }}
        />
        <Stack.Screen
          name="MenuDraftDetail"
          component={MenuDraftDetailScreen}
          options={{ title: "Chi tiết draft" }}
        />
        <Stack.Screen
          name="Stats"
          component={StatsScreen}
          options={{ title: "Thống kê" }}
        />
        <Stack.Screen
          name="ParentStudentStats"
          component={ParentStudentStatsScreen}
          options={{ title: "Thống kê của con" }}
        />

        <Stack.Screen name="Grouping" component={GroupingScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
