import { useState, useMemo, useCallback } from "react";
import {
  Text,
  View,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  StyleSheet,
  KeyboardAvoidingView,
  ActivityIndicator,
  Share,
  Alert,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { trpc } from "@/lib/trpc";
import * as Store from "@/lib/store";
import type { Tour, Settlement, Expense } from "@/lib/types";

const SCREEN_WIDTH = Dimensions.get("window").width;

type TabKey = "participants" | "expenses" | "settlement" | "waiver";

const TAB_CONFIG: { key: TabKey; label: string; icon: string }[] = [
  { key: "participants", label: "참여자", icon: "person.2.fill" },
  { key: "expenses", label: "비용", icon: "dollarsign.circle.fill" },
  { key: "settlement", label: "정산", icon: "checkmark.circle.fill" },
  { key: "waiver", label: "동의서", icon: "doc.text.fill" },
];

function showAlert(title: string, message: string) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

// ===== Waiver Tab Content =====
function WaiverTabContent({ tourId, tourName, colors, router }: { tourId: number; tourName: string; colors: any; router: any }) {
  const waiversQuery = trpc.waiver.listByTour.useQuery(
    { tourId },
    { enabled: !!tourId }
  );
  const waivers = waiversQuery.data || [];

  return (
    <View style={{ flex: 1 }}>
      {/* 서명하기 버튼 */}
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        onPress={() => router.push(`/waiver/sign?tourId=${tourId}&tourName=${encodeURIComponent(tourName)}` as any)}
        activeOpacity={0.8}
      >
        <IconSymbol name="pencil.and.list.clipboard" size={18} color="#FFFFFF" />
        <Text style={styles.addButtonText}>면책동의서 서명하기</Text>
      </TouchableOpacity>

      {waiversQuery.isLoading ? (
        <View style={{ paddingVertical: 40, alignItems: "center" }}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : waivers.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol name="doc.text.fill" size={40} color={colors.muted} />
          <Text style={[styles.emptyText, { color: colors.muted }]}>아직 서명된 동의서가 없습니다</Text>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {waivers.map((w: any) => (
            <TouchableOpacity
              key={w.id}
              style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push(`/waiver/view?tourId=${tourId}&tourName=${encodeURIComponent(tourName)}` as any)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={[styles.iconBadge, { backgroundColor: colors.success + "15" }]}>
                  <IconSymbol name="checkmark.shield.fill" size={18} color={colors.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.listCardTitle, { color: colors.foreground }]}>{w.signerName}</Text>
                  <Text style={[styles.listCardSub, { color: colors.muted }]}>
                    {w.signedAt ? new Date(w.signedAt).toLocaleDateString("ko-KR") : "서명 완료"}
                  </Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color={colors.muted} />
              </View>
            </TouchableOpacity>
          ))}
          <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 4 }}>
            총 {waivers.length}명 서명 완료
          </Text>
        </View>
      )}
    </View>
  );
}

export default function TourDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tourId = Number(id);
  const colors = useColors();
  const router = useRouter();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabKey>("participants");

  // 참여자 추가
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState("");

  // 비용 추가
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseName, setExpenseName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expensePaidBy, setExpensePaidBy] = useState<number | null>(null);
  const [expenseSplitAmong, setExpenseSplitAmong] = useState<number[]>([]);
  const [splitType, setSplitType] = useState<"equal" | "custom">("equal");
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});

  const utils = trpc.useUtils();
  const tourQuery = trpc.tour.getById.useQuery({ id: tourId }, { enabled: !!tourId });
  const addParticipantMutation = trpc.participant.add.useMutation({
    onSuccess: () => {
      utils.tour.getById.invalidate({ id: tourId });
      setNewParticipantName("");
      setShowParticipantModal(false);
    },
  });
  const removeParticipantMutation = trpc.participant.remove.useMutation({
    onSuccess: () => {
      utils.tour.getById.invalidate({ id: tourId });
      tourQuery.refetch();
    },
  });
  const addExpenseMutation = trpc.expense.add.useMutation({
    onSuccess: () => {
      utils.tour.getById.invalidate({ id: tourId });
      setShowExpenseModal(false);
    },
  });
  const removeExpenseMutation = trpc.expense.remove.useMutation({
    onSuccess: () => {
      utils.tour.getById.invalidate({ id: tourId });
      tourQuery.refetch();
    },
  });

  const tour = tourQuery.data as Tour | null | undefined;

  // 정산 계산 - tour 데이터 변경 시 자동 재계산
  const settlements = useMemo(() => {
    if (!tour) return [];
    return Store.calculateSettlement(tour);
  }, [tour]);

  const totalExpense = useMemo(() => {
    return tour?.expenses.reduce((sum, e) => sum + e.amount, 0) || 0;
  }, [tour]);

  const handleAddParticipant = () => {
    if (!newParticipantName.trim()) return;
    addParticipantMutation.mutate({ tourId, name: newParticipantName.trim() });
  };

  // 참여자 삭제 - PIN 없이 자유롭게
  const handleRemoveParticipant = (participantId: number) => {
    const participantName = tour?.participants.find(p => p.id === participantId)?.name || "";
    if (Platform.OS === "web") {
      if (window.confirm(`"${participantName}" 참여자를 삭제하시겠습니까?`)) {
        removeParticipantMutation.mutate({ id: participantId });
      }
    } else {
      Alert.alert(
        "참여자 삭제",
        `"${participantName}" 참여자를 삭제하시겠습니까?`,
        [
          { text: "취소", style: "cancel" },
          { text: "삭제", style: "destructive", onPress: () => removeParticipantMutation.mutate({ id: participantId }) },
        ]
      );
    }
  };

  const openExpenseModal = () => {
    if (!tour || tour.participants.length === 0) {
      showAlert("알림", "먼저 참여자를 추가해주세요.");
      return;
    }
    setExpenseName("");
    setExpenseAmount("");
    setExpensePaidBy(tour.participants[0]?.id ?? null);
    setExpenseSplitAmong(tour.participants.map((p) => p.id));
    setSplitType("equal");
    setCustomAmounts({});
    setShowExpenseModal(true);
  };

  const handleAddExpense = () => {
    if (!expenseName.trim() || !expenseAmount || !expensePaidBy) return;
    const amount = parseInt(expenseAmount.replace(/[^0-9]/g, ""), 10);
    if (isNaN(amount) || amount <= 0) return;

    if (splitType === "custom") {
      const amounts: Record<string, number> = {};
      let total = 0;
      expenseSplitAmong.forEach((pid) => {
        const val = parseInt(customAmounts[String(pid)] || "0", 10);
        amounts[String(pid)] = val;
        total += val;
      });
      if (total !== amount) {
        showAlert("금액 불일치", `개별 금액 합계(${Store.formatCurrency(total)})가 총 금액(${Store.formatCurrency(amount)})과 일치하지 않습니다.`);
        return;
      }
      addExpenseMutation.mutate({
        tourId,
        name: expenseName.trim(),
        amount,
        paidBy: expensePaidBy,
        splitAmong: expenseSplitAmong,
        splitType: "custom",
        splitAmounts: amounts,
      });
    } else {
      addExpenseMutation.mutate({
        tourId,
        name: expenseName.trim(),
        amount,
        paidBy: expensePaidBy,
        splitAmong: expenseSplitAmong,
        splitType: "equal",
      });
    }
  };

  // 비용 삭제 - PIN 없이 자유롭게
  const handleRemoveExpense = (expenseId: number) => {
    const expenseName = tour?.expenses.find(e => e.id === expenseId)?.name || "";
    if (Platform.OS === "web") {
      if (window.confirm(`"${expenseName}" 비용을 삭제하시겠습니까?`)) {
        removeExpenseMutation.mutate({ id: expenseId });
      }
    } else {
      Alert.alert(
        "비용 삭제",
        `"${expenseName}" 비용을 삭제하시겠습니까?`,
        [
          { text: "취소", style: "cancel" },
          { text: "삭제", style: "destructive", onPress: () => removeExpenseMutation.mutate({ id: expenseId }) },
        ]
      );
    }
  };

  const toggleSplitParticipant = (pid: number) => {
    setExpenseSplitAmong((prev) =>
      prev.includes(pid) ? prev.filter((p) => p !== pid) : [...prev, pid]
    );
  };

  const getParticipantName = (pid: number) => {
    return tour?.participants.find((p) => p.id === pid)?.name || "알 수 없음";
  };

  const handleShareInvite = async () => {
    if (!tour) return;
    const message = `🤿 nos divers 다이빙 투어 초대!\n\n투어: ${tour.name}\n날짜: ${tour.date || "미정"}\n장소: ${tour.location || "미정"}\n\n초대 코드: ${tour.inviteCode}\n\n앱에서 초대 코드를 입력하여 참여하세요!`;
    if (Platform.OS === "web") {
      try {
        await navigator.clipboard.writeText(message);
        showAlert("복사 완료", "초대 메시지가 클립보드에 복사되었습니다!");
      } catch {
        window.prompt("아래 메시지를 복사하세요:", message);
      }
    } else {
      Share.share({ message });
    }
  };

  if (tourQuery.isLoading) {
    return (
      <ScreenContainer edges={["top", "left", "right"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (!tour) {
    return (
      <ScreenContainer edges={["top", "left", "right"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.muted }]}>투어를 찾을 수 없습니다</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: colors.primary, fontSize: 16 }}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  // ===== Tab Content Renderers =====

  const renderParticipantsTab = () => (
    <ScrollView contentContainerStyle={styles.tabScrollContent} showsVerticalScrollIndicator={false}>
      {/* 참여자 추가 버튼 */}
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        onPress={() => setShowParticipantModal(true)}
        activeOpacity={0.8}
      >
        <IconSymbol name="plus.circle.fill" size={18} color="#FFFFFF" />
        <Text style={styles.addButtonText}>참여자 추가</Text>
      </TouchableOpacity>

      {tour.participants.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol name="person.2.fill" size={40} color={colors.muted} />
          <Text style={[styles.emptyText, { color: colors.muted }]}>참여자를 추가하거나 초대 코드를 공유하세요</Text>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {tour.participants.map((p) => (
            <View
              key={p.id}
              style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={[styles.iconBadge, { backgroundColor: colors.primary + "15" }]}>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: colors.primary }}>
                    {p.name.charAt(0)}
                  </Text>
                </View>
                <Text style={[styles.listCardTitle, { color: colors.foreground, flex: 1 }]}>{p.name}</Text>
                <TouchableOpacity
                  onPress={() => handleRemoveParticipant(p.id)}
                  style={styles.deleteIconBtn}
                  activeOpacity={0.6}
                >
                  <IconSymbol name="xmark.circle.fill" size={20} color={colors.muted} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 8 }}>
            총 {tour.participants.length}명
          </Text>
        </View>
      )}
      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderExpensesTab = () => (
    <ScrollView contentContainerStyle={styles.tabScrollContent} showsVerticalScrollIndicator={false}>
      {/* 비용 추가 버튼 */}
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        onPress={openExpenseModal}
        activeOpacity={0.8}
      >
        <IconSymbol name="plus.circle.fill" size={18} color="#FFFFFF" />
        <Text style={styles.addButtonText}>비용 추가</Text>
      </TouchableOpacity>

      {/* 총 비용 요약 */}
      {tour.expenses.length > 0 && (
        <View style={[styles.summaryCard, { backgroundColor: colors.primary + "08", borderColor: colors.primary + "20" }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>총 비용</Text>
            <Text style={[styles.summaryValue, { color: colors.primary }]}>{Store.formatCurrency(totalExpense)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>비용 항목</Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{tour.expenses.length}건</Text>
          </View>
          {tour.participants.length > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.muted }]}>1인 평균</Text>
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                {Store.formatCurrency(Math.round(totalExpense / tour.participants.length))}
              </Text>
            </View>
          )}
        </View>
      )}

      {tour.expenses.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol name="dollarsign.circle.fill" size={40} color={colors.muted} />
          <Text style={[styles.emptyText, { color: colors.muted }]}>비용 항목을 추가해주세요</Text>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {tour.expenses.map((expense) => (
            <View
              key={expense.id}
              style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.expenseHeader}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={[styles.listCardTitle, { color: colors.foreground }]}>{expense.name}</Text>
                    {expense.splitType === "custom" && (
                      <View style={{ backgroundColor: colors.warning + "20", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ color: colors.warning, fontSize: 10, fontWeight: "600" }}>커스텀</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.listCardSub, { color: colors.muted }]}>
                    결제: {getParticipantName(expense.paidBy)}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  <Text style={[styles.expenseAmountText, { color: colors.primary }]}>
                    {Store.formatCurrency(expense.amount)}
                  </Text>
                  <TouchableOpacity onPress={() => handleRemoveExpense(expense.id)} activeOpacity={0.6}>
                    <IconSymbol name="trash.fill" size={16} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={[styles.splitInfo, { borderTopColor: colors.border + "40" }]}>
                {expense.splitType === "custom" && expense.splitAmounts ? (
                  <View style={{ flex: 1, gap: 2 }}>
                    {expense.splitAmong.map((pid) => (
                      <Text key={pid} style={{ fontSize: 12, color: colors.muted }}>
                        {getParticipantName(pid)}: {Store.formatCurrency(expense.splitAmounts?.[String(pid)] ?? 0)}
                      </Text>
                    ))}
                  </View>
                ) : (
                  <>
                    <Text style={[styles.splitLabel, { color: colors.muted }]}>
                      분담: {expense.splitAmong.map((pid) => getParticipantName(pid)).join(", ")}
                    </Text>
                    <Text style={[styles.splitAmount, { color: colors.muted }]}>
                      (1인 {Store.formatCurrency(Math.round(expense.amount / expense.splitAmong.length))})
                    </Text>
                  </>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderSettlementTab = () => (
    <ScrollView contentContainerStyle={styles.tabScrollContent} showsVerticalScrollIndicator={false}>
      {/* 요약 카드 */}
      <View style={[styles.summaryCard, { backgroundColor: colors.success + "08", borderColor: colors.success + "20" }]}>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.muted }]}>총 비용</Text>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>{Store.formatCurrency(totalExpense)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.muted }]}>참여자</Text>
          <Text style={[styles.summaryValue, { color: colors.foreground }]}>{tour.participants.length}명</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.muted }]}>정산 건수</Text>
          <Text style={[styles.summaryValue, { color: colors.success }]}>{settlements.length}건</Text>
        </View>
      </View>

      {settlements.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol name="checkmark.circle.fill" size={40} color={colors.muted} />
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            {tour.expenses.length === 0 ? "비용 항목을 먼저 추가해주세요" : "정산할 내역이 없습니다"}
          </Text>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          <Text style={[styles.sectionSubtitle, { color: colors.foreground }]}>송금 내역</Text>
          {settlements.map((s, idx) => (
            <View
              key={idx}
              style={[styles.settlementCard, { backgroundColor: colors.success + "08", borderColor: colors.success + "25" }]}
            >
              <View style={styles.settlementRow}>
                <View style={[styles.iconBadge, { backgroundColor: colors.error + "15" }]}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: colors.error }}>보냄</Text>
                </View>
                <Text style={[styles.settlementName, { color: colors.foreground }]}>{s.fromName}</Text>
                <IconSymbol name="arrow.right" size={16} color={colors.success} />
                <Text style={[styles.settlementName, { color: colors.foreground }]}>{s.toName}</Text>
                <View style={[styles.iconBadge, { backgroundColor: colors.success + "15" }]}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: colors.success }}>받음</Text>
                </View>
              </View>
              <Text style={[styles.settlementAmount, { color: colors.success }]}>
                {Store.formatCurrency(s.amount)}
              </Text>
            </View>
          ))}

          {/* 참여자별 정산 요약 */}
          <Text style={[styles.sectionSubtitle, { color: colors.foreground, marginTop: 16 }]}>참여자별 요약</Text>
          {tour.participants.map((p) => {
            const totalPaid = tour.expenses
              .filter((e) => e.paidBy === p.id)
              .reduce((sum, e) => sum + e.amount, 0);
            const totalOwed = tour.expenses.reduce((sum, e) => {
              if (!e.splitAmong.includes(p.id)) return sum;
              if (e.splitType === "custom" && e.splitAmounts) {
                return sum + (e.splitAmounts[String(p.id)] ?? 0);
              }
              return sum + Math.round(e.amount / e.splitAmong.length);
            }, 0);
            const balance = totalPaid - totalOwed;
            return (
              <View
                key={p.id}
                style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.listCardTitle, { color: colors.foreground }]}>{p.name}</Text>
                    <Text style={[styles.listCardSub, { color: colors.muted }]}>
                      결제: {Store.formatCurrency(totalPaid)} / 부담: {Store.formatCurrency(totalOwed)}
                    </Text>
                  </View>
                  <Text style={[
                    styles.balanceText,
                    { color: balance > 0 ? colors.success : balance < 0 ? colors.error : colors.muted }
                  ]}>
                    {balance > 0 ? `+${Store.formatCurrency(balance)}` : balance < 0 ? `-${Store.formatCurrency(Math.abs(balance))}` : "±₩0"}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
      <View style={{ height: 100 }} />
    </ScrollView>
  );

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <IconSymbol name="chevron.right" size={24} color={colors.primary} style={{ transform: [{ scaleX: -1 }] }} />
          <Text style={[styles.backText, { color: colors.primary }]}>뒤로</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleShareInvite} style={[styles.shareBtn, { backgroundColor: colors.primary + "15" }]} activeOpacity={0.7}>
          <IconSymbol name="paperplane.fill" size={16} color={colors.primary} />
          <Text style={[styles.shareText, { color: colors.primary }]}>초대</Text>
        </TouchableOpacity>
      </View>

      {/* 투어 정보 카드 */}
      <View style={{ paddingHorizontal: 16 }}>
        <View style={[styles.infoCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.tourName}>{tour.name}</Text>
          <View style={styles.tourMeta}>
            <View style={styles.tourMetaItem}>
              <IconSymbol name="calendar" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.tourMetaText}>{Store.formatDate(tour.date) || "날짜 미정"}</Text>
            </View>
            {tour.location ? (
              <View style={styles.tourMetaItem}>
                <IconSymbol name="mappin.and.ellipse" size={14} color="rgba(255,255,255,0.8)" />
                <Text style={styles.tourMetaText}>{tour.location}</Text>
              </View>
            ) : null}
          </View>
          <View style={[styles.inviteCodeRow, { backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10, padding: 8 }]}>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>초대 코드</Text>
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "800", letterSpacing: 2 }}>{tour.inviteCode}</Text>
          </View>
        </View>
      </View>

      {/* 탭 바 */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {TAB_CONFIG.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabItem, isActive && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <IconSymbol
                name={tab.icon}
                size={18}
                color={isActive ? colors.primary : colors.muted}
              />
              <Text style={[
                styles.tabLabel,
                { color: isActive ? colors.primary : colors.muted },
                isActive && { fontWeight: "700" },
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 탭 컨텐츠 */}
      <View style={{ flex: 1 }}>
        {activeTab === "participants" && renderParticipantsTab()}
        {activeTab === "expenses" && renderExpensesTab()}
        {activeTab === "settlement" && renderSettlementTab()}
        {activeTab === "waiver" && (
          <ScrollView contentContainerStyle={styles.tabScrollContent} showsVerticalScrollIndicator={false}>
            <WaiverTabContent tourId={tourId} tourName={tour.name} colors={colors} router={router} />
            <View style={{ height: 100 }} />
          </ScrollView>
        )}
      </View>

      {/* 참여자 추가 모달 */}
      <Modal visible={showParticipantModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>참여자 추가</Text>
                <TouchableOpacity onPress={() => setShowParticipantModal(false)} activeOpacity={0.6}>
                  <IconSymbol name="xmark.circle.fill" size={28} color={colors.muted} />
                </TouchableOpacity>
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.foreground }]}>이름 *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                  placeholder="참여자 이름"
                  placeholderTextColor={colors.muted}
                  value={newParticipantName}
                  onChangeText={setNewParticipantName}
                  returnKeyType="done"
                  onSubmitEditing={handleAddParticipant}
                  autoFocus
                />
              </View>
              <TouchableOpacity
                style={[styles.createButton, { backgroundColor: newParticipantName.trim() ? colors.primary : colors.muted }]}
                onPress={handleAddParticipant}
                disabled={!newParticipantName.trim() || addParticipantMutation.isPending}
                activeOpacity={0.8}
              >
                <Text style={styles.createButtonText}>
                  {addParticipantMutation.isPending ? "추가 중..." : "추가"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 비용 추가 모달 */}
      <Modal visible={showExpenseModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface, maxHeight: "85%" }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>비용 추가</Text>
                <TouchableOpacity onPress={() => setShowExpenseModal(false)} activeOpacity={0.6}>
                  <IconSymbol name="xmark.circle.fill" size={28} color={colors.muted} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.foreground }]}>비용 이름 *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                    placeholder="예: 보트비, 숙박비, 식비"
                    placeholderTextColor={colors.muted}
                    value={expenseName}
                    onChangeText={setExpenseName}
                    returnKeyType="next"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.foreground }]}>총 금액 (원) *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                    placeholder="예: 300000"
                    placeholderTextColor={colors.muted}
                    value={expenseAmount}
                    onChangeText={setExpenseAmount}
                    keyboardType="numeric"
                    returnKeyType="next"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.foreground }]}>결제자 *</Text>
                  <View style={styles.chipContainer}>
                    {tour.participants.map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        style={[
                          styles.selectChip,
                          {
                            backgroundColor: expensePaidBy === p.id ? colors.primary : colors.background,
                            borderColor: expensePaidBy === p.id ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => setExpensePaidBy(p.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.selectChipText, { color: expensePaidBy === p.id ? "#FFFFFF" : colors.foreground }]}>
                          {p.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* 정산 방식 선택 */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.foreground }]}>정산 방식</Text>
                  <View style={[styles.chipContainer, { marginBottom: 8 }]}>
                    <TouchableOpacity
                      style={[styles.selectChip, {
                        backgroundColor: splitType === "equal" ? colors.primary : colors.background,
                        borderColor: splitType === "equal" ? colors.primary : colors.border,
                        paddingHorizontal: 20,
                      }]}
                      onPress={() => setSplitType("equal")}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.selectChipText, { color: splitType === "equal" ? "#FFFFFF" : colors.foreground }]}>
                        균등 분배 (N/1)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.selectChip, {
                        backgroundColor: splitType === "custom" ? colors.warning : colors.background,
                        borderColor: splitType === "custom" ? colors.warning : colors.border,
                        paddingHorizontal: 20,
                      }]}
                      onPress={() => setSplitType("custom")}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.selectChipText, { color: splitType === "custom" ? "#FFFFFF" : colors.foreground }]}>
                        금액 직접 입력
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.foreground }]}>
                    분담 대상 ({expenseSplitAmong.length}명)
                  </Text>
                  <View style={styles.chipContainer}>
                    {tour.participants.map((p) => {
                      const selected = expenseSplitAmong.includes(p.id);
                      return (
                        <TouchableOpacity
                          key={p.id}
                          style={[
                            styles.selectChip,
                            {
                              backgroundColor: selected ? colors.primary : colors.background,
                              borderColor: selected ? colors.primary : colors.border,
                            },
                          ]}
                          onPress={() => toggleSplitParticipant(p.id)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.selectChipText, { color: selected ? "#FFFFFF" : colors.foreground }]}>
                            {p.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* 커스텀 금액 입력 */}
                {splitType === "custom" && expenseSplitAmong.length > 0 && (
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.foreground }]}>참여자별 금액 입력</Text>
                    {expenseSplitAmong.map((pid) => {
                      const p = tour.participants.find((pp) => pp.id === pid);
                      return (
                        <View key={pid} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "500", width: 70 }}>{p?.name}</Text>
                          <TextInput
                            style={[styles.input, { flex: 1, backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                            placeholder="금액"
                            placeholderTextColor={colors.muted}
                            value={customAmounts[String(pid)] || ""}
                            onChangeText={(val) => setCustomAmounts((prev) => ({ ...prev, [String(pid)]: val }))}
                            keyboardType="numeric"
                          />
                          <Text style={{ color: colors.muted, fontSize: 13 }}>원</Text>
                        </View>
                      );
                    })}
                    {expenseAmount ? (
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                        <Text style={{ color: colors.muted, fontSize: 12 }}>
                          입력 합계: {Store.formatCurrency(
                            expenseSplitAmong.reduce((sum, pid) => sum + (parseInt(customAmounts[String(pid)] || "0", 10) || 0), 0)
                          )}
                        </Text>
                        <Text style={{ color: colors.muted, fontSize: 12 }}>
                          총 금액: {Store.formatCurrency(parseInt(expenseAmount.replace(/[^0-9]/g, ""), 10) || 0)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                )}
              </ScrollView>

              <TouchableOpacity
                style={[
                  styles.createButton,
                  {
                    backgroundColor:
                      expenseName.trim() && expenseAmount && expensePaidBy && expenseSplitAmong.length > 0
                        ? colors.primary
                        : colors.muted,
                  },
                ]}
                onPress={handleAddExpense}
                disabled={!expenseName.trim() || !expenseAmount || !expensePaidBy || expenseSplitAmong.length === 0 || addExpenseMutation.isPending}
                activeOpacity={0.8}
              >
                <Text style={styles.createButtonText}>
                  {addExpenseMutation.isPending ? "추가 중..." : "비용 추가"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  shareText: {
    fontSize: 14,
    fontWeight: "600",
  },
  infoCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  tourName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  tourMeta: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  tourMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  tourMetaText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
  },
  inviteCodeRow: {
    alignItems: "center",
    gap: 2,
    marginBottom: 10,
  },
  // Tab bar
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  tabScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  // Add button
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 16,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  // Summary card
  summaryCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    gap: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "700",
  },
  // List card
  listCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  listCardTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  listCardSub: {
    fontSize: 13,
    marginTop: 2,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteIconBtn: {
    padding: 4,
  },
  // Empty state
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
  // Expense specific
  expenseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  expenseAmountText: {
    fontSize: 16,
    fontWeight: "700",
  },
  splitInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  splitLabel: {
    fontSize: 12,
    flex: 1,
  },
  splitAmount: {
    fontSize: 12,
    fontWeight: "600",
  },
  // Settlement
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  settlementCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  settlementRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  settlementName: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  settlementAmount: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "right",
  },
  balanceText: {
    fontSize: 15,
    fontWeight: "700",
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  inputGroup: {
    marginBottom: 16,
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
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  selectChipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  createButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
