import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../lib/AuthContext";
import { useTheme } from "../components/ThemeContext";

type DivingLevel = "" | "OW" | "AOW" | "Rescue" | "Divemaster" | "Instructor";

export default function SignupScreen() {
  const navigation = useNavigation();
  const { signUpWithEmail } = useAuth();
  const { colors } = useTheme();

  // Required fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Optional fields
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [divingLevel, setDivingLevel] = useState<DivingLevel>("");
  const [emergencyContact, setEmergencyContact] = useState("");

  const [loading, setLoading] = useState(false);

  const formatPhone = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };

  const formatBirthDate = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 4) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
  };

  const validate = (): string | null => {
    if (!name.trim()) return "이름을 입력해주세요.";
    if (!email.trim()) return "이메일을 입력해주세요.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "올바른 이메일 형식이 아닙니다.";
    if (password.length < 6) return "비밀번호는 최소 6자 이상이어야 합니다.";
    if (password !== confirmPassword) return "비밀번호가 일치하지 않습니다.";
    return null;
  };

  const handleSignup = async () => {
    const validationError = validate();
    if (validationError) {
      Alert.alert("입력 오류", validationError);
      return;
    }

    setLoading(true);
    const error = await signUpWithEmail(email.trim(), password, name.trim());
    setLoading(false);

    if (error) {
      Alert.alert("가입 실패", error);
      return;
    }

    Alert.alert("가입 완료", "가입이 완료되었습니다. 로그인해주세요.", [
      { text: "확인", onPress: () => navigation.goBack() },
    ]);
  };

  const divingLevels: DivingLevel[] = ["OW", "AOW", "Rescue", "Divemaster", "Instructor"];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={[styles.backButtonText, { color: colors.primary }]}>← 뒤로</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>회원가입</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>NoS Divers에 오신 것을 환영합니다</Text>
        </View>

        {/* Required Fields */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>기본 정보 (필수)</Text>

          <Text style={[styles.label, { color: colors.text }]}>이름 *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
            placeholder="실명을 입력해주세요"
            placeholderTextColor={colors.muted}
            value={name}
            onChangeText={setName}
            autoCapitalize="none"
          />

          <Text style={[styles.label, { color: colors.text }]}>이메일 *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
            placeholder="example@email.com"
            placeholderTextColor={colors.muted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={[styles.label, { color: colors.text }]}>비밀번호 * (최소 6자)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
            placeholder="비밀번호 입력"
            placeholderTextColor={colors.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Text style={[styles.label, { color: colors.text }]}>비밀번호 확인 *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
            placeholder="비밀번호 재입력"
            placeholderTextColor={colors.muted}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        </View>

        {/* Optional Fields */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>추가 정보 (선택)</Text>

          <Text style={[styles.label, { color: colors.text }]}>전화번호</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
            placeholder="010-0000-0000"
            placeholderTextColor={colors.muted}
            value={phone}
            onChangeText={(text) => setPhone(formatPhone(text))}
            keyboardType="phone-pad"
          />

          <Text style={[styles.label, { color: colors.text }]}>생년월일</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.muted}
            value={birthDate}
            onChangeText={(text) => setBirthDate(formatBirthDate(text))}
            keyboardType="numeric"
          />

          <Text style={[styles.label, { color: colors.text }]}>다이빙 레벨</Text>
          <View style={styles.levelGrid}>
            {divingLevels.map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.levelChip,
                  divingLevel === level
                    ? [styles.levelChipActive, { backgroundColor: colors.primary, borderColor: colors.primary }]
                    : { backgroundColor: colors.inputBg, borderColor: colors.border }
                ]}
                onPress={() => setDivingLevel(divingLevel === level ? "" : level)}
              >
                <Text style={[styles.levelChipText, divingLevel === level ? styles.levelChipTextActive : { color: colors.muted }]}>
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.text }]}>비상 연락처</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
            placeholder="비상시 연락할 분의 이름과 번호"
            placeholderTextColor={colors.muted}
            value={emergencyContact}
            onChangeText={setEmergencyContact}
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.primary }, loading && styles.submitButtonDisabled]}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>가입하기</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.muted }]}>이미 계정이 있으신가요? </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[styles.footerLink, { color: colors.primary }]}>로그인</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8F4F8",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    color: "#2196F3",
    fontSize: 16,
    fontWeight: "600",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#023E58",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#3D7A94",
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#C8DFE8",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#023E58",
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#023E58",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F5FAFC",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#023E58",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#C8DFE8",
  },
  levelGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  levelChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F5FAFC",
    borderWidth: 1,
    borderColor: "#C8DFE8",
  },
  levelChipActive: {
    backgroundColor: "#2196F3",
    borderColor: "#2196F3",
  },
  levelChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3D7A94",
  },
  levelChipTextActive: {
    color: "#fff",
  },
  submitButton: {
    backgroundColor: "#2196F3",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    color: "#3D7A94",
    fontSize: 14,
  },
  footerLink: {
    color: "#2196F3",
    fontSize: 14,
    fontWeight: "600",
  },
});
