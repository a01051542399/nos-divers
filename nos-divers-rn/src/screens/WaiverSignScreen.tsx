import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Modal,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { WebView } from "react-native-webview";
import type { WebViewMessageEvent } from "react-native-webview";
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
import { useTheme } from "../components/ThemeContext";

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
    keyboardType: "phone-pad",
  },
];

export default function WaiverSignScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
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

  const scrollRef = useRef<ScrollView>(null);

  // Step 2: Canvas Signature via Modal + WebView
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureBase64, setSignatureBase64] = useState<string>("");
  const [signatureModalVisible, setSignatureModalVisible] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const signatureHTML = `
<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:${colors.card};overflow:hidden}
canvas{display:block;width:100%;height:280px;touch-action:none}</style></head><body>
<canvas id="c"></canvas>
<script>
var c=document.getElementById('c'),ctx=c.getContext('2d'),drawing=false,hasStrokes=false;
c.width=c.offsetWidth*2;c.height=c.offsetHeight*2;ctx.scale(2,2);
ctx.lineWidth=2.5;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='${colors.primary}';
function pos(e){var t=e.touches?e.touches[0]:e,r=c.getBoundingClientRect();
return{x:t.clientX-r.left,y:t.clientY-r.top}}
c.addEventListener('touchstart',function(e){e.preventDefault();drawing=true;var p=pos(e);ctx.beginPath();ctx.moveTo(p.x,p.y);
window.ReactNativeWebView.postMessage(JSON.stringify({type:'touchstart'}))});
c.addEventListener('touchmove',function(e){e.preventDefault();if(!drawing)return;var p=pos(e);ctx.lineTo(p.x,p.y);ctx.stroke();hasStrokes=true;
window.ReactNativeWebView.postMessage(JSON.stringify({type:'drawing',hasStrokes:true}))});
c.addEventListener('touchend',function(e){e.preventDefault();drawing=false;
window.ReactNativeWebView.postMessage(JSON.stringify({type:'touchend'}))});
window.clear=function(){ctx.clearRect(0,0,c.width,c.height);hasStrokes=false;
window.ReactNativeWebView.postMessage(JSON.stringify({type:'drawing',hasStrokes:false}))};
window.getImage=function(){if(!hasStrokes){window.ReactNativeWebView.postMessage(JSON.stringify({type:'image',data:''}));return}
window.ReactNativeWebView.postMessage(JSON.stringify({type:'image',data:c.toDataURL('image/png')}))};
</script></body></html>`;

  const handleWebViewMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'drawing') {
        setHasSignature(msg.hasStrokes);
      } else if (msg.type === 'image') {
        setSignatureBase64(msg.data);
      }
    } catch {}
  }, []);

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

  const formatEmergencyContact = (v: string) => {
    // "010-1234-5678 (관계)" 형태 — 괄호 부분 보존하면서 숫자에 하이픈
    const match = v.match(/^([\d-]+)\s*(\(.+\))?$/);
    if (match) {
      return formatPhone(match[1]) + (match[2] ? " " + match[2] : "");
    }
    // 숫자만 입력 중이면 전화번호 포맷
    const digitsOnly = v.replace(/[^0-9]/g, "");
    if (digitsOnly.length > 0 && digitsOnly.length === v.replace(/[-]/g, "").length) {
      return formatPhone(v);
    }
    return v;
  };

  const formatValue = (key: keyof WaiverPersonalInfo, v: string) => {
    if (key === "phone") return formatPhone(v);
    if (key === "emergencyContact") return formatEmergencyContact(v);
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
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: false }), 50);
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
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: false }), 50);
  };

  const handleSubmit = async () => {
    if (!hasSignature) {
      Alert.alert("서명 필요", "서명란에 직접 서명해주세요.");
      return;
    }

    // Request image from WebView
    webViewRef.current?.injectJavaScript("window.getImage();true;");
    // Wait a moment for the message
    await new Promise(r => setTimeout(r, 300));

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

      const signatureImage = signatureBase64 ||
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
        signatureImage,
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
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>로딩 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backBtnText, { color: colors.primary }]}>{"<"} 뒤로</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressSegment,
              { backgroundColor: i <= step ? colors.primary : colors.muted },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.progressLabel, { color: colors.muted }]}>
        {STEPS[step]} ({step + 1}/{STEPS.length})
      </Text>

      {step !== 2 ? (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Step 0: Personal Info ── */}
            {step === 0 && (
              <View>
                <Text style={[styles.stepTitle, { color: colors.text }]}>1. 기본 정보</Text>
                <Text style={[styles.stepDesc, { color: colors.muted }]}>
                  모든 항목을 빠짐없이 입력해주세요
                </Text>

                {PERSONAL_FIELDS.map((field) => {
                  const isEmpty =
                    showErrors && !personalInfo[field.key].trim();
                  return (
                    <View key={field.key} style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: colors.text }]}>
                        {field.label}{" "}
                        <Text style={{ color: colors.error }}>*</Text>
                      </Text>
                      <TextInput
                        style={[
                          styles.input,
                          { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
                          isEmpty && {
                            borderColor: colors.error,
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
                        placeholderTextColor={colors.muted}
                        keyboardType={field.keyboardType || "default"}
                      />
                      {isEmpty && (
                        <Text style={[styles.errorText, { color: colors.error }]}>
                          필수 입력 항목입니다
                        </Text>
                      )}
                    </View>
                  );
                })}

                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
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
                <View style={[styles.waiverHeaderBox, { backgroundColor: colors.card }]}>
                  <Text style={[styles.waiverTitle, { color: colors.text }]}>{WAIVER_TITLE}</Text>
                  <Text style={[styles.waiverIntro, { color: colors.text }]}>{WAIVER_INTRO}</Text>
                </View>

                {/* Sections */}
                {WAIVER_SECTIONS.map((section, i) => (
                  <View key={i} style={[styles.waiverSection, { backgroundColor: colors.card }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
                    <Text style={[styles.sectionContent, { color: colors.muted }]}>{section.content}</Text>
                  </View>
                ))}

                {/* Health checklist */}
                <View style={[styles.waiverSection, { backgroundColor: colors.card }]}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
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
                          { borderColor: colors.border },
                          healthChecklist[i] && { backgroundColor: colors.primary, borderColor: colors.primary },
                        ]}
                      >
                        {healthChecklist[i] && (
                          <Text style={styles.checkmark}>{"\u2713"}</Text>
                        )}
                      </View>
                      <Text style={[styles.checkboxLabel, { color: colors.text }]}>{item}</Text>
                    </TouchableOpacity>
                  ))}

                  <View style={[styles.inputGroup, { marginTop: 12 }]}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>기타 특이사항</Text>
                    <TextInput
                      style={[styles.input, { height: 80, textAlignVertical: "top", backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                      value={healthOther}
                      onChangeText={setHealthOther}
                      placeholder="해당 사항이 있으면 기입해주세요"
                      placeholderTextColor={colors.muted}
                      multiline
                    />
                  </View>
                </View>

                {/* Closing */}
                <View style={[styles.closingBox, { backgroundColor: colors.card }]}>
                  <Text style={[styles.closingText, { color: colors.text }]}>{WAIVER_CLOSING}</Text>
                </View>

                {/* Agreement checkbox */}
                <TouchableOpacity
                  style={[
                    styles.agreeRow,
                    { borderColor: colors.border },
                    agreedToTerms && { borderColor: colors.primary, backgroundColor: colors.card },
                  ]}
                  onPress={() => setAgreedToTerms(!agreedToTerms)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.checkbox,
                      { borderColor: colors.border },
                      agreedToTerms && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                  >
                    {agreedToTerms && (
                      <Text style={styles.checkmark}>{"\u2713"}</Text>
                    )}
                  </View>
                  <Text style={[styles.agreeText, { color: colors.text }]}>
                    위의 모든 내용을 읽고 이해하였으며, 이에 동의합니다.
                  </Text>
                </TouchableOpacity>

                {/* Nav buttons */}
                <View style={styles.navRow}>
                  <TouchableOpacity
                    style={[styles.secondaryBtn, { flex: 1, backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => setStep(0)}
                  >
                    <Text style={[styles.secondaryBtnText, { color: colors.text }]}>이전</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.primaryBtn,
                      { flex: 2, backgroundColor: colors.primary },
                      !agreedToTerms && { backgroundColor: colors.muted, opacity: 0.5 },
                    ]}
                    onPress={handleStep1Next}
                  >
                    <Text style={styles.primaryBtnText}>다음: 서명</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
      </KeyboardAvoidingView>
      ) : (
          /* ── Step 2: Signature — 버튼 클릭 → 전체화면 모달에서 서명 ── */
          <View style={[styles.scrollContent, { flex: 1, backgroundColor: colors.bg }]}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>3. 서명</Text>
            <Text style={[styles.stepDesc, { color: colors.muted }]}>
              아래 버튼을 눌러 서명 화면을 열어주세요
            </Text>

            {/* 서명 미리보기 또는 서명하기 버튼 */}
            {hasSignature && signatureBase64 ? (
              <View style={[styles.signatureBox, { backgroundColor: colors.card, borderColor: colors.border, alignItems: 'center', padding: 16 }]}>
                <Image source={{ uri: signatureBase64 }} style={{ width: '100%', height: 150, resizeMode: 'contain' }} />
                <Text style={{ color: colors.success, marginTop: 8, fontWeight: '600' }}>서명 완료</Text>
              </View>
            ) : (
              <View style={[styles.signatureBox, { backgroundColor: colors.card, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', height: 180 }]}>
                <Text style={{ color: colors.muted, fontSize: 15 }}>서명이 필요합니다</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
              onPress={() => setSignatureModalVisible(true)}
            >
              <Text style={styles.primaryBtnText}>
                {hasSignature ? "서명 다시하기" : "서명하기"}
              </Text>
            </TouchableOpacity>

            <View style={{ marginVertical: 12 }}>
              <Text style={[styles.signInfoText, { color: colors.muted }]}>
                서명자: {personalInfo.name}
              </Text>
              <Text style={[styles.signInfoText, { color: colors.muted }]}>
                작성일: {new Date().toLocaleDateString("ko-KR")}
              </Text>
            </View>

            {/* Nav buttons */}
            <View style={styles.navRow}>
              <TouchableOpacity
                style={[styles.secondaryBtn, { flex: 1, backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setStep(1)}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>이전</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  { flex: 2, backgroundColor: colors.primary },
                  hasSignature
                    ? { backgroundColor: colors.success }
                    : { backgroundColor: colors.muted, opacity: 0.5 },
                ]}
                onPress={handleSubmit}
                disabled={submitting || !hasSignature}
              >
                <Text style={styles.primaryBtnText}>
                  {submitting ? "제출 중..." : "서명 제출"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── 서명 전체화면 모달 ── */}
        <Modal visible={signatureModalVisible} animationType="slide" presentationStyle="fullScreen">
          <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: Platform.OS === 'ios' ? 60 : 40 }}>
            {/* 상단 헤더 */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <TouchableOpacity
                style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: colors.card }}
                onPress={() => {
                  setSignatureModalVisible(false);
                  setHasSignature(false);
                  setSignatureBase64("");
                  webViewRef.current?.injectJavaScript("window.clear();true;");
                }}
              >
                <Text style={{ color: colors.error, fontSize: 17, fontWeight: '600' }}>취소</Text>
              </TouchableOpacity>
              <Text style={{ color: colors.text, fontSize: 19, fontWeight: '700' }}>서명</Text>
              <TouchableOpacity
                style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: hasSignature ? colors.primary : colors.card }}
                onPress={() => {
                  webViewRef.current?.injectJavaScript("window.getImage();true;");
                  setTimeout(() => setSignatureModalVisible(false), 500);
                }}
              >
                <Text style={{ color: hasSignature ? '#fff' : colors.muted, fontSize: 17, fontWeight: '600' }}>확인</Text>
              </TouchableOpacity>
            </View>

            {/* 서명 캔버스 */}
            <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
              <Text style={{ color: colors.muted, textAlign: 'center', marginBottom: 16, fontSize: 15 }}>
                아래 영역에 손가락으로 서명해주세요
              </Text>
              <View style={{ height: 280, borderRadius: 12, borderWidth: 2, borderColor: colors.border, overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
                <WebView
                  ref={webViewRef}
                  source={{ html: signatureHTML }}
                  style={{ height: 280 }}
                  scrollEnabled={false}
                  bounces={false}
                  overScrollMode="never"
                  onMessage={handleWebViewMessage}
                  javaScriptEnabled
                />
              </View>
            </View>

            {/* 하단 버튼 */}
            <View style={{ paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
              <TouchableOpacity
                style={{ alignSelf: 'center', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
                onPress={() => {
                  webViewRef.current?.injectJavaScript("window.clear();true;");
                  setHasSignature(false);
                  setSignatureBase64("");
                }}
              >
                <Text style={{ color: colors.error, fontSize: 16, fontWeight: '600' }}>지우기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
    borderWidth: 2,
    borderColor: "#D0D0D0",
    borderStyle: "dashed",
    overflow: "hidden",
  },
  signatureCanvas: {
    height: 200,
    backgroundColor: "#fff",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  signaturePlaceholder: {
    position: "absolute",
    fontSize: 16,
    color: "#C0CDD4",
    pointerEvents: "none",
    textAlign: "center",
  },
  clearBtn: {
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#F9F9F9",
  },
  clearBtnText: {
    fontSize: 14,
    color: "#F44336",
    fontWeight: "600",
  },
  signInfoText: {
    fontSize: 14,
    color: "#3D7A94",
  },
});
