import { useState, useEffect } from "react";
import * as db from "../lib/supabase-store";
import { formatDate } from "../store";
import type { Route } from "../App";
import type { Tour, Waiver } from "../types";

interface Props {
  navigate: (r: Route) => void;
}

export function WaiversTab({ navigate }: Props) {
  const [tours, setTours] = useState<Tour[]>([]);
  const [waiversByTour, setWaiversByTour] = useState<Record<number, Waiver[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedTourId, setSelectedTourId] = useState<number | null>(null);
  const [profile, setProfile] = useState<{ name: string }>({ name: "" });

  // Load tours + waivers on mount
  useEffect(() => {
    (async () => {
      try {
        const [toursData, allWaivers, prof] = await Promise.all([
          db.listTours(),
          db.listAllWaivers(),
          db.getProfile(),
        ]);
        setTours(toursData);
        setProfile(prof);

        // Group waivers by tourId
        const grouped: Record<number, Waiver[]> = {};
        for (const w of allWaivers) {
          if (!grouped[w.tourId]) grouped[w.tourId] = [];
          grouped[w.tourId].push(w);
        }
        setWaiversByTour(grouped);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <>
        <div className="page-header">
          <h1>면책동의서</h1>
        </div>
        <div className="p-16" style={{ paddingTop: 0 }}>
          <div style={{ textAlign: "center", padding: 40, color: "var(--muted)", fontSize: 14 }}>
            로딩 중...
          </div>
        </div>
      </>
    );
  }

  // Tour list view
  if (selectedTourId === null) {
    return (
      <>
        <div className="page-header">
          <h1>면책동의서</h1>
        </div>

        <div className="p-16" style={{ paddingTop: 0 }}>
          {tours.length === 0 ? (
            <div className="empty-state">
              <div style={{ color: "var(--muted)", fontSize: 14 }}>
                투어를 생성하면 동의서가 자동으로 생성됩니다
              </div>
            </div>
          ) : (
            tours.map((tour) => {
              const waivers = waiversByTour[tour.id] || [];
              const signedNames = waivers.map((w) => w.signerName);
              const unsigned = tour.participants.filter((p) => !signedNames.includes(p.name));

              return (
                <div
                  key={tour.id}
                  className="card"
                  style={{ padding: "14px 16px", marginBottom: 8, cursor: "pointer" }}
                  onClick={() => setSelectedTourId(tour.id)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, color: "var(--foreground)" }}>
                        {tour.name}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                        {formatDate(tour.date) || "날짜 미정"} · {tour.participants.length}명
                      </div>
                      {unsigned.length > 0 && (
                        <div style={{ fontSize: 11, color: "var(--error)", marginTop: 3 }}>
                          미서명: {unsigned.map((p) => p.name).join(", ")}
                        </div>
                      )}
                    </div>
                    <span style={{ color: "var(--muted)", fontSize: 14 }}>›</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </>
    );
  }

  // Tour detail waiver view
  const tour = tours.find((t) => t.id === selectedTourId);
  if (!tour) {
    setSelectedTourId(null);
    return null;
  }

  const waivers = waiversByTour[tour.id] || [];
  const signedNames = waivers.map((w) => w.signerName);
  const currentUser = profile.name || null;

  return (
    <>
      <div style={{ padding: "12px 16px" }}>
        <button
          className="back-btn"
          onClick={() => setSelectedTourId(null)}
        >
          ← 뒤로
        </button>
      </div>

      <div className="page-header" style={{ paddingTop: 0 }}>
        <h1>{tour.name}</h1>
        <p>{formatDate(tour.date) || "날짜 미정"} · {tour.location || ""}</p>
        {currentUser ? (
          <p style={{ fontSize: 12, color: "var(--primary)", marginTop: 2 }}>
            내 이름: {currentUser}
          </p>
        ) : (
          <p style={{ fontSize: 12, color: "var(--error)", marginTop: 2 }}>
            설정에서 이름을 등록하면 서명할 수 있습니다
          </p>
        )}
      </div>

      <div className="p-16" style={{ paddingTop: 0 }}>
        {tour.participants.length === 0 ? (
          <div style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: 24 }}>
            참여자가 없습니다
          </div>
        ) : (
          tour.participants.map((p) => {
            const signed = signedNames.includes(p.name);
            return (
              <div
                key={p.id}
                style={{
                  display: "flex", alignItems: "center", padding: "10px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", marginRight: 10,
                  background: signed ? "var(--success)" : "var(--surface-light)",
                  color: signed ? "#fff" : "var(--muted)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>
                  {signed ? "✓" : p.name.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--foreground)" }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: signed ? "var(--success)" : "var(--error)" }}>
                    {signed ? "서명 완료" : "미서명"}
                  </div>
                </div>
                {!signed ? (
                  currentUser === p.name ? (
                    <button
                      onClick={() => navigate({ screen: "waiver-sign", tourId: tour.id })}
                      style={{
                        background: "var(--primary)", color: "var(--on-primary)",
                        border: "none", borderRadius: 8, padding: "6px 12px",
                        fontSize: 12, fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      서명
                    </button>
                  ) : (
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>본인만 가능</span>
                  )
                ) : (
                  <button
                    onClick={() => navigate({ screen: "waiver-view", tourId: tour.id })}
                    style={{
                      background: "none", border: "1px solid var(--border)",
                      borderRadius: 8, padding: "6px 12px",
                      fontSize: 12, color: "var(--muted)", cursor: "pointer",
                    }}
                  >
                    보기
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
