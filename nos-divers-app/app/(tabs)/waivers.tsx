import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { trpc } from "../../lib/trpc";
import { useColors } from "../../hooks/use-colors";

export default function WaiversTab() {
  const colors = useColors();
  const router = useRouter();
  const toursQuery = trpc.tour.list.useQuery();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 20, paddingBottom: 10 }}>
        <Text
          style={{
            fontSize: 28,
            fontWeight: "bold",
            color: colors.foreground,
          }}
        >
          면책동의서
        </Text>
        <Text style={{ color: colors.muted, marginTop: 4 }}>
          투어를 선택하여 면책서를 관리하세요
        </Text>
      </View>

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
            <View style={{ alignItems: "center", marginTop: 40 }}>
              <Text style={{ color: colors.muted }}>투어가 없습니다</Text>
            </View>
          }
          renderItem={({ item }) => (
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
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "600",
                  color: colors.foreground,
                  marginBottom: 8,
                }}
              >
                {item.name}
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  onPress={() =>
                    router.push(`/waiver/sign?tourId=${item.id}`)
                  }
                  style={{
                    flex: 1,
                    backgroundColor: colors.primary,
                    borderRadius: 8,
                    paddingVertical: 10,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "600" }}>
                    서명하기
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    router.push(`/waiver/view?tourId=${item.id}`)
                  }
                  style={{
                    flex: 1,
                    backgroundColor: colors.background,
                    borderRadius: 8,
                    paddingVertical: 10,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ color: colors.foreground }}>서명 목록</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
