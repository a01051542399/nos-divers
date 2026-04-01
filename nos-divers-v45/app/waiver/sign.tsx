import { useCallback, useState, useRef } from "react";
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { SignatureModal } from "@/components/signature-modal";
import * as db from "@/lib/supabase-store";
import type { WaiverPersonalInfo } from "@/lib/types";
import {
  WAIVER_TITLE,
  WAIVER_INTRO,
  WAIVER_SECTIONS,
  WAIVER_CLOSING,
  HEALTH_CHECKLIST,
} from "@/lib/waiver-template";

const SCREEN_WIDTH = Dimensions.get("window").width;

// Required fields for step 0
const REQUIRED_FIELDS: { field: keyof WaiverPersonalInfo; label: string }[] = [
  { field: "name", label: "이름" },
  { field: "birthDate", label: "생년월일" },
  { field: "phone", label: "연락처" },
  { field: "divingLevel", label: "다이빙 레벨" },
  { field: "tourPeriod", label: "투어/활동 기간" },
  { field: "tourLocation", label: "투어/활동 장소" },
  { field: "emergencyContact", label: "비상 연락처" },
];

function showAlert(title: string, message: string) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function WaiverSignScreen() {
  const { tourId, tourName } = useLocalSearchParams<{ tourId: string; tourName: string }>();
  const colors = useColors();
  const router = useRouter();

  // 기본 정보
  const [personalInfo, setPersonalInfo] = useState<WaiverPersonalInfo>({
    name: "",
    birthDate: "",
    phone: "",
    divingLevel: "",
    tourPeriod: "",
    tourLocation: tourName ? decodeURIComponent(tourName) : "",
    emergencyContact: "",
  });

  // 건강 체크리스트
  const [healthChecklist, setHealthChecklist] = useState<boolean[]>(
    new Array(HEALTH_CHECKLIST.length).fill(false)
  );
  const [healthOther, setHealthOther] = useState("");

  // 동의 체크
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // 서명
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [step, setStep] = useState(0); // 0: 기본정보, 1: 동의서 내용, 2: 서명
  const [submitting, setSubmitting] = useState(false);

  // 필수 항목 미입력 표시
  const [showErrors, setShowErrors] = useState(false);

  const updateField = (field: keyof WaiverPersonalInfo, value: string) => {
    setPersonalInfo((prev) => ({ ...prev, [field]: value }));
  };

  const toggleHealth = (idx: number) => {
    setHealthChecklist((prev) => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
  };

  // Step 0 validation: all fields required
  const getMissingFields = (): string[] => {
    return REQUIRED_FIELDS.filter(
      (f) => !personalInfo[f.field].trim()
    ).map((f) => f.label);
  };

  const canProceedStep0 = getMissingFields().length === 0;

  const handleStep0Next = () => {
    const missing = getMissingFields();
    if (missing.length > 0) {
      setShowErrors(true);
      showAlert(
        "필수 항목 미입력",
        `다음 항목을 모두 입력해주세요:\n${missing.join(", ")}`
      );
      return;
    }
    setShowErrors(false);
    setStep(1);
  };

  // Step 1 validation: must agree to terms
  const handleStep1Next = () => {
    if (!agreedToTerms) {
      showAlert(
        "동의 필요",
        "면책동의서 내용을 확인하고 하단의 동의 체크박스를 선택해주세요."
      );
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!tourId || !signatureData) return;
    setSubmitting(true);
    try {
      await db.createWaiver({
        tourId: Number(tourId),
        signerName: personalInfo.name,
        personalInfo: JSON.stringify(personalInfo),
        healthChecklist: JSON.stringify(healthChecklist),
        healthOther,
        signatureImage: signatureData,
      });
      showAlert("완료", "면책동의서 서명이 완료되었습니다.");
      router.back();
    } catch (e) {
      console.error("Failed to create waiver:", e);
      showAlert("오류", "서명 저장 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignatureSave = (base64: string) => {
    setSignatureData(base64);
    setShowSignatureModal(false);
  };

  const handleSignatureCancel = () => {
    setShowSignatureModal(false);
  };

  const isFieldEmpty = (field: keyof WaiverPersonalInfo) => {
    return showErrors && !personalInfo[field].trim();
  };

  const renderStep0 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.foreground }]}>1. 기본 정보</Text>
      <Text style={[styles.stepDesc, { color: colors.muted }]}>
        모든 항목을 빠짐없이 입력해주세요
      </Text>

      {[
        { label: "이름", field: "name" as const, placeholder: "홍길동" },
        { label: "생년월일", field: "birthDate" as const, placeholder: "1990-01-01" },
        { label: "연락처", field: "phone" as const, placeholder: "010-1234-5678", keyboardType: "phone-pad" as const },
        { label: "다이빙 레벨 (단체명 포함)", field: "divingLevel" as const, placeholder: "예: PADI AOW / SSI AA" },
        { label: "투어/활동 기간", field: "tourPeriod" as const, placeholder: "예: 2026.03.15 ~ 03.17" },
        { label: "투어/활동 장소", field: "tourLocation" as const, placeholder: "예: 제주 서귀포" },
        { label: "비상 연락처 (관계)", field: "emergencyContact" as const, placeholder: "예: 010-9876-5432 (배우자)" },
      ].map((item) => (
        <View key={item.field} style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.foreground }]}>
            {item.label} <Text style={{ color: colors.error }}>*</Text>
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                color: colors.foreground,
                borderColor: isFieldEmpty(item.field) ? colors.error : colors.border,
                borderWidth: isFieldEmpty(item.field) ? 2 : 1,
              },
            ]}
            placeholder={item.placeholder}
            placeholderTextColor={colors.muted}
            value={personalInfo[item.field]}
            onChangeText={(v) => updateField(item.field, v)}
            keyboardType={(item as any).keyboardType || "default"}
            returnKeyType="next"
          />
          {isFieldEmpty(item.field) && (
            <Text style={[styles.errorText, { color: colors.error }]}>
              필수 입력 항목입니다
            </Text>
          )}
        </View>
      ))}

      <TouchableOpacity
        style={[styles.nextButton, { backgroundColor: colors.primary }]}
        onPress={handleStep0Next}
        activeOpacity={0.8}
      >
        <Text style={styles.nextButtonText}>다음: 동의서 내용 확인</Text>
        <IconSymbol name="arrow.right" size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      {/* 동의서 헤더 */}
      <View style={[styles.waiverHeader, { backgroundColor: colors.primary + "08", borderColor: colors.primary + "20" }]}>
        <Text style={[styles.waiverTitle, { color: colors.foreground }]}>{WAIVER_TITLE}</Text>
        <Text style={[styles.waiverIntro, { color: colors.foreground }]}>{WAIVER_INTRO}</Text>
      </View>

      {/* 동의서 본문 */}
      {WAIVER_SECTIONS.map((section, idx) => (
        <View key={idx} style={styles.waiverSection}>
          <Text style={[styles.waiverSectionTitle, { color: colors.foreground }]}>{section.title}</Text>
          <Text style={[styles.waiverSectionContent, { color: colors.foreground }]}>{section.content}</Text>
        </View>
      ))}

      {/* 건강 상태 체크리스트 */}
      <View style={styles.waiverSection}>
        <Text style={[styles.waiverSectionTitle, { color: colors.foreground }]}>
          건강 상태 확인 (해당 사항 체크)
        </Text>
        {HEALTH_CHECKLIST.map((item, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.checkItem}
            onPress={() => toggleHealth(idx)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: healthChecklist[idx] ? colors.primary : colors.border,
                  backgroundColor: healthChecklist[idx] ? colors.primary : "transparent",
                },
              ]}
            >
              {healthChecklist[idx] && (
                <IconSymbol name="checkmark.circle.fill" size={16} color="#FFFFFF" />
              )}
            </View>
            <Text style={[styles.checkLabel, { color: colors.foreground }]}>{item}</Text>
          </TouchableOpacity>
        ))}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.foreground }]}>기타 특이사항</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
            placeholder="해당 사항이 있으면 기입해주세요"
            placeholderTextColor={colors.muted}
            value={healthOther}
            onChangeText={setHealthOther}
          />
        </View>
      </View>

      {/* 마무리 문구 */}
      <View style={[styles.waiverClosing, { backgroundColor: colors.warning + "10", borderColor: colors.warning + "30" }]}>
        <Text style={[styles.waiverClosingText, { color: colors.foreground }]}>{WAIVER_CLOSING}</Text>
      </View>

      {/* 동의 체크박스 */}
      <TouchableOpacity
        style={[
          styles.agreeRow,
          {
            backgroundColor: agreedToTerms ? colors.primary + "10" : colors.surface,
            borderColor: agreedToTerms ? colors.primary : colors.border,
          },
        ]}
        onPress={() => setAgreedToTerms(!agreedToTerms)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.agreeCheckbox,
            {
              borderColor: agreedToTerms ? colors.primary : colors.border,
              backgroundColor: agreedToTerms ? colors.primary : "transparent",
            },
          ]}
        >
          {agreedToTerms && (
            <IconSymbol name="checkmark.circle.fill" size={18} color="#FFFFFF" />
          )}
        </View>
        <Text style={[styles.agreeText, { color: colors.foreground }]}>
          위의 모든 내용을 읽고 이해하였으며, 이에 동의합니다.
        </Text>
      </TouchableOpacity>

      <View style={styles.stepButtons}>
        <TouchableOpacity
          style={[styles.backStepButton, { borderColor: colors.border }]}
          onPress={() => setStep(0)}
          activeOpacity={0.7}
        >
          <Text style={[styles.backStepText, { color: colors.foreground }]}>이전</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.nextButton,
            { backgroundColor: agreedToTerms ? colors.primary : colors.muted, flex: 1 },
          ]}
          onPress={handleStep1Next}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>다음: 서명</Text>
          <IconSymbol name="arrow.right" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.foreground }]}>3. 서명</Text>
      <Text style={[styles.stepDesc, { color: colors.muted }]}>
        아래 서명란을 탭하여 서명해주세요
      </Text>

      {/* 서명 영역 - 탭하면 전체화면 모달 열림 */}
      <TouchableOpacity
        style={[
          styles.signatureBox,
          {
            backgroundColor: signatureData ? "#FFFFFF" : colors.surface,
            borderColor: signatureData ? colors.success : colors.border,
          },
        ]}
        onPress={() => setShowSignatureModal(true)}
        activeOpacity={0.7}
      >
        {signatureData ? (
          <View style={styles.signaturePreview}>
            {Platform.OS === "web" ? (
              <img
                src={signatureData}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                alt="서명"
              />
            ) : (
              <View style={styles.signaturePreviewInner}>
                <IconSymbol name="checkmark.circle.fill" size={32} color={colors.success} />
                <Text style={[styles.signedText, { color: colors.success }]}>서명 완료</Text>
              </View>
            )}
            <View style={styles.resignRow}>
              <Text style={[styles.resignText, { color: colors.primary }]}>
                탭하여 다시 서명하기
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.signaturePlaceholder}>
            <IconSymbol name="pencil" size={32} color={colors.muted} />
            <Text style={[styles.signaturePlaceholderText, { color: colors.muted }]}>
              여기를 탭하여 서명하세요
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.signerInfo}>
        <Text style={[styles.signerLabel, { color: colors.muted }]}>
          서명자: {personalInfo.name}
        </Text>
        <Text style={[styles.signerLabel, { color: colors.muted }]}>
          작성일: {new Date().toLocaleDateString("ko-KR")}
        </Text>
      </View>

      <View style={styles.stepButtons}>
        <TouchableOpacity
          style={[styles.backStepButton, { borderColor: colors.border }]}
          onPress={() => setStep(1)}
          activeOpacity={0.7}
        >
          <Text style={[styles.backStepText, { color: colors.foreground }]}>이전</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.nextButton,
            { backgroundColor: signatureData ? colors.success : colors.muted, flex: 1 },
          ]}
          onPress={handleSubmit}
          disabled={!signatureData || submitting}
          activeOpacity={0.8}
        >
          <IconSymbol name="checkmark.circle.fill" size={18} color="#FFFFFF" />
          <Text style={styles.nextButtonText}>
            {submitting ? "저장 중..." : "서명 제출"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack} activeOpacity={0.7}>
          <IconSymbol name="chevron.right" size={24} color={colors.primary} style={{ transform: [{ scaleX: -1 }] }} />
          <Text style={[styles.headerBackText, { color: colors.primary }]}>뒤로</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>면책동의서</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* 진행 단계 표시 */}
      <View style={styles.progressBar}>
        {["기본정보", "동의서", "서명"].map((label, idx) => (
          <View key={idx} style={styles.progressItem}>
            <View
              style={[
                styles.progressDot,
                {
                  backgroundColor: step >= idx ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={styles.progressDotText}>{idx + 1}</Text>
            </View>
            <Text
              style={[
                styles.progressLabel,
                { color: step >= idx ? colors.primary : colors.muted },
              ]}
            >
              {label}
            </Text>
          </View>
        ))}
        <View style={[styles.progressLine, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressLineFill,
              { backgroundColor: colors.primary, width: `${step * 50}%` },
            ]}
          />
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 0 && renderStep0()}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 전체화면 서명 모달 */}
      <SignatureModal
        visible={showSignatureModal}
        onSave={handleSignatureSave}
        onCancel={handleSignatureCancel}
        signerName={personalInfo.name}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerBack: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 4,
    width: 60,
  },
  headerBackText: {
    fontSize: 16,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  progressBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 16,
    position: "relative",
  },
  progressItem: {
    alignItems: "center",
    zIndex: 1,
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  progressDotText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
  },
  progressLine: {
    position: "absolute",
    left: 54,
    right: 54,
    top: 30,
    height: 2,
    borderRadius: 1,
  },
  progressLineFill: {
    height: "100%",
    borderRadius: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  stepContent: {
    gap: 0,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 14,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    paddingLeft: 4,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  stepButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  backStepButton: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  backStepText: {
    fontSize: 16,
    fontWeight: "600",
  },
  // 동의서 스타일
  waiverHeader: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  waiverTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 10,
    textAlign: "center",
  },
  waiverIntro: {
    fontSize: 14,
    lineHeight: 22,
  },
  waiverSection: {
    marginBottom: 16,
  },
  waiverSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },
  waiverSectionContent: {
    fontSize: 14,
    lineHeight: 22,
  },
  checkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  checkLabel: {
    fontSize: 14,
    flex: 1,
  },
  waiverClosing: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  waiverClosingText: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 22,
  },
  // 동의 체크박스
  agreeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  agreeCheckbox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  agreeText: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    lineHeight: 20,
  },
  // 서명 스타일
  signatureBox: {
    borderWidth: 2,
    borderRadius: 16,
    borderStyle: "dashed",
    minHeight: 160,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    overflow: "hidden",
  },
  signaturePlaceholder: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 40,
  },
  signaturePlaceholderText: {
    fontSize: 16,
    fontWeight: "500",
  },
  signaturePreview: {
    width: "100%",
    minHeight: 160,
    justifyContent: "center",
    alignItems: "center",
  },
  signaturePreviewInner: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 30,
  },
  signedText: {
    fontSize: 18,
    fontWeight: "700",
  },
  resignRow: {
    paddingVertical: 8,
  },
  resignText: {
    fontSize: 13,
    fontWeight: "500",
  },
  signerInfo: {
    gap: 4,
    marginBottom: 16,
  },
  signerLabel: {
    fontSize: 14,
  },
});
