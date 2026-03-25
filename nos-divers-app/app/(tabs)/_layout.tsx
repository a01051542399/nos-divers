import { Tabs } from "expo-router";
import { useColorScheme } from "react-native";
import { Colors } from "../../constants/theme";

export default function TabLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.foreground,
        headerTitleStyle: { fontWeight: "bold" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "투어",
          tabBarLabel: "투어",
          tabBarIcon: ({ color }) => (
            <TabIcon name="🤿" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="waivers"
        options={{
          title: "면책동의서",
          tabBarLabel: "면책서",
          tabBarIcon: ({ color }) => (
            <TabIcon name="📋" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "설정",
          tabBarLabel: "설정",
          tabBarIcon: ({ color }) => (
            <TabIcon name="⚙️" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({ name, color }: { name: string; color: string }) {
  return (
    <import_Text style={{ fontSize: 20 }}>{name}</import_Text>
  );
}

// Simple text component for tab icons
import { Text as import_Text } from "react-native";
