import { useState, useEffect } from "react";
import type { Route } from "../App";
import { useToast } from "../toast";
import * as db from "../lib/supabase-store";
import type { UserProfile } from "../lib/supabase-store";
import { useAuth } from "../lib/AuthContext";

interface Props {
  navigate: (r: Route) => void;
}

export function SettingsProfileScreen({ navigate }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();

  const [profile, setProfileState] = useState<UserProfile>({ name: "", email: "", grade: "멤버" });
  const [accountPassword, setAccountPasswordState] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [profileForm, setProfileForm] = useState<UserProfile>({ name: "", email: "", grade: "멤버" });
  const [showPwPrompt, setShowPwPrompt] = useState(false);
  const [pwInput, setPwInput] = useState("");

  // Load profile + app settings
  useEffect(() => {
    (async () => {
      try {
        const [prof, settings] = await Promise.all([
          db.getProfile(),
          db.getAppSettings(),
        ]);
        setProfileState(prof);
        setProfileForm({ ...prof });
        setAccountPasswordState(settings.accountPassword);
      } catch {
        // ignore
      } finally {
        setDataLoaded(true);
      }
    })();
  }, []);

  const authProvider = user?.app_metadata?.provider;
  const authLabel = authProvider === "kakao" ? "카카오" : authProvider === "google" ? "Google" : authProvider === "email" ? "이메일" : null;

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

  const handleSaveProfile = async () => {
    if (!profileForm.name.trim()) {
      toast("이름을 입력해주세요", "warning");
      return;
    }
    try {
      await db.setProfile(profileForm);
      setProfileState(profileForm);
      setShowProfileEdit(false);
      toast("프로필이 저장되었습니다", "success");
    } catch {
      toast("프로필 저장에 실패했습니다", "error");
    }
  };

  const handlePwVerify = () => {
    if (pwInput === accountPassword) {
      setShowPwPrompt(false);
      setProfileForm({ ...profile });
      setShowProfileEdit(true);
    } else {
      toast("비밀번호가 올바르지 않습니다", "error");
      setPwInput("");
    }
  };

  const handleEditClick = () => {
    if (showProfileEdit) {
      setShowProfileEdit(false);
      return;
    }
    if (!accountPassword) {
      // No password set — allow direct edit
      setProfileForm({ ...profile });
      setShowProfileEdit(true);
    } else {
      setShowPwPrompt(true);
      setPwInput("");
    }
  };

  if (!dataLoaded) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "var(--muted)", fontSize: 14 }}>
        로딩 중...
      </div>
    );
  }

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
        <h1 style={{ marginLeft: 8 }}>계정</h1>
      </div>

      <div className="p-16" style={{ paddingTop: 0 }}>
        {/* Profile info */}
        <div className="card">
          <div className="settings-row">
            <span className="label">이름</span>
            <span className="value">{profile.name || "-"}</span>
          </div>
          <div className="settings-row">
            <span className="label">이메일</span>
            <span className="value" style={{ fontSize: 13 }}>{profile.email || "-"}</span>
          </div>
          <div className="settings-row">
            <span className="label">전화번호</span>
            <span className="value" style={{ fontSize: 13 }}>{profile.phone || "-"}</span>
          </div>
          <div className="settings-row">
            <span className="label">생년월일</span>
            <span className="value" style={{ fontSize: 13 }}>{profile.birthDate || "-"}</span>
          </div>
          <div className="settings-row">
            <span className="label">다이빙 레벨</span>
            <span className="value" style={{ fontSize: 13 }}>{profile.divingLevel || "-"}</span>
          </div>
          <div className="settings-row">
            <span className="label">비상연락처</span>
            <span className="value" style={{ fontSize: 13 }}>{profile.emergencyContact || "-"}</span>
          </div>
          <div className="settings-row">
            <span className="label">등급</span>
            <span className="badge badge-member">{profile.grade || "멤버"}</span>
          </div>
          <div className="settings-row" style={{ borderBottom: "none" }}>
            <span className="label">로그인</span>
            <span className="value" style={{ fontSize: 13 }}>
              {authLabel ? (authProvider === "email" ? "이메일 로그인" : `${authLabel} 연동`) : "게스트"}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="card" style={{ marginTop: 8 }}>
          <button className="settings-link" onClick={handleEditClick}>
            프로필 수정
          </button>
        </div>

        {/* Password prompt for edit */}
        {showPwPrompt && !showProfileEdit && (
          <div className="card" style={{ marginTop: 8, padding: 16 }}>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>
              프로필을 수정하려면 계정 비밀번호를 입력하세요
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="input" type="password" value={pwInput}
                onChange={(e) => setPwInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePwVerify()}
                placeholder="비밀번호" style={{ flex: 1 }} autoFocus />
              <button onClick={handlePwVerify} style={{
                background: "var(--primary)", color: "var(--on-primary)",
                border: "none", borderRadius: 8, padding: "8px 16px",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>확인</button>
            </div>
          </div>
        )}

        {/* Profile edit form */}
        {showProfileEdit && (
          <div className="card" style={{ marginTop: 8, padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "var(--foreground)" }}>프로필 수정</div>
            <div className="input-group">
              <div className="input-label">이름 *</div>
              <input className="input" value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                placeholder="이름" />
            </div>
            <div className="input-group">
              <div className="input-label">이메일</div>
              <input className="input" value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                placeholder="이메일" type="email" />
            </div>
            <div className="input-group">
              <div className="input-label">전화번호</div>
              <input className="input" value={profileForm.phone || ""}
                onChange={(e) => setProfileForm({ ...profileForm, phone: formatPhone(e.target.value) })}
                placeholder="01012345678" inputMode="numeric" />
            </div>
            <div className="input-group">
              <div className="input-label">생년월일</div>
              <input className="input" value={profileForm.birthDate || ""}
                onChange={(e) => setProfileForm({ ...profileForm, birthDate: formatBirth(e.target.value) })}
                placeholder="19900101" inputMode="numeric" />
            </div>
            <div className="input-group">
              <div className="input-label">다이빙 레벨</div>
              <input className="input" value={profileForm.divingLevel || ""}
                onChange={(e) => setProfileForm({ ...profileForm, divingLevel: e.target.value })}
                placeholder="예: OW, AOW, 레스큐, DM" />
            </div>
            <div className="input-group">
              <div className="input-label">비상연락처</div>
              <input className="input" value={profileForm.emergencyContact || ""}
                onChange={(e) => setProfileForm({ ...profileForm, emergencyContact: e.target.value })}
                placeholder="예: 010-9876-5432 (배우자)" />
            </div>
            <button onClick={handleSaveProfile} style={{
              width: "100%", background: "var(--primary)", color: "var(--on-primary)",
              border: "none", borderRadius: 10, padding: "12px",
              fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 4,
            }}>저장</button>
          </div>
        )}
      </div>
    </>
  );
}
