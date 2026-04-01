import { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SignatureImage } from "@/components/signature-image";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import * as db from "@/lib/supabase-store";
import * as Store from "@/lib/store";
import { HEALTH_CHECKLIST } from "@/lib/waiver-template";
import type { Waiver } from "@/lib/types";

export default function WaiverViewScreen() {
  const { tourId, tourName } = useLocalSearchParams<{ tourId: string; tourName: string }>();
  const colors = useColors();
  const router = useRouter();
  const [selectedWaiver, setSelectedWaiver] = useState<Waiver | null>(null);

  const [waivers, setWaivers] = useState<Waiver[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWaivers = useCallback(async () => {
    if (!tourId) return;
    try {
      setWaivers(await db.listWaiversByTour(Number(tourId)));
    } catch (e) {
      console.error("Failed to load waivers:", e);
    } finally {
      setLoading(false);
    }
  }, [tourId]);

  useEffect(() => {
    loadWaivers();
  }, [loadWaivers]);

  const handleDelete = async (waiverId: number) => {
    const doDelete = async () => {
      try {
        await db.deleteWaiver(waiverId);
        setSelectedWaiver(null);
        await loadWaivers();
      } catch (e) {
        console.error("Failed to delete waiver:", e);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("이 서명을 삭제하시겠습니까?")) {
        await doDelete();
      }
    } else {
      Alert.alert("서명 삭제", "이 서명을 삭제하시겠습니까?", [
        { text: "취소", style: "cancel" },
        { text: "삭제", style: "destructive", onPress: doDelete },
      ]);
    }
  };

  const decodedTourName = tourName ? decodeURIComponent(tourName) : "투어";

  const parsePersonalInfo = (raw: string) => {
    try { return JSON.parse(raw); } catch { return {}; }
  };

  const parseHealthChecklist = (raw: string): boolean[] => {
    try { return JSON.parse(raw); } catch { return []; }
  };

  const renderWaiverItem = ({ item }: { item: Waiver }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => setSelectedWaiver(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardLeft}>
          <View style={[styles.signedBadge, { backgroundColor: colors.success + "15" }]}>
            <IconSymbol name="checkmark.circle.fill" size={16} color={colors.success} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardName, { color: colors.foreground }]}>
              {item.signerName}
            </Text>
            <Text style={[styles.cardDate, { color: colors.muted }]}>
              {Store.formatDateTime(item.signedAt)}
            </Text>
          </View>
        </View>
        <IconSymbol name="chevron.right" size={16} color={colors.muted} />
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <IconSymbol name="doc.text.fill" size={48} color={colors.muted} />
      <Text style={[styles.emptyText, { color: colors.muted }]}>서명된 동의서가 없습니다</Text>
    </View>
  );

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack} activeOpacity={0.7}>
          <IconSymbol name="chevron.right" size={24} color={colors.primary} style={{ transform: [{ scaleX: -1 }] }} />
          <Text style={[styles.headerBackText, { color: colors.primary }]}>뒤로</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.titleArea}>
        <Text style={[styles.titleText, { color: colors.foreground }]}>{decodedTourName}</Text>
        <Text style={[styles.subtitleText, { color: colors.muted }]}>
          서명 {waivers.length}건
        </Text>
      </View>

      {loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={waivers}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderWaiverItem}
          contentContainerStyle={waivers.length === 0 ? styles.emptyList : styles.list}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* 서명 상세 모달 */}
      <Modal visible={!!selectedWaiver} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>서명 상세</Text>
              <TouchableOpacity onPress={() => setSelectedWaiver(null)} activeOpacity={0.6}>
                <IconSymbol name="xmark.circle.fill" size={28} color={colors.muted} />
              </TouchableOpacity>
            </View>

            {selectedWaiver && (() => {
              const info = parsePersonalInfo(typeof selectedWaiver.personalInfo === 'string' ? selectedWaiver.personalInfo : JSON.stringify(selectedWaiver.personalInfo));
              const health = parseHealthChecklist(typeof selectedWaiver.healthChecklist === 'string' ? selectedWaiver.healthChecklist : JSON.stringify(selectedWaiver.healthChecklist));
              return (
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
                  {/* 기본 정보 */}
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailSectionTitle, { color: colors.primary }]}>기본 정보</Text>
                    {[
                      { label: "이름", value: info.name },
                      { label: "생년월일", value: info.birthDate },
                      { label: "연락처", value: info.phone },
                      { label: "다이빙 레벨", value: info.divingLevel },
                      { label: "투어/활동 기간", value: info.tourPeriod },
                      { label: "투어/활동 장소", value: info.tourLocation },
                      { label: "비상 연락처", value: info.emergencyContact },
                    ].map((item) =>
                      item.value ? (
                        <View key={item.label} style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: colors.muted }]}>{item.label}</Text>
                          <Text style={[styles.detailValue, { color: colors.foreground }]}>{item.value}</Text>
                        </View>
                      ) : null
                    )}
                  </View>

                  {/* 건강 상태 */}
                  {(health.some((v: boolean) => v) || selectedWaiver.healthOther) ? (
                    <View style={styles.detailSection}>
                      <Text style={[styles.detailSectionTitle, { color: colors.warning }]}>건강 상태 해당 사항</Text>
                      {health.map((checked: boolean, idx: number) =>
                        checked ? (
                          <View key={idx} style={styles.healthItem}>
                            <IconSymbol name="checkmark.circle.fill" size={14} color={colors.warning} />
                            <Text style={[styles.healthText, { color: colors.foreground }]}>
                              {HEALTH_CHECKLIST[idx]}
                            </Text>
                          </View>
                        ) : null
                      )}
                      {selectedWaiver.healthOther ? (
                        <View style={styles.healthItem}>
                          <IconSymbol name="checkmark.circle.fill" size={14} color={colors.warning} />
                          <Text style={[styles.healthText, { color: colors.foreground }]}>
                            기타: {selectedWaiver.healthOther}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  {/* 서명 */}
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailSectionTitle, { color: colors.success }]}>서명</Text>
                    {selectedWaiver.signatureImage ? (
                      <View style={[styles.signaturePreview, { borderColor: colors.border }]}>
                        <SignatureImage
                          signatureData={selectedWaiver.signatureImage}
                          height={120}
                        />
                      </View>
                    ) : null}
                    <Text style={[styles.signedDate, { color: colors.muted }]}>
                      서명일시: {Store.formatDateTime(selectedWaiver.signedAt)}
                    </Text>
                  </View>

                  {/* 삭제 버튼 */}
                  <TouchableOpacity
                    style={[styles.deleteButton, { borderColor: colors.error }]}
                    onPress={() => handleDelete(selectedWaiver.id)}
                    activeOpacity={0.7}
                  >
                    <IconSymbol name="trash.fill" size={16} color={colors.error} />
                    <Text style={[styles.deleteText, { color: colors.error }]}>서명 삭제</Text>
                  </TouchableOpacity>
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>


    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerBack: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 4,
  },
  headerBackText: {
    fontSize: 16,
    fontWeight: "600",
  },
  titleArea: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  titleText: {
    fontSize: 24,
    fontWeight: "800",
  },
  subtitleText: {
    fontSize: 14,
    marginTop: 4,
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
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  cardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  signedBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  cardInfo: {
    gap: 2,
  },
  cardName: {
    fontSize: 16,
    fontWeight: "600",
  },
  cardDate: {
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
  },
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
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 14,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1.5,
    textAlign: "right",
  },
  healthItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  healthText: {
    fontSize: 14,
    flex: 1,
  },
  signaturePreview: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    backgroundColor: "#FFFFFF",
  },
  signatureImage: {
    width: "100%",
    height: 120,
  },
  signedDate: {
    fontSize: 13,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 20,
  },
  deleteText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
