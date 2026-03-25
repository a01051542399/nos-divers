import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Share,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { trpc } from "../../lib/trpc";
import { useColors } from "../../hooks/use-colors";

export default function TourListScreen() {
  const colors = useColors();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [newTour, setNewTour] = useState({
    name: "",
    date: "",
    location: "",
    accessCode: "0000",
    createdBy: "",
  });

  const toursQuery = trpc.tour.list.useQuery();
  const createMutation = trpc.tour.create.useMutation({
    onSuccess: () => {
      toursQuery.refetch();
      setShowCreate(false);
      setNewTour({ name: "", date: "", location: "", accessCode: "0000", createdBy: "" });
    },
  });

  const handleCreate = () => {
    if (!newTour.name.trim()) {
      Alert.alert("오류", "투어 이름을 입력해주세요");
      return;
    }
    createMutation.mutate(newTour);
  };

  const handleShare = async (inviteCode: string) => {
    try {
      await Share.share({
        message: `NoS Divers 투어에 참가하세요!\n초대 코드: ${inviteCode}`,
      });
    } catch {}
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ padding: 20, paddingBottom: 10 }}>
        <Text
          style={{
            fontSize: 28,
            fontWeight: "bold",
            color: colors.foreground,
          }}
        >
          다이빙 투어
        </Text>
      </View>

      {/* Tour List */}
      {toursQuery.isLoading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 40 }}
        />
      ) : (
        <FlatList
          data={toursQuery.data || []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 60 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🤿</Text>
              <Text style={{ color: colors.muted, fontSize: 16 }}>
                아직 투어가 없습니다
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/tour/${item.id}`)}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  color: colors.foreground,
                  marginBottom: 4,
                }}
              >
                {item.name}
              </Text>
              <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                {item.date ? (
                  <Text style={{ color: colors.muted, fontSize: 14 }}>
                    📅 {item.date}
                  </Text>
                ) : null}
                {item.location ? (
                  <Text style={{ color: colors.muted, fontSize: 14 }}>
                    📍 {item.location}
                  </Text>
                ) : null}
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginTop: 8,
                }}
              >
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  초대코드: {item.inviteCode}
                </Text>
                <TouchableOpacity onPress={() => handleShare(item.inviteCode)}>
                  <Text style={{ color: colors.primary, fontSize: 12 }}>
                    공유
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* FAB: Create Tour */}
      <TouchableOpacity
        onPress={() => setShowCreate(true)}
        style={{
          position: "absolute",
          bottom: 30,
          right: 20,
          backgroundColor: colors.primary,
          width: 56,
          height: 56,
          borderRadius: 28,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 5,
        }}
      >
        <Text style={{ color: "#fff", fontSize: 28, lineHeight: 30 }}>+</Text>
      </TouchableOpacity>

      {/* Create Tour Modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 24,
              paddingBottom: 40,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "bold",
                color: colors.foreground,
                marginBottom: 20,
              }}
            >
              새 투어 만들기
            </Text>

            {[
              { key: "name", label: "투어 이름 *", placeholder: "예: 속초 다이빙" },
              { key: "date", label: "날짜", placeholder: "예: 2026-04-01" },
              { key: "location", label: "장소", placeholder: "예: 속초 대포항" },
              { key: "accessCode", label: "접근 코드 (4자리)", placeholder: "0000" },
              { key: "createdBy", label: "주최자", placeholder: "이름" },
            ].map((field) => (
              <View key={field.key} style={{ marginBottom: 12 }}>
                <Text
                  style={{
                    color: colors.muted,
                    fontSize: 13,
                    marginBottom: 4,
                  }}
                >
                  {field.label}
                </Text>
                <TextInput
                  value={(newTour as any)[field.key]}
                  onChangeText={(text) =>
                    setNewTour({ ...newTour, [field.key]: text })
                  }
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.muted}
                  style={{
                    backgroundColor: colors.background,
                    borderRadius: 8,
                    padding: 12,
                    color: colors.foreground,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                />
              </View>
            ))}

            <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
              <TouchableOpacity
                onPress={() => setShowCreate(false)}
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 10,
                  backgroundColor: colors.background,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: colors.muted }}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreate}
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 10,
                  backgroundColor: colors.primary,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>만들기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
