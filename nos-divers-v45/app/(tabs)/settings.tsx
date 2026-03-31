import { useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Platform,
  StyleSheet,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import * as Store from "@/lib/store";
import { Image } from "expo-image";

export default function SettingsScreen() {
  const colors = useColors();
  const [clearing, setClearing] = useState(false);

  const handleClearData = () => {
    if (Platform.OS === "web") {
      window.alert("데이터는 서버에 저장되어 있습니다.\n개별 투어나 동의서는 각 화면에서 삭제할 수 있습니다.");
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>설정</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* 앱 정보 */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Image
              source={require("@/assets/images/logo-dolphin.png")}
              style={{ width: 50, height: 50, borderRadius: 12 }}
              contentFit="contain"
            />
            <View style={styles.appInfo}>
              <Text style={[styles.appName, { color: colors.foreground }]}>NoS Divers</Text>
              <Text style={[styles.appVersion, { color: colors.muted }]}>SINCE 2019 DIVING TEAM</Text>
            </View>
          </View>
          <Text style={[styles.appDesc, { color: colors.muted }]}>
            다이빙 투어 비용 정산과 면책동의서 서명을 간편하게 관리하세요.
          </Text>
        </View>

        {/* 데이터 관리 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>데이터 관리</Text>
          <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, { backgroundColor: colors.muted + "15" }]}>
                  <IconSymbol name="trash.fill" size={18} color={colors.muted} />
                </View>
                <View>
                  <Text style={[styles.menuItemTitle, { color: colors.muted }]}>
                    모든 데이터 삭제
                  </Text>
                  <Text style={[styles.menuItemDesc, { color: colors.muted }]}>
                    관리자만 사용 가능합니다
                  </Text>
                </View>
              </View>
              <IconSymbol name="lock.fill" size={16} color={colors.muted} />
            </View>
          </View>
        </View>

        {/* 정보 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>정보</Text>
          <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.menuItem, { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}>
              <Text style={[styles.menuItemTitle, { color: colors.foreground }]}>버전</Text>
              <Text style={[styles.menuItemValue, { color: colors.muted }]}>1.0.0</Text>
            </View>
            <View style={styles.menuItem}>
              <Text style={[styles.menuItemTitle, { color: colors.foreground }]}>개발</Text>
              <Text style={[styles.menuItemValue, { color: colors.muted }]}>NOS DIVERS</Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
  content: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 12,
  },
  appInfo: {
    flex: 1,
  },
  appName: {
    fontSize: 20,
    fontWeight: "700",
  },
  appVersion: {
    fontSize: 14,
    marginTop: 2,
  },
  appDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  menuCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: "500",
  },
  menuItemDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  menuItemValue: {
    fontSize: 15,
  },
});
