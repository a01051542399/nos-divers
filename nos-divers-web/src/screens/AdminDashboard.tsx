import { useState } from "react";
import type { Route } from "../App";
import { AdminStats } from "./admin/AdminStats";
import { AdminTours } from "./admin/AdminTours";
import { AdminWaivers } from "./admin/AdminWaivers";
import { AdminBackup } from "./admin/AdminBackup";
import { AdminAnnouncements } from "./admin/AdminAnnouncements";

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

  return (
    <>
      <div className="p-16" style={{ paddingBottom: 0 }}>
        <button
          className="back-btn"
          onClick={() => navigate({ screen: "settings" })}
        >
          ← 앱으로 돌아가기
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
        {tab === "tours" && <AdminTours />}
        {tab === "waivers" && <AdminWaivers />}
        {tab === "announcements" && <AdminAnnouncements />}
        {tab === "backup" && <AdminBackup />}
      </div>
    </>
  );
}
