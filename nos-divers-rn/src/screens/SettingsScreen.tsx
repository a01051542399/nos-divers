import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../lib/AuthContext";

export default function SettingsScreen() {
  const { user, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert("로그아웃", "정말 로그아웃 하시겠습니까?", [
      { text: "취소", style: "cancel" },
      { text: "로그아웃", style: "destructive", onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.title}>설정</Text>
      <ScrollView style={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>NoS Divers</Text>
          <Text style={styles.cardSubtitle}>SINCE 2019 DIVING TEAM</Text>
          <Text style={styles.cardDesc}>
            다이빙 투어 비용 정산과 면책동의서 서명을 간편하게 관리하세요.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>계정</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>내 프로필</Text>
            <Text style={styles.menuValue}>{user?.email ?? ""}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>비밀번호 변경</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
            <Text style={[styles.menuText, { color: "#2196F3" }]}>로그아웃</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>설정</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>화면 모드</Text>
            <Text style={styles.menuValue}>시스템</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>관리자 모드</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>정보</Text>
        <View style={styles.card}>
          <View style={styles.menuItem}>
            <Text style={styles.menuText}>버전</Text>
            <Text style={styles.menuValue}>2.0.0</Text>
          </View>
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
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#023E58",
  },
  cardSubtitle: {
    fontSize: 11,
    color: "#3D7A94",
    marginBottom: 8,
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
});
