import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { Waiver, WaiverPersonalInfo } from "../types";
import * as db from "../lib/supabase-store";
import { HEALTH_CHECKLIST } from "../waiver-template";
import { exportWaiverPDF } from "../utils/export-waiver-pdf";

type RouteParams = {
  waiver: Waiver;
  tourName: string;
};

function parsePersonalInfo(raw: WaiverPersonalInfo | string): WaiverPersonalInfo {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {
        name: "",
        birthDate: "",
        phone: "",
        divingLevel: "",
        tourPeriod: "",
        tourLocation: "",
        emergencyContact: "",
      };
    }
  }
  return raw;
}

function parseHealthChecklist(raw: boolean[] | string): boolean[] {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return Array(6).fill(false);
    }
  }
  return raw;
}

function formatSignedAt(signedAt: string | Date): string {
  const date = typeof signedAt === "string" ? new Date(signedAt) : signedAt;
  if (isNaN(date.getTime())) return String(signedAt);
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function WaiverViewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { waiver, tourName } = route.params as RouteParams;

  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const info = parsePersonalInfo(waiver.personalInfo);
  const checklist = parseHealthChecklist(waiver.healthChecklist);

  const infoRows: [string, string][] = [
    ["성명", info.name],
    ["생년월일", info.birthDate],
    ["전화번호", info.phone],
    ["다이빙 레벨", info.divingLevel],
    ["투어 기간", info.tourPeriod],
    ["투어 장소", info.tourLocation],
    ["비상 연락처", info.emergencyContact],
  ];

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      await exportWaiverPDF(waiver, tourName);
    } catch (e: any) {
      Alert.alert("오류", "PDF 내보내기에 실패했습니다.\n" + (e?.message ?? ""));
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "동의서 삭제",
      `${waiver.signerName}의 동의서를 삭제하시겠습니까?\n삭제하면 복구할 수 없습니다.`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await db.deleteWaiver(waiver.id);
              navigation.goBack();
            } catch (e: any) {
              Alert.alert("오류", "삭제에 실패했습니다.\n" + (e?.message ?? ""));
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{"<"} 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.signerName}>{waiver.signerName}</Text>
        <Text style={styles.signedAt}>서명일시: {formatSignedAt(waiver.signedAt)}</Text>
        <Text style={styles.tourName}>{tourName}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 개인정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>개인 정보</Text>
          {infoRows.map(([label, value]) => (
            <View key={label} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{label}</Text>
              <Text style={styles.infoValue}>{value || "-"}</Text>
            </View>
          ))}
        </View>

        {/* 건강 체크리스트 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>건강 체크리스트</Text>
          {HEALTH_CHECKLIST.map((item, i) => (
            <View key={i} style={styles.checkRow}>
              <Text style={[styles.checkIcon, checklist[i] ? styles.checkYes : styles.checkNo]}>
                {checklist[i] ? "✓" : "✗"}
              </Text>
              <Text
                style={[
                  styles.checkText,
                  checklist[i] ? styles.checkTextYes : styles.checkTextNo,
                ]}
              >
                {item}
              </Text>
            </View>
          ))}
          {waiver.healthOther ? (
            <View style={styles.healthOther}>
              <Text style={styles.healthOtherLabel}>기타 건강 정보:</Text>
              <Text style={styles.healthOtherText}>{waiver.healthOther}</Text>
            </View>
          ) : null}
        </View>

        {/* 서명 이미지 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>서명</Text>
          {waiver.signatureImage ? (
            <View style={styles.signatureContainer}>
              <Image
                source={{ uri: waiver.signatureImage }}
                style={styles.signatureImage}
                resizeMode="contain"
              />
            </View>
          ) : (
            <Text style={styles.noSignature}>서명 이미지 없음</Text>
          )}
          <View style={styles.agreedBadge}>
            <Text style={[styles.agreedText, waiver.agreed ? styles.agreedYes : styles.agreedNo]}>
              {waiver.agreed ? "✓ 동의함" : "✗ 미동의"}
            </Text>
          </View>
        </View>

        {/* 여백 */}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.pdfBtn, exporting && styles.btnDisabled]}
          onPress={handleExportPDF}
          disabled={exporting || deleting}
        >
          {exporting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.actionBtnText}>PDF 내보내기</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.deleteBtn, deleting && styles.btnDisabled]}
          onPress={handleDelete}
          disabled={exporting || deleting}
        >
          {deleting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.actionBtnText}>삭제</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8F4F8",
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#B0D4E3",
    backgroundColor: "#E8F4F8",
  },
  backBtn: {
    paddingVertical: 8,
  },
  backBtnText: {
    fontSize: 14,
    color: "#2196F3",
    fontWeight: "600",
  },
  signerName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#023E58",
    marginTop: 4,
  },
  signedAt: {
    fontSize: 12,
    color: "#3D7A94",
    marginTop: 2,
  },
  tourName: {
    fontSize: 13,
    color: "#3D7A94",
    marginTop: 2,
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#023E58",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E8F4F8",
    paddingBottom: 6,
  },

  // 개인정보
  infoRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  infoLabel: {
    width: 100,
    fontSize: 13,
    fontWeight: "600",
    color: "#3D7A94",
  },
  infoValue: {
    flex: 1,
    fontSize: 13,
    color: "#023E58",
  },

  // 건강 체크
  checkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 5,
  },
  checkIcon: {
    fontSize: 16,
    fontWeight: "700",
    width: 24,
    marginRight: 8,
  },
  checkYes: {
    color: "#4CAF50",
  },
  checkNo: {
    color: "#9E9E9E",
  },
  checkText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  checkTextYes: {
    color: "#D32F2F",
    fontWeight: "600",
  },
  checkTextNo: {
    color: "#555",
  },
  healthOther: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#FFF8E1",
    borderRadius: 8,
  },
  healthOtherLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#F57F17",
    marginBottom: 4,
  },
  healthOtherText: {
    fontSize: 13,
    color: "#333",
  },

  // 서명
  signatureContainer: {
    borderWidth: 1,
    borderColor: "#B0D4E3",
    borderRadius: 8,
    backgroundColor: "#FAFAFA",
    padding: 8,
    alignItems: "center",
    minHeight: 120,
    justifyContent: "center",
  },
  signatureImage: {
    width: "100%",
    height: 120,
  },
  noSignature: {
    textAlign: "center",
    color: "#999",
    fontSize: 13,
    paddingVertical: 20,
  },
  agreedBadge: {
    marginTop: 10,
    alignItems: "flex-start",
  },
  agreedText: {
    fontSize: 13,
    fontWeight: "700",
  },
  agreedYes: {
    color: "#4CAF50",
  },
  agreedNo: {
    color: "#F44336",
  },

  // Bottom buttons
  bottomBar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#B0D4E3",
    backgroundColor: "#E8F4F8",
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  pdfBtn: {
    backgroundColor: "#2196F3",
  },
  deleteBtn: {
    backgroundColor: "#F44336",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
