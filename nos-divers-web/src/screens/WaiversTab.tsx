import { useState } from "react";
import * as store from "../store";
import type { Route } from "../App";

interface Props {
  navigate: (r: Route) => void;
}

export function WaiversTab({ navigate }: Props) {
  const [tours] = useState(() => store.listTours());

  return (
    <>
      <div className="page-header">
        <h1>면책동의서</h1>
      </div>

      <div className="p-16" style={{ paddingTop: 0 }}>
        {tours.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📄</div>
            <div>투어가 없습니다</div>
          </div>
        ) : (
          tours.map((tour) => (
            <div key={tour.id} className="card">
              <div className="card-title" style={{ marginBottom: 12 }}>
                {tour.name}
              </div>
              <div className="flex-row gap-8">
                <button
                  className="btn btn-primary"
                  onClick={() => navigate({ screen: "waiver-sign", tourId: tour.id })}
                >
                  서명하기
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => navigate({ screen: "waiver-view", tourId: tour.id })}
                >
                  서명 목록
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
