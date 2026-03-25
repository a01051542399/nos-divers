import { useState, useRef, useCallback } from "react";
import * as store from "../store";
import { useToast } from "../toast";
import {
  WAIVER_TITLE,
  WAIVER_SECTIONS,
  HEALTH_CHECKLIST_ITEMS,
} from "../waiver-template";
import type { Route } from "../App";

interface Props {
  tourId: number;
  navigate: (r: Route) => void;
}

const STEPS = ["개인정보", "면책 내용", "건강체크", "서명", "완료"];

export function WaiverSignScreen({ tourId, navigate }: Props) {
  const [step, setStep] = useState(0);
  const { toast } = useToast();

  // Step 0: Personal Info
  const [personalInfo, setPersonalInfo] = useState({
    name: "",
    birthDate: "",
    phone: "",
    divingLevel: "",
    tourPeriod: "",
    tourLocation: "",
    emergencyContact: "",
  });

  // Step 2: Health
  const [healthChecklist, setHealthChecklist] = useState<boolean[]>(
    new Array(HEALTH_CHECKLIST_ITEMS.length).fill(false)
  );
  const [healthOther, setHealthOther] = useState("");
  const [healthConfirmed, setHealthConfirmed] = useState(false);

  // Step 3: Signature
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const getPos = (
    e: React.MouseEvent | React.TouchEvent
  ): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      setIsDrawing(true);
      setHasSignature(true);
    },
    []
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing) return;
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = "var(--signature-stroke, #000)";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.stroke();
    },
    [isDrawing]
  );

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const validateStep0 = () => {
    const required = [
      "name",
      "birthDate",
      "phone",
      "divingLevel",
      "tourPeriod",
      "tourLocation",
      "emergencyContact",
    ];
    for (const key of required) {
      if (!(personalInfo as any)[key].trim()) {
        toast("모든 항목을 입력해주세요", "warning");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (step === 0 && !validateStep0()) return;
    if (step === 2 && !healthConfirmed) {
      toast("건강 상태를 확인하고 동의해주세요", "warning");
      return;
    }
    if (step === 3) {
      if (!hasSignature) {
        toast("서명을 해주세요", "warning");
        return;
      }
      const canvas = canvasRef.current;
      const signatureImage = canvas?.toDataURL("image/png") || "";

      store.createWaiver({
        tourId,
        signerName: personalInfo.name,
        personalInfo,
        healthChecklist,
        healthOther: healthOther || undefined,
        signatureImage,
      });
      setStep(4);
      return;
    }
    setStep(step + 1);
  };

  const personalFields = [
    { key: "name", label: "성명", placeholder: "홍길동" },
    { key: "birthDate", label: "생년월일", placeholder: "1990-01-01" },
    { key: "phone", label: "연락처", placeholder: "010-1234-5678" },
    {
      key: "divingLevel",
      label: "다이빙 레벨",
      placeholder: "OW / AOW / 레스큐 등",
    },
    {
      key: "tourPeriod",
      label: "투어 기간",
      placeholder: "2026-04-01 ~ 04-03",
    },
    { key: "tourLocation", label: "투어 장소", placeholder: "속초" },
    {
      key: "emergencyContact",
      label: "비상 연락처",
      placeholder: "이름 / 관계 / 전화번호",
    },
  ];

  return (
    <>
      {/* Progress */}
      <div className="progress-bar">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`progress-segment ${i <= step ? "active" : ""}`}
          />
        ))}
      </div>
      <div className="text-center text-muted" style={{ fontSize: 13, marginBottom: 8 }}>
        {STEPS[step]} ({step + 1}/{STEPS.length})
      </div>

      <div className="scroll-content">
        {/* Step 0: Personal Info */}
        {step === 0 && (
          <div>
            <h3 style={{ fontSize: 20, fontWeight: "bold", marginBottom: 16 }}>
              개인정보 입력
            </h3>
            {personalFields.map((field) => (
              <div key={field.key} className="input-group">
                <div className="input-label">{field.label}</div>
                <input
                  className="input"
                  value={(personalInfo as any)[field.key]}
                  onChange={(e) =>
                    setPersonalInfo((prev) => ({
                      ...prev,
                      [field.key]: e.target.value,
                    }))
                  }
                  placeholder={field.placeholder}
                />
              </div>
            ))}
          </div>
        )}

        {/* Step 1: Waiver Content */}
        {step === 1 && (
          <div>
            <h3
              style={{
                fontSize: 18,
                fontWeight: "bold",
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              {WAIVER_TITLE}
            </h3>
            {WAIVER_SECTIONS.map((section, i) => (
              <div key={i} className="waiver-section">
                <h3>{section.title}</h3>
                <p>{section.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* Step 2: Health Checklist */}
        {step === 2 && (
          <div>
            <h3 style={{ fontSize: 20, fontWeight: "bold", marginBottom: 8 }}>
              건강 체크리스트
            </h3>
            <p className="text-muted mb-16">해당하는 항목을 체크해주세요</p>

            {HEALTH_CHECKLIST_ITEMS.map((item, i) => (
              <div
                key={i}
                className={`checkbox-item ${healthChecklist[i] ? "checked" : ""}`}
                onClick={() => {
                  const next = [...healthChecklist];
                  next[i] = !next[i];
                  setHealthChecklist(next);
                }}
              >
                <div className="checkbox-box">
                  {healthChecklist[i] && "✓"}
                </div>
                <span>{item}</span>
              </div>
            ))}

            <div className="input-group mt-16">
              <div className="input-label">기타 건강 관련 사항</div>
              <textarea
                className="input"
                value={healthOther}
                onChange={(e) => setHealthOther(e.target.value)}
                placeholder="기타 사항이 있으면 입력해주세요"
                rows={3}
                style={{ resize: "vertical", minHeight: 80 }}
              />
            </div>

            <div
              className={`checkbox-item confirm-checkbox ${healthConfirmed ? "checked" : ""}`}
              onClick={() => setHealthConfirmed(!healthConfirmed)}
            >
              <div className="checkbox-box">
                {healthConfirmed && "✓"}
              </div>
              <span>
                위 내용을 확인하였으며, 건강 상태에 대해 정확히 기재하였습니다.
              </span>
            </div>
          </div>
        )}

        {/* Step 3: Signature */}
        {step === 3 && (
          <div>
            <h3 style={{ fontSize: 20, fontWeight: "bold", marginBottom: 8 }}>
              전자 서명
            </h3>
            <p className="text-muted mb-16">아래 영역에 서명해주세요</p>

            <canvas
              ref={canvasRef}
              width={440}
              height={300}
              className="signature-canvas"
              style={{ width: "100%", height: 300 }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />

            <div className="text-center mt-8">
              <button className="text-error" onClick={clearSignature}>
                서명 지우기
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Completion */}
        {step === 4 && (
          <div className="text-center" style={{ paddingTop: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h3 style={{ fontSize: 22, fontWeight: "bold", marginBottom: 8 }}>
              서명 완료
            </h3>
            <p className="text-muted" style={{ marginBottom: 8 }}>
              {personalInfo.name}님의 면책동의서가 저장되었습니다.
            </p>
            <p className="text-muted" style={{ fontSize: 13 }}>
              {new Date().toLocaleDateString("ko-KR")}
            </p>

            <button
              className="btn btn-primary"
              style={{ marginTop: 32, width: "auto", padding: "14px 40px", display: "inline-block" }}
              onClick={() => navigate({ screen: "tour-detail", tourId })}
            >
              돌아가기
            </button>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      {step < 4 && (
        <div className="flex-row gap-12 p-16">
          {step > 0 && (
            <button className="btn btn-secondary" onClick={() => setStep(step - 1)}>
              이전
            </button>
          )}
          <button className="btn btn-primary" onClick={handleNext}>
            {step === 3 ? "제출" : "다음"}
          </button>
        </div>
      )}
    </>
  );
}
