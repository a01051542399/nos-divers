import { useState } from "react";
import * as store from "../store";
import { useToast } from "../toast";
import type { Route } from "../App";

interface Props {
  tourId: number;
  navigate: (r: Route) => void;
}

export function WaiverViewScreen({ tourId, navigate }: Props) {
  const [waivers, setWaivers] = useState(() =>
    store.listWaiversByTour(tourId)
  );
  const { confirm, toast } = useToast();

  const handleDelete = async (waiverId: number) => {
    if (await confirm("이 서명을 삭제하시겠습니까?")) {
      store.deleteWaiver(waiverId);
      setWaivers(store.listWaiversByTour(tourId));
      toast("서명이 삭제되었습니다", "info");
    }
  };

  return (
    <>
      <div className="p-16" style={{ paddingBottom: 0 }}>
        <button
          className="back-btn"
          onClick={() => navigate({ screen: "tour-detail", tourId })}
        >
          ← 뒤로
        </button>
      </div>

      <div className="page-header">
        <h1 style={{ fontSize: 22 }}>서명 목록</h1>
        <p>총 {waivers.length}건의 서명</p>
      </div>

      <div className="p-16" style={{ paddingTop: 0 }}>
        {waivers.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div>서명된 면책동의서가 없습니다</div>
          </div>
        ) : (
          waivers.map((waiver) => {
            const info = waiver.personalInfo;
            return (
              <div key={waiver.id} className="card">
                <div
                  className="flex-row"
                  style={{
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: 17, fontWeight: 600 }}>
                    {waiver.signerName}
                  </span>
                  <span className="badge badge-success">서명 완료</span>
                </div>

                <div className="mt-8" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span className="text-muted" style={{ fontSize: 13 }}>
                    📱 {info?.phone || "-"}
                  </span>
                  <span className="text-muted" style={{ fontSize: 13 }}>
                    🤿 {info?.divingLevel || "-"}
                  </span>
                  <span className="text-muted" style={{ fontSize: 13 }}>
                    📅{" "}
                    {waiver.signedAt
                      ? new Date(waiver.signedAt).toLocaleDateString("ko-KR")
                      : "-"}
                  </span>
                </div>

                <button
                  className="text-error mt-8"
                  onClick={() => handleDelete(waiver.id)}
                >
                  삭제
                </button>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
