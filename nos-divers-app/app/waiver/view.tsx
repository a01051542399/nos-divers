import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { trpc } from "../../lib/trpc";
import { useColors } from "../../hooks/use-colors";

export default function WaiverViewScreen() {
  const { tourId } = useLocalSearchParams<{ tourId: string }>();
  const colors = useColors();

  const waiversQuery = trpc.waiver.listByTour.useQuery({
    tourId: Number(tourId),
  });
  const deleteWaiver = trpc.waiver.delete.useMutation({
    onSuccess: () => waiversQuery.refetch(),
  });

  if (waiversQuery.isLoading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const waivers = waiversQuery.data || [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={waivers}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <Text
            style={{
              fontSize: 14,
              color: colors.muted,
              marginBottom: 12,
            }}
          >
            총 {waivers.length}건의 서명
          </Text>
        }
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>📋</Text>
            <Text style={{ color: colors.muted }}>서명된 면책동의서가 없습니다</Text>
          </View>
        }
        renderItem={({ item }) => {
          const info = item.personalInfo as any;
          return (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 16,
                marginBottom: 10,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 17,
                    fontWeight: "600",
                    color: colors.foreground,
                  }}
                >
                  {item.signerName}
                </Text>
                <View
                  style={{
                    backgroundColor: colors.success + "20",
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 12,
                  }}
                >
                  <Text style={{ color: colors.success, fontSize: 12 }}>
                    서명 완료
                  </Text>
                </View>
              </View>

              <View style={{ marginTop: 8, gap: 2 }}>
                <Text style={{ color: colors.muted, fontSize: 13 }}>
                  📱 {info?.phone || "-"}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 13 }}>
                  🤿 {info?.divingLevel || "-"}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 13 }}>
                  📅 {item.signedAt
                    ? new Date(item.signedAt).toLocaleDateString("ko-KR")
                    : "-"}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() =>
                  Alert.alert("삭제", "이 서명을 삭제하시겠습니까?", [
                    { text: "취소" },
                    {
                      text: "삭제",
                      style: "destructive",
                      onPress: () => deleteWaiver.mutate({ id: item.id }),
                    },
                  ])
                }
                style={{ marginTop: 10 }}
              >
                <Text style={{ color: colors.error, fontSize: 13 }}>삭제</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}
