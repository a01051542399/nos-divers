import type { Route } from "../App";

interface Props {
  navigate: (r: Route) => void;
}

const sections = [
  {
    title: "1. 가입 및 로그인",
    body: `이름, 이메일, 비밀번호를 입력하여 가입합니다.\n카카오 또는 Google 계정으로도 가입할 수 있습니다.\n전화번호, 생년월일, 다이빙 레벨, 비상연락처는 선택사항이며 나중에 설정에서 입력할 수 있습니다.\n미리 입력해두면 면책동의서 작성 시 자동으로 채워집니다.`,
  },
  {
    title: "2. 투어 개설",
    body: `투어 탭 → "+ 새 투어"를 누르세요.\n투어 이름, 날짜, 장소를 입력합니다.\n날짜는 숫자 6자리로 입력합니다. (예: 260401 → 26.04.01)\n수정 비밀번호 4자리를 설정하세요. 비용 수정/삭제와 투어 삭제 시 필요합니다.\n투어를 만들면 본인이 자동으로 첫 번째 참여자로 등록됩니다.\n6자리 초대 코드가 자동으로 생성됩니다.`,
  },
  {
    title: "3. 투어 참여",
    body: `투어 탭 → "▶ 참여" 버튼을 누르세요.\n주최자에게 전달받은 6자리 초대 코드를 입력합니다.\n이름을 확인하고 참여하면 투어 목록에 추가됩니다.`,
  },
  {
    title: "4. 멤버 초대",
    body: `투어 상세 화면 상단의 "초대" 버튼을 누르세요.\n초대 메시지가 자동 생성되어 카카오톡 등으로 바로 공유할 수 있습니다.\n초대 코드와 투어 정보가 포함된 메시지가 전달됩니다.`,
  },
  {
    title: "5. 참여자 관리",
    body: `투어 상세 → 참여자 탭에서 이름을 입력하고 추가하세요.\n동명이인이 있을 경우 이름 뒤에 숫자를 붙여주세요. (예: 홍길동2)\n누가 추가했는지 이름 아래에 표시됩니다.\n면책동의서 미작성자는 빨간색으로 표시됩니다.`,
  },
  {
    title: "6. 비용 입력",
    body: `비용 탭 → "+ 비용 추가"를 누르세요.\n항목 이름과 금액을 입력하고, 결제자와 분담 대상을 선택합니다.\n\n균등 분배: 선택한 인원에게 동일하게 나눕니다.\n지정 분배: 개인별로 금액을 직접 입력합니다.\n\n해외 투어 시 화폐를 변경하면 환율이 자동 조회됩니다.\n영수증 사진을 첨부할 수 있습니다. (5MB 이하)\n\n비용 수정/삭제 시 투어 개설 시 설정한 수정 비밀번호가 필요합니다.`,
  },
  {
    title: "7. 정산 확인 및 내보내기",
    body: `정산 탭에서 누가 누구에게 얼마를 보내야 하는지 자동으로 계산됩니다.\n참여자별로 결제 금액, 부담 금액, 최종 잔액을 확인할 수 있습니다.\n\nPDF 내보내기: O/X 매트릭스 정산표와 송금 내역을 출력합니다.\n엑셀 내보내기: 색상이 적용된 상세 정산표를 받을 수 있습니다.\n- 시트1: 정산 매트릭스 (O/X 색상 구분)\n- 시트2: 송금 내역\n- 시트3: 영수증 목록`,
  },
  {
    title: "8. 면책동의서",
    body: `동의서 탭에서 해당 투어의 "서명"을 누르세요.\n\n1단계: 개인정보 입력 (프로필에서 자동 채움)\n2단계: 건강 체크리스트 확인 및 면책 조항 동의\n3단계: 화면에 직접 서명 (터치 또는 마우스)\n\n서명 완료 후 언제든 다시 조회하거나 PDF로 출력할 수 있습니다.`,
  },
  {
    title: "9. 댓글",
    body: `참여자 탭 하단에 댓글 영역이 있습니다.\n프로필에 등록된 본인 이름으로만 작성할 수 있습니다.\n본인이 작성한 댓글만 수정/삭제가 가능합니다.\n투어별 공지나 안내사항 전달에 활용하세요.`,
  },
  {
    title: "10. 투어 삭제 및 복원",
    body: `투어 목록에서 "삭제" → 수정 비밀번호 입력 시 임시보관함으로 이동합니다.\n7일 이내에 설정 → 임시보관함에서 복원할 수 있습니다.\n7일 경과 시 자동으로 영구 삭제됩니다.`,
  },
  {
    title: "11. 설정",
    body: `내 프로필: 개인정보를 확인하고 수정합니다. (계정 비밀번호 입력 필요)\n비밀번호 변경: 계정 비밀번호를 변경합니다.\n화면 모드: 라이트 / 다크 / 시스템 자동 전환\n숨긴 투어 관리: 목록에서 숨긴 투어를 다시 표시합니다.\n임시보관함: 삭제한 투어를 복원하거나 영구 삭제합니다.`,
  },
  {
    title: "참고사항",
    body: `모든 데이터는 서버에 안전하게 저장됩니다.\n로그인하면 어떤 기기에서든 동일한 데이터를 확인할 수 있습니다.\n문의사항은 NoS Divers 운영진에게 연락해주세요.`,
  },
];

export function SettingsGuideScreen({ navigate }: Props) {
  return (
    <>
      <div className="page-header">
        <button
          onClick={() => navigate({ screen: "settings" })}
          style={{
            background: "none", border: "none", color: "var(--primary)",
            fontSize: 15, fontWeight: 600, cursor: "pointer", padding: 0,
          }}
        >
          ← 설정
        </button>
        <h1 style={{ marginLeft: 8 }}>사용설명서</h1>
      </div>

      <div className="p-16" style={{ paddingTop: 0 }}>
        <div className="card" style={{ padding: "20px 18px" }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>
            NoS Divers 사용안내서
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 20 }}>
            다이빙 투어 정산 & 면책동의서 관리
          </div>

          {sections.map((s, i) => (
            <div key={i} style={{ marginBottom: i < sections.length - 1 ? 20 : 0 }}>
              <div style={{
                fontSize: 14, fontWeight: 700, color: "var(--foreground)",
                marginBottom: 6,
                ...(s.title === "참고사항" ? {
                  marginTop: 8, paddingTop: 14, borderTop: "1px solid var(--border)",
                } : {}),
              }}>
                {s.title}
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.8, whiteSpace: "pre-line" }}>
                {s.body}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
