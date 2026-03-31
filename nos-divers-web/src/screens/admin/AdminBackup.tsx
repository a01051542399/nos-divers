import { useState, useEffect } from "react";
import * as db from "../../lib/supabase-store";
import { formatDateTime } from "../../store";
import { useToast } from "../../toast";

export function AdminBackup() {
  const { toast, confirm } = useToast();
  const [stats, setStats] = useState<{
    tourCount: number;
    participantCount: number;
    expenseCount: number;
    waiverCount: number;
    commentCount: number;
    totalExpenseKRW: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await db.getDataStats();
        setStats(data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const lastBackup = localStorage.getItem("nos_divers_last_backup");

  if (loading || !stats) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "var(--muted)", fontSize: 14 }}>
        로딩 중...
      </div>
    );
  }

  return (
    <div>
      {/* Backup Info */}
      <div className="card" style={{ padding: 20, marginBottom: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", marginBottom: 12 }}>
          데이터 현황
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.8, marginBottom: 14 }}>
          <div>투어: {stats.tourCount}개 · 참여자: {stats.participantCount}명</div>
          <div>비용: {stats.expenseCount}건 · 동의서: {stats.waiverCount}건</div>
          {lastBackup && (
            <div style={{ marginTop: 4 }}>
              마지막 백업: {formatDateTime(lastBackup)}
            </div>
          )}
        </div>
        <div style={{
          padding: "10px 14px", borderRadius: 10,
          background: "rgba(var(--primary-rgb, 0, 122, 255), 0.06)",
          color: "var(--primary)", fontSize: 13, lineHeight: 1.6,
        }}>
          서버 기반 데이터는 Supabase에 안전하게 저장됩니다.
          별도의 백업/복원이 필요하지 않습니다.
        </div>
      </div>

      {/* Data Reset */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--error)", marginBottom: 12 }}>
          데이터 초기화
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14, lineHeight: 1.6 }}>
          주의: 서버의 데이터는 관리자만 Supabase 대시보드에서 삭제할 수 있습니다.
          로컬 캐시만 초기화됩니다.
        </div>
        <button className="btn btn-danger" onClick={async () => {
          if (!(await confirm("로컬 캐시를 초기화하시겠습니까?\n서버 데이터는 영향받지 않습니다."))) return;
          localStorage.clear();
          toast("로컬 캐시가 초기화되었습니다. 페이지를 새로고침합니다.", "info");
          setTimeout(() => window.location.reload(), 1000);
        }}>
          로컬 캐시 초기화
        </button>
      </div>
    </div>
  );
}
