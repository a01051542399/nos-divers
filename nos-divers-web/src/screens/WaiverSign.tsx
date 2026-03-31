import { useState, useRef, useCallback, useEffect } from "react";
import type { Route } from "../App";
import type { Tour } from "../types";
import type { WaiverPersonalInfo } from "../types";
import { useToast } from "../toast";
import * as db from "../lib/supabase-store";
import type { UserProfile } from "../lib/supabase-store";
import {
  WAIVER_TITLE,
  WAIVER_INTRO,
  WAIVER_SECTIONS,
  WAIVER_CLOSING,
  HEALTH_CHECKLIST,
} from "../waiver-template";

interface Props {
  tourId: number;
  navigate: (r: Route) => void;
}

const STEPS = ["기본정보", "동의서", "서명"];

const PERSONAL_FIELDS: {
  key: keyof WaiverPersonalInfo;
  label: string;
  placeholder: string;
}[] = [
  { key: "name", label: "이름", placeholder: "홍길동" },
  { key: "birthDate", label: "생년월일", placeholder: "1990-01-01" },
  { key: "phone", label: "연락처", placeholder: "010-1234-5678" },
  {
    key: "divingLevel",
    label: "다이빙 레벨 (단체명 포함)",
    placeholder: "예: PADI AOW / SSI AA",
  },
  {
    key: "tourPeriod",
    label: "투어/활동 기간",
    placeholder: "예: 2026.03.15 ~ 03.17",
  },
  {
    key: "tourLocation",
    label: "투어/활동 장소",
    placeholder: "예: 제주 서귀포",
  },
  {
    key: "emergencyContact",
    label: "비상 연락처 (관계)",
    placeholder: "예: 010-9876-5432 (배우자)",
  },
];

export function WaiverSignScreen({ tourId, navigate }: Props) {
  const [step, setStep] = useState(0);
  const { toast } = useToast();

  // Async-loaded data
  const [_tour, setTour] = useState<Tour | undefined>(undefined);
  const [profile, setProfile] = useState<UserProfile>({ name: "", email: "", grade: "멤버" });
  const [dataLoaded, setDataLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Step 0: Personal Info
  const [personalInfo, setPersonalInfo] = useState<WaiverPersonalInfo>({
    name: "", birthDate: "", phone: "", divingLevel: "",
    tourPeriod: "", tourLocation: "", emergencyContact: "",
  });

  // Load tour + profile on mount
  useEffect(() => {
    (async () => {
      const [tourData, prof] = await Promise.all([
        db.getTourById(tourId),
        db.getProfile(),
      ]);
      setTour(tourData);
      setProfile(prof);
      // Auto-fill personal info
      setPersonalInfo({
        name: prof.name || "",
        birthDate: prof.birthDate || "",
        phone: prof.phone || "",
        divingLevel: prof.divingLevel || "",
        tourPeriod: tourData?.date || "",
        tourLocation: tourData?.location || "",
        emergencyContact: prof.emergencyContact || "",
      });
      setDataLoaded(true);
    })();
  }, [tourId]);

  // Field-level error highlighting
  const [showErrors, setShowErrors] = useState(false);

  // Step 1: Health checklist + Agreement
  const [healthChecklist, setHealthChecklist] = useState<boolean[]>(
    new Array(HEALTH_CHECKLIST.length).fill(false)
  );
  const [healthOther, setHealthOther] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Step 2: Signature
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const isFieldEmpty = (field: keyof WaiverPersonalInfo) => {
    return showErrors && !personalInfo[field].trim();
  };

  const getMissingFields = (): string[] => {
    return PERSONAL_FIELDS.filter(
      (f) => !personalInfo[f.key].trim()
    ).map((f) => f.label);
  };

  const getPos = (
    e: React.MouseEvent | React.TouchEvent
  ): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
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
      ctx.strokeStyle = "#000";
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

  // Step 0 -> 1: validate all personal info fields
  const handleStep0Next = () => {
    const missing = getMissingFields();
    if (missing.length > 0) {
      setShowErrors(true);
      toast(`필수 항목 미입력: ${missing.join(", ")}`, "warning");
      return;
    }
    setShowErrors(false);
    setStep(1);
  };

  // Step 1 -> 2: must agree to terms
  const handleStep1Next = () => {
    if (!agreedToTerms) {
      toast("면책동의서 내용을 확인하고 동의 체크박스를 선택해주세요.", "warning");
      return;
    }
    setStep(2);
  };

  // Step 2: submit
  const handleSubmit = async () => {
    if (!hasSignature) {
      toast("서명을 해주세요", "warning");
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Validate signature is not blank (check if any pixels were drawn)
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      let hasContent = false;
      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] > 0) { hasContent = true; break; }
      }
      if (!hasContent) {
        toast("서명을 해주세요", "warning");
        setHasSignature(false);
        return;
      }
    }

    setSubmitting(true);
    try {
      // Check for duplicate signature
      const existingWaivers = await db.listWaiversByTour(tourId);
      const duplicate = existingWaivers.find((w) => w.signerName === personalInfo.name.trim());
      if (duplicate) {
        toast(`"${personalInfo.name}" 이름으로 이미 서명이 있습니다. 이전 서명을 삭제 후 다시 작성해주세요.`, "warning");
        setSubmitting(false);
        return;
      }

      const signatureImage = canvas.toDataURL("image/png");

      // Save personal info to profile for future auto-fill
      await db.setProfile({
        ...profile,
        name: personalInfo.name,
        phone: personalInfo.phone,
        birthDate: personalInfo.birthDate,
        divingLevel: personalInfo.divingLevel,
        emergencyContact: personalInfo.emergencyContact,
      });

      await db.createWaiver({
        tourId,
        signerName: personalInfo.name,
        personalInfo: JSON.stringify(personalInfo),
        healthChecklist: JSON.stringify(healthChecklist),
        healthOther: healthOther || undefined,
        signatureImage,
        agreed: true,
      });

      toast("면책동의서 서명이 완료되었습니다.", "success");
      navigate({ screen: "tour-detail", tourId });
    } catch {
      toast("서명 저장 중 오류가 발생했습니다", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!dataLoaded) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "var(--muted)", fontSize: 14 }}>
        로딩 중...
      </div>
    );
  }

  return (
    <>
      {/* Back button */}
      <div style={{ padding: "12px 16px" }}>
        <button className="back-btn" onClick={() => navigate({ screen: "waivers" })}>
          ← 뒤로
        </button>
      </div>

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
            <h3 style={{ fontSize: 20, fontWeight: "bold", marginBottom: 4 }}>
              1. 기본 정보
            </h3>
            <p className="text-muted" style={{ marginBottom: 16, fontSize: 14 }}>
              모든 항목을 빠짐없이 입력해주세요
            </p>

            {PERSONAL_FIELDS.map((field) => {
              const isPhone = field.key === "phone";
              const isBirth = field.key === "birthDate";
              const isNumeric = isPhone || isBirth;
              const formatPhone = (v: string) => {
                const digits = v.replace(/[^0-9]/g, "").slice(0, 11);
                if (digits.length <= 3) return digits;
                if (digits.length <= 7) return digits.slice(0, 3) + "-" + digits.slice(3);
                return digits.slice(0, 3) + "-" + digits.slice(3, 7) + "-" + digits.slice(7);
              };
              const formatBirth = (v: string) => {
                const digits = v.replace(/[^0-9]/g, "").slice(0, 8);
                if (digits.length <= 4) return digits;
                if (digits.length <= 6) return digits.slice(0, 4) + "-" + digits.slice(4);
                return digits.slice(0, 4) + "-" + digits.slice(4, 6) + "-" + digits.slice(6);
              };
              const formatValue = (v: string) => {
                if (isPhone) return formatPhone(v);
                if (isBirth) return formatBirth(v);
                return v;
              };
              return (
              <div key={field.key} className="input-group">
                <div className="input-label">
                  {field.label} <span style={{ color: "var(--error)" }}>*</span>
                </div>
                <input
                  className="input"
                  value={personalInfo[field.key]}
                  onChange={(e) => {
                    const val = formatValue(e.target.value);
                    setPersonalInfo((prev) => ({ ...prev, [field.key]: val }));
                  }}
                  placeholder={field.placeholder}
                  inputMode={isNumeric ? "numeric" : undefined}
                  style={
                    isFieldEmpty(field.key)
                      ? { borderColor: "var(--error)", borderWidth: 2 }
                      : undefined
                  }
                />
                {isFieldEmpty(field.key) && (
                  <div style={{ color: "var(--error)", fontSize: 12, marginTop: 4, paddingLeft: 4 }}>
                    필수 입력 항목입니다
                  </div>
                )}
              </div>
              );
            })}

            <button className="btn btn-primary" onClick={handleStep0Next}>
              다음: 동의서 내용 확인
            </button>
          </div>
        )}

        {/* Step 1: Waiver Content + Health Checklist + Agreement */}
        {step === 1 && (
          <div>
            {/* Waiver Header */}
            <div
              style={{
                backgroundColor: "rgba(var(--primary-rgb, 0, 122, 255), 0.03)",
                border: "1px solid rgba(var(--primary-rgb, 0, 122, 255), 0.12)",
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <h3
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  marginBottom: 10,
                  textAlign: "center",
                }}
              >
                {WAIVER_TITLE}
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.6 }}>{WAIVER_INTRO}</p>
            </div>

            {/* Waiver Sections */}
            {WAIVER_SECTIONS.map((section, i) => (
              <div key={i} className="waiver-section">
                <h3>{section.title}</h3>
                <p>{section.content}</p>
              </div>
            ))}

            {/* Health Checklist */}
            <div className="waiver-section">
              <h3>건강 상태 확인 (해당 사항 체크)</h3>
              {HEALTH_CHECKLIST.map((item, i) => (
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
                    {healthChecklist[i] && "\u2713"}
                  </div>
                  <span>{item}</span>
                </div>
              ))}

              <div className="input-group" style={{ marginTop: 12 }}>
                <div className="input-label">기타 특이사항</div>
                <textarea
                  className="input"
                  value={healthOther}
                  onChange={(e) => setHealthOther(e.target.value)}
                  placeholder="해당 사항이 있으면 기입해주세요"
                  rows={3}
                  style={{ resize: "vertical", minHeight: 80 }}
                />
              </div>
            </div>

            {/* Waiver Closing */}
            <div
              style={{
                backgroundColor: "rgba(var(--warning-rgb, 255, 204, 0), 0.06)",
                border: "1px solid rgba(var(--warning-rgb, 255, 204, 0), 0.18)",
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <p style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.6 }}>
                {WAIVER_CLOSING}
              </p>
            </div>

            {/* Agreement Checkbox */}
            <div
              className={`checkbox-item confirm-checkbox ${agreedToTerms ? "checked" : ""}`}
              onClick={() => setAgreedToTerms(!agreedToTerms)}
              style={{
                padding: 16,
                borderRadius: 12,
                border: agreedToTerms
                  ? "2px solid var(--primary)"
                  : "1.5px solid var(--border, #ddd)",
                backgroundColor: agreedToTerms
                  ? "rgba(var(--primary-rgb, 0, 122, 255), 0.06)"
                  : undefined,
                marginBottom: 16,
              }}
            >
              <div className="checkbox-box">
                {agreedToTerms && "\u2713"}
              </div>
              <span style={{ fontWeight: 600, lineHeight: 1.5 }}>
                위의 모든 내용을 읽고 이해하였으며, 이에 동의합니다.
              </span>
            </div>

            {/* Navigation Buttons */}
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep(0)}>
                이전
              </button>
              <button
                className="btn btn-primary"
                onClick={handleStep1Next}
                style={{
                  flex: 2,
                  backgroundColor: agreedToTerms ? "var(--primary)" : "var(--muted, #999)",
                }}
              >
                다음: 서명
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Signature */}
        {step === 2 && (
          <div>
            <h3 style={{ fontSize: 20, fontWeight: "bold", marginBottom: 4 }}>
              3. 서명
            </h3>
            <p className="text-muted" style={{ marginBottom: 16, fontSize: 14 }}>
              아래 영역에 서명해주세요
            </p>

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

            <div style={{ marginTop: 12, marginBottom: 16 }}>
              <p className="text-muted" style={{ fontSize: 14 }}>
                서명자: {personalInfo.name}
              </p>
              <p className="text-muted" style={{ fontSize: 14 }}>
                작성일: {new Date().toLocaleDateString("ko-KR")}
              </p>
            </div>

            {/* Navigation Buttons */}
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep(1)}>
                이전
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  flex: 2,
                  backgroundColor: hasSignature ? "var(--success)" : "var(--muted, #999)",
                }}
              >
                {submitting ? "제출 중..." : "서명 제출"}
              </button>
            </div>
          </div>
        )}
      </div>

    </>
  );
}
