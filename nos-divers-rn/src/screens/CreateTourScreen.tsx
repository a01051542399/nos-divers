import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../components/ThemeContext";
import * as db from "../lib/supabase-store";

export default function CreateTourScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const [name, setName] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [location, setLocation] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [profileName, setProfileName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    db.getProfile().then((p) => setProfileName(p.name || ""));
  }, []);

  // 6자리 날짜 포맷
  const formatDateInput = (v: string) => v.replace(/[^0-9]/g, "").slice(0, 6);
  const displayDate = (v: string) => {
    if (v.length <= 2) return v;
    if (v.length <= 4) return v.slice(0, 2) + "." + v.slice(2);
    return v.slice(0, 2) + "." + v.slice(2, 4) + "." + v.slice(4);
  };
  const isValidDate = (v: string) => {
    if (v.length !== 6) return false;
    const m = parseInt(v.slice(2, 4), 10);
    const d = parseInt(v.slice(4, 6), 10);
    return m >= 1 && m <= 12 && d >= 1 && d <= 31;
  };

  const handleCreate = async () => {
    if (!profileName.trim()) {
      Alert.alert("알림", "설정에서 이름을 먼저 등록해주세요");
      return;
    }
    if (!name.trim()) {
      Alert.alert("알림", "투어 이름을 입력해주세요");
      return;
    }
    if (!isValidDate(dateStart) || !isValidDate(dateEnd)) {
      Alert.alert("알림", "날짜를 정확히 입력해주세요 (6자리: 연월일)");
      return;
    }
    if (!/^\d{4}$/.test(accessCode)) {
      Alert.alert("알림", "수정 비밀번호는 4자리 숫자여야 합니다");
      return;
    }

    setSubmitting(true);
    try {
      const dateStr = displayDate(dateStart) + " ~ " + displayDate(dateEnd);
      await db.createTour({
        name: name.trim(),
        date: dateStr,
        location: location.trim(),
        accessCode,
        createdBy: profileName.trim(),
      });
      Alert.alert("완료", "투어가 생성되었습니다", [
        { text: "확인", onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert("오류", e.message || "투어 생성에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[styles.backText, { color: colors.primary }]}>취소</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>새 투어 만들기</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.form}
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* 투어 이름 */}
          <Text style={[styles.label, { color: colors.text }]}>투어 이름 *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            value={name}
            onChangeText={setName}
            placeholder="예: 동해 수중정화활동"
            placeholderTextColor={colors.muted}
          />

          {/* 주최자 */}
          <Text style={[styles.label, { color: colors.text }]}>주최자</Text>
          <View style={[styles.readonlyField, { backgroundColor: colors.inputBg }]}>
            {profileName ? (
              <Text style={[styles.readonlyText, { color: colors.text }]}>{profileName}</Text>
            ) : (
              <Text style={[styles.errorHint, { color: colors.error }]}>
                설정에서 이름을 먼저 등록해주세요
              </Text>
            )}
          </View>

          {/* 수정 비밀번호 */}
          <Text style={[styles.label, { color: colors.text }]}>수정 비밀번호 * (4자리 숫자)</Text>
          <TextInput
            style={[styles.input, styles.pinInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            value={accessCode}
            onChangeText={(v) => setAccessCode(v.replace(/[^0-9]/g, "").slice(0, 4))}
            placeholder="0000"
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
          />
          <Text style={[styles.hint, { color: colors.muted }]}>
            *내용 수정시 사용, 관리자에게만 공개하십시오
          </Text>

          {/* 투어 기간 */}
          <Text style={[styles.label, { color: colors.text }]}>투어 기간 * (연월일 6자리)</Text>
          <View style={styles.dateRow}>
            <TextInput
              style={[styles.input, styles.dateInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={displayDate(dateStart)}
              onChangeText={(v) => setDateStart(formatDateInput(v))}
              placeholder="260401"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              maxLength={8}
            />
            <Text style={[styles.dateSeparator, { color: colors.muted }]}>~</Text>
            <TextInput
              style={[styles.input, styles.dateInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={displayDate(dateEnd)}
              onChangeText={(v) => setDateEnd(formatDateInput(v))}
              placeholder="260403"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              maxLength={8}
            />
          </View>
          <Text style={[styles.hint, { color: colors.muted }]}>
            예: 260401 ~ 260403 (26년 4월 1일 ~ 3일)
          </Text>

          {/* 장소 */}
          <Text style={[styles.label, { color: colors.text }]}>장소</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            value={location}
            onChangeText={setLocation}
            placeholder="예: 사라웃리조트"
            placeholderTextColor={colors.muted}
          />

          {/* 버튼 */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => navigation.goBack()}
            >
              <Text style={[styles.cancelButtonText, { color: colors.muted }]}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.createButton,
                { backgroundColor: colors.primary },
                submitting && styles.buttonDisabled,
              ]}
              onPress={handleCreate}
              disabled={submitting}
            >
              <Text style={styles.createButtonText}>
                {submitting ? "생성 중..." : "만들기"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#C8DDE5",
  },
  backText: {
    fontSize: 16,
    color: "#2196F3",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#023E58",
  },
  form: {
    flex: 1,
  },
  formContent: {
    padding: 20,
    paddingBottom: 40,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#023E58",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#023E58",
    borderWidth: 1,
    borderColor: "#D4E8EF",
  },
  pinInput: {
    textAlign: "center",
    fontSize: 28,
    letterSpacing: 12,
    fontWeight: "700",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateInput: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 1,
  },
  dateSeparator: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3D7A94",
  },
  readonlyField: {
    backgroundColor: "#F0F7FA",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  readonlyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#023E58",
  },
  errorHint: {
    fontSize: 13,
    color: "#E53935",
  },
  hint: {
    fontSize: 11,
    color: "#3D7A94",
    marginTop: 6,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 32,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D4E8EF",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3D7A94",
  },
  createButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "#2196F3",
    alignItems: "center",
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
