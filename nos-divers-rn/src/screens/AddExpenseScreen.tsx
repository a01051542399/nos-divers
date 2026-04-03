/**
 * 비용 추가/수정 화면 (모달)
 * - 비용명, 금액, 통화, 환율
 * - 결제자, 분배 방식 (균등/지정)
 * - 영수증 사진 첨부
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
import * as db from "../lib/supabase-store";
import { formatKRW } from "../store";
import type { Participant, Expense } from "../types";

// ─── Colors ───
const C = {
  bg: "#0D1117",
  card: "#161B22",
  border: "#30363D",
  text: "#E6EDF3",
  muted: "#8B949E",
  accent: "#58A6FF",
  green: "#3FB950",
  red: "#F85149",
  orange: "#D29922",
};

const CURRENCIES = [
  { code: "KRW", symbol: "\u20A9", name: "\uD55C\uAD6D \uC6D0" },
  { code: "USD", symbol: "$", name: "\uBBF8\uAD6D \uB2EC\uB7EC" },
  { code: "PHP", symbol: "\u20B1", name: "\uD544\uB9AC\uD540 \uD398\uC18C" },
  { code: "THB", symbol: "\u0E3F", name: "\uD0DC\uAD6D \uBC14\uD2B8" },
  { code: "IDR", symbol: "Rp", name: "\uC778\uB3C4\uB124\uC2DC\uC544 \uB8E8\uD53C\uC544" },
  { code: "JPY", symbol: "\u00A5", name: "\uC77C\uBCF8 \uC5D4" },
];

export default function AddExpenseScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();

  const tourId: number = route.params?.tourId;
  const participants: Participant[] = route.params?.participants ?? [];
  const existingExpense: Expense | undefined = route.params?.expense;
  const isEdit = !!existingExpense;

  // ─── Form state ───
  const [name, setName] = useState(existingExpense?.name ?? "");
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
        setReceiptImage(`data:image/jpeg;base64,${photo.base64}`);
      }
      setShowCamera(false);
    } catch (err) {
      Alert.alert("사진 촬영 실패");
      setShowCamera(false);
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
          name: name.trim(),
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
          name: name.trim(),
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
          {/* 비용명 */}
          <Text style={styles.label}>비용명</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="예: 숙소, 보트비, 식비"
            placeholderTextColor={C.muted}
          />

          {/* 금액 */}
          <Text style={styles.label}>금액</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
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
          <Text style={styles.label}>
            분배 대상 ({splitAmong.length}/{participants.length})
          </Text>

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
              <Text style={styles.receiptBtnText}>
                {receiptImage ? "다시 촬영" : "사진 촬영"}
              </Text>
            </TouchableOpacity>
            {receiptImage && (
              <TouchableOpacity onPress={() => setReceiptImage(undefined)}>
                <Text style={[styles.receiptBtnText, { color: C.red, marginLeft: 12 }]}>삭제</Text>
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

// ─── Styles ───

const styles = StyleSheet.create({
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
  receiptRow: { flexDirection: "row", alignItems: "center" },
  receiptBtn: {
    backgroundColor: C.card,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  receiptBtnText: { color: C.accent, fontSize: 14, fontWeight: "600" },
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
});
