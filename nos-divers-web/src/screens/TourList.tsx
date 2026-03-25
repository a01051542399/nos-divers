import { useState } from "react";
import * as store from "../store";
import { useToast } from "../toast";
import type { Route } from "../App";

interface Props {
  navigate: (r: Route) => void;
}

export function TourListScreen({ navigate }: Props) {
  const [tours, setTours] = useState(() => store.listTours());
  const [showCreate, setShowCreate] = useState(false);
  const { toast, confirm } = useToast();
  const [form, setForm] = useState({
    name: "",
    date: "",
    location: "",
    accessCode: "0000",
    createdBy: "",
  });

  const handleCreate = () => {
    if (!form.name.trim()) {
      toast("투어 이름을 입력해주세요", "warning");
      return;
    }
    store.createTour(form);
    setTours(store.listTours());
    setShowCreate(false);
    setForm({ name: "", date: "", location: "", accessCode: "0000", createdBy: "" });
    toast("투어가 생성되었습니다", "success");
  };

  const handleShare = async (e: React.MouseEvent, inviteCode: string) => {
    e.stopPropagation();
    const text = `NoS Divers 투어에 참가하세요!\n초대 코드: ${inviteCode}`;
    if (navigator.share) {
      try { await navigator.share({ text }); } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      toast("초대 코드가 복사되었습니다!", "success");
    }
  };

  const handleDelete = async (e: React.MouseEvent, tourId: number) => {
    e.stopPropagation();
    if (await confirm("투어를 삭제하시겠습니까?")) {
      store.deleteTour(tourId);
      setTours(store.listTours());
      toast("투어가 삭제되었습니다", "info");
    }
  };

  const fields = [
    { key: "name", label: "투어 이름 *", placeholder: "예: 동해 소수정예" },
    { key: "date", label: "날짜", placeholder: "예: 2026-04-01" },
    { key: "location", label: "장소", placeholder: "예: 사라웃리조트" },
    { key: "accessCode", label: "입장 코드 (4자리)", placeholder: "0000" },
    { key: "createdBy", label: "주최자", placeholder: "이름" },
  ];

  return (
    <>
      {/* Logo */}
      <div className="logo-header">
        <img src="/logo-dolphin.png" alt="NoS Divers" style={{ width: 100, height: 100 }} />
        <div className="logo-title">NoS DIVERS</div>
        <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 1 }}>SINCE 2019 DIVING TEAM</div>
      </div>

      {/* Greeting */}
      <div className="greeting">
        안녕하세요, <strong>다이버</strong>님
      </div>

      {/* Header with actions */}
      <div className="tour-list-header">
        <h1>다이빙 투어</h1>
        <button className="header-btn" onClick={() => navigate({ screen: "join" })}>
          ▶ 참여
        </button>
        <button className="header-btn filled" onClick={() => setShowCreate(true)}>
          + 새 투어
        </button>
      </div>

      {/* Tour List */}
      <div className="p-16" style={{ paddingTop: 0 }}>
        {tours.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🤿</div>
            <div>아직 투어가 없습니다</div>
          </div>
        ) : (
          tours.map((tour) => (
            <div
              key={tour.id}
              className="tour-list-card"
              onClick={() => navigate({ screen: "tour-detail", tourId: tour.id })}
            >
              <div className="card-header">
                <div>
                  <div className="card-title">{tour.name}</div>
                  <div className="card-meta">
                    {tour.date && <span>📅 {tour.date}</span>}
                    {tour.location && <span>📍 {tour.location}</span>}
                  </div>
                </div>
                <div className="card-actions">
                  <button className="share-btn" onClick={(e) => handleShare(e, tour.inviteCode)}>▶</button>
                  <button className="delete-btn" onClick={(e) => handleDelete(e, tour.id)}>🗑</button>
                </div>
              </div>
              <div className="card-footer">
                <span>👤 주최: {tour.createdBy || "-"}</span>
                <span>👥 {tour.participants.length}명</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Tour Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">새 투어 만들기</div>

            {fields.map((field) => (
              <div key={field.key} className="input-group">
                <div className="input-label">{field.label}</div>
                <input
                  className="input"
                  value={(form as any)[field.key]}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                />
              </div>
            ))}

            <div className="flex-row gap-12 mt-8">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>
                취소
              </button>
              <button className="btn btn-primary" onClick={handleCreate}>
                만들기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
