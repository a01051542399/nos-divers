import { useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Platform } from "react-native";
import { setToken } from "../../lib/auth";
import { useColors } from "../../hooks/use-colors";

export default function OAuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colors = useColors();

  useEffect(() => {
    async function handleCallback() {
      const token = params.token as string | undefined;
      const error = params.error as string | undefined;

      if (error) {
        console.error("OAuth error:", error);
        router.replace("/");
        return;
      }

      if (token && Platform.OS !== "web") {
        // Native: Store token from deep link
        await setToken(token);
      }

      // Redirect to home
      router.replace("/");
    }

    handleCallback();
  }, [params]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={{ color: colors.muted, marginTop: 16 }}>
        로그인 처리 중...
      </Text>
    </View>
  );
}
