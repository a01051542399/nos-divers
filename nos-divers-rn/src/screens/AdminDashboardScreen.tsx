import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../components/ThemeContext";
import { useToast } from "../components/Toast";
import * as db from "../lib/supabase-store";
import type { Tour, Waiver } from "../types";

// ─── Types ───────────────────────────────────────────────────────────────────

type TabKey = "stats" | "tours" | "waivers" | "backup";

interface DataStats {
  tourCount: number;
  participantCount: number;
  expenseCount: number;
  waiverCount: number;
  commentCount: number;
  totalExpenseKRW: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatKRW(amount: number): string {
  return "₩" + Math.round(amount).toLocaleString("ko-KR");
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
  } catch {
    return dateStr;
  }
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  color: string;
  icon: string;
}

function StatCard({ label, value, color, icon }: StatCardProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderLeftColor: color }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

// ─── Tab 1: 통계 ─────────────────────────────────────────────────────────────

function StatsTab() {
  const { colors } = useTheme();
  const [stats, setStats] = useState<DataStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await db.getDataStats();
      setStats(data);
    } catch (e) {
      console.error("Stats load error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.centered}>
        <Text style={[styles.emptyText, { color: colors.muted }]}>데이터를 불러올 수 없습니다</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.tabContentInner}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={[styles.sectionTitle, { color: colors.muted }]}>데이터 현황</Text>
      <View style={styles.statsGrid}>
        <StatCard label="투어" value={String(stats.tourCount)} color="#2196F3" icon="🌊" />
        <StatCard label="참여자" value={String(stats.participantCount)} color="#4CAF50" icon="👥" />
        <StatCard label="비용" value={String(stats.expenseCount)} color="#FF9800" icon="💳" />
        <StatCard label="동의서" value={String(stats.waiverCount)} color="#9C27B0" icon="📝" />
        <StatCard label="댓글" value={String(stats.commentCount)} color="#F44336" icon="💬" />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.muted }]}>총 비용</Text>
      <View style={[styles.totalCard, { backgroundColor: colors.card }]}>
        <Text style={styles.totalIcon}>💰</Text>
        <Text style={[styles.totalAmount, { color: colors.text }]}>{formatKRW(stats.totalExpenseKRW)}</Text>
        <Text style={[styles.totalLabel, { color: colors.muted }]}>전체 투어 누적 비용 (KRW 환산)</Text>
      </View>
    </ScrollView>
  );
}

// ─── Tab 2: 투어 ─────────────────────────────────────────────────────────────

function ToursTab() {
  const { colors } = useTheme();
  const { toast, confirm } = useToast();
  const [tours, setTours] = useState<Tour[]>([]);
  const [filtered, setFiltered] = useState<Tour[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await db.listTours();
      setTours(data);
      setFiltered(data);
    } catch (e) {
      console.error("Tours load error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleSearch = (text: string) => {
    setSearch(text);
    if (!text.trim()) {
      setFiltered(tours);
    } else {
      setFiltered(
        tours.filter((t) =>
          t.name.toLowerCase().includes(text.toLowerCase()) ||
          t.location.toLowerCase().includes(text.toLowerCase()),
        ),
      );
    }
  };

  const handleDelete = async (tour: Tour) => {
    const ok = await confirm(`"${tour.name}" 투어를 완전히 삭제하시겠습니까?\n\n참여자, 비용, 동의서가 모두 삭제됩니다.`);
    if (!ok) return;

    try {
      setDeletingId(tour.id);
      await db.deleteTour(tour.id);
      const updated = tours.filter((t) => t.id !== tour.id);
      setTours(updated);
      setFiltered(updated.filter((t) =>
        !search.trim() ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.location.toLowerCase().includes(search.toLowerCase()),
      ));
      toast("투어가 삭제되었습니다", "success");
    } catch {
      toast("삭제에 실패했습니다", "error");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      <View style={styles.searchRow}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          value={search}
          onChangeText={handleSearch}
          placeholder="투어명 또는 장소로 검색"
          placeholderTextColor={colors.muted}
          clearButtonMode="while-editing"
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              {search ? "검색 결과가 없습니다" : "투어가 없습니다"}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.itemCard, { backgroundColor: colors.card }]}>
            <View style={styles.itemInfo}>
              <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.itemMeta, { color: colors.muted }]}>
                {item.date ? formatDate(item.date) : "-"} · {item.location || "-"}
              </Text>
              <Text style={[styles.itemMeta, { color: colors.muted }]}>
                참여자 {item.participants.length}명 · 비용 {item.expenses.length}건
              </Text>
            </View>
            <TouchableOpacity
              style={[{ backgroundColor: colors.error }, styles.deleteBtn, deletingId === item.id && styles.deleteBtnDisabled]}
              onPress={() => handleDelete(item)}
              disabled={deletingId === item.id}
            >
              {deletingId === item.id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.deleteBtnText}>삭제</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

// ─── Tab 3: 동의서 ────────────────────────────────────────────────────────────

function WaiversTab() {
  const { colors } = useTheme();
  const { toast, confirm } = useToast();
  const [waivers, setWaivers] = useState<Waiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await db.listAllWaivers();
      setWaivers(data);
    } catch (e) {
      console.error("Waivers load error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleDelete = async (waiver: Waiver) => {
    const ok = await confirm(`"${waiver.signerName}"의 동의서를 삭제하시겠습니까?`);
    if (!ok) return;

    try {
      setDeletingId(waiver.id);
      await db.deleteWaiver(waiver.id);
      setWaivers((prev) => prev.filter((w) => w.id !== waiver.id));
      toast("동의서가 삭제되었습니다", "success");
    } catch {
      toast("삭제에 실패했습니다", "error");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={waivers}
      keyExtractor={(item) => String(item.id)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      style={styles.tabContent}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: colors.muted }]}>동의서가 없습니다</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={[styles.itemCard, { backgroundColor: colors.card }]}>
          <View style={styles.itemInfo}>
            <Text style={[styles.itemName, { color: colors.text }]}>{item.signerName}</Text>
            <Text style={[styles.itemMeta, { color: colors.muted }]}>투어 ID: {item.tourId}</Text>
            <Text style={[styles.itemMeta, { color: colors.muted }]}>
              서명일: {item.signedAt ? formatDate(String(item.signedAt)) : "-"}
            </Text>
          </View>
          <TouchableOpacity
            style={[{ backgroundColor: colors.error }, styles.deleteBtn, deletingId === item.id && styles.deleteBtnDisabled]}
            onPress={() => handleDelete(item)}
            disabled={deletingId === item.id}
          >
            {deletingId === item.id ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.deleteBtnText}>삭제</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    />
  );
}

// ─── Tab 4: 백업 ─────────────────────────────────────────────────────────────

function BackupTab() {
  const { colors } = useTheme();
  const { toast } = useToast();
  const [stats, setStats] = useState<DataStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    db.getDataStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleClearCache = async () => {
    Alert.alert(
      "로컬 캐시 초기화",
      "앱의 로컬 캐시를 모두 초기화합니다. 서버 데이터는 유지됩니다.\n\n계속하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "초기화",
          style: "destructive",
          onPress: async () => {
            try {
              setClearing(true);
              await AsyncStorage.clear();
              toast("로컬 캐시가 초기화되었습니다", "success");
            } catch {
              toast("초기화에 실패했습니다", "error");
            } finally {
              setClearing(false);
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentInner}>
      <Text style={[styles.sectionTitle, { color: colors.muted }]}>데이터 현황</Text>
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
      ) : stats ? (
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <SummaryRow label="투어" value={String(stats.tourCount)} />
          <SummaryRow label="참여자" value={String(stats.participantCount)} />
          <SummaryRow label="비용" value={String(stats.expenseCount)} />
          <SummaryRow label="동의서" value={String(stats.waiverCount)} />
          <SummaryRow label="댓글" value={String(stats.commentCount)} />
          <SummaryRow label="총 비용" value={formatKRW(stats.totalExpenseKRW)} isLast />
        </View>
      ) : (
        <Text style={[styles.emptyText, { color: colors.muted }]}>데이터를 불러올 수 없습니다</Text>
      )}

      <Text style={[styles.sectionTitle, { color: colors.muted }]}>캐시 관리</Text>
      <View style={[styles.cacheCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.cacheDesc, { color: colors.muted }]}>
          앱의 로컬 캐시를 초기화합니다.{"\n"}
          서버에 저장된 데이터(투어, 비용, 동의서 등)는 삭제되지 않습니다.
        </Text>
        <TouchableOpacity
          style={[{ backgroundColor: colors.error }, styles.clearBtn, clearing && styles.clearBtnDisabled]}
          onPress={handleClearCache}
          disabled={clearing}
        >
          {clearing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.clearBtnText}>로컬 캐시 초기화</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function SummaryRow({ label, value, isLast }: { label: string; value: string; isLast?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.summaryRow, !isLast && { borderBottomColor: colors.border }, !isLast && styles.summaryRowBorder]}>
      <Text style={[styles.summaryLabel, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: colors.primary }]}>{value}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const TABS: { key: TabKey; label: string }[] = [
  { key: "stats", label: "통계" },
  { key: "tours", label: "투어" },
  { key: "waivers", label: "동의서" },
  { key: "backup", label: "백업" },
];

export default function AdminDashboardScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<TabKey>("stats");

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.bg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backBtnText, { color: colors.primary }]}>‹ 뒤로</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>관리자 대시보드</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.card }]}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabBtn, activeTab === tab.key && { backgroundColor: colors.primary }]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabBtnText, activeTab === tab.key && { color: "#fff" }, activeTab !== tab.key && { color: colors.muted }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {activeTab === "stats" && <StatsTab />}
        {activeTab === "tours" && <ToursTab />}
        {activeTab === "waivers" && <WaiversTab />}
        {activeTab === "backup" && <BackupTab />}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8F4F8",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 60,
  },
  backBtnText: {
    fontSize: 17,
    color: "#2196F3",
    fontWeight: "500",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#023E58",
  },

  // Tab Bar
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: "#2196F3",
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3D7A94",
  },
  tabBtnTextActive: {
    color: "#fff",
  },

  // Content
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  tabContentInner: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  // Section
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3D7A94",
    marginTop: 4,
    marginBottom: 10,
  },

  // Stat Cards
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    alignItems: "flex-start",
  },
  statIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },

  // Total Card
  totalCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  totalIcon: {
    fontSize: 30,
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#023E58",
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 13,
    color: "#6B7280",
  },

  // Search
  searchRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: "#023E58",
  },

  // Item Cards (tours / waivers)
  itemCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  itemInfo: {
    flex: 1,
    marginRight: 10,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#023E58",
    marginBottom: 2,
  },
  itemMeta: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 1,
  },
  deleteBtn: {
    backgroundColor: "#F44336",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 52,
    alignItems: "center",
  },
  deleteBtnDisabled: {
    opacity: 0.6,
  },
  deleteBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },

  // Summary Card (Backup)
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  summaryRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#E8F4F8",
  },
  summaryLabel: {
    fontSize: 15,
    color: "#023E58",
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2196F3",
  },

  // Cache Card (Backup)
  cacheCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cacheDesc: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 16,
  },
  clearBtn: {
    backgroundColor: "#F44336",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  clearBtnDisabled: {
    opacity: 0.6,
  },
  clearBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },

  // Misc
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    color: "#9CA3AF",
  },
});
