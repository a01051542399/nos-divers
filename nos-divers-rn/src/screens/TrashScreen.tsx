import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTrashTours } from "../hooks/useSupabase";
import { useToast } from "../components/Toast";
import * as db from "../lib/supabase-store";
import type { Tour } from "../types";

function getDaysRemaining(deletedAt: string): number {
  return Math.max(
    0,
    7 - Math.floor((Date.now() - new Date(deletedAt).getTime()) / 86400000),
  );
}

export default function TrashScreen() {
  const navigation = useNavigation<any>();
  const { toast, confirm } = useToast();
  const { tours, loading, refresh } = useTrashTours();

  const handleRestore = async (tour: Tour) => {
    try {
      await db.restoreTour(tour.id);
      await refresh();
      toast(`"${tour.name}" 투어를 복원했습니다`, "success");
    } catch (e: any) {
      toast(e.message || "복원에 실패했습니다", "error");
    }
  };

  const handleDelete = async (tour: Tour) => {
    const ok = await confirm(`"${tour.name}" 투어를 영구 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`);
    if (!ok) return;
    try {
      await db.deleteTour(tour.id);
      await refresh();
      toast(`"${tour.name}" 투어를 영구 삭제했습니다`, "success");
    } catch (e: any) {
      toast(e.message || "삭제에 실패했습니다", "error");
    }
  };

  const renderItem = ({ item }: { item: Tour }) => {
    const daysLeft = getDaysRemaining(item.deletedAt!);
    return (
      <View style={styles.card}>
        <View style={styles.cardInfo}>
          <Text style={styles.tourName}>{item.name}</Text>
          <Text style={styles.tourMeta}>
            {item.date}
            {item.location ? ` · ${item.location}` : ""}
          </Text>
          <Text style={[styles.daysLeft, daysLeft <= 1 && styles.daysLeftUrgent]}>
            {daysLeft}일 후 자동 삭제
          </Text>
        </View>
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={() => handleRestore(item)}
            activeOpacity={0.75}
          >
            <Text style={styles.restoreButtonText}>복원</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item)}
            activeOpacity={0.75}
          >
            <Text style={styles.deleteButtonText}>영구 삭제</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>임시보관함</Text>
        <View style={styles.backButton} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      ) : (
        <FlatList
          data={tours}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={
            tours.length === 0 ? styles.emptyContainer : styles.listContent
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>임시보관함이 비어있습니다</Text>
            </View>
          }
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 64,
  },
  backText: {
    fontSize: 16,
    color: "#2196F3",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#023E58",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    color: "#3D7A94",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardInfo: {
    flex: 1,
    marginRight: 12,
  },
  tourName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#023E58",
    marginBottom: 4,
  },
  tourMeta: {
    fontSize: 13,
    color: "#3D7A94",
    marginBottom: 4,
  },
  daysLeft: {
    fontSize: 12,
    color: "#FF9800",
    fontWeight: "500",
  },
  daysLeftUrgent: {
    color: "#F44336",
  },
  buttonGroup: {
    gap: 8,
    alignItems: "flex-end",
  },
  restoreButton: {
    backgroundColor: "#2196F3",
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  restoreButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  deleteButton: {
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#F44336",
  },
});
