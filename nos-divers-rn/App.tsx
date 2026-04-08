import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import * as db from "./src/lib/supabase-store";
import { NavigationContainer, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "./src/lib/AuthContext";
import { ToastProvider } from "./src/components/Toast";
import { ThemeProvider, useTheme } from "./src/components/ThemeContext";
import { Ionicons } from "@expo/vector-icons";

import LoginScreen from "./src/screens/LoginScreen";
import SignupScreen from "./src/screens/SignupScreen";
import PasswordResetScreen from "./src/screens/PasswordResetScreen";
import TourListScreen from "./src/screens/TourListScreen";
import CreateTourScreen from "./src/screens/CreateTourScreen";
import JoinTourScreen from "./src/screens/JoinTourScreen";
import WaiversScreen from "./src/screens/WaiversScreen";
import WaiverSignScreen from "./src/screens/WaiverSignScreen";
import WaiverViewScreen from "./src/screens/WaiverViewScreen";
import TourDetailScreen from "./src/screens/TourDetailScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import AddExpenseScreen from "./src/screens/AddExpenseScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import HiddenToursScreen from "./src/screens/HiddenToursScreen";
import TrashScreen from "./src/screens/TrashScreen";
import SettingsGuideScreen from "./src/screens/SettingsGuideScreen";
import AdminDashboardScreen from "./src/screens/AdminDashboardScreen";
import SettingsDisplayScreen from "./src/screens/SettingsDisplayScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen
        name="Signup"
        component={SignupScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="PasswordReset"
        component={PasswordResetScreen}
        options={{ animation: "slide_from_right" }}
      />
    </Stack.Navigator>
  );
}

function ToursStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TourList" component={TourListScreen} />
      <Stack.Screen name="TourDetail" component={TourDetailScreen} />
      <Stack.Screen
        name="CreateTour"
        component={CreateTourScreen}
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="JoinTour"
        component={JoinTourScreen}
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="AddExpense"
        component={AddExpenseScreen}
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
    </Stack.Navigator>
  );
}

function WaiversStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="WaiversList" component={WaiversScreen} />
      <Stack.Screen
        name="WaiverSign"
        component={WaiverSignScreen}
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="WaiverView"
        component={WaiverViewScreen}
        options={{ animation: "slide_from_right" }}
      />
    </Stack.Navigator>
  );
}

function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SettingsMain" component={SettingsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="HiddenTours" component={HiddenToursScreen} />
      <Stack.Screen name="Trash" component={TrashScreen} />
      <Stack.Screen
        name="SettingsGuide"
        component={SettingsGuideScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="SettingsDisplay"
        component={SettingsDisplayScreen}
        options={{ animation: "slide_from_right" }}
      />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          paddingBottom: 8,
          paddingTop: 4,
          height: 68,
        },
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: "600",
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Tours"
        component={ToursStack}
        options={{
          tabBarLabel: "투어",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Waivers"
        component={WaiversStack}
        options={{
          tabBarLabel: "동의서",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStack}
        options={{
          tabBarLabel: "설정",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();

  useEffect(() => {
    if (user) {
      db.cleanupTrash().catch(() => {});
    }
  }, [user]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return <AuthStack />;
  }

  return <MainTabs />;
}

function ThemedApp() {
  const { theme, colors } = useTheme();
  const navTheme = theme === 'dark'
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: colors.bg, card: colors.card, text: colors.text, border: colors.border } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.bg, card: colors.card, text: colors.text, border: colors.border } };

  return (
    <ToastProvider>
      <NavigationContainer theme={navTheme}>
        <AuthProvider>
          <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
          <AppContent />
        </AuthProvider>
      </NavigationContainer>
    </ToastProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
