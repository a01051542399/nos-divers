import type { Waiver, Tour } from "../types";
import { WAIVER_TITLE, WAIVER_SUBTITLE, WAIVER_INTRO, WAIVER_SECTIONS, WAIVER_CLOSING, HEALTH_CHECKLIST } from "../waiver-template";
import { isNative } from "../lib/platform";
import { saveFile } from "./file-save";

function parseInfo(w: Waiver) {
  return typeof w.personalInfo === "string" ? JSON.parse(w.personalInfo) : w.personalInfo;
}

function parseChecklist(w: Waiver): boolean[] {
  const cl = typeof w.healthChecklist === "string" ? JSON.parse(w.healthChecklist) : w.healthChecklist;
  return cl || [];
}

function formatDate(d: string | Date | undefined) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function buildWaiverHTML(waiver: Waiver, tour?: Tour): string {
  const info = parseInfo(waiver);
  const checklist = parseChecklist(waiver);

  return `
    <div class="waiver-page">
      <h1>${WAIVER_TITLE}</h1>
      <div class="subtitle">${WAIVER_SUBTITLE}</div>

      <div class="section">
        <h2>참가 동의</h2>
        <p>${WAIVER_INTRO}</p>
      </div>

      ${WAIVER_SECTIONS.map((s) => `
        <div class="section">
          <h2>${s.title}</h2>
          <p>${s.content.replace(/\n/g, "<br/>")}</p>
        </div>
      `).join("")}

      <div class="section">
        <p>${WAIVER_CLOSING}</p>
      </div>

      <div class="info-box">
        <h3>개인 정보</h3>
        <table class="info-table">
          <tr><td class="label">이름</td><td>${info?.name || waiver.signerName || "-"}</td></tr>
          <tr><td class="label">생년월일</td><td>${info?.birthDate || "-"}</td></tr>
          <tr><td class="label">전화번호</td><td>${info?.phone || "-"}</td></tr>
          <tr><td class="label">다이빙 레벨</td><td>${info?.divingLevel || "-"}</td></tr>
          <tr><td class="label">투어/활동 기간</td><td>${info?.tourPeriod || "-"}</td></tr>
          <tr><td class="label">투어/활동 장소</td><td>${info?.tourLocation || (tour?.location || "-")}</td></tr>
          <tr><td class="label">비상 연락처</td><td>${info?.emergencyContact || "-"}</td></tr>
        </table>
      </div>

      <div class="info-box">
        <h3>건강 체크리스트</h3>
        <table class="info-table">
          ${HEALTH_CHECKLIST.map((item, i) => `
            <tr>
              <td style="width:24px; text-align:center;">${checklist[i] ? "☑" : "☐"}</td>
              <td>${item}</td>
            </tr>
          `).join("")}
        </table>
      </div>

      ${waiver.healthOther ? `
      <div class="info-box">
        <h3>기타 건강 사항</h3>
        <p style="font-size:11px; padding:4px 0;">${waiver.healthOther}</p>
      </div>
      ` : ""}

      <div class="signature-box">
        <div class="sig-label">서명</div>
        <img src="${waiver.signatureImage}" class="sig-img" />
        <div class="sig-date">서명일시: ${formatDate(waiver.signedAt)}</div>
      </div>
    </div>
  `;
}

const CSS = `
  @page { size: A4; margin: 20mm 15mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; font-size: 11px; line-height: 1.6; color: #222; }
  .waiver-page { page-break-after: always; padding: 10px 0; }
  .waiver-page:last-child { page-break-after: auto; }
  h1 { font-size: 18px; text-align: center; margin-bottom: 4px; padding-bottom: 4px; }
  .subtitle { font-size: 10px; text-align: center; color: #666; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 2px solid #333; }
  .section { margin-bottom: 12px; }
  .section h2 { font-size: 12px; font-weight: 700; margin-bottom: 4px; color: #111; }
  .section p { font-size: 10.5px; line-height: 1.5; color: #333; white-space: pre-wrap; }
  .info-box { margin: 16px 0; border: 1px solid #ccc; border-radius: 6px; padding: 12px; }
  .info-box h3 { font-size: 13px; font-weight: 700; margin-bottom: 8px; color: #111; }
  .info-table { width: 100%; border-collapse: collapse; }
  .info-table td { padding: 4px 8px; font-size: 11px; border-bottom: 1px solid #eee; }
  .info-table .label { width: 120px; color: #666; font-weight: 600; }
  .signature-box { margin-top: 20px; text-align: center; border: 1px solid #ccc; border-radius: 6px; padding: 16px; }
  .sig-label { font-size: 13px; font-weight: 700; margin-bottom: 8px; }
  .sig-img { max-width: 300px; height: 80px; object-fit: contain; }
  .sig-date { font-size: 11px; color: #666; margin-top: 8px; }
`;

/** Helper: print or save HTML */
async function outputHTML(html: string, filename: string) {
  if (isNative()) {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    await saveFile(filename, blob, "text/html");
  } else {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 500);
    } else {
      alert("팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.");
    }
  }
}

/** 개인 면책동의서 PDF (1건) */
export async function exportWaiverPDF(waiver: Waiver, tour?: Tour) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>면책동의서 - ${waiver.signerName}</title><style>${CSS}</style></head><body>${buildWaiverHTML(waiver, tour)}</body></html>`;
  await outputHTML(html, `면책동의서_${waiver.signerName}.html`);
}

/** 전체 면책동의서 PDF (투어 전체) */
export async function exportAllWaiversPDF(waivers: Waiver[], tour?: Tour) {
  if (waivers.length === 0) return;
  const pages = waivers.map((w) => buildWaiverHTML(w, tour)).join("");
  const title = tour ? `면책동의서_${tour.name}` : "면책동의서_전체";
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>${CSS}</style></head><body>${pages}</body></html>`;
  await outputHTML(html, `${title}.html`);
}
