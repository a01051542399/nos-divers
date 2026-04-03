/**
 * 비용 추가/수정 화면 (모달)
 * - 카테고리 선택 (다이빙/숙박/식비/기타)
 * - 비용명, 시간, 금액, 통화, 환율
 * - 결제자, 분배 방식 (균등/지정)
 * - 영수증 사진 첨부 (촬영 or 갤러리)
 */
import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import * as db from "../lib/supabase-store";
import { formatKRW } from "../store";
import type { Participant, Expense } from "../types";
import { useToast } from "../components/Toast";
// Theme: using consistent light colors

const CURRENCIES = [
  { code: "KRW", symbol: "\u20A9", name: "\uD55C\uAD6D \uC6D0" },
  { code: "USD", symbol: "$", name: "\uBBF8\uAD6D \uB2EC\uB7EC" },
  { code: "PHP", symbol: "\u20B1", name: "\uD544\uB9AC\uD540 \uD398\uC18C" },
  { code: "THB", symbol: "\u0E3F", name: "\uD0DC\uAD6D \uBC14\uD2B8" },
  { code: "IDR", symbol: "Rp", name: "\uC778\uB3C4\uB124\uC2DC\uC544 \uB8E8\uD53C\uC544" },
  { code: "JPY", symbol: "\u00A5", name: "\uC77C\uBCF8 \uC5D4" },
];

const CATEGORIES = [
  { label: "다이빙", icon: "water" as const },
  { label: "숙박", icon: "bed" as const },
  { label: "식비", icon: "restaurant" as const },
  { label: "기타", icon: "ellipsis-horizontal" as const },
];

/** 비용명에서 카테고리 파싱: "[다이빙] 보트비" → { category: "다이빙", baseName: "보트비", time: "" } */
function parseExpenseName(raw: string): { category: string; baseName: string; time: string } {
  const categoryMatch = raw.match(/^\[(.+?)\]\s*/);
  const category = categoryMatch ? categoryMatch[1] : "기타";
  const withoutCategory = categoryMatch ? raw.slice(categoryMatch[0].length) : raw;

  const timeMatch = withoutCategory.match(/\s*\((\d{1,2}:\d{2})\)$/);
  const time = timeMatch ? timeMatch[1] : "";
  const baseName = timeMatch ? withoutCategory.slice(0, -timeMatch[0].length) : withoutCategory;

  const validCategory = CATEGORIES.some((c) => c.label === category) ? category : "기타";
  return { category: validCategory, baseName, time };
}

/** 카테고리 + 이름 + 시간 조합 */
function buildExpenseName(category: string, baseName: string, time: string): string {
  const base = `[${category}] ${baseName.trim()}`;
  return time.trim() ? `${base} (${time.trim()})` : base;
}

export default function AddExpenseScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { toast } = useToast();
  const C = {
    bg: "#E8F4F8",
    card: "#FFFFFF",
    border: "#D1E6ED",
    text: "#023E58",
    muted: "#3D7A94",
    accent: "#2196F3",
    green: "#4CAF50",
    red: "#F44336",
    orange: "#FF9800",
  };

  const tourId: number = route.params?.tourId;
  const participants: Participant[] = route.params?.participants ?? [];
  const existingExpense: Expense | undefined = route.params?.expense;
  const isEdit = !!existingExpense;

  // ─── Parse existing expense name on edit ───
  const parsed = useMemo(() => {
    if (existingExpense?.name) return parseExpenseName(existingExpense.name);
    return { category: "기타", baseName: "", time: "" };
  }, [existingExpense]);

  // ─── Form state ───
  const [category, setCategory] = useState(parsed.category);
  const [name, setName] = useState(parsed.baseName);
  const [time, setTime] = useState(parsed.time);
  const [amount, setAmount] = useState(existingExpense ? String(existingExpense.amount) : "");
  const [currency, setCurrency] = useState(existingExpense?.currency ?? "KRW");
  const [exchangeRate, setExchangeRate] = useState(
    existingExpense?.exchangeRate ? String(existingExpense.exchangeRate) : "1"
  );
  const [paidBy, setPaidBy] = useState<number>(
    existingExpense?.paidBy ?? participants[0]?.id ?? 0
  );
  const [splitType, setSplitType] = useState<"equal" | "custom">(
    existingExpense?.splitType ?? "equal"
  );
  const [splitAmong, setSplitAmong] = useState<number[]>(
    existingExpense?.splitAmong ?? participants.map((p) => p.id)
  );
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>(() => {
    if (existingExpense?.splitType === "custom" && existingExpense.splitAmounts) {
      const ca: Record<string, string> = {};
      for (const [k, v] of Object.entries(existingExpense.splitAmounts)) {
        ca[k] = String(v);
      }
      return ca;
    }
    return {};
  });
  const [receiptImage, setReceiptImage] = useState<string | undefined>(
    existingExpense?.receiptImage
  );

  const [saving, setSaving] = useState(false);
  const [rateLoading, setRateLoading] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showPayerPicker, setShowPayerPicker] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = React.useRef<any>(null);

  // ─── Styles (dynamic, depends on C) ───
  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: C.bg },
        header: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
        },
        headerCancel: { color: C.muted, fontSize: 16 },
        headerTitle: { color: C.text, fontSize: 17, fontWeight: "700" },
        headerSave: { color: C.accent, fontSize: 16, fontWeight: "700" },
        body: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },

        label: {
          color: C.muted,
          fontSize: 13,
          fontWeight: "600",
          marginTop: 16,
          marginBottom: 6,
        },
        input: {
          backgroundColor: C.card,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 12,
          color: C.text,
          fontSize: 16,
          borderWidth: 1,
          borderColor: C.border,
        },

        // Category chips
        categoryRow: {
          flexDirection: "row",
          gap: 8,
        },
        categoryChip: {
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          paddingVertical: 9,
          borderRadius: 10,
          backgroundColor: C.card,
          borderWidth: 1,
          borderColor: C.border,
        },
        categoryChipActive: {
          backgroundColor: C.accent,
          borderColor: C.accent,
        },
        categoryChipText: { color: C.text, fontSize: 12, fontWeight: "600" },
        categoryChipTextActive: { color: "#fff" },

        // Picker
        pickerBtn: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: C.card,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderWidth: 1,
          borderColor: C.border,
        },
        pickerBtnText: { color: C.text, fontSize: 15 },
        pickerArrow: { color: C.muted, fontSize: 12 },

        optionList: {
          backgroundColor: C.card,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: C.border,
          marginTop: 4,
          overflow: "hidden",
        },
        optionItem: {
          paddingHorizontal: 14,
          paddingVertical: 11,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
        },
        optionItemActive: { backgroundColor: "rgba(88,166,255,0.12)" },
        optionText: { color: C.text, fontSize: 15 },
        optionTextActive: { color: C.accent, fontWeight: "600" },

        // Exchange rate
        rateRow: { flexDirection: "row", alignItems: "center", gap: 8 },
        rateRefreshBtn: {
          backgroundColor: C.card,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderWidth: 1,
          borderColor: C.accent,
        },
        rateRefreshText: { color: C.accent, fontSize: 14, fontWeight: "600" },
        rateHint: { color: C.muted, fontSize: 13, marginTop: 4 },

        // Split toggle
        splitToggle: {
          flexDirection: "row",
          backgroundColor: C.card,
          borderRadius: 10,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: C.border,
        },
        splitBtn: { flex: 1, paddingVertical: 11, alignItems: "center" },
        splitBtnActive: { backgroundColor: C.accent },
        splitBtnText: { color: C.muted, fontSize: 14, fontWeight: "600" },
        splitBtnTextActive: { color: "#fff" },

        // Participant chips
        participantGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
        chipBtn: {
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 20,
          backgroundColor: C.card,
          borderWidth: 1,
          borderColor: C.border,
        },
        chipBtnActive: {
          backgroundColor: "rgba(88,166,255,0.15)",
          borderColor: C.accent,
        },
        chipText: { color: C.muted, fontSize: 14 },
        chipTextActive: { color: C.accent, fontWeight: "600" },
        perPersonHint: { color: C.muted, fontSize: 13, marginTop: 4, width: "100%" },

        // Custom split
        customSplitList: { gap: 8 },
        customRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        },
        customAmountInput: {
          flex: 1,
          backgroundColor: C.card,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 8,
          color: C.text,
          fontSize: 15,
          borderWidth: 1,
          borderColor: C.border,
          textAlign: "right",
        },
        customTotalRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: C.border,
          marginTop: 4,
        },
        customTotalLabel: { color: C.muted, fontSize: 14, fontWeight: "600" },
        customTotalValue: { fontSize: 14, fontWeight: "700" },

        // Receipt
        receiptRow: { flexDirection: "row", alignItems: "center", gap: 8 },
        receiptBtn: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          backgroundColor: C.card,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderWidth: 1,
          borderColor: C.border,
        },
        receiptBtnText: { color: C.accent, fontSize: 14, fontWeight: "600" },
        receiptDeleteBtn: {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingHorizontal: 12,
          paddingVertical: 10,
        },
        receiptPreview: {
          width: "100%",
          height: 200,
          borderRadius: 10,
          marginTop: 10,
        },

        // Camera
        cameraContainer: { flex: 1, backgroundColor: "#000" },
        cameraPreview: { flex: 1 },
        cameraOverlay: {
          flex: 1,
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 40,
        },
        cameraCancel: { position: "absolute", top: 16, left: 16 },
        cameraCancelText: { color: "#fff", fontSize: 16 },
        captureBtn: {
          width: 72,
          height: 72,
          borderRadius: 36,
          borderWidth: 4,
          borderColor: "#fff",
          alignItems: "center",
          justifyContent: "center",
        },
        captureBtnInner: {
          width: 58,
          height: 58,
          borderRadius: 29,
          backgroundColor: "#fff",
        },
      }),
    [C.bg, C.card, C.border, C.text, C.muted, C.accent, C.green, C.red]
  );

  // ─── Exchange rate auto-fetch ───
  const fetchExchangeRate = async (code: string) => {
    if (code === "KRW") {
      setExchangeRate("1");
      return;
    }
    setRateLoading(true);
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/KRW");
      const data = await res.json();
      if (data.rates?.[code]) {
        const rate = 1 / data.rates[code];
        setExchangeRate(String(Math.round(rate * 100) / 100));
      } else {
        Alert.alert("환율 조회 실패", "수동으로 입력해주세요.");
      }
    } catch {
      Alert.alert("환율 조회 실패", "수동으로 입력해주세요.");
    }
    setRateLoading(false);
  };

  useEffect(() => {
    if (!isEdit && currency !== "KRW") {
      fetchExchangeRate(currency);
    }
  }, [currency]);

  // ─── Custom split total ───
  const customTotal = useMemo(() => {
    return splitAmong.reduce(
      (sum, pid) => sum + (parseInt(customAmounts[String(pid)] || "0", 10) || 0),
      0
    );
  }, [customAmounts, splitAmong]);

  const amountNum = parseInt(amount.replace(/[^0-9]/g, ""), 10) || 0;

  // ─── Toggle participant in split ───
  const toggleSplit = (pid: number) => {
    setSplitAmong((prev) =>
      prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]
    );
  };

  // ─── Time auto-format (HH:MM) ───
  const handleTimeChange = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, "").slice(0, 4);
    if (digits.length <= 2) {
      setTime(digits);
    } else {
      setTime(`${digits.slice(0, 2)}:${digits.slice(2)}`);
    }
  };

  // ─── Camera ───
  const handleTakePhoto = async () => {
    if (!cameraPermission?.granted) {
      const perm = await requestCameraPermission();
      if (!perm.granted) {
        Alert.alert("카메라 권한이 필요합니다");
        return;
      }
    }
    setShowCamera(true);
  };

  const capturePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.6,
      });
      if (photo?.base64) {
        const sizeBytes = (photo.base64.length * 3) / 4;
        if (sizeBytes > 5 * 1024 * 1024) {
          toast("영수증 사진이 5MB를 초과합니다", "error");
          setShowCamera(false);
          return;
        }
        setReceiptImage(`data:image/jpeg;base64,${photo.base64}`);
      }
      setShowCamera(false);
    } catch (err) {
      Alert.alert("사진 촬영 실패");
      setShowCamera(false);
    }
  };

  // ─── Gallery picker ───
  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"] as any,
      base64: true,
      quality: 0.6,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      const sizeBytes = (result.assets[0].base64.length * 3) / 4;
      if (sizeBytes > 5 * 1024 * 1024) {
        toast("영수증 사진이 5MB를 초과합니다", "error");
        return;
      }
      setReceiptImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  // ─── Save ───
  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("비용명을 입력해주세요");
      return;
    }
    if (!amountNum || amountNum <= 0) {
      Alert.alert("금액을 올바르게 입력해주세요");
      return;
    }
    if (!paidBy) {
      Alert.alert("결제자를 선택해주세요");
      return;
    }
    if (splitAmong.length === 0) {
      Alert.alert("분배 대상을 1명 이상 선택해주세요");
      return;
    }

    const rateNum = parseFloat(exchangeRate) || 1;
    if (currency !== "KRW" && rateNum <= 0) {
      Alert.alert("환율을 올바르게 입력해주세요");
      return;
    }

    if (splitType === "custom" && customTotal !== amountNum) {
      Alert.alert(
        "금액 불일치",
        `개별 금액 합계(${formatKRW(customTotal)})가 총 금액(${formatKRW(amountNum)})과 일치하지 않습니다.`
      );
      return;
    }

    const finalName = buildExpenseName(category, name, time);

    setSaving(true);
    try {
      const splitAmountsObj: Record<string, number> | null =
        splitType === "custom"
          ? splitAmong.reduce((obj, pid) => {
              obj[String(pid)] = parseInt(customAmounts[String(pid)] || "0", 10) || 0;
              return obj;
            }, {} as Record<string, number>)
          : null;

      if (isEdit && existingExpense) {
        await db.editExpense(tourId, existingExpense.id, {
          name: finalName,
          amount: amountNum,
          currency,
          exchangeRate: rateNum,
          paidBy,
          splitAmong,
          splitType,
          splitAmounts: splitAmountsObj,
          receiptImage,
        });
      } else {
        await db.addExpense({
          tourId,
          name: finalName,
          amount: amountNum,
          currency,
          exchangeRate: rateNum,
          paidBy,
          splitAmong,
          splitType,
          splitAmounts: splitAmountsObj,
          receiptImage,
        });
      }

      navigation.goBack();
    } catch (err: any) {
      Alert.alert("저장 실패", err?.message || "다시 시도해주세요.");
    }
    setSaving(false);
  };

  // ─── Camera fullscreen ───
  if (showCamera) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.cameraPreview} facing="back">
          <SafeAreaView style={styles.cameraOverlay}>
            <TouchableOpacity style={styles.cameraCancel} onPress={() => setShowCamera(false)}>
              <Text style={styles.cameraCancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.captureBtn} onPress={capturePhoto}>
              <View style={styles.captureBtnInner} />
            </TouchableOpacity>
          </SafeAreaView>
        </CameraView>
      </View>
    );
  }

  const currencyObj = CURRENCIES.find((c) => c.code === currency);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.headerCancel}>취소</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEdit ? "비용 수정" : "비용 추가"}</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={C.accent} />
            ) : (
              <Text style={styles.headerSave}>저장</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* 카테고리 */}
          <Text style={styles.label}>카테고리</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => {
              const active = category === cat.label;
              return (
                <TouchableOpacity
                  key={cat.label}
                  style={[styles.categoryChip, active && styles.categoryChipActive]}
                  onPress={() => setCategory(cat.label)}
                >
                  <Ionicons
                    name={cat.icon}
                    size={14}
                    color={active ? "#fff" : C.muted}
                  />
                  <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 비용명 */}
          <Text style={styles.label}>비용명</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="예: 보트비, 조식, 민박"
            placeholderTextColor={C.muted}
          />

          {/* 시간 */}
          <Text style={styles.label}>시간 (선택)</Text>
          <TextInput
            style={styles.input}
            value={time}
            onChangeText={handleTimeChange}
            placeholder="예: 14:30"
            placeholderTextColor={C.muted}
            keyboardType="numeric"
            maxLength={5}
          />

          {/* 금액 */}
          <Text style={styles.label}>금액</Text>
          <TextInput
            style={styles.input}
            value={amount ? Number(amount.replace(/[^0-9]/g, "")).toLocaleString("ko-KR") : ""}
            onChangeText={(v) => setAmount(v.replace(/[^0-9]/g, ""))}
            placeholder="0"
            placeholderTextColor={C.muted}
            keyboardType="numeric"
          />

          {/* 통화 */}
          <Text style={styles.label}>통화</Text>
          <TouchableOpacity
            style={styles.pickerBtn}
            onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
          >
            <Text style={styles.pickerBtnText}>
              {currencyObj ? `${currencyObj.symbol} ${currencyObj.code} - ${currencyObj.name}` : currency}
            </Text>
            <Text style={styles.pickerArrow}>{showCurrencyPicker ? "\u25B2" : "\u25BC"}</Text>
          </TouchableOpacity>

          {showCurrencyPicker && (
            <View style={styles.optionList}>
              {CURRENCIES.map((c) => (
                <TouchableOpacity
                  key={c.code}
                  style={[styles.optionItem, currency === c.code && styles.optionItemActive]}
                  onPress={() => {
                    setCurrency(c.code);
                    setShowCurrencyPicker(false);
                  }}
                >
                  <Text style={[styles.optionText, currency === c.code && styles.optionTextActive]}>
                    {c.symbol} {c.code} - {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* 환율 */}
          {currency !== "KRW" && (
            <>
              <Text style={styles.label}>
                환율 (1 {currency} = ? KRW){rateLoading ? " 조회 중..." : ""}
              </Text>
              <View style={styles.rateRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={exchangeRate}
                  onChangeText={setExchangeRate}
                  keyboardType="decimal-pad"
                  placeholderTextColor={C.muted}
                />
                <TouchableOpacity
                  style={styles.rateRefreshBtn}
                  onPress={() => fetchExchangeRate(currency)}
                  disabled={rateLoading}
                >
                  <Text style={styles.rateRefreshText}>
                    {rateLoading ? "..." : "자동"}
                  </Text>
                </TouchableOpacity>
              </View>
              {amountNum > 0 && parseFloat(exchangeRate) > 0 && (
                <Text style={styles.rateHint}>
                  = {formatKRW(Math.round(amountNum * parseFloat(exchangeRate)))} KRW
                </Text>
              )}
            </>
          )}

          {/* 결제자 */}
          <Text style={styles.label}>결제자</Text>
          <TouchableOpacity
            style={styles.pickerBtn}
            onPress={() => setShowPayerPicker(!showPayerPicker)}
          >
            <Text style={styles.pickerBtnText}>
              {participants.find((p) => p.id === paidBy)?.name || "선택"}
            </Text>
            <Text style={styles.pickerArrow}>{showPayerPicker ? "\u25B2" : "\u25BC"}</Text>
          </TouchableOpacity>

          {showPayerPicker && (
            <View style={styles.optionList}>
              {participants.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.optionItem, paidBy === p.id && styles.optionItemActive]}
                  onPress={() => {
                    setPaidBy(p.id);
                    setShowPayerPicker(false);
                  }}
                >
                  <Text style={[styles.optionText, paidBy === p.id && styles.optionTextActive]}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* 분배 방식 */}
          <Text style={styles.label}>분배 방식</Text>
          <View style={styles.splitToggle}>
            <TouchableOpacity
              style={[styles.splitBtn, splitType === "equal" && styles.splitBtnActive]}
              onPress={() => setSplitType("equal")}
            >
              <Text style={[styles.splitBtnText, splitType === "equal" && styles.splitBtnTextActive]}>
                균등 분배
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.splitBtn, splitType === "custom" && styles.splitBtnActive]}
              onPress={() => setSplitType("custom")}
            >
              <Text style={[styles.splitBtnText, splitType === "custom" && styles.splitBtnTextActive]}>
                지정 분배
              </Text>
            </TouchableOpacity>
          </View>

          {/* 분배 대상 */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16, marginBottom: 6 }}>
            <Text style={[styles.label, { marginTop: 0, marginBottom: 0 }]}>
              분배 대상 ({splitAmong.length}/{participants.length})
            </Text>
            <TouchableOpacity
              onPress={() => {
                if (splitAmong.length === participants.length) {
                  setSplitAmong([]);
                } else {
                  setSplitAmong(participants.map((p) => p.id));
                }
              }}
            >
              <Text style={{ color: C.accent, fontSize: 13, fontWeight: "600" }}>
                {splitAmong.length === participants.length ? "전체 해제" : "모두 선택"}
              </Text>
            </TouchableOpacity>
          </View>

          {splitType === "equal" ? (
            <View style={styles.participantGrid}>
              {participants.map((p) => {
                const selected = splitAmong.includes(p.id);
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.chipBtn, selected && styles.chipBtnActive]}
                    onPress={() => toggleSplit(p.id)}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                      {selected ? "\u2713 " : ""}{p.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {splitAmong.length > 0 && amountNum > 0 && (
                <Text style={styles.perPersonHint}>
                  1인당: {formatKRW(Math.round(amountNum / splitAmong.length))}
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.customSplitList}>
              {participants.map((p) => {
                const selected = splitAmong.includes(p.id);
                return (
                  <View key={p.id} style={styles.customRow}>
                    <TouchableOpacity
                      style={[styles.chipBtn, { flex: 0 }, selected && styles.chipBtnActive]}
                      onPress={() => toggleSplit(p.id)}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                        {selected ? "\u2713 " : ""}{p.name}
                      </Text>
                    </TouchableOpacity>
                    {selected && (
                      <TextInput
                        style={styles.customAmountInput}
                        value={customAmounts[String(p.id)] ?? ""}
                        onChangeText={(v) =>
                          setCustomAmounts((prev) => ({ ...prev, [String(p.id)]: v }))
                        }
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={C.muted}
                      />
                    )}
                  </View>
                );
              })}
              <View style={styles.customTotalRow}>
                <Text style={styles.customTotalLabel}>합계</Text>
                <Text
                  style={[
                    styles.customTotalValue,
                    customTotal !== amountNum && amountNum > 0
                      ? { color: C.red }
                      : { color: C.green },
                  ]}
                >
                  {formatKRW(customTotal)} / {formatKRW(amountNum)}
                </Text>
              </View>
            </View>
          )}

          {/* 영수증 */}
          <Text style={styles.label}>영수증</Text>
          <View style={styles.receiptRow}>
            <TouchableOpacity style={styles.receiptBtn} onPress={handleTakePhoto}>
              <Ionicons name="camera" size={16} color={C.accent} />
              <Text style={styles.receiptBtnText}>촬영</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.receiptBtn} onPress={handlePickImage}>
              <Ionicons name="images" size={16} color={C.accent} />
              <Text style={styles.receiptBtnText}>불러오기</Text>
            </TouchableOpacity>
            {receiptImage && (
              <TouchableOpacity style={styles.receiptDeleteBtn} onPress={() => setReceiptImage(undefined)}>
                <Ionicons name="close-circle" size={18} color={C.red} />
                <Text style={[styles.receiptBtnText, { color: C.red }]}>삭제</Text>
              </TouchableOpacity>
            )}
          </View>
          {receiptImage && (
            <Image
              source={{ uri: receiptImage }}
              style={styles.receiptPreview}
              resizeMode="cover"
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
