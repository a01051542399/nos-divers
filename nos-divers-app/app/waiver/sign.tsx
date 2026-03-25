import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Modal,
  Dimensions,
  PanResponder,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { trpc } from "../../lib/trpc";
import { useColors } from "../../hooks/use-colors";
import {
  WAIVER_TITLE,
  WAIVER_SECTIONS,
  HEALTH_CHECKLIST_ITEMS,
} from "../../lib/waiver-template";

const STEPS = ["개인정보", "면책 내용", "건강체크", "서명", "완료"];

export default function WaiverSignScreen() {
  const { tourId } = useLocalSearchParams<{ tourId: string }>();
  const router = useRouter();
  const colors = useColors();
  const [step, setStep] = useState(0);

  // Step 0: Personal Info
  const [personalInfo, setPersonalInfo] = useState({
    name: "",
    birthDate: "",
    phone: "",
    divingLevel: "",
    tourPeriod: "",
    tourLocation: "",
    emergencyContact: "",
  });

  // Step 2: Health
  const [healthChecklist, setHealthChecklist] = useState<boolean[]>(
    new Array(HEALTH_CHECKLIST_ITEMS.length).fill(false)
  );
  const [healthOther, setHealthOther] = useState("");
  const [healthConfirmed, setHealthConfirmed] = useState(false);

  // Step 3: Signature
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  // Mutation
  const createWaiver = trpc.waiver.create.useMutation({
    onSuccess: () => {
      setStep(4); // Go to completion
    },
    onError: (err) => {
      Alert.alert("오류", err.message);
    },
  });

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      setCurrentPath(`M${locationX},${locationY}`);
    },
    onPanResponderMove: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      setCurrentPath((prev) => prev + `L${locationX},${locationY}`);
    },
    onPanResponderRelease: () => {
      if (currentPath) {
        setPaths((prev) => [...prev, currentPath]);
        setCurrentPath("");
      }
    },
  });

  const getSignatureSvg = (): string => {
    const width = Dimensions.get("window").width - 40;
    const height = 300;
    const pathsStr = paths.map((p) => `<path d="${p}" stroke="#000" stroke-width="2" fill="none"/>`).join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${pathsStr}</svg>`;
  };

  const validateStep0 = () => {
    const required = ["name", "birthDate", "phone", "divingLevel", "tourPeriod", "tourLocation", "emergencyContact"];
    for (const key of required) {
      if (!(personalInfo as any)[key].trim()) {
        Alert.alert("오류", "모든 항목을 입력해주세요");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (step === 0 && !validateStep0()) return;
    if (step === 2 && !healthConfirmed) {
      Alert.alert("확인", "건강 상태를 확인하고 동의해주세요");
      return;
    }
    if (step === 3) {
      // Submit
      if (paths.length === 0) {
        Alert.alert("오류", "서명을 해주세요");
        return;
      }
      const svgBase64 = Buffer.from(getSignatureSvg()).toString("base64");
      createWaiver.mutate({
        tourId: Number(tourId),
        signerName: personalInfo.name,
        personalInfo,
        healthChecklist,
        healthOther: healthOther || undefined,
        signatureImage: `data:image/svg+xml;base64,${svgBase64}`,
      });
      return;
    }
    setStep(step + 1);
  };

  const personalFields = [
    { key: "name", label: "성명", placeholder: "홍길동" },
    { key: "birthDate", label: "생년월일", placeholder: "1990-01-01" },
    { key: "phone", label: "연락처", placeholder: "010-1234-5678" },
    { key: "divingLevel", label: "다이빙 레벨", placeholder: "OW / AOW / 레스큐 등" },
    { key: "tourPeriod", label: "투어 기간", placeholder: "2026-04-01 ~ 04-03" },
    { key: "tourLocation", label: "투어 장소", placeholder: "속초" },
    { key: "emergencyContact", label: "비상 연락처", placeholder: "이름 / 관계 / 전화번호" },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Progress */}
      <View style={{ flexDirection: "row", padding: 16, gap: 4 }}>
        {STEPS.map((s, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: i <= step ? colors.primary : colors.border,
            }}
          />
        ))}
      </View>
      <Text style={{ textAlign: "center", color: colors.muted, fontSize: 13, marginBottom: 8 }}>
        {STEPS[step]} ({step + 1}/{STEPS.length})
      </Text>

      <ScrollView style={{ flex: 1, padding: 16 }}>
        {/* ── Step 0: Personal Info ── */}
        {step === 0 && (
          <View>
            <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.foreground, marginBottom: 16 }}>
              개인정보 입력
            </Text>
            {personalFields.map((field) => (
              <View key={field.key} style={{ marginBottom: 12 }}>
                <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 4 }}>{field.label}</Text>
                <TextInput
                  value={(personalInfo as any)[field.key]}
                  onChangeText={(text) => setPersonalInfo({ ...personalInfo, [field.key]: text })}
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.muted}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 8,
                    padding: 12,
                    color: colors.foreground,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                />
              </View>
            ))}
          </View>
        )}

        {/* ── Step 1: Waiver Content ── */}
        {step === 1 && (
          <View>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.foreground, marginBottom: 16, textAlign: "center" }}>
              {WAIVER_TITLE}
            </Text>
            {WAIVER_SECTIONS.map((section, i) => (
              <View key={i} style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground, marginBottom: 6 }}>
                  {section.title}
                </Text>
                <Text style={{ color: colors.muted, lineHeight: 22, fontSize: 14 }}>
                  {section.content}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Step 2: Health Checklist ── */}
        {step === 2 && (
          <View>
            <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.foreground, marginBottom: 8 }}>
              건강 체크리스트
            </Text>
            <Text style={{ color: colors.muted, marginBottom: 16 }}>
              해당하는 항목을 체크해주세요
            </Text>

            {HEALTH_CHECKLIST_ITEMS.map((item, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => {
                  const next = [...healthChecklist];
                  next[i] = !next[i];
                  setHealthChecklist(next);
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.surface,
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: healthChecklist[i] ? colors.warning : colors.border,
                }}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: healthChecklist[i] ? colors.warning : colors.border,
                    backgroundColor: healthChecklist[i] ? colors.warning : "transparent",
                    marginRight: 12,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {healthChecklist[i] && <Text style={{ color: "#fff", fontSize: 14, fontWeight: "bold" }}>✓</Text>}
                </View>
                <Text style={{ color: colors.foreground, flex: 1 }}>{item}</Text>
              </TouchableOpacity>
            ))}

            <Text style={{ color: colors.muted, fontSize: 13, marginTop: 12, marginBottom: 4 }}>
              기타 건강 관련 사항
            </Text>
            <TextInput
              value={healthOther}
              onChangeText={setHealthOther}
              placeholder="기타 사항이 있으면 입력해주세요"
              multiline
              numberOfLines={3}
              placeholderTextColor={colors.muted}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 8,
                padding: 12,
                color: colors.foreground,
                borderWidth: 1,
                borderColor: colors.border,
                minHeight: 80,
                textAlignVertical: "top",
              }}
            />

            <TouchableOpacity
              onPress={() => setHealthConfirmed(!healthConfirmed)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 20,
                padding: 14,
                backgroundColor: healthConfirmed ? colors.success + "15" : colors.surface,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: healthConfirmed ? colors.success : colors.border,
              }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: healthConfirmed ? colors.success : colors.border,
                  backgroundColor: healthConfirmed ? colors.success : "transparent",
                  marginRight: 12,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {healthConfirmed && <Text style={{ color: "#fff", fontSize: 12 }}>✓</Text>}
              </View>
              <Text style={{ color: colors.foreground, flex: 1 }}>
                위 내용을 확인하였으며, 건강 상태에 대해 정확히 기재하였습니다.
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 3: Signature ── */}
        {step === 3 && (
          <View>
            <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.foreground, marginBottom: 8 }}>
              전자 서명
            </Text>
            <Text style={{ color: colors.muted, marginBottom: 16 }}>
              아래 영역에 서명해주세요
            </Text>

            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 12,
                borderWidth: 2,
                borderColor: colors.border,
                height: 300,
                overflow: "hidden",
              }}
              {...panResponder.panHandlers}
            >
              <Svg width="100%" height="100%">
                {paths.map((p, i) => (
                  <Path key={i} d={p} stroke="#000" strokeWidth={2} fill="none" />
                ))}
                {currentPath ? (
                  <Path d={currentPath} stroke="#000" strokeWidth={2} fill="none" />
                ) : null}
              </Svg>
            </View>

            <TouchableOpacity
              onPress={() => {
                setPaths([]);
                setCurrentPath("");
              }}
              style={{ marginTop: 12, alignItems: "center" }}
            >
              <Text style={{ color: colors.error }}>서명 지우기</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 4: Completion ── */}
        {step === 4 && (
          <View style={{ alignItems: "center", paddingTop: 40 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>✅</Text>
            <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.foreground, marginBottom: 8 }}>
              서명 완료
            </Text>
            <Text style={{ color: colors.muted, textAlign: "center", marginBottom: 8 }}>
              {personalInfo.name}님의 면책동의서가 저장되었습니다.
            </Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>
              {new Date().toLocaleDateString("ko-KR")}
            </Text>

            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                backgroundColor: colors.primary,
                borderRadius: 10,
                paddingVertical: 14,
                paddingHorizontal: 40,
                marginTop: 32,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>돌아가기</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Navigation Buttons */}
      {step < 4 && (
        <View style={{ flexDirection: "row", padding: 16, gap: 12 }}>
          {step > 0 && (
            <TouchableOpacity
              onPress={() => setStep(step - 1)}
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 10,
                backgroundColor: colors.surface,
                alignItems: "center",
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: colors.foreground }}>이전</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleNext}
            disabled={createWaiver.isPending}
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 10,
              backgroundColor: colors.primary,
              alignItems: "center",
              opacity: createWaiver.isPending ? 0.6 : 1,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>
              {step === 3 ? (createWaiver.isPending ? "저장 중..." : "제출") : "다음"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
