import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TourListScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>다이빙 투어</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.joinButton}>
            <Text style={styles.joinButtonText}>▶ 참여</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.newButton}>
            <Text style={styles.newButtonText}>+ 새 투어</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>🌊</Text>
        <Text style={styles.emptyTitle}>투어가 없습니다</Text>
        <Text style={styles.emptySubtitle}>
          새 다이빙 투어를 만들거나{"\n"}입장코드로 투어에 참여하세요
        </Text>
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
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#023E58",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#3D7A94",
    textAlign: "center",
    lineHeight: 20,
  },
});
