import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { WaiverPersonalInfo } from "../types";
import * as db from "../lib/supabase-store";
import type { UserProfile } from "../lib/supabase-store";
import {
  WAIVER_TITLE,
  WAIVER_INTRO,
  WAIVER_SECTIONS,
  WAIVER_CLOSING,
  HEALTH_CHECKLIST,
} from "../waiver-template";

const STEPS = ["기본정보", "동의서", "서명"];

const PERSONAL_FIELDS: {
  key: keyof WaiverPersonalInfo;
  label: string;
  placeholder: string;
  keyboardType?: "default" | "numeric" | "phone-pad";
}[] = [
  { key: "name", label: "이름", placeholder: "홍길동" },
  {
    key: "birthDate",
    label: "생년월일",
    placeholder: "1990-01-01",
    keyboardType: "numeric",
  },
  {
    key: "phone",
    label: "연락처",
    placeholder: "010-1234-5678",
    keyboardType: "phone-pad",
  },
  {
    key: "divingLevel",
    label: "다이빙 레벨 (단체명 포함)",
    placeholder: "예: PADI AOW / SSI AA",
  },
  {
    key: "tourPeriod",
    label: "투어/활동 기간",
    placeholder: "예: 2026.03.15 ~ 03.17",
  },
  {
    key: "tourLocation",
    label: "투어/활동 장소",
    placeholder: "예: 제주 서귀포",
  },
  {
    key: "emergencyContact",
    label: "비상 연락처 (관계)",
    placeholder: "예: 010-9876-5432 (배우자)",
  },
];

export default function WaiverSignScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const tourId: number = route.params?.tourId;

  const [step, setStep] = useState(0);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    email: "",
    grade: "멤버",
  });

  // Step 0: Personal Info
  const [personalInfo, setPersonalInfo] = useState<WaiverPersonalInfo>({
    name: "",
    birthDate: "",
    phone: "",
    divingLevel: "",
    tourPeriod: "",
    tourLocation: "",
    emergencyContact: "",
  });
  const [showErrors, setShowErrors] = useState(false);

  // Step 1: Health checklist + Agreement
  const [healthChecklist, setHealthChecklist] = useState<boolean[]>(
    new Array(HEALTH_CHECKLIST.length).fill(false),
  );
  const [healthOther, setHealthOther] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Step 2: Signature (text-based for now)
  const [signatureText, setSignatureText] = useState("");

  // Load tour + profile on mount
  useEffect(() => {
    (async () => {
      const [tourData, prof] = await Promise.all([
        db.getTourById(tourId),
        db.getProfile(),
      ]);
      setProfile(prof);
      setPersonalInfo({
        name: prof.name || "",
        birthDate: prof.birthDate || "",
        phone: prof.phone || "",
        divingLevel: prof.divingLevel || "",
        tourPeriod: tourData?.date || "",
        tourLocation: tourData?.location || "",
        emergencyContact: prof.emergencyContact || "",
      });
      setSignatureText(prof.name || "");
      setDataLoaded(true);
    })();
  }, [tourId]);

  // Formatters
  const formatPhone = (v: string) => {
    const digits = v.replace(/[^0-9]/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return digits.slice(0, 3) + "-" + digits.slice(3);
    return (
      digits.slice(0, 3) + "-" + digits.slice(3, 7) + "-" + digits.slice(7)
    );
  };

  const formatBirth = (v: string) => {
    const digits = v.replace(/[^0-9]/g, "").slice(0, 8);
    if (digits.length <= 4) return digits;
    if (digits.length <= 6) return digits.slice(0, 4) + "-" + digits.slice(4);
    return (
      digits.slice(0, 4) + "-" + digits.slice(4, 6) + "-" + digits.slice(6)
    );
  };

  const formatValue = (key: keyof WaiverPersonalInfo, v: string) => {
    if (key === "phone") return formatPhone(v);
    if (key === "birthDate") return formatBirth(v);
    return v;
  };

  // Validation
  const getMissingFields = (): string[] => {
    return PERSONAL_FIELDS.filter((f) => !personalInfo[f.key].trim()).map(
      (f) => f.label,
    );
  };

  const handleStep0Next = () => {
    const missing = getMissingFields();
    if (missing.length > 0) {
      setShowErrors(true);
      Alert.alert("필수 항목 미입력", missing.join(", "));
      return;
    }
    setShowErrors(false);
    setStep(1);
  };

  const handleStep1Next = () => {
    if (!agreedToTerms) {
      Alert.alert(
        "동의 필요",
        "면책동의서 내용을 확인하고 동의 체크박스를 선택해주세요.",
      );
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!signatureText.trim()) {
      Alert.alert("서명 필요", "서명란에 이름을 입력해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      // Check for duplicate
      const existingWaivers = await db.listWaiversByTour(tourId);
      const duplicate = existingWaivers.find(
        (w) => w.signerName === personalInfo.name.trim(),
      );
      if (duplicate) {
        Alert.alert(
          "중복 서명",
          `"${personalInfo.name}" 이름으로 이미 서명이 있습니다. 이전 서명을 삭제 후 다시 작성해주세요.`,
        );
        setSubmitting(false);
        return;
      }

      // Generate a simple signature image placeholder (1x1 transparent PNG as base64)
      // In a future update, this will be replaced with a canvas signature
      const placeholderSignature =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

      // Save profile for future auto-fill
      await db.setProfile({
        ...profile,
        name: personalInfo.name,
        phone: personalInfo.phone,
        birthDate: personalInfo.birthDate,
        divingLevel: personalInfo.divingLevel,
        emergencyContact: personalInfo.emergencyContact,
      });

      await db.createWaiver({
        tourId,
        signerName: personalInfo.name,
        personalInfo,
        healthChecklist,
        healthOther: healthOther || undefined,
        signatureImage: placeholderSignature,
        agreed: true,
      });

      Alert.alert("완료", "면책동의서 서명이 완료되었습니다.", [
        { text: "확인", onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert("오류", "서명 저장 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!dataLoaded) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>로딩 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>{"<"} 뒤로</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressSegment,
              { backgroundColor: i <= step ? "#2196F3" : "#D0D0D0" },
            ]}
          />
        ))}
      </View>
      <Text style={styles.progressLabel}>
        {STEPS[step]} ({step + 1}/{STEPS.length})
      </Text>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Step 0: Personal Info ── */}
          {step === 0 && (
            <View>
              <Text style={styles.stepTitle}>1. 기본 정보</Text>
              <Text style={styles.stepDesc}>
                모든 항목을 빠짐없이 입력해주세요
              </Text>

              {PERSONAL_FIELDS.map((field) => {
                const isEmpty =
                  showErrors && !personalInfo[field.key].trim();
                return (
                  <View key={field.key} style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      {field.label}{" "}
                      <Text style={{ color: "#F44336" }}>*</Text>
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        isEmpty && {
                          borderColor: "#F44336",
                          borderWidth: 2,
                        },
                      ]}
                      value={personalInfo[field.key]}
                      onChangeText={(text) =>
                        setPersonalInfo((prev) => ({
                          ...prev,
                          [field.key]: formatValue(field.key, text),
                        }))
                      }
                      placeholder={field.placeholder}
                      placeholderTextColor="#A0B4BE"
                      keyboardType={field.keyboardType || "default"}
                    />
                    {isEmpty && (
                      <Text style={styles.errorText}>
                        필수 입력 항목입니다
                      </Text>
                    )}
                  </View>
                );
              })}

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleStep0Next}
              >
                <Text style={styles.primaryBtnText}>
                  다음: 동의서 내용 확인
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Step 1: Waiver Content + Health Checklist ── */}
          {step === 1 && (
            <View>
              {/* Waiver header */}
              <View style={styles.waiverHeaderBox}>
                <Text style={styles.waiverTitle}>{WAIVER_TITLE}</Text>
                <Text style={styles.waiverIntro}>{WAIVER_INTRO}</Text>
              </View>

              {/* Sections */}
              {WAIVER_SECTIONS.map((section, i) => (
                <View key={i} style={styles.waiverSection}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Text style={styles.sectionContent}>{section.content}</Text>
                </View>
              ))}

              {/* Health checklist */}
              <View style={styles.waiverSection}>
                <Text style={styles.sectionTitle}>
                  건강 상태 확인 (해당 사항 체크)
                </Text>
                {HEALTH_CHECKLIST.map((item, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.checkboxRow}
                    onPress={() => {
                      const next = [...healthChecklist];
                      next[i] = !next[i];
                      setHealthChecklist(next);
                    }}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        healthChecklist[i] && styles.checkboxChecked,
                      ]}
                    >
                      {healthChecklist[i] && (
                        <Text style={styles.checkmark}>{"\u2713"}</Text>
                      )}
                    </View>
                    <Text style={styles.checkboxLabel}>{item}</Text>
                  </TouchableOpacity>
                ))}

                <View style={[styles.inputGroup, { marginTop: 12 }]}>
                  <Text style={styles.inputLabel}>기타 특이사항</Text>
                  <TextInput
                    style={[styles.input, { height: 80, textAlignVertical: "top" }]}
                    value={healthOther}
                    onChangeText={setHealthOther}
                    placeholder="해당 사항이 있으면 기입해주세요"
                    placeholderTextColor="#A0B4BE"
                    multiline
                  />
                </View>
              </View>

              {/* Closing */}
              <View style={styles.closingBox}>
                <Text style={styles.closingText}>{WAIVER_CLOSING}</Text>
              </View>

              {/* Agreement checkbox */}
              <TouchableOpacity
                style={[
                  styles.agreeRow,
                  agreedToTerms && styles.agreeRowChecked,
                ]}
                onPress={() => setAgreedToTerms(!agreedToTerms)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    agreedToTerms && styles.checkboxChecked,
                  ]}
                >
                  {agreedToTerms && (
                    <Text style={styles.checkmark}>{"\u2713"}</Text>
                  )}
                </View>
                <Text style={styles.agreeText}>
                  위의 모든 내용을 읽고 이해하였으며, 이에 동의합니다.
                </Text>
              </TouchableOpacity>

              {/* Nav buttons */}
              <View style={styles.navRow}>
                <TouchableOpacity
                  style={[styles.secondaryBtn, { flex: 1 }]}
                  onPress={() => setStep(0)}
                >
                  <Text style={styles.secondaryBtnText}>이전</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    { flex: 2 },
                    !agreedToTerms && { backgroundColor: "#999" },
                  ]}
                  onPress={handleStep1Next}
                >
                  <Text style={styles.primaryBtnText}>다음: 서명</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── Step 2: Signature ── */}
          {step === 2 && (
            <View>
              <Text style={styles.stepTitle}>3. 서명</Text>
              <Text style={styles.stepDesc}>
                아래에 본인의 이름을 정확히 입력해주세요
              </Text>

              <View style={styles.signatureBox}>
                <TextInput
                  style={styles.signatureInput}
                  value={signatureText}
                  onChangeText={setSignatureText}
                  placeholder="본인 이름 (서명 대용)"
                  placeholderTextColor="#A0B4BE"
                  autoCapitalize="none"
                />
                <Text style={styles.signatureHint}>
                  추후 캔버스 서명으로 업그레이드 예정
                </Text>
              </View>

              <View style={{ marginVertical: 12 }}>
                <Text style={styles.signInfoText}>
                  서명자: {personalInfo.name}
                </Text>
                <Text style={styles.signInfoText}>
                  작성일: {new Date().toLocaleDateString("ko-KR")}
                </Text>
              </View>

              {/* Nav buttons */}
              <View style={styles.navRow}>
                <TouchableOpacity
                  style={[styles.secondaryBtn, { flex: 1 }]}
                  onPress={() => setStep(1)}
                >
                  <Text style={styles.secondaryBtnText}>이전</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    { flex: 2 },
                    signatureText.trim()
                      ? { backgroundColor: "#4CAF50" }
                      : { backgroundColor: "#999" },
                  ]}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  <Text style={styles.primaryBtnText}>
                    {submitting ? "제출 중..." : "서명 제출"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8F4F8",
  },
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#3D7A94",
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  backBtnText: {
    fontSize: 14,
    color: "#2196F3",
    fontWeight: "600",
  },

  // Progress
  progressBar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 6,
    marginBottom: 6,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  progressLabel: {
    textAlign: "center",
    fontSize: 13,
    color: "#3D7A94",
    marginBottom: 8,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Step titles
  stepTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#023E58",
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 14,
    color: "#3D7A94",
    marginBottom: 16,
  },

  // Input
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#023E58",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D0D0D0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#023E58",
  },
  errorText: {
    color: "#F44336",
    fontSize: 12,
    marginTop: 4,
    paddingLeft: 4,
  },

  // Buttons
  primaryBtn: {
    backgroundColor: "#2196F3",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryBtn: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D0D0D0",
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  secondaryBtnText: {
    color: "#023E58",
    fontSize: 15,
    fontWeight: "600",
  },
  navRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },

  // Waiver content
  waiverHeaderBox: {
    backgroundColor: "rgba(33,150,243,0.05)",
    borderWidth: 1,
    borderColor: "rgba(33,150,243,0.15)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  waiverTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#023E58",
    textAlign: "center",
    marginBottom: 10,
  },
  waiverIntro: {
    fontSize: 14,
    lineHeight: 22,
    color: "#023E58",
  },
  waiverSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#023E58",
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 13,
    lineHeight: 20,
    color: "#3D7A94",
  },

  // Health checklist
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#D0D0D0",
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#2196F3",
    borderColor: "#2196F3",
  },
  checkmark: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: "#023E58",
    lineHeight: 20,
  },

  // Closing
  closingBox: {
    backgroundColor: "rgba(255,193,7,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,193,7,0.2)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  closingText: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 22,
    color: "#023E58",
  },

  // Agree
  agreeRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#D0D0D0",
    marginBottom: 16,
  },
  agreeRowChecked: {
    borderColor: "#2196F3",
    borderWidth: 2,
    backgroundColor: "rgba(33,150,243,0.06)",
  },
  agreeText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#023E58",
    lineHeight: 22,
  },

  // Signature
  signatureBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: "#D0D0D0",
    borderStyle: "dashed",
    alignItems: "center",
  },
  signatureInput: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#023E58",
    textAlign: "center",
    width: "100%",
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#023E58",
  },
  signatureHint: {
    marginTop: 10,
    fontSize: 12,
    color: "#999",
  },
  signInfoText: {
    fontSize: 14,
    color: "#3D7A94",
  },
});
