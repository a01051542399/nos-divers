/**
 * 데이터 스토어 - tRPC API를 통한 서버/DB 연동
 * 투어, 면책동의서 데이터를 서버에 저장/관리
 */
import type { Tour, Participant, Expense, Settlement } from "./types";

// ===== Settlement Calculation =====

export function calculateSettlement(tour: Tour): Settlement[] {
  const { participants, expenses } = tour;
  if (participants.length === 0 || expenses.length === 0) return [];

  // 각 참여자별 순 잔액 계산 (양수 = 받을 돈, 음수 = 보낼 돈)
  const balances: Record<number, number> = {};
  participants.forEach((p) => {
    balances[p.id] = 0;
  });

  expenses.forEach((expense) => {
    if (!expense.paidBy || expense.splitAmong.length === 0) return;

    // 결제자는 전체 금액을 냈으므로 +
    if (balances[expense.paidBy] !== undefined) {
      balances[expense.paidBy] += expense.amount;
    }

    if (expense.splitType === "custom" && expense.splitAmounts) {
      // 커스텀 금액: 각 참여자별 지정 금액만큼 -
      expense.splitAmong.forEach((pid) => {
        const customAmount = expense.splitAmounts?.[String(pid)] ?? 0;
        if (balances[pid] !== undefined) {
          balances[pid] -= customAmount;
        }
      });
    } else {
      // 균등 분배: 전체 금액을 참여자 수로 나눔
      const perPerson = expense.amount / expense.splitAmong.length;
      expense.splitAmong.forEach((pid) => {
        if (balances[pid] !== undefined) {
          balances[pid] -= perPerson;
        }
      });
    }
  });

  // 정산 최적화: 채권자/채무자 분리 후 매칭
  const creditors: { id: number; amount: number }[] = [];
  const debtors: { id: number; amount: number }[] = [];

  Object.entries(balances).forEach(([idStr, balance]) => {
    const id = Number(idStr);
    if (balance > 0.01) {
      creditors.push({ id, amount: balance });
    } else if (balance < -0.01) {
      debtors.push({ id, amount: -balance });
    }
  });

  // 금액 큰 순서로 정렬
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const settlements: Settlement[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const amount = Math.min(creditors[ci].amount, debtors[di].amount);
    if (amount > 0.01) {
      const fromP = participants.find((p) => p.id === debtors[di].id);
      const toP = participants.find((p) => p.id === creditors[ci].id);
      settlements.push({
        from: debtors[di].id,
        fromName: fromP?.name || "",
        to: creditors[ci].id,
        toName: toP?.name || "",
        amount: Math.round(amount),
      });
    }
    creditors[ci].amount -= amount;
    debtors[di].amount -= amount;
    if (creditors[ci].amount < 0.01) ci++;
    if (debtors[di].amount < 0.01) di++;
  }

  return settlements;
}

// ===== Formatting Helpers =====

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "";
  const str = typeof dateStr === "string" ? dateStr : dateStr.toISOString();
  const date = new Date(str);
  if (isNaN(date.getTime())) {
    return str;
  }
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatDateTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "";
  const str = typeof dateStr === "string" ? dateStr : dateStr.toISOString();
  const date = new Date(str);
  if (isNaN(date.getTime())) {
    return str;
  }
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
