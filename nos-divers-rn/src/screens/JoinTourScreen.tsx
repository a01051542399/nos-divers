import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../components/ThemeContext";
import * as db from "../lib/supabase-store";

export default function JoinTourScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const [step, setStep] = useState(0); // 0: 코드 입력, 1: 확인 + 참여
  const [inviteCode, setInviteCode] = useState("");
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(false);
  const [tour, setTour] = useState<{
    id: number;
    name: string;
    date: string;
    location: string;
    createdByName: string;
  } | null>(null);

  // 프로필 이름 로드
  useEffect(() => {
    db.getProfile().then((p) => {
      if (p.name) setUserName(p.name);
    });
  }, []);

  const handleCheckCode = async () => {
    const code = inviteCode.trim();
    if (code.length < 6) {
      Alert.alert("알림", "6자리 초대 코드를 입력해주세요");
      return;
    }
    setLoading(true);
    try {
      const found = await db.lookupTourByInvite(code);
      if (found) {
        setTour(found);
        setStep(1);
      } else {
        Alert.alert("오류", "유효하지 않은 초대 코드입니다");
      }
    } catch {
      Alert.alert("오류", "코드 확인 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!userName.trim()) {
      Alert.alert("알림", "이름을 입력해주세요");
      return;
    }
    if (!tour) return;

    setLoading(true);
    try {
      const result = await db.joinTour(inviteCode.trim(), userName.trim());
      if ("error" in result) {
        if (result.error.includes("이미")) {
          Alert.alert("알림", "이미 참여 중입니다", [
            {
              text: "확인",
              onPress: () =>
                navigation.navigate("TourDetail", { tourId: tour.id }),
            },
          ]);
        } else {
          Alert.alert("오류", result.error);
        }
      } else {
        Alert.alert("완료", "투어에 참가하였습니다!", [
          {
            text: "확인",
            onPress: () =>
              navigation.navigate("TourDetail", { tourId: result.tourId }),
          },
        ]);
      }
    } catch {
      Alert.alert("오류", "참여 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => {
              if (step === 1) {
                setStep(0);
                setTour(null);
              } else {
                navigation.goBack();
              }
            }}
          >
            <Text style={[styles.backText, { color: colors.primary }]}>
              {step === 1 ? "뒤로" : "취소"}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>투어 참여하기</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Step 0: 초대 코드 입력 */}
        {step === 0 && (
          <View style={styles.content}>
            <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}20` }]}>
              <Text style={[styles.iconText, { color: colors.primary }]}>+</Text>
            </View>
            <Text style={[styles.mainTitle, { color: colors.text }]}>투어 참여하기</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              초대 코드를 입력하여 다이빙 투어에 참여하세요
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>초대 코드</Text>
              <TextInput
                style={[styles.codeInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={inviteCode}
                onChangeText={(v) => setInviteCode(v.toUpperCase())}
                placeholder="ABC123"
                placeholderTextColor={colors.muted}
                maxLength={6}
                autoCapitalize="characters"
                autoFocus
                onSubmitEditing={handleCheckCode}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary },
                inviteCode.trim().length < 6 && styles.buttonDisabled,
              ]}
              onPress={handleCheckCode}
              disabled={loading || inviteCode.trim().length < 6}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>코드 확인</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Step 1: 투어 정보 확인 + 이름 입력 + 참여 */}
        {step === 1 && tour && (
          <View style={styles.content}>
            {/* 투어 정보 카드 */}
            <View style={[styles.tourInfoCard, { backgroundColor: colors.primary }]}>
              <Text style={styles.tourInfoLabel}>참여할 투어</Text>
              <Text style={styles.tourInfoName}>{tour.name}</Text>
              <View style={styles.tourInfoMeta}>
                {tour.date ? (
                  <Text style={styles.tourInfoMetaText}>{tour.date}</Text>
                ) : null}
                {tour.location ? (
                  <Text style={styles.tourInfoMetaText}>{tour.location}</Text>
                ) : null}
              </View>
              <Text style={styles.tourInfoHost}>
                주최: {tour.createdByName}
              </Text>
            </View>

            {/* 이름 입력 */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>이름 입력</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={userName}
                onChangeText={setUserName}
                placeholder="참여자 이름을 입력하세요"
                placeholderTextColor={colors.muted}
                autoFocus
                onSubmitEditing={handleJoin}
              />
              <Text style={[styles.hint, { color: colors.muted }]}>
                동명이인의 경우 이름 뒤에 숫자를 붙여주세요 (예: 홍길동2)
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary },
                !userName.trim() && styles.buttonDisabled,
              ]}
              onPress={handleJoin}
              disabled={loading || !userName.trim()}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>참여하기</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryAction}
              onPress={() => {
                setStep(0);
                setTour(null);
              }}
            >
              <Text style={[styles.secondaryActionText, { color: colors.muted }]}>다른 코드 입력</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8F4F8",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#C8DDE5",
  },
  backText: {
    fontSize: 16,
    color: "#2196F3",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#023E58",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: "center",
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(33,150,243,0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  iconText: {
    fontSize: 40,
    color: "#2196F3",
    fontWeight: "300",
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#023E58",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#3D7A94",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  inputGroup: {
    width: "100%",
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#023E58",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#023E58",
    borderWidth: 1,
    borderColor: "#D4E8EF",
  },
  codeInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 24,
    fontWeight: "700",
    color: "#023E58",
    textAlign: "center",
    letterSpacing: 8,
    borderWidth: 1,
    borderColor: "#D4E8EF",
  },
  hint: {
    fontSize: 11,
    color: "#3D7A94",
    marginTop: 6,
  },
  primaryButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "#2196F3",
    alignItems: "center",
    marginTop: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  // 투어 정보 카드
  tourInfoCard: {
    width: "100%",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    backgroundColor: "#2196F3",
    alignItems: "center",
  },
  tourInfoLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
    marginBottom: 4,
  },
  tourInfoName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 8,
  },
  tourInfoMeta: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 8,
  },
  tourInfoMetaText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
  },
  tourInfoHost: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
  },
  secondaryAction: {
    marginTop: 16,
    paddingVertical: 12,
  },
  secondaryActionText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#3D7A94",
  },
});
