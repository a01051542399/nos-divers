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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { Tour, Waiver } from "../types";
import * as db from "../lib/supabase-store";
import { exportAllWaiversPDF } from "../utils/export-waiver-pdf";

export default function WaiversScreen() {
  const navigation = useNavigation<any>();
  const [tours, setTours] = useState<Tour[]>([]);
  const [waiversByTour, setWaiversByTour] = useState<Record<number, Waiver[]>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTourId, setSelectedTourId] = useState<number | null>(null);
  const [profile, setProfile] = useState<{ name: string }>({ name: "" });
  const [exportingPDF, setExportingPDF] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [toursData, allWaivers, prof] = await Promise.all([
        db.listTours(),
        db.listAllWaivers(),
        db.getProfile(),
      ]);
      setTours(toursData);
      setProfile(prof);

      const grouped: Record<number, Waiver[]> = {};
      for (const w of allWaivers) {
        if (!grouped[w.tourId]) grouped[w.tourId] = [];
        grouped[w.tourId].push(w);
      }
      setWaiversByTour(grouped);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh on focus
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      fetchData();
    });
    return unsubscribe;
  }, [navigation, fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr.length !== 6) return dateStr || "날짜 미정";
    return `20${dateStr.slice(0, 2)}.${dateStr.slice(2, 4)}.${dateStr.slice(4, 6)}`;
  };

  // ── Tour detail waiver view ──
  if (selectedTourId !== null) {
    const tour = tours.find((t) => t.id === selectedTourId);
    if (!tour) {
      setSelectedTourId(null);
      return null;
    }

    const waivers = waiversByTour[tour.id] || [];
    const signedNames = waivers.map((w) => w.signerName);
    const currentUser = profile.name || null;

    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        {/* Header */}
        <View style={styles.detailHeader}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <TouchableOpacity
              onPress={() => setSelectedTourId(null)}
              style={styles.backBtn}
            >
              <Text style={styles.backBtnText}>{"<"} 뒤로</Text>
            </TouchableOpacity>
            {waivers.length > 0 && (
              <TouchableOpacity
                style={[styles.pdfBtn, exportingPDF && { opacity: 0.5 }]}
                disabled={exportingPDF}
                onPress={async () => {
                  setExportingPDF(true);
                  try {
                    await exportAllWaiversPDF(waivers, tour.name);
                  } catch (e: any) {
                    Alert.alert("오류", e?.message || "PDF 내보내기 실패");
                  } finally {
                    setExportingPDF(false);
                  }
                }}
              >
                <Text style={styles.pdfBtnText}>
                  {exportingPDF ? "내보내는 중..." : "전체 PDF"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.detailTitle}>{tour.name}</Text>
          <Text style={styles.detailSub}>
            {formatDate(tour.date)} · {tour.location || ""}
          </Text>
          {currentUser ? (
            <Text style={styles.currentUserText}>내 이름: {currentUser}</Text>
          ) : (
            <Text style={styles.noUserText}>
              설정에서 이름을 등록하면 서명할 수 있습니다
            </Text>
          )}
        </View>

        {/* Participant waiver list */}
        {tour.participants.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>참여자가 없습니다</Text>
          </View>
        ) : (
          <FlatList
            data={tour.participants}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
            renderItem={({ item: p }) => {
              const signed = signedNames.includes(p.name);
              return (
                <View style={styles.participantRow}>
                  <View
                    style={[
                      styles.avatar,
                      {
                        backgroundColor: signed ? "#4CAF50" : "#E0E0E0",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.avatarText,
                        { color: signed ? "#fff" : "#999" },
                      ]}
                    >
                      {signed ? "\u2713" : p.name.charAt(0)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.participantName}>{p.name}</Text>
                    <Text
                      style={[
                        styles.statusText,
                        { color: signed ? "#4CAF50" : "#F44336" },
                      ]}
                    >
                      {signed ? "서명 완료" : "미서명"}
                    </Text>
                  </View>
                  {signed ? (
                    <TouchableOpacity
                      style={styles.viewBtn}
                      onPress={() => {
                        const w = waivers.find((wv) => wv.signerName === p.name);
                        if (w) {
                          navigation.navigate("WaiverView", {
                            waiver: w,
                            tourName: tour.name,
                          });
                        }
                      }}
                    >
                      <Text style={styles.viewBtnText}>보기</Text>
                    </TouchableOpacity>
                  ) : currentUser === p.name ? (
                    <TouchableOpacity
                      style={styles.signBtn}
                      onPress={() =>
                        navigation.navigate("WaiverSign", {
                          tourId: tour.id,
                        })
                      }
                    >
                      <Text style={styles.signBtnText}>서명</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.onlySelfText}>본인만 가능</Text>
                  )}
                </View>
              );
            }}
          />
        )}
      </SafeAreaView>
    );
  }

  // ── Tour list view ──
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Text style={styles.title}>면책동의서</Text>
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.title}>면책동의서</Text>

      {tours.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            투어를 생성하면 동의서가 자동으로 생성됩니다
          </Text>
        </View>
      ) : (
        <FlatList
          data={tours}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item: tour }) => {
            const waivers = waiversByTour[tour.id] || [];
            const signedNames = waivers.map((w) => w.signerName);
            const unsigned = tour.participants.filter(
              (p) => !signedNames.includes(p.name),
            );

            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => setSelectedTourId(tour.id)}
                activeOpacity={0.7}
              >
                <View style={styles.cardRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{tour.name}</Text>
                    <Text style={styles.cardSub}>
                      {formatDate(tour.date)} · {tour.participants.length}명
                    </Text>
                    {unsigned.length > 0 && (
                      <Text style={styles.unsignedText}>
                        미서명: {unsigned.map((p) => p.name).join(", ")}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.chevron}>{">"}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
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
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#023E58",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#3D7A94",
  },

  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#023E58",
  },
  cardSub: {
    fontSize: 12,
    color: "#3D7A94",
    marginTop: 2,
  },
  unsignedText: {
    fontSize: 11,
    color: "#F44336",
    marginTop: 3,
  },
  chevron: {
    color: "#3D7A94",
    fontSize: 14,
  },

  // Detail header
  detailHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backBtn: {
    paddingVertical: 8,
  },
  backBtnText: {
    fontSize: 14,
    color: "#2196F3",
    fontWeight: "600",
  },
  pdfBtn: {
    backgroundColor: "#C62828",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pdfBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#023E58",
    marginTop: 4,
  },
  detailSub: {
    fontSize: 13,
    color: "#3D7A94",
    marginTop: 2,
  },
  currentUserText: {
    fontSize: 12,
    color: "#2196F3",
    marginTop: 4,
  },
  noUserText: {
    fontSize: 12,
    color: "#F44336",
    marginTop: 4,
  },

  // Participant row
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "700",
  },
  participantName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#023E58",
  },
  statusText: {
    fontSize: 11,
    marginTop: 2,
  },
  signBtn: {
    backgroundColor: "#2196F3",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  signBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  onlySelfText: {
    fontSize: 11,
    color: "#999",
  },
  viewBtn: {
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  viewBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});
