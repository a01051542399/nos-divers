/**
 * 투어 상세 화면
 * 3개 탭: 참여자 / 비용 / 정산
 */
import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  Clipboard,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { useTourDetail, useComments, useProfile, useWaivers } from "../hooks/useSupabase";
import { calculateSettlement, formatKRW, formatDate } from "../store";
import * as db from "../lib/supabase-store";
import type { Expense } from "../types";
import { useRoute, useNavigation } from "@react-navigation/native";
import PinModal from "../components/PinModal";
import { useToast } from "../components/Toast";
import { exportSettlementPDF } from "../utils/export-pdf";
import { exportSettlementExcel } from "../utils/export-excel";
import { useTheme } from "../components/ThemeContext";

type Tab = "participants" | "expenses" | "settlement";

type PinAction = "edit" | "delete" | null;
type ExpensePinAction = "expenseEdit" | "expenseDelete" | null;

export default function TourDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const C = {
    bg: colors.bg,
    card: colors.card,
    border: colors.border,
    text: colors.text,
    muted: colors.muted,
    accent: colors.primary,
    green: colors.success,
    red: colors.error,
    orange: colors.warning,
    tabActive: colors.primary,
    tabInactive: colors.muted,
  };
  const tourId = route.params?.tourId as number;
  const onBack = () => navigation.goBack();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const styles = useMemo(() => makeStyles(C), [colors]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const editStyles = useMemo(() => makeEditStyles(C), [colors]);
  const { tour, loading, refresh } = useTourDetail(tourId);
  const {
    comments,
    loading: commentsLoading,
    addComment,
    removeComment,
  } = useComments(tourId);
  const { profile } = useProfile();
  const { waivers } = useWaivers(tourId);
  const { toast, confirm } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>("participants");
  const [newParticipantName, setNewParticipantName] = useState("");
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  // 비용 카드 펼침
  const [expandedExpenseId, setExpandedExpenseId] = useState<number | null>(null);

  // 비용 PIN 모달
  const [expensePinVisible, setExpensePinVisible] = useState(false);
  const [expensePinError, setExpensePinError] = useState<string | undefined>();
  const [expensePinAction, setExpensePinAction] = useState<ExpensePinAction>(null);
  const [targetExpenseId, setTargetExpenseId] = useState<number | null>(null);

  // 투어 PIN 모달
  const [pinVisible, setPinVisible] = useState(false);
  const [pinError, setPinError] = useState<string | undefined>();
  const [pinAction, setPinAction] = useState<PinAction>(null);

  // 수정 모달
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [saving, setSaving] = useState(false);

  const settlements = useMemo(
    () => (tour ? calculateSettlement(tour) : []),
    [tour],
  );

  const totalExpensesKRW = useMemo(
    () =>
      tour
        ? tour.expenses.reduce(
            (sum, e) => sum + e.amount * (e.exchangeRate || 1),
            0,
          )
        : 0,
    [tour],
  );

  // ─── Handlers ───

  const handleAddParticipant = async () => {
    const name = newParticipantName.trim();
    if (!name || !tour) return;
    setAddingParticipant(true);
    try {
      await db.addParticipant(tour.id, name);
      setNewParticipantName("");
      await refresh();
    } catch (e: any) {
      Alert.alert("오류", e.message || "참여자 추가에 실패했습니다");
    } finally {
      setAddingParticipant(false);
    }
  };

  const handleRemoveParticipant = (pid: number, name: string) => {
    Alert.alert("참여자 삭제", `${name}님을 삭제하시겠습니까?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await db.removeParticipant(tourId, pid);
            await refresh();
          } catch (e: any) {
            Alert.alert("오류", e.message || "삭제에 실패했습니다");
          }
        },
      },
    ]);
  };

  const handleSendComment = async () => {
    const text = commentText.trim();
    if (!text) return;
    const authorName = profile?.name?.trim() || "";
    if (!authorName) {
      Alert.alert("알림", "설정에서 이름을 등록한 후 댓글을 작성할 수 있습니다");
      return;
    }
    setSendingComment(true);
    try {
      await addComment(authorName, text);
      setCommentText("");
    } catch {
      Alert.alert("오류", "댓글 작성에 실패했습니다");
    } finally {
      setSendingComment(false);
    }
  };

  const handleCopyInviteCode = () => {
    if (!tour) return;
    Clipboard.setString(tour.inviteCode);
    Alert.alert("복사됨", "초대코드가 클립보드에 복사되었습니다");
  };

  // ─── 더보기 메뉴 ───

  const handleMorePress = () => {
    Alert.alert("투어 관리", "작업을 선택하세요", [
      {
        text: "투어 정보 수정",
        onPress: () => {
          setPinAction("edit");
          setPinError(undefined);
          setPinVisible(true);
        },
      },
      {
        text: "투어 삭제",
        style: "destructive",
        onPress: () => {
          setPinAction("delete");
          setPinError(undefined);
          setPinVisible(true);
        },
      },
      { text: "취소", style: "cancel" },
    ]);
  };

  // ─── PIN 인증 ───

  const handlePinSubmit = async (pin: string) => {
    if (!tour) return;
    try {
      const ok = await db.verifyTourAccessCode(tour.id, pin);
      if (!ok) {
        setPinError("PIN이 일치하지 않습니다");
        return;
      }
      setPinVisible(false);
      setPinError(undefined);

      if (pinAction === "edit") {
        setEditName(tour.name);
        setEditDate(tour.date || "");
        setEditLocation(tour.location || "");
        setEditModalVisible(true);
      } else if (pinAction === "delete") {
        handleDeleteTour();
      }
    } catch (e: any) {
      setPinError(e.message || "오류가 발생했습니다");
    }
  };

  // ─── 투어 삭제 ───

  const handleDeleteTour = async () => {
    if (!tour) return;
    const confirmed = await confirm(`"${tour.name}" 투어를 삭제하시겠습니까?\n임시보관함에서 7일간 복원 가능합니다.`);
    if (!confirmed) return;
    try {
      await db.softDeleteTour(tour.id);
      toast("투어가 삭제되었습니다", "success");
      navigation.goBack();
    } catch (e: any) {
      toast(e.message || "삭제에 실패했습니다", "error");
    }
  };

  // ─── 비용 액션 (수정/삭제) ───

  const handleExpenseAction = (expense: Expense, action: ExpensePinAction) => {
    setTargetExpenseId(expense.id);
    setExpensePinAction(action);
    setExpensePinError(undefined);
    setExpensePinVisible(true);
  };

  const handleExpensePinSubmit = async (pin: string) => {
    if (!tour) return;
    try {
      const ok = await db.verifyTourAccessCode(tour.id, pin);
      if (!ok) {
        setExpensePinError("PIN이 일치하지 않습니다");
        return;
      }
      setExpensePinVisible(false);
      setExpensePinError(undefined);

      if (expensePinAction === "expenseEdit") {
        const expense = tour.expenses.find((e) => e.id === targetExpenseId);
        if (!expense) return;
        navigation.navigate("AddExpense", {
          tourId: tour.id,
          participants: tour.participants,
          expense,
        });
      } else if (expensePinAction === "expenseDelete") {
        const expense = tour.expenses.find((e) => e.id === targetExpenseId);
        if (!expense) return;
        const confirmed = await confirm(`"${expense.name}" 비용을 삭제하시겠습니까?`);
        if (!confirmed) return;
        try {
          await db.removeExpense(tour.id, expense.id);
          setExpandedExpenseId(null);
          toast("비용이 삭제되었습니다", "success");
          await refresh();
        } catch (e: any) {
          toast(e.message || "삭제에 실패했습니다", "error");
        }
      }
    } catch (e: any) {
      setExpensePinError(e.message || "오류가 발생했습니다");
    }
  };

  // ─── 투어 수정 저장 ───

  const handleEditSave = async () => {
    if (!tour) return;
    if (!editName.trim()) {
      Alert.alert("오류", "투어 이름을 입력해주세요");
      return;
    }
    setSaving(true);
    try {
      await db.editTour(tour.id, {
        name: editName.trim(),
        date: editDate.trim(),
        location: editLocation.trim(),
      });
      toast("투어가 수정되었습니다", "success");
      setEditModalVisible(false);
      await refresh();
    } catch (e: any) {
      toast(e.message || "수정에 실패했습니다", "error");
    } finally {
      setSaving(false);
    }
  };

  const getParticipantName = (pid: number) =>
    tour?.participants.find((p) => p.id === pid)?.name ?? "?";

  const getCurrencySymbol = (currency?: string) => {
    const map: Record<string, string> = {
      KRW: "₩",
      USD: "$",
      PHP: "₱",
      THB: "฿",
      IDR: "Rp",
      JPY: "¥",
    };
    return map[currency || "KRW"] || currency || "₩";
  };

  // ─── Loading / Error ───

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator
          size="large"
          color={C.accent}
          style={{ marginTop: 60 }}
        />
      </SafeAreaView>
    );
  }

  if (!tour) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.mutedText}>투어를 찾을 수 없습니다</Text>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backBtnText}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── 참여자 탭 ───

  const renderParticipantsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* 참여자 추가 */}
      <View style={styles.addRow}>
        <TextInput
          style={styles.addInput}
          placeholder="참여자 이름"
          placeholderTextColor={C.muted}
          value={newParticipantName}
          onChangeText={setNewParticipantName}
          onSubmitEditing={handleAddParticipant}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[
            styles.addBtn,
            (!newParticipantName.trim() || addingParticipant) &&
              styles.addBtnDisabled,
          ]}
          onPress={handleAddParticipant}
          disabled={!newParticipantName.trim() || addingParticipant}
        >
          <Text style={styles.addBtnText}>
            {addingParticipant ? "..." : "추가"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 참여자 목록 */}
      {tour.participants.length === 0 ? (
        <Text style={[styles.mutedText, { textAlign: "center", marginTop: 24 }]}>
          아직 참여자가 없습니다
        </Text>
      ) : (
        tour.participants.map((p) => {
          const hasSigned = waivers.some(
            (w) => w.signerName === p.name,
          );
          return (
            <View key={p.id} style={styles.listItem}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: hasSigned ? "#4CAF50" : "#F85149",
                  marginRight: 10,
                  flexShrink: 0,
                }}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{p.name}</Text>
                {p.addedBy && (
                  <Text style={styles.itemSub}>추가: {p.addedBy}</Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => handleRemoveParticipant(p.id, p.name)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={{ color: C.red, fontSize: 14 }}>삭제</Text>
              </TouchableOpacity>
            </View>
          );
        })
      )}

      {/* 댓글 영역 */}
      <View style={styles.commentSection}>
        <Text style={styles.sectionTitle}>댓글</Text>
        {commentsLoading ? (
          <ActivityIndicator size="small" color={C.muted} />
        ) : comments.length === 0 ? (
          <Text style={[styles.mutedText, { marginBottom: 12 }]}>
            아직 댓글이 없습니다
          </Text>
        ) : (
          comments.map((c) => (
            <View key={c.id} style={styles.commentItem}>
              <View style={styles.commentHeader}>
                <Text style={styles.commentAuthor}>{c.authorName}</Text>
                <Text style={styles.commentTime}>
                  {formatDate(c.createdAt)}
                  {c.edited ? " (수정됨)" : ""}
                </Text>
              </View>
              <Text style={styles.commentText}>{c.text}</Text>
            </View>
          ))
        )}

        {/* 댓글 입력 */}
        {!profile?.name?.trim() ? (
          <Text style={[styles.mutedText, { marginBottom: 16, fontSize: 13 }]}>
            설정에서 이름을 등록하면 댓글을 작성할 수 있습니다
          </Text>
        ) : (
          <View style={styles.commentInputRow}>
            <TextInput
              style={styles.commentInput}
              placeholder="댓글을 입력하세요"
              placeholderTextColor={C.muted}
              value={commentText}
              onChangeText={setCommentText}
              multiline
            />
            <TouchableOpacity
              style={[
                styles.commentSendBtn,
                (!commentText.trim() || sendingComment) &&
                  styles.addBtnDisabled,
              ]}
              onPress={handleSendComment}
              disabled={!commentText.trim() || sendingComment}
            >
              <Text style={styles.addBtnText}>
                {sendingComment ? "..." : "전송"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );

  // ─── 비용 탭 ───

  const renderExpenseItem = (expense: Expense) => {
    const isKRW = !expense.currency || expense.currency === "KRW";
    const symbol = getCurrencySymbol(expense.currency);
    const displayAmount = isKRW
      ? formatKRW(expense.amount)
      : `${symbol}${expense.amount.toLocaleString()}`;
    const krwAmount = expense.amount * (expense.exchangeRate || 1);
    const isExpanded = expandedExpenseId === expense.id;

    const splitNames = expense.splitAmong
      .map((pid) => getParticipantName(pid))
      .join(", ");

    return (
      <View key={expense.id} style={styles.expenseCard}>
        {/* 헤더 행: 탭하면 펼침/접힘 */}
        <TouchableOpacity
          style={styles.expenseCardHeader}
          onPress={() =>
            setExpandedExpenseId(isExpanded ? null : expense.id)
          }
          activeOpacity={0.7}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitle}>{expense.name}</Text>
            <Text style={styles.itemSub}>
              결제: {getParticipantName(expense.paidBy)} | 분배:{" "}
              {expense.splitAmong.length}명
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.itemTitle, { color: C.accent }]}>
              {displayAmount}
            </Text>
            {!isKRW && (
              <Text style={styles.itemSub}>{formatKRW(krwAmount)}</Text>
            )}
            <Text style={[styles.itemSub, { marginTop: 4 }]}>
              {isExpanded ? "▲" : "▼"}
            </Text>
          </View>
        </TouchableOpacity>

        {/* 펼쳐진 상세 */}
        {isExpanded && (
          <View style={styles.expenseDetail}>
            <View style={styles.expenseDetailDivider} />

            <View style={styles.expenseDetailRow}>
              <Text style={styles.expenseDetailLabel}>결제자</Text>
              <Text style={styles.expenseDetailValue}>
                {getParticipantName(expense.paidBy)}
              </Text>
            </View>

            <View style={styles.expenseDetailRow}>
              <Text style={styles.expenseDetailLabel}>분배 대상</Text>
              <Text style={[styles.expenseDetailValue, { flex: 1, textAlign: "right" }]}>
                {splitNames || "-"}
              </Text>
            </View>

            <View style={styles.expenseDetailRow}>
              <Text style={styles.expenseDetailLabel}>분배 방식</Text>
              <Text style={styles.expenseDetailValue}>
                {expense.splitType === "custom" ? "지정 분배" : "균등 분배"}
              </Text>
            </View>

            {!isKRW && (
              <View style={styles.expenseDetailRow}>
                <Text style={styles.expenseDetailLabel}>통화/환율</Text>
                <Text style={styles.expenseDetailValue}>
                  {expense.currency} / 1{expense.currency} = ₩
                  {expense.exchangeRate?.toLocaleString() ?? "1"}
                </Text>
              </View>
            )}

            {expense.createdAt && (
              <View style={styles.expenseDetailRow}>
                <Text style={styles.expenseDetailLabel}>등록일</Text>
                <Text style={styles.expenseDetailValue}>
                  {formatDate(expense.createdAt)}
                </Text>
              </View>
            )}

            {expense.receiptImage && (
              <View style={{ marginTop: 10 }}>
                <Text style={[styles.expenseDetailLabel, { marginBottom: 6 }]}>
                  영수증
                </Text>
                <Image
                  source={{ uri: expense.receiptImage }}
                  style={styles.expenseReceiptThumb}
                  resizeMode="cover"
                />
              </View>
            )}

            {/* 수정 / 삭제 버튼 */}
            <View style={styles.expenseActions}>
              <TouchableOpacity
                style={styles.expenseEditBtn}
                onPress={() => handleExpenseAction(expense, "expenseEdit")}
              >
                <Text style={styles.expenseEditBtnText}>수정</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.expenseDeleteBtn}
                onPress={() => handleExpenseAction(expense, "expenseDelete")}
              >
                <Text style={styles.expenseDeleteBtnText}>삭제</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderExpensesTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* 총 비용 */}
      <View style={styles.summaryCard}>
        <Text style={styles.mutedText}>총 비용</Text>
        <Text style={[styles.summaryAmount, { color: C.accent }]}>
          {formatKRW(totalExpensesKRW)}
        </Text>
        <Text style={styles.mutedText}>
          {tour.expenses.length}건 | {tour.participants.length}명 참여
        </Text>
      </View>

      {/* 비용 추가 버튼 */}
      <TouchableOpacity
        style={styles.addExpenseBtn}
        onPress={() =>
          navigation.navigate("AddExpense", {
            tourId: tour.id,
            participants: tour.participants,
          })
        }
      >
        <Text style={styles.addExpenseBtnText}>+ 비용 추가</Text>
      </TouchableOpacity>

      {/* 비용 목록 */}
      {tour.expenses.length === 0 ? (
        <Text style={[styles.mutedText, { textAlign: "center", marginTop: 24 }]}>
          아직 비용이 없습니다
        </Text>
      ) : (
        tour.expenses.map(renderExpenseItem)
      )}
    </ScrollView>
  );

  // ─── 정산 탭 ───

  const renderSettlementTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* 총 비용 요약 */}
      <View style={styles.summaryCard}>
        <Text style={styles.mutedText}>총 비용</Text>
        <Text style={[styles.summaryAmount, { color: C.green }]}>
          {formatKRW(totalExpensesKRW)}
        </Text>
        {tour.participants.length > 0 && (
          <Text style={styles.mutedText}>
            인당 약 {formatKRW(totalExpensesKRW / tour.participants.length)}
          </Text>
        )}
      </View>

      {/* 정산 내역 */}
      <Text style={styles.sectionTitle}>정산 내역</Text>
      {settlements.length === 0 ? (
        <Text style={[styles.mutedText, { textAlign: "center", marginTop: 16 }]}>
          {tour.expenses.length === 0
            ? "비용을 추가하면 정산이 계산됩니다"
            : "모든 참여자의 정산이 완료되었습니다"}
        </Text>
      ) : (
        settlements.map((s, i) => (
          <View key={i} style={styles.settlementItem}>
            <View style={styles.settlementRow}>
              <Text style={[styles.settlementName, { color: C.red }]}>
                {s.fromName}
              </Text>
              <Text style={styles.settlementArrow}>→</Text>
              <Text style={[styles.settlementName, { color: C.green }]}>
                {s.toName}
              </Text>
            </View>
            <Text style={[styles.settlementAmount, { color: C.accent }]}>
              {formatKRW(s.amount)}
            </Text>
          </View>
        ))
      )}

      {/* 참여자별 잔액 */}
      {tour.participants.length > 0 && tour.expenses.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
            참여자별 상세
          </Text>
          {tour.participants.map((p) => {
            const paid = tour.expenses
              .filter((e) => e.paidBy === p.id)
              .reduce((sum, e) => sum + e.amount * (e.exchangeRate || 1), 0);
            const owed = tour.expenses
              .filter((e) => e.splitAmong.includes(p.id))
              .reduce((sum, e) => {
                const rate = e.exchangeRate || 1;
                if (e.splitType === "custom" && e.splitAmounts) {
                  return sum + (e.splitAmounts[String(p.id)] || 0) * rate;
                }
                return (
                  sum + (e.amount * rate) / e.splitAmong.length
                );
              }, 0);
            const balance = paid - owed;
            return (
              <View key={p.id} style={styles.listItem}>
                <Text style={styles.itemTitle}>{p.name}</Text>
                <View style={{ alignItems: "flex-end" }}>
                  <Text
                    style={{
                      color: balance >= 0 ? C.green : C.red,
                      fontSize: 15,
                      fontWeight: "600",
                    }}
                  >
                    {balance >= 0 ? "+" : ""}
                    {formatKRW(balance)}
                  </Text>
                  <Text style={styles.itemSub}>
                    결제 {formatKRW(paid)} / 부담 {formatKRW(owed)}
                  </Text>
                </View>
              </View>
            );
          })}
        </>
      )}

      {/* 내보내기 버튼 */}
      {tour.expenses.length > 0 && (
        <View style={styles.exportRow}>
          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: "#C62828" }]}
            onPress={async () => {
              try {
                await exportSettlementPDF(tour, settlements);
              } catch (e: any) {
                toast(e?.message || "PDF 내보내기 실패", "error");
              }
            }}
          >
            <Text style={styles.exportBtnText}>PDF 내보내기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: "#1B5E20" }]}
            onPress={async () => {
              try {
                await exportSettlementExcel(tour, settlements);
              } catch (e: any) {
                toast(e?.message || "Excel 내보내기 실패", "error");
              }
            }}
          >
            <Text style={styles.exportBtnText}>Excel 내보내기</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );

  // ─── Main Render ───

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.headerBack}>← 목록</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {tour.name}
        </Text>
        <TouchableOpacity
          onPress={handleMorePress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.headerMoreBtn}
        >
          <Text style={styles.headerMoreText}>···</Text>
        </TouchableOpacity>
      </View>

      {/* 투어 정보 카드 */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>날짜</Text>
          <Text style={styles.infoValue}>{formatDate(tour.date) || tour.date}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>장소</Text>
          <Text style={styles.infoValue}>{tour.location || "-"}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>초대코드</Text>
          <TouchableOpacity onPress={handleCopyInviteCode}>
            <Text style={[styles.infoValue, { color: C.accent }]}>
              {tour.inviteCode} (복사)
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 탭 바 */}
      <View style={styles.tabBar}>
        {(
          [
            { key: "participants", label: `참여자 (${tour.participants.length})` },
            { key: "expenses", label: `비용 (${tour.expenses.length})` },
            { key: "settlement", label: "정산" },
          ] as { key: Tab; label: string }[]
        ).map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabItem,
              activeTab === tab.key && styles.tabItemActive,
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 탭 내용 */}
      {activeTab === "participants" && renderParticipantsTab()}
      {activeTab === "expenses" && renderExpensesTab()}
      {activeTab === "settlement" && renderSettlementTab()}

      {/* 투어 PIN 모달 */}
      <PinModal
        visible={pinVisible}
        title={pinAction === "edit" ? "수정 PIN 입력" : "삭제 PIN 입력"}
        onSubmit={handlePinSubmit}
        onCancel={() => {
          setPinVisible(false);
          setPinError(undefined);
        }}
        error={pinError}
      />

      {/* 비용 PIN 모달 */}
      <PinModal
        visible={expensePinVisible}
        title={expensePinAction === "expenseEdit" ? "비용 수정 PIN 입력" : "비용 삭제 PIN 입력"}
        onSubmit={handleExpensePinSubmit}
        onCancel={() => {
          setExpensePinVisible(false);
          setExpensePinError(undefined);
        }}
        error={expensePinError}
      />

      {/* 투어 수정 모달 */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={editStyles.overlay}
        >
          <View style={editStyles.card}>
            <Text style={editStyles.title}>투어 수정</Text>

            <Text style={editStyles.label}>투어 이름 *</Text>
            <TextInput
              style={editStyles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="투어 이름"
              placeholderTextColor={C.muted}
            />

            <Text style={editStyles.label}>날짜 (YYMMDD)</Text>
            <TextInput
              style={editStyles.input}
              value={editDate}
              onChangeText={setEditDate}
              placeholder="예: 250315"
              placeholderTextColor={C.muted}
              keyboardType="numeric"
              maxLength={6}
            />

            <Text style={editStyles.label}>장소</Text>
            <TextInput
              style={editStyles.input}
              value={editLocation}
              onChangeText={setEditLocation}
              placeholder="예: 제주도"
              placeholderTextColor={C.muted}
            />

            <View style={editStyles.buttons}>
              <TouchableOpacity
                style={editStyles.cancelBtn}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={editStyles.cancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[editStyles.saveBtn, saving && editStyles.btnDisabled]}
                onPress={handleEditSave}
                disabled={saving}
              >
                <Text style={editStyles.saveText}>{saving ? "저장 중..." : "저장"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles helper ───

function makeStyles(C: {
  bg: string; card: string; border: string; text: string; muted: string;
  accent: string; green: string; red: string; orange: string;
  tabActive: string; tabInactive: string;
}) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerBack: {
    color: C.accent,
    fontSize: 16,
  },
  headerTitle: {
    color: C.text,
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  headerMoreBtn: {
    paddingLeft: 8,
    paddingVertical: 2,
    minWidth: 50,
    alignItems: "flex-end",
  },
  headerMoreText: {
    color: C.muted,
    fontSize: 18,
    letterSpacing: 1,
  },

  // Info card
  infoCard: {
    margin: 12,
    padding: 14,
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  infoLabel: {
    color: C.muted,
    fontSize: 14,
  },
  infoValue: {
    color: C.text,
    fontSize: 14,
    fontWeight: "500",
  },

  // Tab bar
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabItemActive: {
    borderBottomColor: C.tabActive,
  },
  tabText: {
    color: C.tabInactive,
    fontSize: 14,
    fontWeight: "500",
  },
  tabTextActive: {
    color: C.tabActive,
    fontWeight: "700",
  },

  // Tab content
  tabContent: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
  },

  // Add participant row
  addRow: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 8,
  },
  addInput: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    color: C.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  addBtn: {
    backgroundColor: C.accent,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  addBtnDisabled: {
    opacity: 0.4,
  },
  addBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  // List items
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 8,
  },
  itemTitle: {
    color: C.text,
    fontSize: 15,
    fontWeight: "600",
  },
  itemSub: {
    color: C.muted,
    fontSize: 12,
    marginTop: 2,
  },

  // Summary card
  summaryCard: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  summaryAmount: {
    fontSize: 28,
    fontWeight: "800",
    marginVertical: 4,
  },

  // Section title
  sectionTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 10,
  },

  // Settlement
  settlementItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.card,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 8,
  },
  settlementRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  settlementName: {
    fontSize: 15,
    fontWeight: "600",
  },
  settlementArrow: {
    color: C.muted,
    fontSize: 16,
  },
  settlementAmount: {
    fontSize: 16,
    fontWeight: "700",
  },

  // Export buttons
  exportRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 24,
    marginBottom: 8,
  },
  exportBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  exportBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  // Comments
  commentSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  commentItem: {
    backgroundColor: C.card,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 8,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  commentAuthor: {
    color: C.accent,
    fontSize: 13,
    fontWeight: "600",
  },
  commentTime: {
    color: C.muted,
    fontSize: 11,
  },
  commentText: {
    color: C.text,
    fontSize: 14,
    lineHeight: 20,
  },
  commentInputRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    marginBottom: 24,
  },
  commentInput: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    color: C.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 80,
  },
  commentSendBtn: {
    backgroundColor: C.accent,
    borderRadius: 8,
    paddingHorizontal: 14,
    justifyContent: "center",
  },

  // Expense card (expandable)
  expenseCard: {
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 8,
    overflow: "hidden",
  },
  expenseCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  expenseDetail: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  expenseDetailDivider: {
    height: 1,
    backgroundColor: C.border,
    marginBottom: 10,
  },
  expenseDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  expenseDetailLabel: {
    color: C.muted,
    fontSize: 12,
    fontWeight: "600",
    minWidth: 60,
  },
  expenseDetailValue: {
    color: C.text,
    fontSize: 13,
    fontWeight: "500",
  },
  expenseReceiptThumb: {
    width: "100%",
    height: 140,
    borderRadius: 8,
  },
  expenseActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  expenseEditBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.accent,
    alignItems: "center",
  },
  expenseEditBtnText: {
    color: C.accent,
    fontSize: 14,
    fontWeight: "700",
  },
  expenseDeleteBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.red,
    alignItems: "center",
  },
  expenseDeleteBtnText: {
    color: C.red,
    fontSize: 14,
    fontWeight: "700",
  },

  // Add expense button
  addExpenseBtn: {
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 14,
  },
  addExpenseBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },

  // Misc
  mutedText: {
    color: C.muted,
    fontSize: 14,
  },
  backBtn: {
    marginTop: 16,
    backgroundColor: C.accent,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backBtnText: {
    color: "#fff",
    fontWeight: "700",
  },
});
}

function makeEditStyles(C: {
  bg: string; card: string; border: string; text: string; muted: string;
  accent: string;
}) {
  return StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: C.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: C.text,
    marginBottom: 20,
    textAlign: "center",
  },
  label: {
    fontSize: 13,
    color: C.muted,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: C.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: C.text,
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.border,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: C.muted,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.accent,
    alignItems: "center",
  },
  saveText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
}
