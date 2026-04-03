import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { Waiver, WaiverPersonalInfo } from "../types";
import {
  WAIVER_TITLE,
  WAIVER_INTRO,
  WAIVER_SECTIONS,
  WAIVER_CLOSING,
  HEALTH_CHECKLIST,
} from "../waiver-template";

function parsePersonalInfo(raw: WaiverPersonalInfo | string): WaiverPersonalInfo {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {
        name: "",
        birthDate: "",
        phone: "",
        divingLevel: "",
        tourPeriod: "",
        tourLocation: "",
        emergencyContact: "",
      };
    }
  }
  return raw;
}

function parseHealthChecklist(raw: boolean[] | string): boolean[] {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return Array(6).fill(false);
    }
  }
  return raw;
}

function formatSignedAt(signedAt: string | Date): string {
  const date = typeof signedAt === "string" ? new Date(signedAt) : signedAt;
  if (isNaN(date.getTime())) return String(signedAt);
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildWaiverHTML(waiver: Waiver, tourName: string, isFirst = true): string {
  const info = parsePersonalInfo(waiver.personalInfo);
  const checklist = parseHealthChecklist(waiver.healthChecklist);

  const sectionsHTML = WAIVER_SECTIONS.map(
    (s) => `
    <div class="section">
      <h3>${s.title}</h3>
      <p>${s.content.replace(/\n/g, "<br>")}</p>
    </div>
  `
  ).join("");

  const checklistHTML = HEALTH_CHECKLIST.map(
    (item, i) => `
    <tr>
      <td class="check-cell">${checklist[i] ? "☑" : "☐"}</td>
      <td class="${checklist[i] ? "check-yes" : ""}">${item}</td>
    </tr>
  `
  ).join("");

  const infoRows = [
    ["성명", info.name],
    ["생년월일", info.birthDate],
    ["전화번호", info.phone],
    ["다이빙 레벨", info.divingLevel],
    ["투어 기간", info.tourPeriod],
    ["투어 장소", info.tourLocation],
    ["비상 연락처", info.emergencyContact],
  ]
    .map(
      ([label, value]) => `
    <tr>
      <td class="info-label">${label}</td>
      <td>${value || "-"}</td>
    </tr>
  `
    )
    .join("");

  const pageBreak = isFirst ? "" : 'style="page-break-before: always;"';

  return `
    <div class="waiver-page" ${pageBreak}>
      <div class="header">
        <h1>${WAIVER_TITLE}</h1>
        <p class="tour-name">투어: ${tourName}</p>
      </div>

      <div class="section intro">
        <p>1. ${WAIVER_INTRO}</p>
      </div>

      ${sectionsHTML}

      <div class="section">
        <h3>개인 정보</h3>
        <table class="info-table">
          <tbody>${infoRows}</tbody>
        </table>
      </div>

      <div class="section">
        <h3>건강 체크리스트</h3>
        <p class="checklist-note">아래 해당 항목에 체크하십시오:</p>
        <table class="check-table">
          <tbody>${checklistHTML}</tbody>
        </table>
        ${
          waiver.healthOther
            ? `<p class="health-other"><strong>기타:</strong> ${waiver.healthOther}</p>`
            : ""
        }
      </div>

      <div class="section closing">
        <p>${WAIVER_CLOSING}</p>
      </div>

      <div class="signature-block">
        <div class="sig-row">
          <span class="sig-label">서명일시:</span>
          <span>${formatSignedAt(waiver.signedAt)}</span>
        </div>
        <div class="sig-row">
          <span class="sig-label">동의 여부:</span>
          <span>${waiver.agreed ? "✓ 동의함" : "✗ 미동의"}</span>
        </div>
        <div class="sig-row">
          <span class="sig-label">서명:</span>
        </div>
        ${
          waiver.signatureImage
            ? `<img src="${waiver.signatureImage}" class="signature-img" alt="서명" />`
            : '<p class="no-sig">서명 없음</p>'
        }
      </div>
    </div>
  `;
}

const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
    font-size: 11pt;
    color: #111;
    background: #fff;
    padding: 24pt;
    width: 595pt;
  }
  .waiver-page { max-width: 100%; }
  .header { text-align: center; margin-bottom: 20pt; border-bottom: 2px solid #023E58; padding-bottom: 12pt; }
  h1 { font-size: 14pt; color: #023E58; line-height: 1.4; }
  .tour-name { margin-top: 6pt; font-size: 11pt; color: #555; }
  .section { margin-bottom: 14pt; }
  .section h3 { font-size: 11pt; color: #023E58; margin-bottom: 6pt; border-bottom: 1px solid #B0D4E3; padding-bottom: 3pt; }
  .section p { font-size: 10pt; line-height: 1.7; color: #333; }
  .intro p { font-size: 10.5pt; }
  .closing p { font-style: italic; font-size: 10pt; }
  .info-table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  .info-table td { border: 1px solid #ccc; padding: 5pt 8pt; }
  .info-label { background: #E8F4F8; font-weight: bold; width: 100pt; color: #023E58; }
  .check-table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  .check-table td { border: 1px solid #ddd; padding: 5pt 8pt; }
  .check-cell { width: 24pt; text-align: center; font-size: 13pt; background: #F5F5F5; }
  .check-yes { font-weight: bold; color: #D32F2F; }
  .checklist-note { font-size: 9pt; color: #555; margin-bottom: 6pt; }
  .health-other { margin-top: 8pt; font-size: 10pt; color: #444; }
  .signature-block { margin-top: 20pt; border: 1px solid #B0D4E3; border-radius: 6pt; padding: 12pt 16pt; background: #F9FDFF; }
  .sig-row { display: flex; gap: 12pt; margin-bottom: 6pt; font-size: 10pt; }
  .sig-label { font-weight: bold; color: #023E58; min-width: 70pt; }
  .signature-img { max-width: 200pt; max-height: 80pt; border: 1px solid #ddd; border-radius: 4pt; margin-top: 8pt; display: block; }
  .no-sig { color: #999; font-size: 10pt; margin-top: 8pt; }
`;

const HTML_WRAPPER = (body: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>${CSS}</style>
</head>
<body>
  ${body}
</body>
</html>
`;

export async function exportWaiverPDF(waiver: Waiver, tourName: string): Promise<void> {
  const body = buildWaiverHTML(waiver, tourName, true);
  const html = HTML_WRAPPER(body);

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    dialogTitle: `${waiver.signerName} 면책동의서`,
    UTI: "com.adobe.pdf",
  });
}

export async function exportAllWaiversPDF(waivers: Waiver[], tourName: string): Promise<void> {
  if (waivers.length === 0) return;

  const body = waivers
    .map((w, i) => buildWaiverHTML(w, tourName, i === 0))
    .join("\n");
  const html = HTML_WRAPPER(body);

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    dialogTitle: `${tourName} 전체 면책동의서 (${waivers.length}명)`,
    UTI: "com.adobe.pdf",
  });
}
