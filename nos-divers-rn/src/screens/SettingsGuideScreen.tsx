import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

interface Section {
  title: string;
  body: string;
}

const SECTIONS: Section[] = [
  {
    title: "1. 회원가입 및 로그인",
    body:
      "이메일/비밀번호로 직접 가입하거나, 카카오·구글 계정으로 간편 로그인할 수 있습니다.\n\n" +
      "• 이메일 가입: '회원가입' 버튼을 눌러 이메일과 비밀번호를 입력한 뒤 가입합니다.\n" +
      "• 카카오 로그인: 카카오 버튼을 누르면 카카오 인증 화면으로 이동합니다. 인증 완료 후 앱으로 자동 복귀합니다.\n" +
      "• 구글 로그인: 구글 버튼을 누르면 Chrome Custom Tab에서 구글 인증이 진행됩니다.\n" +
      "• 최초 로그인 후 이름을 등록해야 댓글·투어 개설 기능을 사용할 수 있습니다.",
  },
  {
    title: "2. 투어 만들기",
    body:
      "다이빙 투어를 만들어 비용과 동의서를 관리하세요.\n\n" +
      "• 투어 목록 화면에서 '+ 새 투어' 버튼을 누릅니다.\n" +
      "• 투어 이름, 날짜(YYMMDD 형식, 예: 250315), 장소를 입력합니다.\n" +
      "• 4자리 PIN을 설정합니다. 투어 수정·삭제 시 이 PIN이 필요합니다.\n" +
      "• 생성 완료 후 6자리 초대 코드가 자동으로 발급됩니다.",
  },
  {
    title: "3. 투어 참여하기",
    body:
      "투어 개설자에게 초대 코드를 받아 참여할 수 있습니다.\n\n" +
      "• 투어 목록 화면에서 '참여' 버튼을 누릅니다.\n" +
      "• 6자리 초대 코드를 정확히 입력합니다.\n" +
      "• 참여가 완료되면 해당 투어가 목록에 표시됩니다.\n" +
      "• 참여 후에도 비용 조회, 정산 확인, 동의서 서명이 가능합니다.",
  },
  {
    title: "4. 멤버 초대",
    body:
      "투어 초대 코드를 다른 다이버에게 공유하세요.\n\n" +
      "• 투어 상세 화면 상단에 6자리 초대 코드가 표시됩니다.\n" +
      "• 코드를 탭하면 클립보드에 복사됩니다.\n" +
      "• 복사된 코드를 카카오톡이나 문자로 전달하세요.\n" +
      "• 초대 코드는 영구적으로 유효합니다.",
  },
  {
    title: "5. 참여자 관리",
    body:
      "투어에 참여하는 다이버를 직접 추가하거나 삭제할 수 있습니다.\n\n" +
      "• 투어 상세 → '참여자' 탭에서 이름을 입력하고 추가 버튼을 누릅니다.\n" +
      "• 참여자 이름 오른쪽의 휴지통 버튼으로 삭제할 수 있습니다.\n" +
      "• 참여자는 비용 분배·정산·동의서 서명에 모두 연동됩니다.\n" +
      "• 참여자 삭제 시 관련 비용 분배 정보도 함께 조정됩니다.",
  },
  {
    title: "6. 비용 입력",
    body:
      "다이빙 투어의 모든 비용을 기록하고 자동으로 정산합니다.\n\n" +
      "• 투어 상세 → '비용' 탭 → '+' 버튼으로 비용을 추가합니다.\n" +
      "• 지원 통화: KRW(원), USD(달러), PHP(페소), THB(바트), IDR(루피아), JPY(엔)\n" +
      "• 외화 선택 시 환율이 자동으로 조회됩니다. 수동 입력도 가능합니다.\n" +
      "• 분배 방식: 균등(참여자 전원 동일 금액) 또는 지정(각자 금액 직접 입력)\n" +
      "• 영수증 사진을 촬영해 첨부할 수 있습니다 (최대 5MB).",
  },
  {
    title: "7. 정산 확인",
    body:
      "누가 누구에게 얼마를 보내야 하는지 자동으로 계산됩니다.\n\n" +
      "• 투어 상세 → '정산' 탭에서 이체 목록을 확인합니다.\n" +
      "• 외화 비용은 입력한 환율로 원화 환산 후 계산됩니다.\n" +
      "• 최소 이체 횟수로 최적화된 정산 결과를 제공합니다.\n" +
      "• PDF 내보내기: 비용 매트릭스 + 정산 내역을 PDF로 저장합니다.\n" +
      "• Excel 내보내기: 정산 매트릭스·송금 내역·영수증 목록을 3시트로 저장합니다.",
  },
  {
    title: "8. 면책동의서 서명",
    body:
      "다이빙 전 안전을 위한 면책동의서를 3단계로 작성합니다.\n\n" +
      "• 1단계 — 개인정보: 이름, 생년월일, 전화번호, 다이빙 레벨, 투어 기간/장소, 비상 연락처\n" +
      "• 2단계 — 건강 체크: 6개 건강 항목에 체크 및 기타 사항 입력\n" +
      "• 3단계 — 서명: 화면에 직접 손가락으로 서명\n" +
      "• 동의서 탭에서 미서명자는 빨간색으로 표시됩니다.\n" +
      "• 서명된 동의서는 PDF로 개별 또는 일괄 내보낼 수 있습니다.",
  },
  {
    title: "9. 댓글 기능",
    body:
      "투어별로 팀원과 소통할 수 있는 댓글 공간입니다.\n\n" +
      "• 투어 상세 → '참여자' 탭 하단에 댓글 입력 창이 있습니다.\n" +
      "• 댓글 작성 전 설정에서 이름을 등록해야 합니다.\n" +
      "• 내 댓글은 수정(연필 아이콘) 또는 삭제(휴지통 아이콘)할 수 있습니다.\n" +
      "• 수정된 댓글에는 '(수정됨)' 표시가 나타납니다.",
  },
  {
    title: "10. 투어 삭제 및 복원",
    body:
      "삭제한 투어는 즉시 사라지지 않고 임시보관함에 보관됩니다.\n\n" +
      "• 삭제: 투어 목록 → '···' → 삭제 → PIN 입력 후 확인\n" +
      "• 삭제된 투어는 7일 동안 '임시보관함'에 보관됩니다.\n" +
      "• 복원: 설정 → 임시보관함 → 복원 버튼\n" +
      "• 7일이 지나면 자동으로 영구 삭제됩니다.\n" +
      "• 영구 삭제된 투어는 복원할 수 없으니 주의하세요.",
  },
  {
    title: "11. 설정",
    body:
      "앱 사용 환경을 개인화하고 계정을 관리합니다.\n\n" +
      "• 내 프로필: 이름, 연락처, 다이빙 레벨, 비상 연락처 등을 수정합니다.\n" +
      "• 비밀번호 변경: 앱 내 계정 비밀번호(프로필 보호용)를 설정합니다.\n" +
      "• 화면 모드: 라이트 / 다크 / 시스템 설정에 맞게 선택합니다.\n" +
      "• 숨긴 투어: 목록에서 숨긴 투어를 다시 표시하거나 완전히 제거합니다.\n" +
      "• 임시보관함: 삭제된 투어를 복원하거나 영구 삭제합니다.\n" +
      "• 관리자 모드: 별도 관리자 암호를 통해 전체 데이터를 관리합니다.",
  },
];

export default function SettingsGuideScreen() {
  const navigation = useNavigation();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (idx: number) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backText}>‹ 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>사용설명서</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          NoS Divers 앱의 주요 기능을 안내합니다.{"\n"}
          각 항목을 눌러 내용을 확인하세요.
        </Text>

        {SECTIONS.map((section, idx) => {
          const isOpen = openIndex === idx;
          return (
            <View key={idx} style={styles.card}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => toggle(idx)}
                activeOpacity={0.7}
              >
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.chevron}>{isOpen ? "▲" : "▼"}</Text>
              </TouchableOpacity>
              {isOpen && (
                <View style={styles.sectionBody}>
                  <Text style={styles.sectionText}>{section.body}</Text>
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.footer}>
          <Text style={styles.footerText}>NoS Divers v2.0.0</Text>
          <Text style={styles.footerSub}>SINCE 2019 DIVING TEAM</Text>
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
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    width: 64,
  },
  backText: {
    fontSize: 16,
    color: "#2196F3",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#023E58",
    textAlign: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  intro: {
    fontSize: 14,
    color: "#3D7A94",
    lineHeight: 22,
    marginBottom: 16,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 10,
    overflow: "hidden",
    shadowColor: "#023E58",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#EDF6FF",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#023E58",
    flex: 1,
  },
  chevron: {
    fontSize: 12,
    color: "#2196F3",
    marginLeft: 8,
  },
  sectionBody: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#E8F4F8",
  },
  sectionText: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 22,
  },
  footer: {
    alignItems: "center",
    marginTop: 24,
    paddingBottom: 8,
  },
  footerText: {
    fontSize: 13,
    color: "#3D7A94",
    fontWeight: "600",
  },
  footerSub: {
    fontSize: 11,
    color: "#3D7A94",
    marginTop: 2,
  },
});
