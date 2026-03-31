import { useState } from "react";
import type { Route } from "../App";
import { getTheme, setTheme, type ThemeMode } from "../theme";

interface Props {
  navigate: (r: Route) => void;
}

export function SettingsDisplayScreen({ navigate }: Props) {
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(getTheme);

  const handleThemeChange = (mode: ThemeMode) => {
    setTheme(mode);
    setCurrentTheme(mode);
  };

  const themeOptions: { key: ThemeMode; label: string }[] = [
    { key: "light", label: "라이트" },
    { key: "dark", label: "다크" },
    { key: "system", label: "시스템" },
  ];

  return (
    <>
      <div style={{ padding: "12px 16px" }}>
        <button className="back-btn" onClick={() => navigate({ screen: "settings" })}>
          ← 뒤로
        </button>
      </div>

      <div className="page-header">
        <h1>화면 모드</h1>
        <p>앱의 테마를 변경합니다</p>
      </div>

      <div className="p-16" style={{ paddingTop: 0 }}>
        {themeOptions.map((opt) => (
          <div
            key={opt.key}
            className="card"
            style={{
              marginBottom: 8,
              cursor: "pointer",
              border: currentTheme === opt.key ? "2px solid var(--primary)" : undefined,
              background: currentTheme === opt.key ? "var(--primary-alpha-12)" : undefined,
            }}
            onClick={() => handleThemeChange(opt.key)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 4 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: "var(--foreground)" }}>{opt.label}</div>
              </div>
              {currentTheme === opt.key && (
                <span style={{ color: "var(--primary)", fontSize: 20, fontWeight: 700 }}>✓</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
