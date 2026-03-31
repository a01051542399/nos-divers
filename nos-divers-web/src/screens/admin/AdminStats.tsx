import { useState, useEffect } from "react";
import * as db from "../../lib/supabase-store";
import { formatKRW, formatDate } from "../../store";
import type { Tour, Waiver } from "../../types";

export function AdminStats() {
  const [stats, setStats] = useState<{
    tourCount: number;
    participantCount: number;
    expenseCount: number;
    waiverCount: number;
    commentCount: number;
    totalExpenseKRW: number;
  } | null>(null);
  const [tours, setTours] = useState<Tour[]>([]);
  const [waivers, setWaivers] = useState<Waiver[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [statsData, toursData, waiversData] = await Promise.all([
          db.getDataStats(),
          db.listTours(),
          db.listAllWaivers(),
        ]);
        setStats(statsData);
        setTours(toursData);
        setWaivers(waiversData);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Recent activity: combine tours and waivers, sort by date descending
  const recentActivity = (() => {
    const items: { type: "tour" | "waiver"; name: string; date: string }[] = [];
    for (const t of tours) {
      items.push({ type: "tour", name: `투어 "${t.name}" 생성`, date: t.createdAt || "" });
    }
    for (const w of waivers) {
      items.push({ type: "waiver", name: `${w.signerName} 동의서 서명`, date: typeof w.signedAt === "string" ? w.signedAt : "" });
    }
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return items.slice(0, 10);
  })();

  const timeAgo = (dateStr: string) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "방금";
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}일 전`;
    return formatDate(dateStr);
  };

  if (loading || !stats) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "var(--muted)", fontSize: 14 }}>
        로딩 중...
      </div>
    );
  }

  return (
    <div>
      {/* Stat cards 2x2 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <StatCard label="총 투어" value={String(stats.tourCount)} color="var(--primary)" />
        <StatCard label="총 참여자" value={`${stats.participantCount}명`} color="var(--success)" />
        <StatCard label="총 비용" value={formatKRW(stats.totalExpenseKRW)} color="var(--warning)" />
        <StatCard label="총 동의서" value={`${stats.waiverCount}건`} color="var(--primary)" />
      </div>

      {/* Data size */}
      <div className="card" style={{ padding: 14, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 6 }}>
          <span style={{ color: "var(--muted)" }}>비용 항목</span>
          <span style={{ color: "var(--foreground)", fontWeight: 600 }}>{stats.expenseCount}건</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 6 }}>
          <span style={{ color: "var(--muted)" }}>댓글</span>
          <span style={{ color: "var(--foreground)", fontWeight: 600 }}>{stats.commentCount}건</span>
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>최근 활동</div>
      {recentActivity.length === 0 ? (
        <div className="empty-state">
          <div style={{ color: "var(--muted)" }}>활동 내역이 없습니다</div>
        </div>
      ) : (
        recentActivity.map((item, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 0", borderBottom: "1px solid var(--border)",
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
              background: item.type === "tour" ? "var(--primary)" : "var(--success)",
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, color: "var(--foreground)" }}>{item.name}</div>
            </div>
            <span style={{ fontSize: 12, color: "var(--muted)", flexShrink: 0 }}>
              {timeAgo(item.date)}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="card" style={{ padding: 16, textAlign: "center" }}>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}
