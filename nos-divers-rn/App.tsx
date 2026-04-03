import React from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "./src/lib/AuthContext";
import { ToastProvider } from "./src/components/Toast";
import { ThemeProvider } from "./src/components/ThemeContext";

import LoginScreen from "./src/screens/LoginScreen";
import SignupScreen from "./src/screens/SignupScreen";
import PasswordResetScreen from "./src/screens/PasswordResetScreen";
import TourListScreen from "./src/screens/TourListScreen";
import CreateTourScreen from "./src/screens/CreateTourScreen";
import JoinTourScreen from "./src/screens/JoinTourScreen";
import WaiversScreen from "./src/screens/WaiversScreen";
import WaiverSignScreen from "./src/screens/WaiverSignScreen";
import TourDetailScreen from "./src/screens/TourDetailScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import AddExpenseScreen from "./src/screens/AddExpenseScreen";
import ProfileScreen from "./src/screens/ProfileScreen";

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
    </Stack.Navigator>
  );
}

function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SettingsMain" component={SettingsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2196F3",
        tabBarInactiveTintColor: "#3D7A94",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#E8F4F8",
          paddingBottom: 4,
          height: 56,
        },
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: "600",
        },
      }}
    >
      <Tab.Screen
        name="Tours"
        component={ToursStack}
        options={{ tabBarLabel: "투어", tabBarIcon: () => null }}
      />
      <Tab.Screen
        name="Waivers"
        component={WaiversStack}
        options={{ tabBarLabel: "동의서", tabBarIcon: () => null }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStack}
        options={{ tabBarLabel: "설정", tabBarIcon: () => null }}
      />
    </Tab.Navigator>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#E8F4F8" }}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (!user) {
    return <AuthStack />;
  }

  return <MainTabs />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ToastProvider>
          <NavigationContainer>
            <AuthProvider>
              <StatusBar style="dark" />
              <AppContent />
            </AuthProvider>
          </NavigationContainer>
        </ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
