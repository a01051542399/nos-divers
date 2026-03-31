import {
  Text,
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { trpc } from "@/lib/trpc";
import * as Store from "@/lib/store";
import type { TourListItem } from "@/lib/types";

export default function WaiversScreen() {
  const colors = useColors();
  const router = useRouter();

  const toursQuery = trpc.tour.list.useQuery();
  const tours = (toursQuery.data ?? []) as TourListItem[];

  const renderTourItem = ({ item }: { item: TourListItem }) => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardContent}>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.name}</Text>
          <View style={styles.cardMeta}>
            <Text style={[styles.metaText, { color: colors.muted }]}>
              {Store.formatDate(item.date) || "날짜 미정"}
            </Text>
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.signButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push(`/waiver/sign?tourId=${item.id}&tourName=${encodeURIComponent(item.name)}` as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.signButtonText}>서명받기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewButton, { borderColor: colors.primary }]}
            onPress={() => router.push(`/waiver/view?tourId=${item.id}&tourName=${encodeURIComponent(item.name)}` as any)}
            activeOpacity={0.7}
          >
            <Text style={[styles.viewButtonText, { color: colors.primary }]}>목록</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <IconSymbol name="doc.text.fill" size={64} color={colors.muted} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>투어가 없습니다</Text>
      <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
        투어 탭에서 먼저 투어를 생성해주세요
      </Text>
    </View>
  );

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>면책동의서</Text>
      </View>

      {toursQuery.isLoading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={tours}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderTourItem}
          contentContainerStyle={tours.length === 0 ? styles.emptyList : styles.list}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  emptyList: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardContent: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardInfo: {
    flex: 1,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  metaText: {
    fontSize: 13,
  },
  cardActions: {
    flexDirection: "row",
    gap: 8,
  },
  signButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  signButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  viewButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
  },
});
