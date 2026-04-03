/**
 * 정산 Excel 내보내기
 * xlsx + expo-file-system + expo-sharing 사용
 */
import * as XLSX from "xlsx";
import {
  cacheDirectory,
  writeAsStringAsync,
  EncodingType,
} from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import type { Tour, Settlement, Participant, Expense } from "../types";
import { formatKRW } from "../store";

function getParticipantName(participants: Participant[], id: number): string {
  return participants.find((p) => p.id === id)?.name || String(id);
}

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

export async function exportSettlementExcel(
  tour: Tour,
  settlements: Settlement[],
): Promise<void> {
  const { participants, expenses } = tour;
  const wb = XLSX.utils.book_new();

  // ─── Sheet 1: 정산 매트릭스 ───
  const { paid, owed } = calcParticipantSummary(participants, expenses);

  const matrixHeader = [
    "비용명",
    "금액(원)",
    "결제자",
    ...participants.map((p) => p.name),
  ];

  const matrixRows: (string | number)[][] = expenses.map((e) => {
    const rate = e.exchangeRate || 1;
    const amountKRW = Math.round(e.amount * rate);
    const payerName = getParticipantName(participants, e.paidBy);

    const participantCells = participants.map((p) => {
      const isInSplit = e.splitAmong.includes(p.id);
      const isPayer = e.paidBy === p.id;
      if (isPayer && isInSplit) return "O결";
      if (isPayer && !isInSplit) return "X결";
      return isInSplit ? "O" : "X";
    });

    return [e.name, amountKRW, payerName, ...participantCells];
  });

  // 요약 행
  const owedRow: (string | number)[] = [
    "인당 정산액",
    "",
    "",
    ...participants.map((p) => Math.round(owed[p.id] || 0)),
  ];
  const paidRow: (string | number)[] = [
    "결제액",
    "",
    "",
    ...participants.map((p) => Math.round(paid[p.id] || 0)),
  ];
  const balanceRow: (string | number)[] = [
    "최종 잔액",
    "",
    "",
    ...participants.map((p) => Math.round((paid[p.id] || 0) - (owed[p.id] || 0))),
  ];

  const matrixData = [
    matrixHeader,
    ...matrixRows,
    owedRow,
    paidRow,
    balanceRow,
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(matrixData);

  // 컬럼 너비 설정
  ws1["!cols"] = [
    { wch: 20 }, // 비용명
    { wch: 14 }, // 금액
    { wch: 10 }, // 결제자
    ...participants.map(() => ({ wch: 9 })),
  ];

  XLSX.utils.book_append_sheet(wb, ws1, "정산 매트릭스");

  // ─── Sheet 2: 송금 내역 ───
  const settlementHeader = ["보내는 사람", "받는 사람", "금액(원)"];
  const settlementRows = settlements.map((s) => [
    s.fromName,
    s.toName,
    Math.round(s.amount),
  ]);
  const ws2 = XLSX.utils.aoa_to_sheet([settlementHeader, ...settlementRows]);
  ws2["!cols"] = [{ wch: 14 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws2, "송금 내역");

  // ─── Sheet 3: 영수증 목록 ───
  const receiptHeader = ["비용명", "결제자", "금액(원)", "날짜"];
  const receiptRows = expenses
    .filter((e) => !!e.receiptImage)
    .map((e) => [
      e.name,
      getParticipantName(participants, e.paidBy),
      Math.round(e.amount * (e.exchangeRate || 1)),
      e.createdAt
        ? new Date(e.createdAt).toLocaleDateString("ko-KR")
        : "",
    ]);
  const ws3 = XLSX.utils.aoa_to_sheet([receiptHeader, ...receiptRows]);
  ws3["!cols"] = [{ wch: 20 }, { wch: 12 }, { wch: 14 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws3, "영수증 목록");

  // ─── 파일 저장 & 공유 ───
  const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
  const safeName = tour.name.replace(/[^\w가-힣]/g, "_");
  const path = (cacheDirectory ?? "") + `${safeName}_정산.xlsx`;
  await writeAsStringAsync(path, wbout, {
    encoding: EncodingType.Base64,
  });
  await Sharing.shareAsync(path, {
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
