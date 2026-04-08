import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, ThemeMode } from "../components/ThemeContext";
import { useToast } from "../components/Toast";

const THEME_OPTIONS: { value: ThemeMode; label: string; desc: string }[] = [
  { value: "light", label: "라이트 모드", desc: "항상 밝은 화면을 사용합니다" },
  { value: "dark", label: "다크 모드", desc: "항상 어두운 화면을 사용합니다" },
  { value: "system", label: "시스템 설정", desc: "기기 설정에 따라 자동으로 전환됩니다" },
];

export default function SettingsDisplayScreen() {
  const navigation = useNavigation<any>();
  const { mode, setMode, colors } = useTheme();
  const { toast } = useToast();

  const handleSelect = async (value: ThemeMode) => {
    await setMode(value);
    toast("테마가 변경되었습니다", "success");
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>화면 모드</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.sectionDesc, { color: colors.muted }]}>
          앱의 색상 테마를 선택하세요.
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {THEME_OPTIONS.map((option, index) => {
            const isSelected = mode === option.value;
            const isLast = index === THEME_OPTIONS.length - 1;

            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.optionRow, !isLast && { borderBottomColor: colors.border }, !isLast && styles.optionRowBorder]}
                onPress={() => handleSelect(option.value)}
                activeOpacity={0.7}
              >
                <View style={styles.optionLeft}>
                  <View style={[styles.radioOuter, { borderColor: colors.border }, isSelected && { borderColor: colors.primary }]}>
                    {isSelected && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                  </View>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionLabel, { color: colors.text }, isSelected && { color: colors.primary, fontWeight: "600" }]}>
                      {option.label}
                    </Text>
                    <Text style={[styles.optionDesc, { color: colors.muted }]}>{option.desc}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
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
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#023E58",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  sectionDesc: {
    fontSize: 13,
    color: "#3D7A94",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  optionRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#E8F4F8",
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 14,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#C0D9E4",
    justifyContent: "center",
    alignItems: "center",
  },
  radioOuterSelected: {
    borderColor: "#2196F3",
  },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: "#2196F3",
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    color: "#023E58",
    fontWeight: "500",
  },
  optionLabelSelected: {
    color: "#2196F3",
    fontWeight: "600",
  },
  optionDesc: {
    fontSize: 12,
    color: "#3D7A94",
    marginTop: 2,
  },
});
