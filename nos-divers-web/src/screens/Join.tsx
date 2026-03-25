import { useState } from "react";
import * as store from "../store";
import { useToast } from "../toast";
import type { Route } from "../App";

interface Props {
  navigate: (r: Route) => void;
}

export function JoinScreen({ navigate }: Props) {
  const [step, setStep] = useState(0);
  const [inviteCode, setInviteCode] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [name, setName] = useState("");
  const [tour, setTour] = useState<ReturnType<typeof store.getTourByInviteCode>>(undefined);
  const { toast } = useToast();

  const handleCheckCode = () => {
    if (inviteCode.length < 4) {
      toast("초대 코드를 입력해주세요", "warning");
      return;
    }
    const found = store.getTourByInviteCode(inviteCode);
    if (found) {
      setTour(found);
      setStep(1);
    } else {
      toast("유효하지 않은 초대 코드입니다", "error");
    }
  };

  const handleJoin = () => {
    if (!name.trim()) {
      toast("이름을 입력해주세요", "warning");
      return;
    }
    if (!tour) return;

    if (!store.verifyTourAccessCode(tour.id, accessCode)) {
      toast("접근 코드가 올바르지 않습니다", "error");
      return;
    }

    store.addParticipant(tour.id, name.trim());
    toast("투어에 참가하였습니다!", "success");
    navigate({ screen: "tour-detail", tourId: tour.id });
  };

  return (
    <div className="join-screen">
      {step === 0 && (
        <div style={{ width: "100%" }}>
          <h2
            style={{
              fontSize: 24,
              fontWeight: "bold",
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            투어 참가
          </h2>
          <p
            className="text-muted text-center"
            style={{ marginBottom: 32 }}
          >
            초대 코드를 입력하세요
          </p>

          <input
            className="join-code-input"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="초대 코드 (8자리)"
            maxLength={8}
          />

          <button className="btn btn-primary" onClick={handleCheckCode}>
            확인
          </button>
        </div>
      )}

      {step === 1 && tour && (
        <div style={{ width: "100%" }}>
          <h2
            style={{
              fontSize: 24,
              fontWeight: "bold",
              textAlign: "center",
              marginBottom: 20,
            }}
          >
            투어 정보 확인
          </h2>

          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
              {tour.name}
            </div>
            {tour.date && (
              <div className="text-muted">📅 {tour.date}</div>
            )}
            {tour.location && (
              <div className="text-muted">📍 {tour.location}</div>
            )}
            {tour.createdBy && (
              <div className="text-muted mt-8">주최: {tour.createdBy}</div>
            )}
          </div>

          <div className="input-group">
            <input
              className="input"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="접근 코드 (4자리)"
              maxLength={4}
              inputMode="numeric"
              style={{
                fontSize: 20,
                textAlign: "center",
                letterSpacing: 6,
              }}
            />
          </div>

          <div className="input-group">
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="참가자 이름"
            />
          </div>

          <button
            className="btn btn-primary"
            style={{ marginBottom: 12 }}
            onClick={handleJoin}
          >
            참가하기
          </button>

          <div className="text-center">
            <button
              className="text-muted"
              style={{ background: "none", border: "none", cursor: "pointer" }}
              onClick={() => setStep(0)}
            >
              뒤로
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
