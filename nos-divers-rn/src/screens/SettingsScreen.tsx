import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../lib/AuthContext";
import { useTheme, ThemeMode } from "../components/ThemeContext";
import { useAppSettings } from "../hooks/useSupabase";
import { useToast } from "../components/Toast";
import * as db from "../lib/supabase-store";

const THEME_MODES: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "라이트" },
  { value: "dark", label: "다크" },
  { value: "system", label: "시스템" },
];

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { user, signOut } = useAuth();
  const { mode, setMode } = useTheme();
  const { settings, refresh: refreshSettings } = useAppSettings();
  const { toast, confirm } = useToast();

  // 비밀번호 변경 모달 상태
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  // 관리자 모드 모달 상태
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPw, setAdminPw] = useState("");
  const [verifyingAdmin, setVerifyingAdmin] = useState(false);

  const cycleModeLabel = THEME_MODES.find((m) => m.value === mode)?.label ?? "시스템";

  const cycleThemeMode = () => {
    const idx = THEME_MODES.findIndex((m) => m.value === mode);
    const next = THEME_MODES[(idx + 1) % THEME_MODES.length];
    setMode(next.value);
  };

  const handleSignOut = async () => {
    const confirmed = await confirm("정말 로그아웃 하시겠습니까?");
    if (confirmed) {
      await signOut();
    }
  };

  const openPasswordModal = () => {
    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
    setShowPasswordModal(true);
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
  };

  const handleSavePassword = async () => {
    // 현재 비밀번호가 설정된 경우 검증
    if (settings.accountPassword) {
      if (!currentPw) {
        toast("현재 비밀번호를 입력해주세요", "error");
        return;
      }
      if (currentPw !== settings.accountPassword) {
        toast("현재 비밀번호가 일치하지 않습니다", "error");
        return;
      }
    }

    if (newPw.length < 4) {
      toast("새 비밀번호는 4자 이상이어야 합니다", "error");
      return;
    }

    if (newPw !== confirmPw) {
      toast("새 비밀번호가 일치하지 않습니다", "error");
      return;
    }

    try {
      setSavingPw(true);
      await db.setAccountPassword(newPw);
      await refreshSettings();
      closePasswordModal();
      toast("비밀번호가 변경되었습니다", "success");
    } catch {
      toast("비밀번호 변경에 실패했습니다", "error");
    } finally {
      setSavingPw(false);
    }
  };

  const openAdminModal = () => {
    setAdminPw("");
    setShowAdminModal(true);
  };

  const closeAdminModal = () => {
    setShowAdminModal(false);
    setAdminPw("");
  };

  const handleAdminLogin = async () => {
    if (!adminPw.trim()) {
      toast("관리자 비밀번호를 입력해주세요", "error");
      return;
    }
    try {
      setVerifyingAdmin(true);
      const ok = await db.verifyAdminPassword(adminPw);
      if (ok) {
        closeAdminModal();
        navigation.navigate("AdminDashboard");
      } else {
        toast("관리자 비밀번호가 올바르지 않습니다", "error");
      }
    } catch {
      toast("인증에 실패했습니다", "error");
    } finally {
      setVerifyingAdmin(false);
    }
  };

  const hasPassword = Boolean(settings.accountPassword);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.title}>설정</Text>
      <ScrollView style={styles.scroll}>
        <View style={styles.card}>
          <View style={styles.appInfoRow}>
            <Image
              source={require("../../assets/logo-dolphin-official.png")}
              style={{ width: 52, height: 52, borderRadius: 12 }}
            />
            <View style={styles.appInfoText}>
              <Text style={styles.cardTitle}>NoS Divers</Text>
              <Text style={styles.cardSubtitle}>SINCE 2019 DIVING TEAM</Text>
            </View>
          </View>
          <Text style={styles.cardDesc}>
            다이빙 투어 비용 정산과 면책동의서 서명을 간편하게 관리하세요.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>계정</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("Profile")}>
            <Text style={styles.menuText}>내 프로필</Text>
            <Text style={styles.menuValue}>{user?.email ?? ""} ›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={openPasswordModal}>
            <Text style={styles.menuText}>비밀번호 변경</Text>
            <Text style={styles.menuValue}>
              {hasPassword ? "설정됨 ›" : "미설정 ›"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
            <Text style={[styles.menuText, { color: "#2196F3" }]}>로그아웃</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>설정</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.menuItem} onPress={cycleThemeMode}>
            <Text style={styles.menuText}>화면 모드</Text>
            <Text style={styles.menuValue}>{cycleModeLabel} ›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("HiddenTours")}>
            <Text style={styles.menuText}>숨긴 투어</Text>
            <Text style={styles.menuValue}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("Trash")}>
            <Text style={styles.menuText}>임시보관함</Text>
            <Text style={styles.menuValue}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={openAdminModal}>
            <Text style={styles.menuText}>관리자 모드</Text>
            <Text style={styles.menuValue}>›</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>정보</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("SettingsGuide")}>
            <Text style={styles.menuText}>사용설명서</Text>
            <Text style={styles.menuValue}>›</Text>
          </TouchableOpacity>
          <View style={styles.menuItem}>
            <Text style={styles.menuText}>버전</Text>
            <Text style={styles.menuValue}>2.0.0</Text>
          </View>
        </View>
      </ScrollView>

      {/* 비밀번호 변경 모달 */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={closePasswordModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>비밀번호 변경</Text>

            {hasPassword && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>현재 비밀번호</Text>
                <TextInput
                  style={styles.modalInput}
                  value={currentPw}
                  onChangeText={setCurrentPw}
                  placeholder="현재 비밀번호 입력"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>새 비밀번호</Text>
              <TextInput
                style={styles.modalInput}
                value={newPw}
                onChangeText={setNewPw}
                placeholder="새 비밀번호 (4자 이상)"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>비밀번호 확인</Text>
              <TextInput
                style={styles.modalInput}
                value={confirmPw}
                onChangeText={setConfirmPw}
                placeholder="비밀번호 다시 입력"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={closePasswordModal}
                disabled={savingPw}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, savingPw && styles.saveButtonDisabled]}
                onPress={handleSavePassword}
                disabled={savingPw}
              >
                <Text style={styles.saveButtonText}>
                  {savingPw ? "저장 중..." : "저장"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 관리자 모드 인증 모달 */}
      <Modal
        visible={showAdminModal}
        transparent
        animationType="fade"
        onRequestClose={closeAdminModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>관리자 인증</Text>
            <Text style={styles.adminDesc}>
              관리자 비밀번호를 입력하세요.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>관리자 비밀번호</Text>
              <TextInput
                style={styles.modalInput}
                value={adminPw}
                onChangeText={setAdminPw}
                placeholder="비밀번호 입력"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                autoCapitalize="none"
                onSubmitEditing={handleAdminLogin}
                returnKeyType="done"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={closeAdminModal}
                disabled={verifyingAdmin}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, verifyingAdmin && styles.saveButtonDisabled]}
                onPress={handleAdminLogin}
                disabled={verifyingAdmin}
              >
                {verifyingAdmin ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>확인</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  scroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3D7A94",
    marginTop: 20,
    marginBottom: 8,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 4,
  },
  appInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 10,
  },
  appInfoText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#023E58",
  },
  cardSubtitle: {
    fontSize: 11,
    color: "#3D7A94",
  },
  cardDesc: {
    fontSize: 13,
    color: "#3D7A94",
    lineHeight: 18,
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E8F4F8",
  },
  menuText: {
    fontSize: 16,
    color: "#023E58",
  },
  menuValue: {
    fontSize: 14,
    color: "#3D7A94",
  },
  // 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#023E58",
    marginBottom: 8,
    textAlign: "center",
  },
  adminDesc: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3D7A94",
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#023E58",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F0F0F0",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#666",
  },
  saveButton: {
    backgroundColor: "#0891b2",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});
