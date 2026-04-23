import { useEffect, useState } from "react";
import type { Route } from "../App";
import { useAnnouncements } from "../hooks/useSupabase";
import { useToast } from "../toast";
import * as db from "../lib/supabase-store";
import { formatDateTime } from "../store";
import type { Announcement } from "../types";

interface Props {
  navigate: (r: Route) => void;
}

export function AnnouncementsScreen({ navigate }: Props) {
  const { announcements, loading, refresh } = useAnnouncements();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // 진입 시 모두 읽음 처리 (한 번)
  useEffect(() => {
    (async () => {
      try {
        await db.markAllAnnouncementsRead();
      } catch {
        // ignore
      }
    })();
  }, []);

  const toggle = async (a: Announcement) => {
    const next = new Set(expanded);
    if (next.has(a.id)) next.delete(a.id);
    else {
      next.add(a.id);
      if (!a.read) {
        try {
          await db.markAnnouncementRead(a.id);
          refresh();
        } catch {
          // ignore
        }
      }
    }
    setExpanded(next);
  };

  const handleMarkAll = async () => {
    try {
      const n = await db.markAllAnnouncementsRead();
      toast(n > 0 ? `${n}개 공지를 읽음 처리했습니다` : "모두 읽음 상태입니다", "success");
      refresh();
    } catch {
      toast("읽음 처리에 실패했습니다", "error");
    }
  };

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
        <h1 style={{ marginLeft: 8, flex: 1 }}>공지사항</h1>
        <button
          onClick={handleMarkAll}
          style={{
            background: "var(--primary-alpha-15)", color: "var(--primary)",
            border: "none", borderRadius: 8, padding: "6px 12px",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}
        >
          모두 읽음
        </button>
      </div>

      <div className="p-16" style={{ paddingTop: 0 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--muted)", fontSize: 14 }}>
            로딩 중...
          </div>
        ) : announcements.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
            등록된 공지가 없습니다
          </div>
        ) : (
          announcements.map((a) => {
            const isOpen = expanded.has(a.id);
            return (
              <div
                key={a.id}
                className="card"
                style={{ padding: 0, marginBottom: 8, overflow: "hidden" }}
              >
                <button
                  onClick={() => toggle(a)}
                  style={{
                    width: "100%", textAlign: "left", background: "none", border: "none",
                    padding: "14px 16px", cursor: "pointer", color: "var(--foreground)",
                    display: "flex", alignItems: "flex-start", gap: 10,
                  }}
                >
                  {!a.read && (
                    <span
                      aria-label="새 공지"
                      style={{
                        width: 8, height: 8, borderRadius: 4, background: "var(--error)",
                        flexShrink: 0, marginTop: 8,
                      }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
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
                        }}>투어 한정</span>
                      )}
                    </div>
                    <div style={{
                      fontSize: 15, fontWeight: a.read ? 500 : 700,
                      color: "var(--foreground)", marginBottom: 3,
                    }}>
                      {a.title}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>
                      {a.authorName} · {formatDateTime(a.createdAt)}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 16, color: "var(--muted)",
                    transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s",
                  }}>›</span>
                </button>
                {isOpen && (
                  <div style={{
                    padding: "0 16px 16px 34px",
                    fontSize: 14, color: "var(--foreground)", lineHeight: 1.6,
                    whiteSpace: "pre-line", borderTop: "1px solid var(--border)",
                    paddingTop: 12,
                  }}>
                    {a.body}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
