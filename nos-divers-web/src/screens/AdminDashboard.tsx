import { useState } from "react";
import type { Route } from "../App";
import { AdminStats } from "./admin/AdminStats";
import { AdminTours } from "./admin/AdminTours";
import { AdminWaivers } from "./admin/AdminWaivers";
import { AdminBackup } from "./admin/AdminBackup";
import { AdminAnnouncements } from "./admin/AdminAnnouncements";
import * as db from "../lib/supabase-store";
import { useToast } from "../toast";

interface Props {
  navigate: (r: Route) => void;
}

type AdminTab = "stats" | "tours" | "waivers" | "announcements" | "backup";

const TABS: { key: AdminTab; label: string }[] = [
  { key: "stats", label: "통계" },
  { key: "tours", label: "투어" },
  { key: "waivers", label: "동의서" },
  { key: "announcements", label: "공지" },
  { key: "backup", label: "백업" },
];

export function AdminDashboard({ navigate }: Props) {
  const [tab, setTab] = useState<AdminTab>("stats");
  const { toast, confirm } = useToast();

  const handleExit = async () => {
    if (await confirm("관리자 모드를 종료하시겠습니까?")) {
      await db.releaseAdminAccess();
      toast("관리자 모드 종료됨", "info");
      navigate({ screen: "settings" });
    }
  };

  return (
    <>
      <div className="p-16" style={{ paddingBottom: 0, display: "flex", alignItems: "center", gap: 8 }}>
        <button
          className="back-btn"
          onClick={() => navigate({ screen: "settings" })}
          style={{ flex: 1, textAlign: "left" }}
        >
          ← 앱으로 돌아가기
        </button>
        <button
          onClick={handleExit}
          style={{
            background: "rgba(239,68,68,0.1)", color: "var(--error)",
            border: "none", borderRadius: 8, padding: "6px 12px",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}
        >
          관리자 모드 종료
        </button>
      </div>

      <div className="page-header">
        <h1 style={{ fontSize: 22 }}>관리자 대시보드</h1>
      </div>

      <div className="detail-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`detail-tab ${tab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="scroll-content">
        {tab === "stats" && <AdminStats />}
        {tab === "tours" && <AdminTours navigate={navigate} />}
        {tab === "waivers" && <AdminWaivers />}
        {tab === "announcements" && <AdminAnnouncements />}
        {tab === "backup" && <AdminBackup />}
      </div>
    </>
  );
}
