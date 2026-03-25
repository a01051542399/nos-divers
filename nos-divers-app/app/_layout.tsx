import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { trpc, queryClient, createTRPCClient } from "../lib/trpc";
import { Colors } from "../constants/theme";

export default function RootLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const [trpcClient] = useState(() => createTRPCClient());

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.foreground,
            headerTitleStyle: { fontWeight: "bold" },
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="tour/[id]"
            options={{
              title: "투어 상세",
              headerBackTitle: "뒤로",
            }}
          />
          <Stack.Screen
            name="waiver/sign"
            options={{
              title: "면책동의서 서명",
              headerBackTitle: "뒤로",
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="waiver/view"
            options={{
              title: "서명 목록",
              headerBackTitle: "뒤로",
            }}
          />
          <Stack.Screen
            name="join"
            options={{
              title: "투어 참가",
              headerBackTitle: "뒤로",
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="oauth/callback"
            options={{ headerShown: false }}
          />
        </Stack>
        <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      </QueryClientProvider>
    </trpc.Provider>
  );
}
