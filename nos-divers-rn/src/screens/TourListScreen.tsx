import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { Tour } from "../types";
import * as db from "../lib/supabase-store";
import PinModal from "../components/PinModal";
import { useToast } from "../components/Toast";
import { useAppSettings } from "../hooks/useSupabase";

// ─── 투어 수정 모달 ───

interface EditTourModalProps {
  visible: boolean;
  tour: Tour | null;
  onClose: () => void;
  onSave: (updates: { name: string; date: string; location: string }) => Promise<void>;
}

function EditTourModal({ visible, tour, onClose, onSave }: EditTourModalProps) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tour && visible) {
      setName(tour.name);
      setDate(tour.date || "");
      setLocation(tour.location || "");
    }
  }, [tour, visible]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("오류", "투어 이름을 입력해주세요");
      return;
    }
    setSaving(true);
    try {
      await onSave({ name: name.trim(), date: date.trim(), location: location.trim() });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={editStyles.overlay}
      >
        <View style={editStyles.card}>
          <Text style={editStyles.title}>투어 수정</Text>

          <Text style={editStyles.label}>투어 이름 *</Text>
          <TextInput
            style={editStyles.input}
            value={name}
            onChangeText={setName}
            placeholder="투어 이름"
            placeholderTextColor="#999"
          />

          <Text style={editStyles.label}>날짜 (YYMMDD)</Text>
          <TextInput
            style={editStyles.input}
            value={date}
            onChangeText={setDate}
            placeholder="예: 250315"
            placeholderTextColor="#999"
            keyboardType="numeric"
            maxLength={6}
          />

          <Text style={editStyles.label}>장소</Text>
          <TextInput
            style={editStyles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="예: 제주도"
            placeholderTextColor="#999"
          />

          <View style={editStyles.buttons}>
            <TouchableOpacity style={editStyles.cancelBtn} onPress={onClose}>
              <Text style={editStyles.cancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[editStyles.saveBtn, saving && editStyles.btnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={editStyles.saveText}>{saving ? "저장 중..." : "저장"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── 메인 화면 ───

type PinAction = "edit" | "delete" | null;

export default function TourListScreen() {
  const navigation = useNavigation<any>();
  const { toast, confirm } = useToast();
  const { settings, refresh: refreshSettings } = useAppSettings();

  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // PIN 모달 상태
  const [pinVisible, setPinVisible] = useState(false);
  const [pinError, setPinError] = useState<string | undefined>();
  const [pinAction, setPinAction] = useState<PinAction>(null);
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);

  // 수정 모달 상태
  const [editModalVisible, setEditModalVisible] = useState(false);

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

  // ─── 더보기 메뉴 ───

  const handleMorePress = (tour: Tour) => {
    setSelectedTour(tour);
    Alert.alert(tour.name, "작업을 선택하세요", [
      {
        text: "수정",
        onPress: () => {
          setPinAction("edit");
          setPinError(undefined);
          setPinVisible(true);
        },
      },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => {
          setPinAction("delete");
          setPinError(undefined);
          setPinVisible(true);
        },
      },
      {
        text: "숨기기",
        onPress: () => handleHideTour(tour),
      },
      { text: "취소", style: "cancel" },
    ]);
  };

  // ─── PIN 인증 ───

  const handlePinSubmit = async (pin: string) => {
    if (!selectedTour) return;
    try {
      const ok = await db.verifyTourAccessCode(selectedTour.id, pin);
      if (!ok) {
        setPinError("PIN이 일치하지 않습니다");
        return;
      }
      setPinVisible(false);
      setPinError(undefined);

      if (pinAction === "edit") {
        setEditModalVisible(true);
      } else if (pinAction === "delete") {
        handleDeleteTour(selectedTour);
      }
    } catch (e: any) {
      setPinError(e.message || "오류가 발생했습니다");
    }
  };

  // ─── 투어 삭제 ───

  const handleDeleteTour = async (tour: Tour) => {
    const confirmed = await confirm(`"${tour.name}" 투어를 삭제하시겠습니까?\n임시보관함에서 7일간 복원 가능합니다.`);
    if (!confirmed) return;
    try {
      await db.softDeleteTour(tour.id);
      toast("투어가 삭제되었습니다", "success");
      await fetchTours();
    } catch (e: any) {
      toast(e.message || "삭제에 실패했습니다", "error");
    }
  };

  // ─── 투어 수정 저장 ───

  const handleEditSave = async (updates: { name: string; date: string; location: string }) => {
    if (!selectedTour) return;
    try {
      await db.editTour(selectedTour.id, updates);
      toast("투어가 수정되었습니다", "success");
      setEditModalVisible(false);
      await fetchTours();
    } catch (e: any) {
      toast(e.message || "수정에 실패했습니다", "error");
    }
  };

  // ─── 투어 숨기기 ───

  const handleHideTour = async (tour: Tour) => {
    try {
      const existing = settings.hiddenTourIds || [];
      if (existing.includes(tour.id)) {
        toast("이미 숨겨진 투어입니다", "info");
        return;
      }
      await db.setHiddenTourIds([...existing, tour.id]);
      await refreshSettings();
      toast("투어가 숨겨졌습니다. 설정에서 복원할 수 있습니다.", "success");
      await fetchTours();
    } catch (e: any) {
      toast(e.message || "숨기기에 실패했습니다", "error");
    }
  };

  // ─── 숨긴 투어 필터 ───

  const visibleTours = tours.filter(
    (t) => !(settings?.hiddenTourIds ?? []).includes(t.id)
  );

  // ─── 투어 카드 렌더링 ───

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
        <TouchableOpacity
          style={styles.moreBtn}
          onPress={() => handleMorePress(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.moreBtnText}>···</Text>
        </TouchableOpacity>
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
      {/* Logo */}
      <Image
        source={require("../../assets/logo-full-official.png")}
        style={{ width: 180, height: 50, resizeMode: "contain", alignSelf: "center", marginTop: 4, marginBottom: 8 }}
      />

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
          data={visibleTours}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderTourCard}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={
            visibleTours.length === 0 ? styles.emptyContainer : styles.listContent
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

      {/* PIN 모달 */}
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

      {/* 투어 수정 모달 */}
      <EditTourModal
        visible={editModalVisible}
        tour={selectedTour}
        onClose={() => setEditModalVisible(false)}
        onSave={handleEditSave}
      />
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#023E58",
    flex: 1,
  },
  moreBtn: {
    paddingLeft: 8,
    paddingVertical: 2,
  },
  moreBtnText: {
    fontSize: 18,
    color: "#3D7A94",
    letterSpacing: 1,
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

// ─── EditTourModal 스타일 ───

const editStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#023E58",
    marginBottom: 20,
    textAlign: "center",
  },
  label: {
    fontSize: 13,
    color: "#3D7A94",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#F4F8FB",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D0E8F0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#023E58",
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
    backgroundColor: "#F0F0F0",
    alignItems: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#666",
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#2196F3",
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
