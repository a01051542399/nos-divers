import { useState, useEffect } from "react";
import type { Route } from "../../App";
import * as db from "../../lib/supabase-store";
import { formatKRW, formatDateTime } from "../../store";
import { useToast } from "../../toast";
import type { Tour } from "../../types";

interface Props {
  navigate?: (r: Route) => void;
}

export function AdminTours({ navigate }: Props = {}) {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: "", date: "", location: "" });
  const [waiverCounts, setWaiverCounts] = useState<Record<number, number>>({});
  const { toast, confirm } = useToast();

  const loadTours = async () => {
    setLoading(true);
    try {
      const data = await db.listTours();
      setTours(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTours();
  }, []);

  const filtered = search
    ? tours.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    : tours;

  const handleEdit = (tour: Tour) => {
    setEditingId(tour.id);
    setEditForm({ name: tour.name, date: tour.date, location: tour.location });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    if (!editForm.name.trim()) { toast("투어 이름을 입력해주세요", "warning"); return; }
    await db.editTour(editingId, editForm);
    setEditingId(null);
    await loadTours();
    toast("투어가 수정되었습니다", "success");
  };

  const handleDelete = async (tour: Tour) => {
    if (await confirm(`"${tour.name}" 투어를 삭제하시겠습니까?\n관련 동의서와 댓글도 모두 삭제됩니다.`)) {
      await db.deleteTour(tour.id);
      await loadTours();
      setExpandedId(null);
      toast("투어가 삭제되었습니다", "info");
    }
  };

  const loadWaiverCount = async (tourId: number) => {
    if (waiverCounts[tourId] !== undefined) return;
    try {
      const waivers = await db.listWaiversByTour(tourId);
      setWaiverCounts((prev) => ({ ...prev, [tourId]: waivers.length }));
    } catch {
      // ignore
    }
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
      {/* Search */}
      <input
        className="input"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="투어 이름 검색..."
        style={{ marginBottom: 16 }}
      />

      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
        총 {filtered.length}개 투어
      </div>

      {filtered.map((tour) => {
        const isExpanded = expandedId === tour.id;
        const isEditing = editingId === tour.id;
        const totalKRW = tour.expenses.reduce((s, e) => s + e.amount * (e.exchangeRate || 1), 0);

        return (
          <div key={tour.id} className="card" style={{ marginBottom: 8, padding: 0, overflow: "hidden" }}>
            {/* Header row */}
            <div
              onClick={() => {
                const nextExpanded = isExpanded ? null : tour.id;
                setExpandedId(nextExpanded);
                setEditingId(null);
                if (nextExpanded) loadWaiverCount(tour.id);
              }}
              style={{
                padding: "12px 16px", cursor: "pointer",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>{tour.name}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  {tour.date || "날짜 미정"} · {tour.location || "장소 미정"}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 13, color: "var(--primary)", fontWeight: 600 }}>
                  {tour.participants.length}명 · {tour.expenses.length}건
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>
                  {formatKRW(totalKRW)}
                </div>
              </div>
              <span style={{ color: "var(--muted)", fontSize: 12, marginLeft: 8 }}>
                {isExpanded ? "▲" : "▼"}
              </span>
            </div>

            {/* Expanded detail */}
            {isExpanded && (
              <div style={{ borderTop: "1px solid var(--border)", padding: "12px 16px" }}>
                {isEditing ? (
                  <div>
                    <div className="input-group">
                      <div className="input-label">투어 이름</div>
                      <input className="input" value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                    </div>
                    <div className="input-group">
                      <div className="input-label">날짜</div>
                      <input className="input" type="date" value={editForm.date}
                        onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
                    </div>
                    <div className="input-group">
                      <div className="input-label">장소</div>
                      <input className="input" value={editForm.location}
                        onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} />
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button className="btn btn-secondary" onClick={() => setEditingId(null)}>취소</button>
                      <button className="btn btn-primary" onClick={handleSaveEdit}>저장</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Info rows */}
                    <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.8 }}>
                      <div>주최: {tour.createdBy || "-"}</div>
                      <div>초대코드: <span style={{ fontWeight: 700, color: "var(--foreground)" }}>{tour.inviteCode}</span></div>
                      <div>접근코드: <span style={{ fontWeight: 700, color: "var(--foreground)" }}>{tour.accessCode}</span></div>
                      <div>동의서: {waiverCounts[tour.id] ?? "..."}건</div>
                      <div>생성일: {formatDateTime(tour.createdAt)}</div>
                    </div>

                    {/* Participants */}
                    {tour.participants.length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", marginBottom: 4 }}>참여자</div>
                        <div style={{ fontSize: 13, color: "var(--muted)" }}>
                          {tour.participants.map((p) => p.name).join(", ")}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 12, marginTop: 14, alignItems: "center" }}>
                      {navigate && (
                        <button
                          onClick={() => navigate({ screen: "tour-detail", tourId: tour.id })}
                          style={{
                            background: "var(--primary)", color: "var(--on-primary)",
                            border: "none", borderRadius: 8, padding: "8px 14px",
                            fontSize: 13, fontWeight: 700, cursor: "pointer",
                          }}
                        >
                          📋 상세 관리
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(tour)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", fontSize: 13, fontWeight: 600, padding: 0 }}
                      >
                        이름/날짜 수정
                      </button>
                      <button
                        onClick={() => handleDelete(tour)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--error)", fontSize: 13, padding: 0 }}
                      >
                        삭제
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="empty-state">
          <div style={{ color: "var(--muted)" }}>
            {search ? "검색 결과가 없습니다" : "등록된 투어가 없습니다"}
          </div>
        </div>
      )}
    </div>
  );
}
