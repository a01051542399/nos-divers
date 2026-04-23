import { useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { getTheme } from "../theme";

type Mode = "login" | "signup" | "reset";

export function LoginScreen() {
  const {
    signInWithEmail, signUpWithEmail, signInWithKakao, signInWithGoogle,
    resetPassword, loading,
  } = useAuth();
  const theme = getTheme();
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [divingLevel, setDivingLevel] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const formatPhone = (v: string) => {
    const d = v.replace(/[^0-9]/g, "").slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 7) return d.slice(0, 3) + "-" + d.slice(3);
    return d.slice(0, 3) + "-" + d.slice(3, 7) + "-" + d.slice(7);
  };
  const formatBirth = (v: string) => {
    const d = v.replace(/[^0-9]/g, "").slice(0, 8);
    if (d.length <= 4) return d;
    if (d.length <= 6) return d.slice(0, 4) + "-" + d.slice(4);
    return d.slice(0, 4) + "-" + d.slice(4, 6) + "-" + d.slice(6);
  };

  if (loading) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", background: "var(--background)",
      }}>
        <div style={{ color: "var(--muted)", fontSize: 16 }}>로딩 중...</div>
      </div>
    );
  }

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("이메일과 비밀번호를 입력해주세요");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const result = await signInWithEmail(email, password);
      if (result.error) setError(result.error);
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignup = async () => {
    if (!name.trim()) { setError("이름을 입력해주세요"); return; }
    if (!email.trim()) { setError("이메일을 입력해주세요"); return; }
    if (password.length < 6) { setError("비밀번호는 6자 이상이어야 합니다"); return; }
    if (password !== confirmPw) { setError("비밀번호가 일치하지 않습니다"); return; }
    setSubmitting(true);
    setError("");
    try {
      const result = await signUpWithEmail(email, password, name);
      if (result.error) {
        setError(result.error);
      } else {
        setInfo("회원가입이 완료되었습니다. 로그인해주세요.");
        setMode("login");
        setPassword("");
        setConfirmPw("");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async () => {
    if (!email.trim()) { setError("이메일을 입력해주세요"); return; }
    setSubmitting(true);
    setError("");
    try {
      const result = await resetPassword(email);
      if (result.error) {
        setError(result.error);
      } else {
        setInfo("비밀번호 재설정 링크가 이메일로 발송되었습니다.");
        setMode("login");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError("");
    setInfo("");
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "14px 16px", borderRadius: 12,
    border: "1px solid var(--border)", background: "var(--surface)",
    color: "var(--foreground)", fontSize: 15, outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 14, fontWeight: 600, color: "var(--foreground)",
    marginBottom: 6, display: "block",
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      minHeight: "100vh", padding: "48px 24px 24px",
      background: "var(--background)", overflowY: "auto",
    }}>
      {/* Logo */}
      <img
        src={isDark ? "/logo-full.png" : "/logo-full-official.png"}
        alt="Dive ON"
        style={{
          width: 160, height: "auto", marginBottom: 20,
          filter: isDark
            ? "drop-shadow(0 0 2px rgba(255,255,255,0.9)) drop-shadow(0 0 4px rgba(255,255,255,0.6)) drop-shadow(0 0 6px rgba(255,255,255,0.3))"
            : "none",
        }}
        onError={(e) => { (e.target as HTMLImageElement).src = "/logo-dolphin-official.png"; }}
      />

      {/* Back button (signup / reset) */}
      {mode !== "login" && (
        <button
          onClick={() => switchMode("login")}
          style={{
            alignSelf: "flex-start", maxWidth: 360, width: "100%",
            background: "none", border: "none", color: "var(--primary)",
            fontSize: 15, fontWeight: 600, cursor: "pointer",
            padding: 0, marginBottom: 8, textAlign: "left",
          }}
        >
          ← 로그인으로 돌아가기
        </button>
      )}

      {/* Title */}
      <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--foreground)", margin: "0 0 6px" }}>
        {mode === "login" ? "로그인" : mode === "signup" ? "회원가입" : "비밀번호 찾기"}
      </h1>
      <p style={{ fontSize: 14, color: "var(--muted)", margin: "0 0 28px" }}>
        {mode === "login"
          ? "Dive ON에 오신 것을 환영합니다"
          : mode === "signup"
          ? "새 계정을 만들어보세요"
          : "가입하신 이메일을 입력해주세요"}
      </p>

      {/* Form */}
      <div style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Info message */}
        {info && (
          <div style={{
            padding: "10px 14px", borderRadius: 10,
            background: "var(--success)", color: "#fff",
            fontSize: 13, fontWeight: 500, textAlign: "center",
          }}>
            {info}
          </div>
        )}

        {/* Name (signup only) */}
        {mode === "signup" && (
          <div>
            <label style={labelStyle}>이름</label>
            <input
              style={inputStyle}
              type="text" value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력하세요"
            />
          </div>
        )}

        {/* Email */}
        <div>
          <label style={labelStyle}>이메일</label>
          <input
            style={inputStyle}
            type="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            onKeyDown={(e) => e.key === "Enter" && mode === "reset" && handleReset()}
          />
        </div>

        {/* Password */}
        {mode !== "reset" && (
          <div>
            <label style={labelStyle}>비밀번호</label>
            <input
              style={inputStyle}
              type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
              onKeyDown={(e) => e.key === "Enter" && mode === "login" && handleLogin()}
            />
          </div>
        )}

        {mode === "signup" && (
          <div>
            <label style={labelStyle}>비밀번호 확인</label>
            <input
              style={inputStyle}
              type="password" value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              placeholder="비밀번호 재입력"
            />
          </div>
        )}

        {/* Optional profile fields (signup only) */}
        {mode === "signup" && (
          <>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, marginBottom: -6 }}>
              아래 항목은 선택사항입니다 (나중에 설정에서 수정 가능)
            </div>
            <div>
              <label style={labelStyle}>전화번호</label>
              <input
                style={inputStyle}
                type="tel" value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="01012345678"
                inputMode="numeric"
              />
            </div>
            <div>
              <label style={labelStyle}>생년월일</label>
              <input
                style={inputStyle}
                type="text" value={birthDate}
                onChange={(e) => setBirthDate(formatBirth(e.target.value))}
                placeholder="19900101"
                inputMode="numeric"
              />
            </div>
            <div>
              <label style={labelStyle}>다이빙 레벨</label>
              <input
                style={inputStyle}
                type="text" value={divingLevel}
                onChange={(e) => setDivingLevel(e.target.value)}
                placeholder="예: OW, AOW, 레스큐, DM (선택)"
              />
            </div>
            <div>
              <label style={labelStyle}>비상연락처</label>
              <input
                style={inputStyle}
                type="text" value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="예: 010-9876-5432 (배우자)"
                onKeyDown={(e) => e.key === "Enter" && handleSignup()}
              />
            </div>
          </>
        )}

        {/* Error */}
        {error && (
          <div style={{
            padding: "10px 14px", borderRadius: 10,
            background: "rgba(239,68,68,0.15)", color: "var(--error)",
            fontSize: 13, fontWeight: 500, textAlign: "center",
          }}>
            {error}
          </div>
        )}

        {/* Submit button */}
        <button
          onClick={mode === "login" ? handleLogin : mode === "signup" ? handleSignup : handleReset}
          disabled={submitting}
          style={{
            width: "100%", padding: "14px 0", borderRadius: 12,
            background: "var(--primary)", color: "var(--on-primary)",
            border: "none", fontSize: 16, fontWeight: 700,
            cursor: submitting ? "wait" : "pointer", opacity: submitting ? 0.7 : 1,
            marginTop: 4,
          }}
        >
          {submitting ? "처리 중..." : mode === "login" ? "로그인" : mode === "signup" ? "회원가입" : "재설정 링크 발송"}
        </button>

        {/* Divider + Kakao (login mode) */}
        {mode === "login" && (
          <>
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              margin: "4px 0",
            }}>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              <span style={{ fontSize: 13, color: "var(--muted)" }}>또는</span>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>

            <button
              onClick={signInWithKakao}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                width: "100%", padding: "14px 0", borderRadius: 12,
                background: "#FEE500", color: "#191919", border: "none",
                fontSize: 15, fontWeight: 700, cursor: "pointer",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 1C4.58 1 1 3.8 1 7.2c0 2.2 1.47 4.13 3.68 5.2-.16.6-.58 2.17-.67 2.51-.1.42.15.41.32.3.13-.09 2.09-1.42 2.94-2 .56.08 1.14.12 1.73.12 4.42 0 8-2.8 8-6.2S13.42 1 9 1z" fill="#191919"/>
              </svg>
              카카오로 로그인
            </button>

            <button
              onClick={signInWithGoogle}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                width: "100%", padding: "14px 0", borderRadius: 12,
                background: "#fff", color: "#333", border: "1px solid var(--border)",
                fontSize: 15, fontWeight: 700, cursor: "pointer",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Google로 로그인
            </button>
          </>
        )}

        {/* Links */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          gap: 10, marginTop: 8,
        }}>
          {mode === "login" && (
            <>
              <button
                onClick={() => switchMode("reset")}
                style={{
                  background: "none", border: "none", color: "var(--muted)",
                  fontSize: 13, cursor: "pointer", padding: 0,
                }}
              >
                비밀번호를 잊으셨나요?
              </button>
              <div style={{ fontSize: 14, color: "var(--muted)" }}>
                처음이신가요?{" "}
                <button
                  onClick={() => switchMode("signup")}
                  style={{
                    background: "none", border: "none", color: "var(--primary)",
                    fontSize: 14, fontWeight: 700, cursor: "pointer", padding: 0,
                  }}
                >
                  회원가입
                </button>
              </div>
            </>
          )}

          {mode === "signup" && (
            <div style={{ fontSize: 14, color: "var(--muted)" }}>
              이미 계정이 있으신가요?{" "}
              <button
                onClick={() => switchMode("login")}
                style={{
                  background: "none", border: "none", color: "var(--primary)",
                  fontSize: 14, fontWeight: 700, cursor: "pointer", padding: 0,
                }}
              >
                로그인
              </button>
            </div>
          )}

          {mode === "reset" && (
            <button
              onClick={() => switchMode("login")}
              style={{
                background: "none", border: "none", color: "var(--primary)",
                fontSize: 14, fontWeight: 600, cursor: "pointer", padding: 0,
              }}
            >
              로그인으로 돌아가기
            </button>
          )}

        </div>
      </div>
    </div>
  );
}
