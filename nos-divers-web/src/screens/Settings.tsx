import { useState } from "react";
import type { Route } from "../App";
import { useToast } from "../toast";
import { getTheme, setTheme } from "../theme";
import type { ThemeMode } from "../theme";

interface Props {
  navigate: (r: Route) => void;
}

export function SettingsScreen({ navigate: _navigate }: Props) {
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(getTheme);
  const { toast, confirm } = useToast();

  const handleThemeChange = (mode: ThemeMode) => {
    setTheme(mode);
    setCurrentTheme(mode);
  };

  const handleClearData = async () => {
    if (await confirm("모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      localStorage.removeItem("nos_divers_data");
      toast("데이터가 삭제되었습니다", "success");
      setTimeout(() => window.location.reload(), 500);
    }
  };

  const themeOptions: { key: ThemeMode; label: string }[] = [
    { key: "light", label: "☀️ 라이트" },
    { key: "dark", label: "🌙 다크" },
    { key: "system", label: "🖥 시스템" },
  ];

  return (
    <>
      <div className="page-header">
        <h1>설정</h1>
      </div>

      <div className="p-16" style={{ paddingTop: 0 }}>
        {/* App Info Card */}
        <div className="card" style={{ padding: 20 }}>
          <div className="settings-app-info">
            <img src="/logo-dolphin.png" alt="NoS Divers" style={{ width: 60, height: 60, marginBottom: 8 }} />
            <h2>NoS Divers</h2>
            <div className="subtitle">SINCE 2019 DIVING TEAM</div>
            <div className="desc">
              다이빙 투어 비용 정산과 면책동의서 서명을<br/>
              간편하게 관리하세요.
            </div>
          </div>
        </div>

        {/* Theme Section */}
        <div className="card" style={{ marginTop: 16 }}>
          <div className="section-label">화면 모드</div>
          <div className="theme-toggle-group">
            {themeOptions.map((opt) => (
              <button
                key={opt.key}
                className={`theme-toggle-btn ${currentTheme === opt.key ? "active" : ""}`}
                onClick={() => handleThemeChange(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Account Section */}
        <div className="card" style={{ marginTop: 16 }}>
          <div className="section-label">계정</div>
          <div className="settings-row">
            <span className="label">이름</span>
            <span className="value">다이버</span>
          </div>
          <div className="settings-row">
            <span className="label">이메일</span>
            <span className="value">-</span>
          </div>
          <div className="settings-row">
            <span className="label">등급</span>
            <span className="badge badge-member">멤버</span>
          </div>
          <button className="settings-link" style={{ marginTop: 4 }}>
            ↩ 로그아웃
          </button>
          <button className="settings-link danger">
            🗑 회원 탈퇴
          </button>
        </div>

        {/* Info Section */}
        <div className="card" style={{ marginTop: 16 }}>
          <div className="section-label">정보</div>
          <div className="settings-row">
            <span className="label">버전</span>
            <span className="value">2.0.0</span>
          </div>
          <div className="settings-row">
            <span className="label">개발</span>
            <span className="value">NOS DIVERS</span>
          </div>
        </div>

        {/* Data Management */}
        <div style={{ marginTop: 24 }}>
          <button className="btn btn-danger" onClick={handleClearData}>
            모든 데이터 초기화
          </button>
        </div>
      </div>
    </>
  );
}
