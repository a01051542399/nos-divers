import { useState } from "react";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Platform,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import * as db from "@/lib/supabase-store";

export default function JoinScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const colors = useColors();
  const router = useRouter();

  const [inviteCode, setInviteCode] = useState(code?.toUpperCase() || "");
  const [participantName, setParticipantName] = useState("");
  const [step, setStep] = useState<"code" | "name" | "success">(code ? "code" : "code");
  const [tourInfo, setTourInfo] = useState<{ id: number; name: string; date: string; location: string; createdByName: string } | null>(null);
  const [joinResult, setJoinResult] = useState<{ tourId: number; tourName: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [joining, setJoining] = useState(false);

  const handleCheckCode = async () => {
    if (!inviteCode.trim() || inviteCode.trim().length < 4) {
      if (Platform.OS === "web") {
        window.alert("초대 코드를 입력해주세요.");
      } else {
        Alert.alert("알림", "초대 코드를 입력해주세요.");
      }
      return;
    }

    setChecking(true);
    try {
      const result = await db.lookupTourByInvite(inviteCode.toUpperCase());
      if (result) {
        setTourInfo({
          id: result.id,
          name: result.name,
          date: result.date,
          location: result.location,
          createdByName: result.createdByName,
        });
        setStep("name");
      } else {
        if (Platform.OS === "web") {
          window.alert("유효하지 않은 초대 코드입니다.\n코드를 다시 확인해주세요.");
        } else {
          Alert.alert("오류", "유효하지 않은 초대 코드입니다.\n코드를 다시 확인해주세요.");
        }
      }
    } catch {
      if (Platform.OS === "web") {
        window.alert("코드 확인 중 오류가 발생했습니다.");
      } else {
        Alert.alert("오류", "코드 확인 중 오류가 발생했습니다.");
      }
    } finally {
      setChecking(false);
    }
  };

  const handleJoin = async () => {
    if (!participantName.trim()) {
      if (Platform.OS === "web") {
        window.alert("이름을 입력해주세요.");
      } else {
        Alert.alert("알림", "이름을 입력해주세요.");
      }
      return;
    }
    setJoining(true);
    try {
      const result = await db.joinTour(inviteCode.toUpperCase(), participantName.trim());
      if ("error" in result) {
        if (Platform.OS === "web") {
          window.alert(String(result.error) || "참여에 실패했습니다.");
        } else {
          Alert.alert("오류", String(result.error) || "참여에 실패했습니다.");
        }
      } else {
        setJoinResult({ tourId: result.tourId, tourName: result.tourName });
        setStep("success");
      }
    } catch (e) {
      if (Platform.OS === "web") {
        window.alert("참여 중 오류가 발생했습니다.");
      } else {
        Alert.alert("오류", "참여 중 오류가 발생했습니다.");
      }
    } finally {
      setJoining(false);
    }
  };

  const handleGoToTour = () => {
    if (joinResult) {
      router.replace(`/tour/${joinResult.tourId}` as any);
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 헤더 */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
              <IconSymbol name="chevron.right" size={24} color={colors.primary} style={{ transform: [{ scaleX: -1 }] }} />
              <Text style={[styles.backText, { color: colors.primary }]}>뒤로</Text>
            </TouchableOpacity>
          </View>

          {/* Step 1: 초대 코드 입력 */}
          {step === "code" && (
            <View style={styles.stepContainer}>
              <View style={styles.iconContainer}>
                <View style={[styles.iconCircle, { backgroundColor: colors.primary + "15" }]}>
                  <IconSymbol name="paperplane.fill" size={40} color={colors.primary} />
                </View>
              </View>
              <Text style={[styles.title, { color: colors.foreground }]}>투어 참여하기</Text>
              <Text style={[styles.subtitle, { color: colors.muted }]}>
                초대 코드를 입력하여 다이빙 투어에 참여하세요
              </Text>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.foreground }]}>초대 코드</Text>
                <TextInput
                  style={[styles.codeInput, {
                    backgroundColor: colors.surface,
                    color: colors.foreground,
                    borderColor: colors.border,
                  }]}
                  placeholder="예: ABCD1234"
                  placeholderTextColor={colors.muted}
                  value={inviteCode}
                  onChangeText={(text) => setInviteCode(text.toUpperCase())}
                  autoCapitalize="characters"
                  maxLength={12}
                  returnKeyType="done"
                  onSubmitEditing={handleCheckCode}
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, {
                  backgroundColor: inviteCode.trim().length >= 4 ? colors.primary : colors.muted,
                }]}
                onPress={handleCheckCode}
                disabled={inviteCode.trim().length < 4 || checking}
                activeOpacity={0.8}
              >
                {checking ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>코드 확인</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Step 2: 투어 정보 확인 + 이름 입력 */}
          {step === "name" && tourInfo && (
            <View style={styles.stepContainer}>
              <View style={[styles.tourInfoCard, { backgroundColor: colors.primary }]}>
                <Text style={styles.tourInfoLabel}>참여할 투어</Text>
                <Text style={styles.tourInfoName}>{tourInfo.name}</Text>
                <View style={styles.tourInfoMeta}>
                  {tourInfo.date ? (
                    <View style={styles.tourInfoMetaItem}>
                      <IconSymbol name="calendar" size={14} color="rgba(255,255,255,0.8)" />
                      <Text style={styles.tourInfoMetaText}>{tourInfo.date}</Text>
                    </View>
                  ) : null}
                  {tourInfo.location ? (
                    <View style={styles.tourInfoMetaItem}>
                      <IconSymbol name="mappin.and.ellipse" size={14} color="rgba(255,255,255,0.8)" />
                      <Text style={styles.tourInfoMetaText}>{tourInfo.location}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.foreground }]}>이름 입력</Text>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: colors.surface,
                    color: colors.foreground,
                    borderColor: colors.border,
                  }]}
                  placeholder="참여자 이름을 입력하세요"
                  placeholderTextColor={colors.muted}
                  value={participantName}
                  onChangeText={setParticipantName}
                  returnKeyType="done"
                  onSubmitEditing={handleJoin}
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, {
                  backgroundColor: participantName.trim() ? colors.primary : colors.muted,
                }]}
                onPress={handleJoin}
                disabled={!participantName.trim() || joining}
                activeOpacity={0.8}
              >
                {joining ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>참여하기</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => { setStep("code"); setTourInfo(null); }}
                style={styles.secondaryButton}
                activeOpacity={0.7}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.muted }]}>
                  다른 코드 입력
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 3: 참여 완료 */}
          {step === "success" && joinResult && (
            <View style={styles.stepContainer}>
              <View style={styles.iconContainer}>
                <View style={[styles.iconCircle, { backgroundColor: colors.success + "15" }]}>
                  <IconSymbol name="checkmark.circle.fill" size={48} color={colors.success} />
                </View>
              </View>
              <Text style={[styles.title, { color: colors.foreground }]}>참여 완료!</Text>
              <Text style={[styles.subtitle, { color: colors.muted }]}>
                {joinResult.tourName} 투어에 성공적으로 참여했습니다
              </Text>

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                onPress={handleGoToTour}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>투어 보기</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.replace("/(tabs)" as any)}
                style={styles.secondaryButton}
                activeOpacity={0.7}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.muted }]}>
                  홈으로 돌아가기
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 4,
  },
  backText: {
    fontSize: 16,
    fontWeight: "600",
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  inputContainer: {
    width: "100%",
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  codeInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 3,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  primaryButton: {
    width: "100%",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  secondaryButton: {
    marginTop: 16,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "500",
  },
  tourInfoCard: {
    width: "100%",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: "center",
  },
  tourInfoLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  tourInfoName: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
  },
  tourInfoMeta: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  tourInfoMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  tourInfoMetaText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
  },
  tourInfoParticipants: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    marginTop: 4,
  },
});
