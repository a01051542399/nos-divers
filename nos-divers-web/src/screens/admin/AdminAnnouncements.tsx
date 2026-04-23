import { useEffect, useState } from "react";
import * as db from "../../lib/supabase-store";
import { formatDateTime } from "../../store";
import { useToast } from "../../toast";
import type { Announcement, Tour } from "../../types";

/**
 * 관리자 공지 관리 — 작성 / 고정 토글 / 삭제.
 * 모든 변경은 관리자 비밀번호를 RPC 인자로 전달해 서버에서 검증.
 * 화면 진입은 이미 관리자 PIN 으로 보호되어 있으므로 비밀번호는 한 번만 입력.
 */
export function AdminAnnouncements() {
  const { toast, confirm } = useToast();
  const [items, setItems] = useState<Announcement[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminPw, setAdminPw] = useState("");
  const [pwOk, setPwOk] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // 작성 폼
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [targetTourId, setTargetTourId] = useState<number | "all">("all");
  const [submitting, setSubmitting] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      const [a, t] = await Promise.all([
        db.listAnnouncements(),
        db.listTours().catch(() => [] as Tour[]),
      ]);
      setItems(a);
      setTours(t);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const handleVerify = async () => {
    if (!adminPw) return;
    setVerifying(true);
    const ok = await db.verifyAdminPassword(adminPw);
    setVerifying(false);
    if (ok) {
      setPwOk(true);
      toast("관리자 인증 완료", "success");
    } else {
      toast("비밀번호가 올바르지 않습니다", "error");
      setAdminPw("");
    }
  };

  const handleCreate = async () => {
    if (!pwOk) {
      toast("먼저 관리자 비밀번호를 인증하세요", "warning");
      return;
    }
    if (!title.trim()) { toast("제목을 입력하세요", "warning"); return; }
    if (!body.trim()) { toast("본문을 입력하세요", "warning"); return; }
    setSubmitting(true);
    const res = await db.createAnnouncement({
      adminPassword: adminPw,
      title: title.trim(),
      body: body.trim(),
      targetTourId: targetTourId === "all" ? null : targetTourId,
      pinned,
    });
    setSubmitting(false);
    if ("error" in res) {
      toast(res.error, "error");
      return;
    }
    toast("공지를 등록했습니다", "success");
    setTitle("");
    setBody("");
    setPinned(false);
    setTargetTourId("all");
    reload();
  };

  const handleTogglePin = async (a: Announcement) => {
    if (!pwOk) {
      toast("먼저 관리자 비밀번호를 인증하세요", "warning");
      return;
    }
    const res = await db.updateAnnouncement({
      adminPassword: adminPw,
      id: a.id,
      pinned: !a.pinned,
    });
    if ("error" in res) {
      toast(res.error, "error");
      return;
    }
    toast(a.pinned ? "고정 해제" : "상단 고정", "success");
    reload();
  };

  const handleDelete = async (a: Announcement) => {
    if (!pwOk) {
      toast("먼저 관리자 비밀번호를 인증하세요", "warning");
      return;
    }
    if (!(await confirm(`"${a.title}" 공지를 삭제하시겠습니까?`))) return;
    const res = await db.deleteAnnouncement({
      adminPassword: adminPw,
      id: a.id,
    });
    if ("error" in res) {
      toast(res.error, "error");
      return;
    }
    toast("삭제되었습니다", "info");
    reload();
  };

  return (
    <div>
      {/* 관리자 비밀번호 입력 */}
      {!pwOk && (
        <div className="card" style={{ padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>
            공지 작성/수정/삭제는 관리자 비밀번호로 보호됩니다
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="input"
              type="password"
              value={adminPw}
              onChange={(e) => setAdminPw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              placeholder="관리자 비밀번호"
              style={{ flex: 1 }}
              autoFocus
            />
            <button
              onClick={handleVerify}
              disabled={verifying || !adminPw}
              style={{
                background: "var(--primary)", color: "var(--on-primary)",
                border: "none", borderRadius: 8, padding: "8px 16px",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                opacity: verifying || !adminPw ? 0.5 : 1,
              }}
            >
              인증
            </button>
          </div>
        </div>
      )}

      {/* 작성 폼 */}
      {pwOk && (
        <div className="card" style={{ padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: "var(--foreground)" }}>
            새 공지 작성
          </div>
          <div className="input-group">
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목 (필수)"
              maxLength={120}
            />
          </div>
          <div className="input-group">
            <textarea
              className="input"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="본문 내용 (줄바꿈 가능)"
              rows={5}
              style={{ resize: "vertical", minHeight: 100, fontFamily: "inherit" }}
            />
          </div>
          <div className="input-group">
            <div className="input-label">대상</div>
            <select
              className="input"
              value={targetTourId}
              onChange={(e) =>
                setTargetTourId(e.target.value === "all" ? "all" : Number(e.target.value))
              }
            >
              <option value="all">전체 회원</option>
              {tours.map((t) => (
                <option key={t.id} value={t.id}>
                  투어 한정: {t.name}
                </option>
              ))}
            </select>
          </div>
          <label
            style={{
              display: "flex", alignItems: "center", gap: 8, fontSize: 13,
              color: "var(--foreground)", marginBottom: 10, cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
            />
            상단 고정
          </label>
          <button
            onClick={handleCreate}
            disabled={submitting}
            style={{
              width: "100%", background: "var(--primary)", color: "var(--on-primary)",
              border: "none", borderRadius: 10, padding: "12px",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
              opacity: submitting ? 0.5 : 1,
            }}
          >
            {submitting ? "등록 중..." : "공지 등록"}
          </button>
        </div>
      )}

      {/* 기존 공지 목록 */}
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)", padding: "0 4px 8px" }}>
        등록된 공지 ({items.length})
      </div>
      {loading ? (
        <div style={{ textAlign: "center", padding: 24, color: "var(--muted)", fontSize: 13 }}>
          로딩 중...
        </div>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
          등록된 공지가 없습니다
        </div>
      ) : (
        items.map((a) => (
          <div key={a.id} className="card" style={{ padding: 14, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  {a.pinned && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: "var(--primary)",
                      background: "var(--primary-alpha-15)", padding: "2px 6px", borderRadius: 4,
                    }}>📌 고정</span>
                  )}
                  {a.targetTourId && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, color: "var(--muted)",
                      background: "var(--surface)", padding: "2px 6px", borderRadius: 4,
                    }}>투어 #{a.targetTourId}</span>
                  )}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>
                  {a.title}
                </div>
                <div style={{
                  fontSize: 13, color: "var(--foreground)", lineHeight: 1.5,
                  whiteSpace: "pre-line", marginBottom: 6,
                }}>
                  {a.body}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>
                  {a.authorName} · {formatDateTime(a.createdAt)}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => handleTogglePin(a)}
                  style={{
                    background: "var(--primary-alpha-15)", color: "var(--primary)",
                    border: "none", borderRadius: 8, padding: "6px 10px",
                    fontSize: 11, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  {a.pinned ? "고정해제" : "고정"}
                </button>
                <button
                  onClick={() => handleDelete(a)}
                  style={{
                    background: "rgba(239,68,68,0.1)", color: "var(--error)",
                    border: "none", borderRadius: 8, padding: "6px 10px",
                    fontSize: 11, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
