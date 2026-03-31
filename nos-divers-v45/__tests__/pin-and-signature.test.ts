import { describe, it, expect } from "vitest";

// Test PIN validation logic (extracted from pin-modal component)
const ADMIN_PIN = "2399";

function validatePin(input: string): boolean {
  return input === ADMIN_PIN;
}

function cleanPinInput(raw: string): string {
  return raw.replace(/[^0-9]/g, "").slice(0, 4);
}

describe("PIN Authentication", () => {
  it("should accept correct PIN 2399", () => {
    expect(validatePin("2399")).toBe(true);
  });

  it("should reject incorrect PIN", () => {
    expect(validatePin("1234")).toBe(false);
    expect(validatePin("0000")).toBe(false);
    expect(validatePin("2398")).toBe(false);
    expect(validatePin("9932")).toBe(false);
  });

  it("should reject empty PIN", () => {
    expect(validatePin("")).toBe(false);
  });

  it("should reject partial PIN", () => {
    expect(validatePin("239")).toBe(false);
    expect(validatePin("23")).toBe(false);
  });

  it("should clean non-numeric characters from input", () => {
    expect(cleanPinInput("23a9b")).toBe("239");
    expect(cleanPinInput("abc")).toBe("");
    expect(cleanPinInput("2399")).toBe("2399");
    expect(cleanPinInput("23990")).toBe("2399"); // max 4 digits
  });

  it("should limit PIN to 4 digits", () => {
    expect(cleanPinInput("123456")).toBe("1234");
    expect(cleanPinInput("239900")).toBe("2399");
  });
});

// Test SVG to base64 conversion logic (extracted from signature-pad component)
function generateSvgContent(
  paths: string[],
  width: number,
  height: number,
  backgroundColor: string,
  strokeColor: string,
  strokeWidth: number
): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="${backgroundColor}"/>${paths.map((d) => `<path d="${d}" stroke="${strokeColor}" stroke-width="${strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join("")}</svg>`;
}

function toBase64(paths: string[], width = 300, height = 180): string | null {
  if (paths.length === 0) return null;
  const svgContent = generateSvgContent(paths, width, height, "#FFFFFF", "#1A1A2E", 2.5);
  return `data:image/svg+xml;base64,${btoa(svgContent)}`;
}

describe("Signature Pad - SVG Generation", () => {
  it("should return null for empty paths", () => {
    expect(toBase64([])).toBeNull();
  });

  it("should generate valid base64 data URI for single path", () => {
    const result = toBase64(["M10.0,20.0 L30.0,40.0"]);
    expect(result).not.toBeNull();
    expect(result).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it("should generate valid base64 data URI for multiple paths", () => {
    const result = toBase64([
      "M10.0,20.0 L30.0,40.0",
      "M50.0,60.0 L70.0,80.0",
      "M100.0,100.0 L150.0,150.0",
    ]);
    expect(result).not.toBeNull();
    expect(result).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it("should decode back to valid SVG content", () => {
    const paths = ["M10.0,20.0 L30.0,40.0"];
    const result = toBase64(paths)!;
    const base64Part = result.replace("data:image/svg+xml;base64,", "");
    const decoded = atob(base64Part);
    expect(decoded).toContain("<svg");
    expect(decoded).toContain("xmlns");
    expect(decoded).toContain("M10.0,20.0 L30.0,40.0");
    expect(decoded).toContain("stroke=\"#1A1A2E\"");
  });

  it("should include all paths in generated SVG", () => {
    const paths = ["M1,1 L2,2", "M3,3 L4,4"];
    const result = toBase64(paths)!;
    const base64Part = result.replace("data:image/svg+xml;base64,", "");
    const decoded = atob(base64Part);
    expect(decoded).toContain("M1,1 L2,2");
    expect(decoded).toContain("M3,3 L4,4");
  });

  it("should use correct dimensions", () => {
    const result = toBase64(["M1,1 L2,2"], 400, 200)!;
    const base64Part = result.replace("data:image/svg+xml;base64,", "");
    const decoded = atob(base64Part);
    expect(decoded).toContain('width="400"');
    expect(decoded).toContain('height="200"');
  });
});

// Test path generation logic
describe("Signature Pad - Path Generation", () => {
  it("should create correct Move command for start point", () => {
    const x = 150.3;
    const y = 75.8;
    const path = `M${x.toFixed(1)},${y.toFixed(1)}`;
    expect(path).toBe("M150.3,75.8");
  });

  it("should append Line commands for move points", () => {
    let path = "M10.0,20.0";
    path += ` L${(30.5).toFixed(1)},${(40.7).toFixed(1)}`;
    path += ` L${(50.2).toFixed(1)},${(60.9).toFixed(1)}`;
    expect(path).toBe("M10.0,20.0 L30.5,40.7 L50.2,60.9");
  });

  it("should clamp coordinates to canvas bounds", () => {
    const width = 300;
    const height = 180;
    const clampX = (x: number) => Math.max(0, Math.min(x, width));
    const clampY = (y: number) => Math.max(0, Math.min(y, height));

    expect(clampX(-10)).toBe(0);
    expect(clampX(500)).toBe(300);
    expect(clampX(150)).toBe(150);
    expect(clampY(-5)).toBe(0);
    expect(clampY(200)).toBe(180);
    expect(clampY(90)).toBe(90);
  });
});
