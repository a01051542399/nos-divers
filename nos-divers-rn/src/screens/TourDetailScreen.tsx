/**
 * 투어 상세 화면
 * 3개 탭: 참여자 / 비용 / 정산
 */
import React, { useState, useMemo } from "react";
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
} from "react-native";
import { useTourDetail, useComments } from "../hooks/useSupabase";
import { calculateSettlement, formatKRW, formatDate } from "../store";
import * as db from "../lib/supabase-store";
import type { Expense } from "../types";
import { useRoute, useNavigation } from "@react-navigation/native";

// ─── Colors (다크 테마) ───

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
  tabActive: "#58A6FF",
  tabInactive: "#8B949E",
};

type Tab = "participants" | "expenses" | "settlement";

export default function TourDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const tourId = route.params?.tourId as number;
  const onBack = () => navigation.goBack();
  const { tour, loading, refresh } = useTourDetail(tourId);
  const {
    comments,
    loading: commentsLoading,
    addComment,
    removeComment,
  } = useComments(tourId);

  const [activeTab, setActiveTab] = useState<Tab>("participants");
  const [newParticipantName, setNewParticipantName] = useState("");
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

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
    setSendingComment(true);
    try {
      // TODO: 실제 사용자 이름으로 교체
      await addComment("나", text);
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
        tour.participants.map((p) => (
          <View key={p.id} style={styles.listItem}>
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
        ))
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

    return (
      <View key={expense.id} style={styles.listItem}>
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
        </View>
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
        <View style={{ width: 50 }} />
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
    </SafeAreaView>
  );
}

// ─── Styles ───

const styles = StyleSheet.create({
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
