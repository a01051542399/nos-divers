/**
 * 정산 PDF 내보내기
 * expo-print + expo-sharing 사용
 */
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { Tour, Settlement, Expense, Participant } from "../types";
import { formatKRW } from "../store";

// 참여자별 인당정산액 / 결제액 / 최종금액 계산
function calcParticipantSummary(
  participants: Participant[],
  expenses: Expense[],
) {
  const paid: Record<number, number> = {};
  const owed: Record<number, number> = {};
  for (const p of participants) {
    paid[p.id] = 0;
    owed[p.id] = 0;
  }
  for (const e of expenses) {
    const rate = e.exchangeRate || 1;
    const amountKRW = e.amount * rate;
    if (paid[e.paidBy] !== undefined) {
      paid[e.paidBy] += amountKRW;
    }
    if (e.splitType === "custom" && e.splitAmounts) {
      for (const [pid, amount] of Object.entries(e.splitAmounts)) {
        const id = Number(pid);
        if (owed[id] !== undefined) {
          owed[id] += amount * rate;
        }
      }
    } else {
      const splitCount = e.splitAmong.length;
      if (splitCount > 0) {
        const perPerson = amountKRW / splitCount;
        for (const pid of e.splitAmong) {
          if (owed[pid] !== undefined) {
            owed[pid] += perPerson;
          }
        }
      }
    }
  }
  return { paid, owed };
}

function buildSettlementHTML(tour: Tour, settlements: Settlement[]): string {
  const { participants, expenses } = tour;
  const landscape = participants.length > 10;
  const totalKRW = expenses.reduce(
    (sum, e) => sum + e.amount * (e.exchangeRate || 1),
    0,
  );
  const avgPerPerson =
    participants.length > 0 ? totalKRW / participants.length : 0;

  // 폰트 크기 조절
  const colCount = participants.length;
  const fontSize =
    colCount <= 5 ? 12 : colCount <= 8 ? 10 : colCount <= 12 ? 8 : 7;

  const { paid, owed } = calcParticipantSummary(participants, expenses);

  // O/X 매트릭스 헤더 행
  const headerCells = participants
    .map(
      (p) =>
        `<th style="background:#1565C0;color:#fff;padding:4px 6px;border:1px solid #ccc;white-space:nowrap;">${p.name}</th>`,
    )
    .join("");

  // 비용 행
  const expenseRows = expenses
    .map((e) => {
      const rate = e.exchangeRate || 1;
      const amountKRW = e.amount * rate;
      const payerName =
        participants.find((p) => p.id === e.paidBy)?.name || "-";
      const currLabel =
        e.currency && e.currency !== "KRW"
          ? ` (${e.currency} ${e.amount.toLocaleString("ko-KR")})`
          : "";

      const cells = participants
        .map((p) => {
          const isInSplit = e.splitAmong.includes(p.id);
          const isPayer = e.paidBy === p.id;
          if (isPayer && isInSplit) {
            return `<td style="background:#E3F2FD;color:#0D47A1;text-align:center;padding:4px;border:1px solid #ccc;font-weight:700;">O결</td>`;
          } else if (isPayer && !isInSplit) {
            return `<td style="background:#FFF3E0;color:#E65100;text-align:center;padding:4px;border:1px solid #ccc;font-weight:700;">X결</td>`;
          } else if (isInSplit) {
            return `<td style="background:#E8F5E9;color:#1B5E20;text-align:center;padding:4px;border:1px solid #ccc;font-weight:700;">O</td>`;
          } else {
            return `<td style="background:#FFEBEE;color:#B71C1C;text-align:center;padding:4px;border:1px solid #ccc;">X</td>`;
          }
        })
        .join("");

      return `<tr>
        <td style="padding:4px 6px;border:1px solid #ccc;white-space:nowrap;">${e.name}</td>
        <td style="padding:4px 6px;border:1px solid #ccc;text-align:right;white-space:nowrap;">${formatKRW(amountKRW)}${currLabel}</td>
        <td style="padding:4px 6px;border:1px solid #ccc;text-align:center;">${payerName}</td>
        ${cells}
      </tr>`;
    })
    .join("");

  // 요약 행들
  const owedRow = participants
    .map((p) => `<td style="text-align:center;padding:4px;border:1px solid #ccc;">${formatKRW(owed[p.id] || 0)}</td>`)
    .join("");
  const paidRow = participants
    .map((p) => `<td style="text-align:center;padding:4px;border:1px solid #ccc;">${formatKRW(paid[p.id] || 0)}</td>`)
    .join("");
  const balanceRow = participants
    .map((p) => {
      const bal = (paid[p.id] || 0) - (owed[p.id] || 0);
      const color = bal >= 0 ? "#1B5E20" : "#B71C1C";
      return `<td style="text-align:center;padding:4px;border:1px solid #ccc;color:${color};font-weight:700;">${bal >= 0 ? "+" : ""}${formatKRW(bal)}</td>`;
    })
    .join("");

  // 정산 이체 목록
  const settlementList =
    settlements.length === 0
      ? `<p style="color:#666;">모든 참여자의 정산이 완료되었습니다.</p>`
      : settlements
          .map(
            (s) =>
              `<div style="display:flex;justify-content:space-between;padding:8px 12px;border:1px solid #ddd;border-radius:6px;margin-bottom:6px;background:#fafafa;">
            <span style="color:#c62828;font-weight:600;">${s.fromName} → <span style="color:#2e7d32;">${s.toName}</span></span>
            <span style="color:#1565C0;font-weight:700;">${formatKRW(s.amount)}</span>
          </div>`,
          )
          .join("");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8"/>
<style>
  body { font-family: 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif; font-size:${fontSize}pt; color:#222; margin:0; padding:16px; }
  h1 { font-size:18pt; margin-bottom:4px; }
  h2 { font-size:13pt; border-bottom:2px solid #1565C0; padding-bottom:4px; margin-top:24px; color:#1565C0; }
  .summary-grid { display:flex; gap:12px; margin:12px 0; flex-wrap:wrap; }
  .summary-card { flex:1; min-width:120px; background:#f0f4ff; border-radius:8px; padding:10px 14px; border:1px solid #c5d0e8; }
  .summary-card .label { font-size:9pt; color:#555; margin-bottom:2px; }
  .summary-card .value { font-size:14pt; font-weight:700; color:#1565C0; }
  table { border-collapse:collapse; width:100%; font-size:${fontSize}pt; }
  th { background:#1565C0; color:#fff; padding:6px; border:1px solid #ccc; }
  td { padding:4px 6px; border:1px solid #ccc; }
  .summary-row td { background:#f5f5f5; font-weight:600; }
  @media print { body { margin:0; } }
</style>
</head>
<body>
<h1>${tour.name}</h1>
<p style="color:#555;margin-top:0;">${tour.date} · ${tour.location}</p>

<div class="summary-grid">
  <div class="summary-card"><div class="label">총 비용</div><div class="value">${formatKRW(totalKRW)}</div></div>
  <div class="summary-card"><div class="label">비용 항목</div><div class="value">${expenses.length}건</div></div>
  <div class="summary-card"><div class="label">이체 건수</div><div class="value">${settlements.length}건</div></div>
  <div class="summary-card"><div class="label">인당 평균</div><div class="value">${formatKRW(avgPerPerson)}</div></div>
</div>

<h2>비용 O/X 매트릭스</h2>
${
  expenses.length === 0
    ? `<p style="color:#666;">비용이 없습니다.</p>`
    : `<table>
  <thead>
    <tr>
      <th>비용명</th>
      <th>금액</th>
      <th>결제자</th>
      ${headerCells}
    </tr>
  </thead>
  <tbody>
    ${expenseRows}
    <tr class="summary-row">
      <td colspan="3" style="text-align:right;padding:4px 6px;">인당 정산액</td>
      ${owedRow}
    </tr>
    <tr class="summary-row">
      <td colspan="3" style="text-align:right;padding:4px 6px;">결제액</td>
      ${paidRow}
    </tr>
    <tr class="summary-row">
      <td colspan="3" style="text-align:right;padding:4px 6px;">최종 잔액</td>
      ${balanceRow}
    </tr>
  </tbody>
</table>`
}

<h2>정산 이체 내역</h2>
${settlementList}

<p style="margin-top:32px;color:#aaa;font-size:8pt;text-align:right;">NoS Divers · 생성일: ${new Date().toLocaleDateString("ko-KR")}</p>
</body>
</html>`;
}

export async function exportSettlementPDF(
  tour: Tour,
  settlements: Settlement[],
): Promise<void> {
  const html = buildSettlementHTML(tour, settlements);
  const landscape = tour.participants.length > 10;
  const { uri } = await Print.printToFileAsync({
    html,
    width: landscape ? 842 : 595,
    height: landscape ? 595 : 842,
  });
  await Sharing.shareAsync(uri, { mimeType: "application/pdf" });
}
