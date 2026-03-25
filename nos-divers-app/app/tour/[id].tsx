import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { trpc } from "../../lib/trpc";
import { useColors } from "../../hooks/use-colors";
import { calculateSettlement, formatKRW, formatSettlement } from "../../lib/store";

type Tab = "participants" | "expenses" | "settlement" | "waivers";

export default function TourDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tourId = Number(id);
  const colors = useColors();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("participants");

  // PIN modal state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const tourQuery = trpc.tour.getById.useQuery({ id: tourId });
  const tour = tourQuery.data;

  // Mutations
  const addParticipant = trpc.participant.add.useMutation({
    onSuccess: () => tourQuery.refetch(),
  });
  const removeParticipant = trpc.participant.remove.useMutation({
    onSuccess: () => tourQuery.refetch(),
  });
  const addExpense = trpc.expense.add.useMutation({
    onSuccess: () => tourQuery.refetch(),
  });
  const removeExpense = trpc.expense.remove.useMutation({
    onSuccess: () => tourQuery.refetch(),
  });
  const deleteTour = trpc.tour.delete.useMutation({
    onSuccess: () => router.back(),
  });

  // Form states
  const [newParticipantName, setNewParticipantName] = useState("");
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    name: "",
    amount: "",
    paidBy: 0,
    splitAmong: [] as number[],
  });

  if (!tour) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const settlements = calculateSettlement(tour);

  const requirePin = (action: () => void) => {
    setPendingAction(() => action);
    setPinValue("");
    setShowPinModal(true);
  };

  const verifyPin = () => {
    if (pinValue === "2399") {
      setShowPinModal(false);
      pendingAction?.();
    } else {
      Alert.alert("오류", "PIN이 올바르지 않습니다");
    }
  };

  const handleAddParticipant = () => {
    if (!newParticipantName.trim()) return;
    addParticipant.mutate({ tourId, name: newParticipantName.trim() });
    setNewParticipantName("");
  };

  const handleAddExpense = () => {
    if (!expenseForm.name || !expenseForm.amount || !expenseForm.paidBy) {
      Alert.alert("오류", "필수 항목을 모두 입력해주세요");
      return;
    }
    const splitAmong =
      expenseForm.splitAmong.length > 0
        ? expenseForm.splitAmong
        : tour.participants.map((p) => p.id);

    addExpense.mutate({
      tourId,
      name: expenseForm.name,
      amount: Number(expenseForm.amount),
      paidBy: expenseForm.paidBy,
      splitAmong,
    });
    setExpenseForm({ name: "", amount: "", paidBy: 0, splitAmong: [] });
    setShowExpenseForm(false);
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "participants", label: "참가자" },
    { key: "expenses", label: "비용" },
    { key: "settlement", label: "정산" },
    { key: "waivers", label: "면책서" },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Tour Info */}
      <View style={{ padding: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderColor: colors.border }}>
        <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.foreground }}>{tour.name}</Text>
        <View style={{ flexDirection: "row", gap: 16, marginTop: 6 }}>
          {tour.date ? <Text style={{ color: colors.muted }}>📅 {tour.date}</Text> : null}
          {tour.location ? <Text style={{ color: colors.muted }}>📍 {tour.location}</Text> : null}
        </View>
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
          초대코드: {tour.inviteCode}
        </Text>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: "row", backgroundColor: colors.surface, borderBottomWidth: 1, borderColor: colors.border }}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              paddingVertical: 12,
              alignItems: "center",
              borderBottomWidth: 2,
              borderBottomColor: activeTab === tab.key ? colors.primary : "transparent",
            }}
          >
            <Text
              style={{
                color: activeTab === tab.key ? colors.primary : colors.muted,
                fontWeight: activeTab === tab.key ? "600" : "400",
              }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <ScrollView style={{ flex: 1, padding: 16 }}>
        {/* ── Participants Tab ── */}
        {activeTab === "participants" && (
          <View>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
              <TextInput
                value={newParticipantName}
                onChangeText={setNewParticipantName}
                placeholder="참가자 이름"
                placeholderTextColor={colors.muted}
                style={{
                  flex: 1,
                  backgroundColor: colors.surface,
                  borderRadius: 8,
                  padding: 12,
                  color: colors.foreground,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
                onSubmitEditing={handleAddParticipant}
              />
              <TouchableOpacity
                onPress={handleAddParticipant}
                style={{
                  backgroundColor: colors.primary,
                  borderRadius: 8,
                  paddingHorizontal: 16,
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>추가</Text>
              </TouchableOpacity>
            </View>

            {tour.participants.map((p) => (
              <View
                key={p.id}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 8,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ color: colors.foreground, fontSize: 16 }}>{p.name}</Text>
                <TouchableOpacity onPress={() => removeParticipant.mutate({ id: p.id })}>
                  <Text style={{ color: colors.error }}>삭제</Text>
                </TouchableOpacity>
              </View>
            ))}

            {tour.participants.length === 0 && (
              <Text style={{ color: colors.muted, textAlign: "center", marginTop: 20 }}>
                아직 참가자가 없습니다
              </Text>
            )}
          </View>
        )}

        {/* ── Expenses Tab ── */}
        {activeTab === "expenses" && (
          <View>
            <TouchableOpacity
              onPress={() => setShowExpenseForm(true)}
              style={{
                backgroundColor: colors.primary,
                borderRadius: 10,
                padding: 14,
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>+ 비용 추가</Text>
            </TouchableOpacity>

            {tour.expenses.map((e) => {
              const payer = tour.participants.find((p) => p.id === e.paidBy);
              return (
                <View
                  key={e.id}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 10,
                    padding: 14,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: colors.foreground, fontWeight: "600" }}>{e.name}</Text>
                    <Text style={{ color: colors.primary, fontWeight: "600" }}>{formatKRW(e.amount)}</Text>
                  </View>
                  <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>
                    결제: {payer?.name || "?"} | 분담: {e.splitAmong.length}명 ({e.splitType === "equal" ? "균등" : "커스텀"})
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeExpense.mutate({ id: e.id })}
                    style={{ marginTop: 8 }}
                  >
                    <Text style={{ color: colors.error, fontSize: 13 }}>삭제</Text>
                  </TouchableOpacity>
                </View>
              );
            })}

            {tour.expenses.length === 0 && (
              <Text style={{ color: colors.muted, textAlign: "center", marginTop: 20 }}>
                아직 비용이 없습니다
              </Text>
            )}
          </View>
        )}

        {/* ── Settlement Tab ── */}
        {activeTab === "settlement" && (
          <View>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.foreground, marginBottom: 16 }}>
              정산 결과
            </Text>

            {settlements.length === 0 ? (
              <Text style={{ color: colors.muted, textAlign: "center", marginTop: 20 }}>
                정산할 내역이 없습니다
              </Text>
            ) : (
              settlements.map((s, i) => (
                <View
                  key={i}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 10,
                    padding: 16,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ fontSize: 16, color: colors.foreground, fontWeight: "500" }}>
                    {s.fromName} → {s.toName}
                  </Text>
                  <Text style={{ fontSize: 20, color: colors.primary, fontWeight: "bold", marginTop: 4 }}>
                    {formatKRW(s.amount)}
                  </Text>
                </View>
              ))
            )}

            {/* Total expenses summary */}
            {tour.expenses.length > 0 && (
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 10,
                  padding: 16,
                  marginTop: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ color: colors.muted, fontSize: 14 }}>총 비용</Text>
                <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.foreground }}>
                  {formatKRW(tour.expenses.reduce((sum, e) => sum + e.amount, 0))}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Waivers Tab ── */}
        {activeTab === "waivers" && (
          <View>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
              <TouchableOpacity
                onPress={() => router.push(`/waiver/sign?tourId=${tourId}`)}
                style={{
                  flex: 1,
                  backgroundColor: colors.primary,
                  borderRadius: 10,
                  padding: 14,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>서명하기</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push(`/waiver/view?tourId=${tourId}`)}
                style={{
                  flex: 1,
                  backgroundColor: colors.surface,
                  borderRadius: 10,
                  padding: 14,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ color: colors.foreground, fontWeight: "600" }}>서명 목록</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Delete Tour Button */}
      <View style={{ padding: 16 }}>
        <TouchableOpacity
          onPress={() =>
            requirePin(() => {
              Alert.alert("투어 삭제", "정말 삭제하시겠습니까?", [
                { text: "취소" },
                { text: "삭제", style: "destructive", onPress: () => deleteTour.mutate({ id: tourId }) },
              ]);
            })
          }
          style={{
            padding: 14,
            borderRadius: 10,
            backgroundColor: colors.error + "15",
            alignItems: "center",
          }}
        >
          <Text style={{ color: colors.error, fontWeight: "600" }}>투어 삭제</Text>
        </TouchableOpacity>
      </View>

      {/* Expense Form Modal */}
      <Modal visible={showExpenseForm} animationType="slide" transparent>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 }}>
            <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.foreground, marginBottom: 20 }}>
              비용 추가
            </Text>

            <TextInput
              value={expenseForm.name}
              onChangeText={(text) => setExpenseForm({ ...expenseForm, name: text })}
              placeholder="항목명 (예: 숙박비)"
              placeholderTextColor={colors.muted}
              style={{ backgroundColor: colors.background, borderRadius: 8, padding: 12, color: colors.foreground, borderWidth: 1, borderColor: colors.border, marginBottom: 12 }}
            />

            <TextInput
              value={expenseForm.amount}
              onChangeText={(text) => setExpenseForm({ ...expenseForm, amount: text.replace(/[^0-9]/g, "") })}
              placeholder="금액 (원)"
              keyboardType="numeric"
              placeholderTextColor={colors.muted}
              style={{ backgroundColor: colors.background, borderRadius: 8, padding: 12, color: colors.foreground, borderWidth: 1, borderColor: colors.border, marginBottom: 12 }}
            />

            <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 8 }}>결제자 선택</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {tour.participants.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setExpenseForm({ ...expenseForm, paidBy: p.id })}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderRadius: 20,
                    backgroundColor: expenseForm.paidBy === p.id ? colors.primary : colors.background,
                    borderWidth: 1,
                    borderColor: expenseForm.paidBy === p.id ? colors.primary : colors.border,
                  }}
                >
                  <Text style={{ color: expenseForm.paidBy === p.id ? "#fff" : colors.foreground }}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 8 }}>
              분담자 (미선택 시 전체)
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {tour.participants.map((p) => {
                const selected = expenseForm.splitAmong.includes(p.id);
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => {
                      const next = selected
                        ? expenseForm.splitAmong.filter((x) => x !== p.id)
                        : [...expenseForm.splitAmong, p.id];
                      setExpenseForm({ ...expenseForm, splitAmong: next });
                    }}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                      borderRadius: 20,
                      backgroundColor: selected ? colors.success + "20" : colors.background,
                      borderWidth: 1,
                      borderColor: selected ? colors.success : colors.border,
                    }}
                  >
                    <Text style={{ color: selected ? colors.success : colors.foreground }}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => setShowExpenseForm(false)}
                style={{ flex: 1, padding: 14, borderRadius: 10, backgroundColor: colors.background, alignItems: "center" }}
              >
                <Text style={{ color: colors.muted }}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddExpense}
                style={{ flex: 1, padding: 14, borderRadius: 10, backgroundColor: colors.primary, alignItems: "center" }}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>추가</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PIN Modal */}
      <Modal visible={showPinModal} animationType="fade" transparent>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 24, width: 280 }}>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.foreground, textAlign: "center", marginBottom: 16 }}>
              PIN 입력
            </Text>
            <TextInput
              value={pinValue}
              onChangeText={setPinValue}
              placeholder="4자리 PIN"
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
              placeholderTextColor={colors.muted}
              style={{
                backgroundColor: colors.background,
                borderRadius: 8,
                padding: 14,
                textAlign: "center",
                fontSize: 24,
                letterSpacing: 8,
                color: colors.foreground,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 16,
              }}
            />
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => setShowPinModal(false)}
                style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: colors.background, alignItems: "center" }}
              >
                <Text style={{ color: colors.muted }}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={verifyPin}
                style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: colors.primary, alignItems: "center" }}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
