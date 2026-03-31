import { useState, useEffect } from "react";
import * as db from "../../lib/supabase-store";
import { useToast } from "../../toast";
import type { Tour, Waiver } from "../../types";
import { HEALTH_CHECKLIST } from "../../waiver-template";

export function AdminWaivers() {
  const [waivers, setWaivers] = useState<Waiver[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTourId, setFilterTourId] = useState<number | 0>(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { toast, confirm } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [waiversData, toursData] = await Promise.all([
        db.listAllWaivers(),
        db.listTours(),
      ]);
      setWaivers(waiversData);
      setTours(toursData);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = filterTourId ? waivers.filter((w) => w.tourId === filterTourId) : waivers;

  const getTourName = (tourId: number) => tours.find((t) => t.id === tourId)?.name || `투어 #${tourId}`;

  const parseInfo = (w: Waiver) => {
    try { return typeof w.personalInfo === "string" ? JSON.parse(w.personalInfo) : w.personalInfo; }
    catch { return {}; }
  };

  const parseChecklist = (w: Waiver): boolean[] => {
    try { return typeof w.healthChecklist === "string" ? JSON.parse(w.healthChecklist) : w.healthChecklist || []; }
    catch { return []; }
  };

  const handleDelete = async (waiver: Waiver) => {
    if (await confirm(`"${waiver.signerName}" 동의서를 삭제하시겠습니까?`)) {
      await db.deleteWaiver(waiver.id);
      await loadData();
      setExpandedId(null);
      toast("동의서가 삭제되었습니다", "info");
    }
  };

  const formatDate = (d: string | Date | undefined) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("ko-KR");
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "var(--muted)", fontSize: 14 }}>
        로딩 중...
      </div>
    );
  }

  return (
    <div>
      {/* Filter */}
      <select
        className="input"
        value={filterTourId}
        onChange={(e) => setFilterTourId(Number(e.target.value))}
        style={{ marginBottom: 16 }}
      >
        <option value={0}>전체 투어 ({waivers.length}건)</option>
        {tours.map((t) => {
          const count = waivers.filter((w) => w.tourId === t.id).length;
          return (
            <option key={t.id} value={t.id}>
              {t.name} ({count}건)
            </option>
          );
        })}
      </select>

      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
        {filtered.length}건의 동의서
      </div>

      {filtered.map((waiver) => {
        const isExpanded = expandedId === waiver.id;
        const info = isExpanded ? parseInfo(waiver) : null;
        const checklist = isExpanded ? parseChecklist(waiver) : [];
        const checkedItems = isExpanded ? HEALTH_CHECKLIST.filter((_, i) => checklist[i]) : [];

        return (
          <div key={waiver.id} className="card" style={{ marginBottom: 8, padding: 0, overflow: "hidden" }}>
            <div
              onClick={() => setExpandedId(isExpanded ? null : waiver.id)}
              style={{
                padding: "12px 16px", cursor: "pointer",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>
                  {waiver.signerName}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  {getTourName(waiver.tourId)} · {formatDate(waiver.signedAt)}
                </div>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
                background: "var(--success-alpha)", color: "var(--success)",
              }}>
                서명완료
              </span>
              <span style={{ color: "var(--muted)", fontSize: 12, marginLeft: 8 }}>
                {isExpanded ? "▲" : "▼"}
              </span>
            </div>

            {isExpanded && (
              <div style={{ borderTop: "1px solid var(--border)", padding: "12px 16px" }}>
                {/* Personal info */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)", marginBottom: 6 }}>개인 정보</div>
                  <div style={{ background: "var(--surface-light)", borderRadius: 10, padding: 12 }}>
                    {[
                      { label: "이름", value: info?.name },
                      { label: "생년월일", value: info?.birthDate },
                      { label: "전화번호", value: info?.phone },
                      { label: "다이빙 레벨", value: info?.divingLevel },
                      { label: "투어 기간", value: info?.tourPeriod },
                      { label: "투어 장소", value: info?.tourLocation },
                      { label: "비상 연락처", value: info?.emergencyContact },
                    ].map((row, i) => (
                      <div key={i} style={{
                        display: "flex", justifyContent: "space-between",
                        fontSize: 13, padding: "3px 0",
                      }}>
                        <span style={{ color: "var(--muted)" }}>{row.label}</span>
                        <span style={{ color: "var(--foreground)", fontWeight: 500 }}>{row.value || "-"}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Health checklist */}
                {checkedItems.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)", marginBottom: 6 }}>건강 체크리스트</div>
                    <div style={{ background: "var(--warning-alpha)", borderRadius: 10, padding: 12 }}>
                      {checkedItems.map((item, i) => (
                        <div key={i} style={{ fontSize: 13, color: "var(--warning)", display: "flex", gap: 6, padding: "2px 0" }}>
                          <span>⚠</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Signature */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)", marginBottom: 6 }}>서명</div>
                  <img
                    src={waiver.signatureImage || ""}
                    alt="서명"
                    style={{ width: "100%", height: 80, objectFit: "contain", background: "#fff", borderRadius: 8 }}
                  />
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(waiver)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--error)", fontSize: 13, padding: 0 }}
                >
                  삭제
                </button>
              </div>
            )}
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="empty-state">
          <div style={{ color: "var(--muted)" }}>동의서가 없습니다</div>
        </div>
      )}
    </div>
  );
}
