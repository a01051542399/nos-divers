import { View, Text, TouchableOpacity, SafeAreaView, Linking } from "react-native";
import { useColors } from "../../hooks/use-colors";
import { useAuth } from "../../hooks/use-auth";
import { getGoogleAuthUrl, getKakaoAuthUrl } from "../../lib/auth";

export default function SettingsScreen() {
  const colors = useColors();
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 20 }}>
        <Text
          style={{
            fontSize: 28,
            fontWeight: "bold",
            color: colors.foreground,
            marginBottom: 24,
          }}
        >
          설정
        </Text>

        {/* App Info */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 20,
            alignItems: "center",
            marginBottom: 20,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 40, marginBottom: 8 }}>🤿</Text>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "bold",
              color: colors.foreground,
            }}
          >
            NoS Divers
          </Text>
          <Text style={{ color: colors.muted, marginTop: 4 }}>v2.0.0</Text>
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
            노스다이버스 다이빙 동호회
          </Text>
        </View>

        {/* Auth Section */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text
            style={{
              color: colors.muted,
              fontSize: 13,
              marginBottom: 12,
              fontWeight: "600",
            }}
          >
            계정
          </Text>

          {isAuthenticated ? (
            <View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <Text style={{ color: colors.foreground }}>
                  {user?.name || "사용자"}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 13 }}>
                  {user?.provider === "google" ? "Google" : "카카오"} 로그인
                </Text>
              </View>
              {user?.email && (
                <Text
                  style={{ color: colors.muted, fontSize: 13, marginBottom: 12 }}
                >
                  {user.email}
                </Text>
              )}
              <TouchableOpacity
                onPress={logout}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: colors.error + "15",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: colors.error }}>로그아웃</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              <TouchableOpacity
                onPress={() => Linking.openURL(getKakaoAuthUrl())}
                style={{
                  padding: 14,
                  borderRadius: 10,
                  backgroundColor: "#FEE500",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#000", fontWeight: "600" }}>
                  카카오로 로그인
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => Linking.openURL(getGoogleAuthUrl())}
                style={{
                  padding: 14,
                  borderRadius: 10,
                  backgroundColor: "#fff",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ color: "#333", fontWeight: "600" }}>
                  Google로 로그인
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Developer Info */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text
            style={{
              color: colors.muted,
              fontSize: 13,
              marginBottom: 8,
              fontWeight: "600",
            }}
          >
            정보
          </Text>
          <Text style={{ color: colors.muted, fontSize: 13 }}>
            개발: NOS DIVERS
          </Text>
          <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>
            버전: 2.0.0
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
