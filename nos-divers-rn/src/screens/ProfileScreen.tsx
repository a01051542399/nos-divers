import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useProfile, useAppSettings } from "../hooks/useSupabase";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../components/Toast";
import type { UserProfile } from "../store";
import { useTheme } from "../components/ThemeContext";

const DIVING_LEVELS = ["OW", "AOW", "레스큐", "DM", "강사", "기타"];

function formatPhone(v: string): string {
  const d = v.replace(/[^0-9]/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 7) return d.slice(0, 3) + "-" + d.slice(3);
  return d.slice(0, 3) + "-" + d.slice(3, 7) + "-" + d.slice(7);
}

function formatBirth(v: string): string {
  const d = v.replace(/[^0-9]/g, "").slice(0, 8);
  if (d.length <= 4) return d;
  if (d.length <= 6) return d.slice(0, 4) + "-" + d.slice(4);
  return d.slice(0, 4) + "-" + d.slice(4, 6) + "-" + d.slice(6);
}

import { useNavigation } from "@react-navigation/native";

export default function ProfileScreen() {
  const navigation = useNavigation();
  const onBack = () => navigation.goBack();
  const { user } = useAuth();
  const { profile, loading, updateProfile } = useProfile();
  const { settings } = useAppSettings();
  const { toast } = useToast();
  const { colors } = useTheme();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<UserProfile>({
    name: "",
    email: "",
    grade: "멤버",
  });
  const [saving, setSaving] = useState(false);

  // 비밀번호 확인 모달
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  useEffect(() => {
    if (profile) {
      setForm({ ...profile });
    }
  }, [profile]);

  const authProvider = user?.app_metadata?.provider;
  const authLabel =
    authProvider === "kakao"
      ? "카카오 연동"
      : authProvider === "google"
        ? "Google 연동"
        : authProvider === "email"
          ? "이메일 로그인"
          : "게스트";

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert("알림", "이름을 입력해주세요");
      return;
    }
    try {
      setSaving(true);
      await updateProfile(form);
      setEditing(false);
      Alert.alert("완료", "프로필이 저장되었습니다");
    } catch {
      Alert.alert("오류", "프로필 저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({ ...profile });
    setEditing(false);
  };

  // 수정 버튼 탭 → 비밀번호가 설정된 경우 모달 표시, 아니면 바로 편집 모드
  const handleEditPress = () => {
    if (settings.accountPassword) {
      setPinInput("");
      setPinError("");
      setShowPinModal(true);
    } else {
      setForm({ ...profile });
      setEditing(true);
    }
  };

  const handlePinConfirm = () => {
    if (!pinInput) {
      setPinError("비밀번호를 입력해주세요");
      return;
    }
    if (pinInput !== settings.accountPassword) {
      setPinError("비밀번호가 일치하지 않습니다");
      return;
    }
    setShowPinModal(false);
    setPinInput("");
    setPinError("");
    setForm({ ...profile });
    setEditing(true);
  };

  const handlePinCancel = () => {
    setShowPinModal(false);
    setPinInput("");
    setPinError("");
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={[styles.backBtn, { color: colors.primary }]}>← 설정</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>내 프로필</Text>
        <TouchableOpacity
          onPress={editing ? handleCancel : handleEditPress}
        >
          <Text style={[styles.editBtn, { color: colors.primary }]}>{editing ? "취소" : "수정"}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* 읽기 모드 */}
          {!editing && (
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <InfoRow label="이름" value={profile.name || "-"} />
              <InfoRow label="이메일" value={profile.email || "-"} />
              <InfoRow label="등급" value={profile.grade || "멤버"} badge />
              <InfoRow label="전화번호" value={profile.phone || "-"} />
              <InfoRow label="생년월일" value={profile.birthDate || "-"} />
              <InfoRow label="다이빙 레벨" value={profile.divingLevel || "-"} />
              <InfoRow label="비상연락처" value={profile.emergencyContact || "-"} />
              <InfoRow label="로그인" value={authLabel} last />
            </View>
          )}

          {/* 편집 모드 */}
          {editing && (
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <FieldInput
                label="이름 *"
                value={form.name}
                onChangeText={(v) => setForm({ ...form, name: v })}
                placeholder="이름"
              />
              <FieldInput
                label="이메일"
                value={form.email}
                onChangeText={(v) => setForm({ ...form, email: v })}
                placeholder="이메일"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <FieldInput
                label="전화번호"
                value={form.phone || ""}
                onChangeText={(v) => setForm({ ...form, phone: formatPhone(v) })}
                placeholder="01012345678"
                keyboardType="number-pad"
              />
              <FieldInput
                label="생년월일"
                value={form.birthDate || ""}
                onChangeText={(v) => setForm({ ...form, birthDate: formatBirth(v) })}
                placeholder="19900101"
                keyboardType="number-pad"
              />

              <Text style={styles.fieldLabel}>다이빙 레벨</Text>
              <View style={styles.levelRow}>
                {DIVING_LEVELS.map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.levelChip,
                      form.divingLevel === level && styles.levelChipActive,
                    ]}
                    onPress={() => setForm({ ...form, divingLevel: level })}
                  >
                    <Text
                      style={[
                        styles.levelChipText,
                        form.divingLevel === level && styles.levelChipTextActive,
                      ]}
                    >
                      {level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <FieldInput
                label="비상연락처"
                value={form.emergencyContact || ""}
                onChangeText={(v) => setForm({ ...form, emergencyContact: v })}
                placeholder="010-9876-5432 (배우자)"
              />

              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>저장</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 비밀번호 확인 모달 */}
      <Modal
        visible={showPinModal}
        transparent
        animationType="fade"
        onRequestClose={handlePinCancel}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>비밀번호 입력</Text>
            <Text style={styles.modalDesc}>프로필 수정을 위해 비밀번호를 입력하세요</Text>

            <TextInput
              style={[styles.modalInput, pinError ? styles.modalInputError : null]}
              value={pinInput}
              onChangeText={(v) => {
                setPinInput(v);
                if (pinError) setPinError("");
              }}
              placeholder="비밀번호"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              autoCapitalize="none"
              autoFocus
            />
            {pinError ? (
              <Text style={styles.pinErrorText}>{pinError}</Text>
            ) : null}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handlePinCancel}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handlePinConfirm}
              >
                <Text style={styles.confirmButtonText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Sub-components ───

function InfoRow({
  label,
  value,
  badge,
  last,
}: {
  label: string;
  value: string;
  badge?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.infoLabel}>{label}</Text>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{value}</Text>
        </View>
      ) : (
        <Text style={styles.infoValue}>{value}</Text>
      )}
    </View>
  );
}

function FieldInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "number-pad";
  autoCapitalize?: "none" | "sentences";
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

// ─── Styles ───

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8F4F8",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    fontSize: 15,
    fontWeight: "600",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  editBtn: {
    fontSize: 15,
    fontWeight: "600",
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  // Info row (read mode)
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E8F4F8",
  },
  infoLabel: {
    fontSize: 15,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "500",
    maxWidth: "60%",
    textAlign: "right",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  // Edit mode
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3D7A94",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#023E58",
  },
  levelRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  levelChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  levelChipActive: {
    backgroundColor: "#0891b2",
    borderColor: "#0891b2",
  },
  levelChipText: {
    fontSize: 13,
    color: "#3D7A94",
    fontWeight: "500",
  },
  levelChipTextActive: {
    color: "#fff",
  },
  saveBtn: {
    backgroundColor: "#0891b2",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  // 비밀번호 모달
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
    marginBottom: 6,
    textAlign: "center",
  },
  modalDesc: {
    fontSize: 13,
    color: "#3D7A94",
    textAlign: "center",
    marginBottom: 20,
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
    marginBottom: 6,
  },
  modalInputError: {
    borderColor: "#F44336",
  },
  pinErrorText: {
    fontSize: 12,
    color: "#F44336",
    marginBottom: 12,
    marginLeft: 2,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
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
  confirmButton: {
    backgroundColor: "#0891b2",
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});
