import { useState, useEffect } from "react";
import type { Route } from "../App";
import { useToast } from "../toast";
import * as db from "../lib/supabase-store";

interface Props {
  navigate: (r: Route) => void;
}

export function JoinScreen({ navigate }: Props) {
  const [step, setStep] = useState(0);
  const [inviteCode, setInviteCode] = useState("");
  const [name, setName] = useState("");
  const [tour, setTour] = useState<{
    id: number;
    name: string;
    date: string;
    location: string;
    createdByName: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Load profile name on mount
  useEffect(() => {
    (async () => {
      const profile = await db.getProfile();
      if (profile.name) setName(profile.name);
    })();
  }, []);

  const handleCheckCode = async () => {
    if (!inviteCode.trim() || inviteCode.trim().length < 6) {
      toast("6자리 초대 코드를 입력해주세요", "warning");
      return;
    }
    setLoading(true);
    try {
      const found = await db.lookupTourByInvite(inviteCode);
      if (found) {
        setTour(found);
        setStep(1);
      } else {
        toast("유효하지 않은 초대 코드입니다", "error");
      }
    } catch {
      toast("코드 확인 중 오류가 발생했습니다", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!name.trim()) {
      toast("이름을 입력해주세요", "warning");
      return;
    }
    if (!tour) return;

    setLoading(true);
    try {
      const result = await db.joinTour(inviteCode, name.trim());
      if ("error" in result) {
        if (result.error.includes("이미")) {
          toast("이미 참여 중입니다", "info");
          navigate({ screen: "tour-detail", tourId: tour.id });
        } else {
          toast(result.error, "error");
        }
      } else {
        toast("투어에 참가하였습니다!", "success");
        navigate({ screen: "tour-detail", tourId: result.tourId });
      }
    } catch {
      toast("참여 중 오류가 발생했습니다", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="join-screen">
      {/* Header with back button */}
      <div style={{ padding: "8px 16px" }}>
        <button
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: 4,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--primary)",
            fontSize: 16,
            fontWeight: 600,
          }}
          onClick={() => {
            if (step === 1) {
              setStep(0);
              setTour(null);
            } else {
              navigate({ screen: "tours" });
            }
          }}
        >
          <span style={{ fontSize: 18 }}>&lsaquo;</span> 뒤로
        </button>
      </div>

      {/* Step 0: Enter invite code */}
      {step === 0 && (
        <div style={{ width: "100%", paddingTop: 40, textAlign: "center" }}>
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: "var(--primary-alpha-15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto",
                fontSize: 40,
              }}
            >
              +
            </div>
          </div>
          <h2
            style={{
              fontSize: 26,
              fontWeight: 800,
              textAlign: "center",
              marginBottom: 8,
              color: "var(--foreground)",
            }}
          >
            투어 참여하기
          </h2>
          <p
            style={{
              color: "var(--muted)",
              textAlign: "center",
              marginBottom: 32,
              fontSize: 15,
              lineHeight: 1.5,
            }}
          >
            초대 코드를 입력하여 다이빙 투어에 참여하세요
          </p>

          <div style={{ width: "100%", marginBottom: 16, textAlign: "left" }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 8,
                color: "var(--foreground)",
              }}
            >
              초대 코드
            </div>
            <input
              className="join-code-input"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="예: ABC123"
              maxLength={6}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCheckCode()}
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={handleCheckCode}
            disabled={loading}
            style={{
              opacity: inviteCode.trim().length >= 6 ? 1 : 0.5,
            }}
          >
            {loading ? "확인 중..." : "코드 확인"}
          </button>
        </div>
      )}

      {/* Step 1: Tour info + name input + join */}
      {step === 1 && tour && (
        <div style={{ width: "100%", paddingTop: 40, textAlign: "center" }}>
          {/* Tour info card */}
          <div
            style={{
              width: "100%",
              borderRadius: 16,
              padding: 20,
              marginBottom: 24,
              background: "var(--primary)",
              color: "#fff",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                opacity: 0.7,
                marginBottom: 4,
              }}
            >
              참여할 투어
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                marginBottom: 8,
              }}
            >
              {tour.name}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 16,
                flexWrap: "wrap",
                marginBottom: 8,
                fontSize: 13,
                opacity: 0.8,
              }}
            >
              {tour.date && <span>{tour.date}</span>}
              {tour.location && <span>{tour.location}</span>}
            </div>
            <div style={{ fontSize: 13, opacity: 0.8 }}>
              주최: {tour.createdByName}
            </div>
          </div>

          {/* Name input */}
          <div style={{ width: "100%", marginBottom: 16, textAlign: "left" }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 8,
                color: "var(--foreground)",
              }}
            >
              이름 입력
            </div>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="참여자 이름을 입력하세요"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
              동명이인의 경우 이름 뒤에 숫자를 붙여주세요 (예: 홍길동2)
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleJoin}
            disabled={loading}
            style={{
              opacity: name.trim() ? 1 : 0.5,
            }}
          >
            {loading ? "참여 중..." : "참여하기"}
          </button>

          <div style={{ marginTop: 16 }}>
            <button
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--muted)",
                fontSize: 15,
                fontWeight: 500,
                padding: "12px 0",
              }}
              onClick={() => {
                setStep(0);
                setTour(null);
              }}
            >
              다른 코드 입력
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
