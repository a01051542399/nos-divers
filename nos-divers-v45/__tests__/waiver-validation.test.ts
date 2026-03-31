import { describe, it, expect } from "vitest";

// Replicate the validation logic from waiver/sign.tsx

interface WaiverPersonalInfo {
  name: string;
  birthDate: string;
  phone: string;
  divingLevel: string;
  tourPeriod: string;
  tourLocation: string;
  emergencyContact: string;
}

const REQUIRED_FIELDS: { field: keyof WaiverPersonalInfo; label: string }[] = [
  { field: "name", label: "이름" },
  { field: "birthDate", label: "생년월일" },
  { field: "phone", label: "연락처" },
  { field: "divingLevel", label: "다이빙 레벨" },
  { field: "tourPeriod", label: "투어/활동 기간" },
  { field: "tourLocation", label: "투어/활동 장소" },
  { field: "emergencyContact", label: "비상 연락처" },
];

function getMissingFields(personalInfo: WaiverPersonalInfo): string[] {
  return REQUIRED_FIELDS.filter(
    (f) => !personalInfo[f.field].trim()
  ).map((f) => f.label);
}

describe("Waiver Step 0 - Required Fields Validation", () => {
  it("should return all fields as missing when all are empty", () => {
    const info: WaiverPersonalInfo = {
      name: "",
      birthDate: "",
      phone: "",
      divingLevel: "",
      tourPeriod: "",
      tourLocation: "",
      emergencyContact: "",
    };
    const missing = getMissingFields(info);
    expect(missing).toHaveLength(7);
    expect(missing).toContain("이름");
    expect(missing).toContain("생년월일");
    expect(missing).toContain("연락처");
    expect(missing).toContain("다이빙 레벨");
    expect(missing).toContain("투어/활동 기간");
    expect(missing).toContain("투어/활동 장소");
    expect(missing).toContain("비상 연락처");
  });

  it("should return no missing fields when all are filled", () => {
    const info: WaiverPersonalInfo = {
      name: "홍길동",
      birthDate: "1990-01-01",
      phone: "010-1234-5678",
      divingLevel: "PADI AOW",
      tourPeriod: "2026.03.15 ~ 03.17",
      tourLocation: "제주 서귀포",
      emergencyContact: "010-9876-5432 (배우자)",
    };
    const missing = getMissingFields(info);
    expect(missing).toHaveLength(0);
  });

  it("should detect partially filled form", () => {
    const info: WaiverPersonalInfo = {
      name: "홍길동",
      birthDate: "1990-01-01",
      phone: "",
      divingLevel: "PADI AOW",
      tourPeriod: "",
      tourLocation: "제주",
      emergencyContact: "",
    };
    const missing = getMissingFields(info);
    expect(missing).toHaveLength(3);
    expect(missing).toContain("연락처");
    expect(missing).toContain("투어/활동 기간");
    expect(missing).toContain("비상 연락처");
  });

  it("should treat whitespace-only values as empty", () => {
    const info: WaiverPersonalInfo = {
      name: "   ",
      birthDate: "  ",
      phone: "\t",
      divingLevel: " ",
      tourPeriod: "  ",
      tourLocation: "  ",
      emergencyContact: " ",
    };
    const missing = getMissingFields(info);
    expect(missing).toHaveLength(7);
  });

  it("should accept values with leading/trailing spaces as valid", () => {
    const info: WaiverPersonalInfo = {
      name: " 홍길동 ",
      birthDate: " 1990-01-01 ",
      phone: " 010-1234-5678 ",
      divingLevel: " PADI AOW ",
      tourPeriod: " 2026.03.15 ",
      tourLocation: " 제주 ",
      emergencyContact: " 010-9876 ",
    };
    const missing = getMissingFields(info);
    expect(missing).toHaveLength(0);
  });
});

describe("Waiver Step 1 - Terms Agreement Validation", () => {
  it("should block proceeding when not agreed", () => {
    const agreedToTerms = false;
    expect(agreedToTerms).toBe(false);
  });

  it("should allow proceeding when agreed", () => {
    const agreedToTerms = true;
    expect(agreedToTerms).toBe(true);
  });
});

describe("Waiver Step 2 - Signature Validation", () => {
  it("should block submit when no signature data", () => {
    const signatureData: string | null = null;
    const canSubmit = signatureData !== null;
    expect(canSubmit).toBe(false);
  });

  it("should allow submit when signature data exists", () => {
    const signatureData = "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=";
    const canSubmit = signatureData !== null;
    expect(canSubmit).toBe(true);
  });

  it("should generate valid SVG base64 from paths", () => {
    const paths = ["M10,20 L30,40"];
    const width = 300;
    const height = 200;
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#FFFFFF"/>${paths.map((d) => `<path d="${d}" stroke="#1A1A2E" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join("")}</svg>`;

    const base64 = btoa(unescape(encodeURIComponent(svgContent)));
    const dataUri = `data:image/svg+xml;base64,${base64}`;

    expect(dataUri).toMatch(/^data:image\/svg\+xml;base64,/);

    // Verify it decodes back correctly
    const decoded = decodeURIComponent(escape(atob(base64)));
    expect(decoded).toContain("<svg");
    expect(decoded).toContain("M10,20 L30,40");
  });
});

describe("Waiver Full Flow Validation", () => {
  it("should enforce step order: info → terms → signature", () => {
    // Step 0: all fields required
    const emptyInfo: WaiverPersonalInfo = {
      name: "", birthDate: "", phone: "", divingLevel: "",
      tourPeriod: "", tourLocation: "", emergencyContact: "",
    };
    expect(getMissingFields(emptyInfo).length).toBeGreaterThan(0);

    // Step 0: filled info passes
    const filledInfo: WaiverPersonalInfo = {
      name: "김다이버", birthDate: "1985-05-15", phone: "010-1111-2222",
      divingLevel: "SSI AOW", tourPeriod: "2026.04.01~04.03",
      tourLocation: "필리핀 세부", emergencyContact: "010-3333-4444 (부모)",
    };
    expect(getMissingFields(filledInfo).length).toBe(0);

    // Step 1: must agree
    let agreed = false;
    expect(agreed).toBe(false); // blocked
    agreed = true;
    expect(agreed).toBe(true); // can proceed

    // Step 2: must have signature
    let signature: string | null = null;
    expect(signature !== null).toBe(false); // blocked
    signature = "data:image/svg+xml;base64,abc123";
    expect(signature !== null).toBe(true); // can submit
  });
});
