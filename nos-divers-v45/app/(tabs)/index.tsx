import { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { PinModal } from "@/components/pin-modal";
import * as db from "@/lib/supabase-store";
import * as Store from "@/lib/store";
import type { Tour } from "@/lib/types";

export default function ToursScreen() {
  const colors = useColors();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [tourName, setTourName] = useState("");
  const [tourDate, setTourDate] = useState("");
  const [tourLocation, setTourLocation] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [createdBy, setCreatedBy] = useState("");

  // PIN modal state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  // Data state
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const loadTours = useCallback(async () => {
    try {
      setTours(await db.listTours());
    } catch (e) {
      console.error("Failed to load tours:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTours();
  }, [loadTours]);

  const handleCreateTour = async () => {
    if (!tourName.trim() || !accessCode.trim() || accessCode.length !== 4 || !createdBy.trim()) return;
    setCreating(true);
    try {
      await db.createTour({
        name: tourName.trim(),
        date: tourDate.trim(),
        location: tourLocation.trim(),
        accessCode: accessCode.trim(),
        createdBy: createdBy.trim(),
      });
      setTourName("");
      setTourDate("");
      setTourLocation("");
      setAccessCode("");
      setCreatedBy("");
      setShowModal(false);
      await loadTours();
    } catch (e) {
      console.error("Failed to create tour:", e);
      if (Platform.OS === "web") {
        window.alert("투어 생성 중 오류가 발생했습니다.");
      } else {
        Alert.alert("오류", "투어 생성 중 오류가 발생했습니다.");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTour = (tourId: number) => {
    setPendingDeleteId(tourId);
    setShowPinModal(true);
  };

  const handlePinSuccess = async () => {
    setShowPinModal(false);
    if (pendingDeleteId !== null) {
      try {
        await db.deleteTour(pendingDeleteId);
        await loadTours();
      } catch (e) {
        console.error("Failed to delete tour:", e);
      }
      setPendingDeleteId(null);
    }
  };

  const handlePinCancel = () => {
    setShowPinModal(false);
    setPendingDeleteId(null);
  };

  const renderTourCard = ({ item }: { item: Tour }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => router.push(`/tour/${item.id}` as any)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.name}</Text>
          <TouchableOpacity
            onPress={() => handleDeleteTour(item.id)}
            activeOpacity={0.6}
            style={styles.deleteBtn}
          >
            <IconSymbol name="trash.fill" size={16} color={colors.error} />
          </TouchableOpacity>
        </View>
        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <IconSymbol name="calendar" size={14} color={colors.muted} />
            <Text style={[styles.metaText, { color: colors.muted }]}>
              {Store.formatDate(item.date) || "날짜 미정"}
            </Text>
          </View>
          {item.location ? (
            <View style={styles.metaItem}>
              <IconSymbol name="mappin.and.ellipse" size={14} color={colors.muted} />
              <Text style={[styles.metaText, { color: colors.muted }]}>{item.location}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
        <View style={styles.footerItem}>
          <IconSymbol name="person.fill" size={14} color={colors.primary} />
          <Text style={[styles.footerText, { color: colors.foreground }]}>
            주최: {item.createdBy || "미정"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <IconSymbol name="water.waves" size={64} color={colors.muted} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>투어가 없습니다</Text>
      <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
        새 다이빙 투어를 만들어 정산을 시작하세요
      </Text>
    </View>
  );

  const canCreate = tourName.trim() && accessCode.length === 4 && /^\d{4}$/.test(accessCode) && createdBy.trim();

  return (
    <ScreenContainer>
      {/* 로고 영역 */}
      <View style={styles.logoContainer}>
        <Image
          source={require("@/assets/images/logo-full.png")}
          style={styles.logoImage}
          contentFit="contain"
        />
      </View>

      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>다이빙 투어</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.joinButton, { borderColor: colors.primary }]}
            onPress={() => router.push("/join" as any)}
            activeOpacity={0.8}
          >
            <IconSymbol name="paperplane.fill" size={16} color={colors.primary} />
            <Text style={[styles.joinButtonText, { color: colors.primary }]}>참여</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowModal(true)}
            activeOpacity={0.8}
          >
            <IconSymbol name="plus.circle.fill" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>새 투어</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={tours}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderTourCard}
          contentContainerStyle={tours.length === 0 ? styles.emptyList : styles.list}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* PIN 인증 모달 */}
      <PinModal
        visible={showPinModal}
        onSuccess={handlePinSuccess}
        onCancel={handlePinCancel}
        title="투어 삭제"
        message="이 투어를 삭제하려면 관리자 PIN을 입력하세요"
      />

      {/* 새 투어 생성 모달 */}
      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <View style={styles.modalOverlayInner}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>새 투어 만들기</Text>
                <TouchableOpacity onPress={() => setShowModal(false)} activeOpacity={0.6}>
                  <IconSymbol name="xmark.circle.fill" size={28} color={colors.muted} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                bounces={false}
              >
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.foreground }]}>투어 이름 *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                    placeholder="예: 제주 서귀포 투어"
                    placeholderTextColor={colors.muted}
                    value={tourName}
                    onChangeText={setTourName}
                    returnKeyType="next"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.foreground }]}>주최자 이름 *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                    placeholder="예: 자이언트"
                    placeholderTextColor={colors.muted}
                    value={createdBy}
                    onChangeText={setCreatedBy}
                    returnKeyType="next"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.foreground }]}>입장 코드 (4자리 숫자) *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border, letterSpacing: 8, textAlign: "center", fontSize: 22, fontWeight: "700" }]}
                    placeholder="0000"
                    placeholderTextColor={colors.muted}
                    value={accessCode}
                    onChangeText={(text) => setAccessCode(text.replace(/[^0-9]/g, "").slice(0, 4))}
                    keyboardType="number-pad"
                    maxLength={4}
                    returnKeyType="next"
                  />
                  <Text style={[styles.inputHint, { color: colors.muted }]}>
                    이 코드를 아는 사람만 투어에 입장할 수 있습니다
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.foreground }]}>날짜</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                    placeholder="예: 2026-03-15"
                    placeholderTextColor={colors.muted}
                    value={tourDate}
                    onChangeText={setTourDate}
                    returnKeyType="next"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.foreground }]}>장소</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                    placeholder="예: 제주 서귀포"
                    placeholderTextColor={colors.muted}
                    value={tourLocation}
                    onChangeText={setTourLocation}
                    returnKeyType="done"
                    onSubmitEditing={handleCreateTour}
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.createButton,
                    { backgroundColor: canCreate ? colors.primary : colors.muted },
                  ]}
                  onPress={handleCreateTour}
                  disabled={!canCreate || creating}
                  activeOpacity={0.8}
                >
                  <Text style={styles.createButtonText}>
                    {creating ? "생성 중..." : "투어 생성"}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  logoContainer: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 4,
  },
  logoImage: {
    width: 180,
    height: 180,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  joinButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 12,
  },
  emptyList: {
    flex: 1,
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
  },
  cardHeader: {
    padding: 16,
  },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
  },
  deleteBtn: {
    padding: 8,
  },
  cardMeta: {
    flexDirection: "row",
    gap: 16,
    flexWrap: "wrap",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 13,
  },
  cardFooter: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 0.5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerText: {
    fontSize: 13,
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingBottom: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  // Modal
  modalOverlay: {
    flex: 1,
  },
  modalOverlayInner: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: "90%",
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
  inputHint: {
    fontSize: 12,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
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
