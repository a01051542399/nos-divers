import { useState, useEffect } from "react";
import type { Route } from "../App";
import { useToast } from "../toast";
import * as db from "../lib/supabase-store";
import { getTheme, type ThemeMode } from "../theme";
import { useAuth } from "../lib/AuthContext";
import type { Tour } from "../types";

interface Props {
  navigate: (r: Route) => void;
}

export function SettingsScreen({ navigate }: Props) {
  const [currentTheme] = useState<ThemeMode>(getTheme);
  const { toast, confirm } = useToast();
  const { signOut: authSignOut } = useAuth();
  const [showHidden, setShowHidden] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [showPwPrompt, setShowPwPrompt] = useState(false);

  // Account password setup
  const [showPwSetup, setShowPwSetup] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  // Admin mode
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);
  const [adminPwInput, setAdminPwInput] = useState("");

  // Async-loaded data
  const [profileName, setProfileName] = useState("");
  const [tours, setTours] = useState<Tour[]>([]);
  const [hiddenIds, setHiddenIds] = useState<number[]>([]);
  const [accountPassword, setAccountPasswordState] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [prof, toursData, settings] = await Promise.all([
          db.getProfile(),
          db.listTours(),
          db.getAppSettings(),
        ]);
        setProfileName(prof.name);
        setTours(toursData);
        setHiddenIds(settings.hiddenTourIds || []);
        setAccountPasswordState(settings.accountPassword);
      } catch {
        // ignore
      } finally {
        setDataLoaded(true);
      }
    })();
  }, []);

  const hiddenTours = tours.filter((t) => hiddenIds.includes(t.id));
  const hasAccountPw = !!accountPassword;

  const handleUnhide = async (tourId: number) => {
    const updated = hiddenIds.filter((id) => id !== tourId);
    await db.setHiddenTourIds(updated);
    setHiddenIds(updated);
    toast("투어가 다시 표시됩니다", "success");
  };

  const handleHiddenAccess = () => {
    if (!accountPassword) {
      toast("계정 비밀번호를 먼저 설정해주세요", "warning");
      setShowPwPrompt(false);
      setShowPwSetup(true);
      return;
    }
    if (pwInput === accountPassword) {
      setShowHidden(true);
      setShowPwPrompt(false);
      setPwInput("");
    } else {
      toast("비밀번호가 올바르지 않습니다", "error");
      setPwInput("");
    }
  };

  const handleSetPassword = async () => {
    if (!newPw.trim()) {
      toast("비밀번호를 입력해주세요", "warning");
      return;
    }
    if (newPw !== confirmPw) {
      toast("비밀번호가 일치하지 않습니다", "error");
      return;
    }
    await db.setAccountPassword(newPw);
    setAccountPasswordState(newPw);
    setShowPwSetup(false);
    setNewPw("");
    setConfirmPw("");
    toast("계정 비밀번호가 설정되었습니다", "success");
  };

  const handleLogout = async () => {
    if (await confirm("로그아웃 하시겠습니까?")) {
      await authSignOut();
      toast("로그아웃 되었습니다", "info");
    }
  };

  const handleWithdraw = async () => {
    if (await confirm("정말 회원을 탈퇴하시겠습니까?\n모든 데이터가 삭제됩니다.")) {
      await authSignOut();
      localStorage.clear();
      toast("회원 탈퇴가 완료되었습니다", "info");
      setTimeout(() => window.location.reload(), 500);
    }
  };

  const handleAdminVerify = async (pw: string) => {
    const valid = await db.verifyAdminPassword(pw);
    if (valid) {
      setShowAdminPrompt(false);
      navigate({ screen: "admin" });
    } else {
      toast("비밀번호가 올바르지 않습니다", "error");
      setAdminPwInput("");
    }
  };

  if (!dataLoaded) {
    return (
      <>
        <div className="page-header">
          <h1>설정</h1>
        </div>
        <div className="p-16" style={{ paddingTop: 0 }}>
          <div style={{ textAlign: "center", padding: 40, color: "var(--muted)", fontSize: 14 }}>
            로딩 중...
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1>설정</h1>
      </div>

      <div className="p-16" style={{ paddingTop: 0 }}>
        {/* App Info Card */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
            <img
              src="/logo-dolphin-official.png"
              alt="NoS Divers"
              style={{ width: 52, height: 52, borderRadius: 26, objectFit: "cover" }}
            />
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)" }}>
                NoS Divers
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>
                SINCE 2019 DIVING TEAM
              </div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
            다이빙 투어 비용 정산과 면책동의서 서명을 간편하게 관리하세요.
          </div>
        </div>

        {/* Account — simplified as a single clickable row */}
        <div className="section-label" style={{ marginTop: 16, paddingLeft: 2 }}>계정</div>
        <div className="card">
          <div className="settings-row" style={{ cursor: "pointer" }}
            onClick={() => navigate({ screen: "settings-profile" })}>
            <span className="label">내 프로필</span>
            <span className="value" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13 }}>{profileName || "미설정"}</span>
              <span style={{ fontSize: 16 }}>›</span>
            </span>
          </div>
          <button
            className="settings-link"
            onClick={() => { setShowPwSetup(!showPwSetup); setNewPw(""); setConfirmPw(""); }}
          >
            비밀번호 변경
          </button>
          <button className="settings-link" onClick={handleLogout}>
            로그아웃
          </button>
          <button className="settings-link danger" onClick={handleWithdraw} style={{ borderBottom: "none" }}>
            회원 탈퇴
          </button>
        </div>

        {showPwSetup && (
          <div className="card" style={{ marginTop: 8, padding: 16 }}>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>
              {"새 비밀번호를 입력하세요"}
            </div>
            <div className="input-group">
              <input className="input" type="password" value={newPw}
                onChange={(e) => setNewPw(e.target.value)} placeholder="비밀번호" autoFocus />
            </div>
            <div className="input-group">
              <input className="input" type="password" value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSetPassword()} placeholder="비밀번호 확인" />
            </div>
            <button onClick={handleSetPassword} style={{
              width: "100%", background: "var(--primary)", color: "var(--on-primary)",
              border: "none", borderRadius: 10, padding: "12px",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}>
              {hasAccountPw ? "변경" : "설정"}
            </button>
          </div>
        )}

        {/* Settings section */}
        <div className="section-label" style={{ marginTop: 16, paddingLeft: 2 }}>설정</div>
        <div className="card">
          <div className="settings-row" style={{ cursor: "pointer" }}
            onClick={() => navigate({ screen: "settings-display" })}>
            <span className="label">화면 모드</span>
            <span className="value" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {currentTheme === "light" ? "라이트" : currentTheme === "dark" ? "다크" : "시스템"}
              <span style={{ fontSize: 16 }}>›</span>
            </span>
          </div>
          <div className="settings-row" style={{ cursor: "pointer" }}
            onClick={() => { setShowAdminPrompt(true); setAdminPwInput(""); }}>
            <span className="label">관리자 모드</span>
            <span className="value" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 16 }}>›</span>
            </span>
          </div>
          <div className="settings-row" style={{ cursor: "pointer" }}
            onClick={() => {
              if (showHidden) { setShowHidden(false); }
              else if (!hasAccountPw) { toast("계정 비밀번호를 먼저 설정해주세요", "warning"); setShowPwSetup(true); }
              else { setShowPwPrompt(true); setPwInput(""); }
            }}>
            <span className="label">숨긴 투어 관리</span>
            <span className="value" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 16 }}>›</span>
            </span>
          </div>
          <TrashRow toast={toast} confirm={confirm} />
        </div>

        {showAdminPrompt && (
          <div className="card" style={{ marginTop: 8, padding: 16 }}>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>관리자 비밀번호를 입력하세요</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="input" type="password" value={adminPwInput}
                onChange={(e) => setAdminPwInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdminVerify(adminPwInput);
                }}
                placeholder="비밀번호" style={{ flex: 1 }} autoFocus />
              <button onClick={() => handleAdminVerify(adminPwInput)} style={{
                background: "var(--primary)", color: "var(--on-primary)",
                border: "none", borderRadius: 8, padding: "8px 16px",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>확인</button>
            </div>
          </div>
        )}

        {showPwPrompt && !showHidden && (
          <div className="card" style={{ marginTop: 8, padding: 16 }}>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>계정 비밀번호를 입력하세요</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="input" type="password" value={pwInput}
                onChange={(e) => setPwInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleHiddenAccess()}
                placeholder="비밀번호" style={{ flex: 1 }} autoFocus />
              <button onClick={handleHiddenAccess} style={{
                background: "var(--primary)", color: "var(--on-primary)",
                border: "none", borderRadius: 8, padding: "8px 16px",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>확인</button>
            </div>
          </div>
        )}

        {showHidden && (
          <div style={{ marginTop: 8 }}>
            {hiddenTours.length === 0 ? (
              <div style={{ textAlign: "center", padding: 16, color: "var(--muted)", fontSize: 13 }}>
                숨긴 투어가 없습니다
              </div>
            ) : (
              hiddenTours.map((tour) => (
                <div key={tour.id} className="card" style={{ padding: "12px 16px", marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>{tour.name}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{tour.date || "날짜 미정"}</div>
                    </div>
                    <button onClick={() => handleUnhide(tour.id)} style={{
                      background: "var(--primary-alpha-15)", color: "var(--primary)",
                      border: "none", borderRadius: 8, padding: "6px 12px",
                      fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}>다시 표시</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Info */}
        <div className="section-label" style={{ marginTop: 16, paddingLeft: 2 }}>정보</div>
        <div className="card">
          <div className="settings-row">
            <span className="label">버전</span>
            <span className="value">1.5.0</span>
          </div>
          <div className="settings-row" style={{ borderBottom: "none" }}>
            <span className="label">개발</span>
            <span className="value">NOS DIVERS</span>
          </div>
        </div>

        {/* Guide — navigable row */}
        <div className="card" style={{ marginTop: 8 }}>
          <div className="settings-row" style={{ borderBottom: "none", cursor: "pointer" }}
            onClick={() => navigate({ screen: "settings-guide" })}>
            <span className="label">사용설명서</span>
            <span className="value" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 16 }}>›</span>
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

type ToastFn = (msg: string, type?: "info" | "success" | "error" | "warning") => void;
function TrashRow({ toast, confirm }: { toast: ToastFn; confirm: (msg: string) => Promise<boolean> }) {
  const [showTrash, setShowTrash] = useState(false);
  const [trashTours, setTrashTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTrash = async () => {
    setLoading(true);
    try {
      const data = await db.getTrashTours();
      setTrashTours(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (showTrash) {
      setShowTrash(false);
    } else {
      loadTrash();
      setShowTrash(true);
    }
  };

  const daysLeft = (deletedAt: string) => {
    const diff = 7 - Math.floor((Date.now() - new Date(deletedAt).getTime()) / (24 * 60 * 60 * 1000));
    return Math.max(0, diff);
  };

  const handleRestore = async (tourId: number, tourName: string) => {
    if (await confirm(`"${tourName}" 투어를 복원하시겠습니까?`)) {
      await db.restoreTour(tourId);
      await loadTrash();
      toast("투어가 복원되었습니다", "success");
    }
  };

  const handlePermanentDelete = async (tourId: number, tourName: string) => {
    if (await confirm(`"${tourName}" 투어를 영구 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      await db.deleteTour(tourId);
      await loadTrash();
      toast("투어가 영구 삭제되었습니다", "info");
    }
  };

  return (
    <>
      <div className="settings-row" style={{ borderBottom: "none", cursor: "pointer" }}
        onClick={handleToggle}>
        <span className="label">임시보관함</span>
        <span className="value" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {trashTours.length > 0 && (
            <span style={{ fontSize: 12, color: "var(--error)", fontWeight: 600 }}>{trashTours.length}</span>
          )}
          <span style={{ fontSize: 16 }}>›</span>
        </span>
      </div>

      {showTrash && (
        <div style={{ padding: "0 0 8px 0", borderTop: "1px solid var(--border)" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 16, color: "var(--muted)", fontSize: 13 }}>
              로딩 중...
            </div>
          ) : trashTours.length === 0 ? (
            <div style={{ textAlign: "center", padding: 16, color: "var(--muted)", fontSize: 13 }}>
              임시보관된 투어가 없습니다
            </div>
          ) : (
            <>
              <div style={{ fontSize: 11, color: "var(--muted)", padding: "8px 4px", lineHeight: 1.5 }}>
                삭제된 투어는 7일간 보관 후 자동으로 영구 삭제됩니다.
              </div>
              {trashTours.map((tour) => (
                <div key={tour.id} style={{ padding: "8px 4px", borderTop: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>{tour.name}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>
                        {tour.date || "날짜 미정"} · 남은 기간: {daysLeft(tour.deletedAt!)}일
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button onClick={() => handleRestore(tour.id, tour.name)} style={{
                        background: "var(--primary-alpha-15)", color: "var(--primary)",
                        border: "none", borderRadius: 8, padding: "6px 12px",
                        fontSize: 12, fontWeight: 600, cursor: "pointer",
                      }}>복원</button>
                      <button onClick={() => handlePermanentDelete(tour.id, tour.name)} style={{
                        background: "rgba(239,68,68,0.1)", color: "var(--error)",
                        border: "none", borderRadius: 8, padding: "6px 12px",
                        fontSize: 12, fontWeight: 600, cursor: "pointer",
                      }}>영구삭제</button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </>
  );
}
