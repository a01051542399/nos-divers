import React, { useMemo } from "react";
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
import { useTheme } from "../components/ThemeContext";
import { useTours } from "../hooks/useSupabase";
import { useAppSettings } from "../hooks/useSupabase";
import { useToast } from "../components/Toast";
import * as db from "../lib/supabase-store";
import type { Tour } from "../types";

export default function HiddenToursScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { toast } = useToast();
  const { tours, loading: toursLoading } = useTours();
  const { settings, loading: settingsLoading, refresh: refreshSettings } = useAppSettings();

  const hiddenTours = useMemo(() => {
    if (!settings.hiddenTourIds.length) return [];
    return tours.filter((t) => settings.hiddenTourIds.includes(t.id));
  }, [tours, settings.hiddenTourIds]);

  const handleRestore = async (tour: Tour) => {
    try {
      const newIds = settings.hiddenTourIds.filter((id) => id !== tour.id);
      await db.setHiddenTourIds(newIds);
      await refreshSettings();
      toast(`"${tour.name}" 투어를 복원했습니다`, "success");
    } catch (e: any) {
      toast(e.message || "복원에 실패했습니다", "error");
    }
  };

  const loading = toursLoading || settingsLoading;

  const renderItem = ({ item }: { item: Tour }) => (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.cardInfo}>
        <Text style={[styles.tourName, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.tourMeta, { color: colors.muted }]}>
          {item.date}
          {item.location ? ` · ${item.location}` : ""}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.restoreButton, { backgroundColor: colors.primary }]}
        onPress={() => handleRestore(item)}
        activeOpacity={0.75}
      >
        <Text style={styles.restoreButtonText}>복원</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: colors.bg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backText, { color: colors.primary }]}>‹ 뒤로</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>숨긴 투어</Text>
        <View style={styles.backButton} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={hiddenTours}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={
            hiddenTours.length === 0 ? styles.emptyContainer : styles.listContent
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.muted }]}>숨긴 투어가 없습니다</Text>
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
  },
  restoreButton: {
    backgroundColor: "#2196F3",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  restoreButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
});
