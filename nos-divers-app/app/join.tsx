import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { trpc } from "../lib/trpc";
import { useColors } from "../hooks/use-colors";

export default function JoinScreen() {
  const colors = useColors();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [inviteCode, setInviteCode] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [name, setName] = useState("");

  const tourQuery = trpc.tour.getByInviteCode.useQuery(
    { code: inviteCode },
    { enabled: false }
  );

  const joinMutation = trpc.tour.joinByInviteCode.useMutation({
    onSuccess: (data) => {
      Alert.alert("참가 완료", "투어에 참가하였습니다!", [
        { text: "확인", onPress: () => router.replace(`/tour/${data.tourId}`) },
      ]);
    },
    onError: (err) => {
      Alert.alert("오류", err.message);
    },
  });

  const handleCheckCode = async () => {
    if (inviteCode.length < 4) {
      Alert.alert("오류", "초대 코드를 입력해주세요");
      return;
    }
    const result = await tourQuery.refetch();
    if (result.data) {
      setStep(1);
    } else {
      Alert.alert("오류", "유효하지 않은 초대 코드입니다");
    }
  };

  const handleJoin = () => {
    if (!name.trim()) {
      Alert.alert("오류", "이름을 입력해주세요");
      return;
    }
    joinMutation.mutate({
      code: inviteCode,
      accessCode,
      name: name.trim(),
    });
  };

  const tour = tourQuery.data;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, padding: 24, justifyContent: "center" }}>
        {/* Step 0: Enter Invite Code */}
        {step === 0 && (
          <View>
            <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.foreground, textAlign: "center", marginBottom: 8 }}>
              투어 참가
            </Text>
            <Text style={{ color: colors.muted, textAlign: "center", marginBottom: 32 }}>
              초대 코드를 입력하세요
            </Text>

            <TextInput
              value={inviteCode}
              onChangeText={(text) => setInviteCode(text.toUpperCase())}
              placeholder="초대 코드 (8자리)"
              placeholderTextColor={colors.muted}
              autoCapitalize="characters"
              maxLength={8}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 16,
                fontSize: 24,
                textAlign: "center",
                letterSpacing: 4,
                color: colors.foreground,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 20,
              }}
            />

            <TouchableOpacity
              onPress={handleCheckCode}
              disabled={tourQuery.isFetching}
              style={{
                backgroundColor: colors.primary,
                borderRadius: 12,
                padding: 16,
                alignItems: "center",
              }}
            >
              {tourQuery.isFetching ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>확인</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Step 1: Confirm Tour */}
        {step === 1 && tour && (
          <View>
            <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.foreground, textAlign: "center", marginBottom: 20 }}>
              투어 정보 확인
            </Text>

            <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 20, fontWeight: "600", color: colors.foreground, marginBottom: 8 }}>{tour.name}</Text>
              {tour.date ? <Text style={{ color: colors.muted }}>📅 {tour.date}</Text> : null}
              {tour.location ? <Text style={{ color: colors.muted }}>📍 {tour.location}</Text> : null}
              {tour.createdBy ? <Text style={{ color: colors.muted, marginTop: 4 }}>주최: {tour.createdBy}</Text> : null}
            </View>

            <TextInput
              value={accessCode}
              onChangeText={setAccessCode}
              placeholder="접근 코드 (4자리)"
              keyboardType="numeric"
              maxLength={4}
              placeholderTextColor={colors.muted}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 10,
                padding: 14,
                fontSize: 20,
                textAlign: "center",
                letterSpacing: 6,
                color: colors.foreground,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 12,
              }}
            />

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="참가자 이름"
              placeholderTextColor={colors.muted}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 10,
                padding: 14,
                color: colors.foreground,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 20,
              }}
            />

            <TouchableOpacity
              onPress={handleJoin}
              disabled={joinMutation.isPending}
              style={{
                backgroundColor: colors.primary,
                borderRadius: 12,
                padding: 16,
                alignItems: "center",
                opacity: joinMutation.isPending ? 0.6 : 1,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
                {joinMutation.isPending ? "참가 중..." : "참가하기"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setStep(0)}
              style={{ marginTop: 12, alignItems: "center" }}
            >
              <Text style={{ color: colors.muted }}>뒤로</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
