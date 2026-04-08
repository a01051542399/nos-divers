import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../lib/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../components/ThemeContext";

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const { signInWithEmail, signInWithKakao, signInWithGoogle } = useAuth();
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert("알림", "이메일과 비밀번호를 입력해주세요");
      return;
    }
    setLoading(true);
    const { error } = await signInWithEmail(email, password);
    setLoading(false);
    if (error) Alert.alert("로그인 실패", error);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <Image
          source={require("../../assets/icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={[styles.title, { color: colors.text }]}>NoS Divers</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>SINCE 2019 DIVING TEAM</Text>

        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.text }]}>이메일</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            placeholder="example@email.com"
            placeholderTextColor={colors.muted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={[styles.label, { color: colors.text }]}>비밀번호</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            placeholder="비밀번호 입력"
            placeholderTextColor={colors.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {/* Forgot password link */}
          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => navigation.navigate("PasswordReset")}
          >
            <Text style={styles.forgotPasswordText}>비밀번호를 잊으셨나요?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: colors.primary }]}
            onPress={handleEmailLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>로그인</Text>
            )}
          </TouchableOpacity>

          {/* Sign up link */}
          <View style={styles.signupRow}>
            <Text style={[styles.signupText, { color: colors.muted }]}>계정이 없으신가요? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
              <Text style={[styles.signupLink, { color: colors.primary }]}>회원가입</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.muted }]}>또는</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <TouchableOpacity style={styles.kakaoButton} onPress={signInWithKakao}>
            <View style={styles.oauthButtonInner}>
              <Ionicons name="chatbubble" size={20} color="#191919" />
              <Text style={styles.kakaoButtonText}>카카오로 로그인</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.googleButton} onPress={signInWithGoogle}>
            <View style={styles.oauthButtonInner}>
              <Ionicons name="logo-google" size={20} color="#4285F4" />
              <Text style={styles.googleButtonText}>Google로 로그인</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8F4F8",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#023E58",
  },
  subtitle: {
    fontSize: 12,
    color: "#3D7A94",
    marginBottom: 32,
  },
  form: {
    width: "100%",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#023E58",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#023E58",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#C8DFE8",
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 16,
    marginTop: -8,
  },
  forgotPasswordText: {
    color: "#2196F3",
    fontSize: 13,
    fontWeight: "500",
  },
  loginButton: {
    backgroundColor: "#2196F3",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  signupText: {
    color: "#3D7A94",
    fontSize: 14,
  },
  signupLink: {
    color: "#2196F3",
    fontSize: 14,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#C8DFE8",
  },
  dividerText: {
    marginHorizontal: 12,
    color: "#3D7A94",
    fontSize: 14,
  },
  oauthButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  kakaoButton: {
    backgroundColor: "#FEE500",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  kakaoButtonText: {
    color: "#191919",
    fontSize: 16,
    fontWeight: "600",
  },
  googleButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  googleButtonText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "600",
  },
});
