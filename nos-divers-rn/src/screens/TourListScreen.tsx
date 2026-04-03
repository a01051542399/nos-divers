import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { Tour } from "../types";
import * as db from "../lib/supabase-store";

export default function TourListScreen() {
  const navigation = useNavigation<any>();
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTours = useCallback(async () => {
    try {
      const data = await db.listTours();
      setTours(data);
    } catch (e) {
      console.error("투어 목록 조회 실패:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTours();
  }, [fetchTours]);

  // 화면에 돌아올 때마다 새로고침
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      fetchTours();
    });
    return unsubscribe;
  }, [navigation, fetchTours]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTours();
  }, [fetchTours]);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("ko-KR") + "원";
  };

  const renderTourCard = ({ item }: { item: Tour }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => navigation.navigate("TourDetail", { tourId: item.id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.name}
        </Text>
      </View>

      <View style={styles.cardMeta}>
        {item.date ? (
          <Text style={styles.cardMetaText}>{item.date}</Text>
        ) : null}
        {item.location ? (
          <Text style={styles.cardMetaText}>
            {item.date ? "  ·  " : ""}
            {item.location}
          </Text>
        ) : null}
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.cardFooterText}>
          주최: {item.createdBy || "-"}
        </Text>
        <View style={styles.cardStats}>
          <Text style={styles.cardFooterText}>
            {item.participants.length}명
          </Text>
          {item.expenses.length > 0 && (
            <Text style={styles.cardExpense}>
              {formatCurrency(
                item.expenses.reduce((s, e) => s + e.amount, 0)
              )}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>~</Text>
        <Text style={styles.emptyTitle}>투어가 없습니다</Text>
        <Text style={styles.emptySubtitle}>
          새 다이빙 투어를 만들거나{"\n"}입장코드로 투어에 참여하세요
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>다이빙 투어</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.joinButton}
            onPress={() => navigation.navigate("JoinTour")}
          >
            <Text style={styles.joinButtonText}>참여</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.newButton}
            onPress={() => navigation.navigate("CreateTour")}
          >
            <Text style={styles.newButtonText}>+ 새 투어</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tour List */}
      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>로딩 중...</Text>
        </View>
      ) : (
        <FlatList
          data={tours}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderTourCard}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={
            tours.length === 0 ? styles.emptyContainer : styles.listContent
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#2196F3"
              colors={["#2196F3"]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8F4F8",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#023E58",
  },
  headerButtons: {
    flexDirection: "row",
    gap: 8,
  },
  joinButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#2196F3",
  },
  joinButtonText: {
    color: "#2196F3",
    fontWeight: "600",
    fontSize: 14,
  },
  newButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#2196F3",
  },
  newButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    shadowColor: "#023E58",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#023E58",
  },
  cardMeta: {
    flexDirection: "row",
    marginBottom: 12,
  },
  cardMetaText: {
    fontSize: 13,
    color: "#3D7A94",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E8F4F8",
    paddingTop: 10,
  },
  cardFooterText: {
    fontSize: 13,
    color: "#3D7A94",
  },
  cardStats: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  cardExpense: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2196F3",
  },
  // Empty / Loading states
  loadingState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#3D7A94",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 60,
  },
  emptyIcon: {
    fontSize: 48,
    color: "#2196F3",
    opacity: 0.4,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#023E58",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#3D7A94",
    textAlign: "center",
    lineHeight: 22,
  },
});
