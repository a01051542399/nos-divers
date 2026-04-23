import type { Tour, Settlement } from "./types";

// ─── Pure utility functions (no side effects) ───────────────────────────────

export interface UserProfile {
  name: string;
  email: string;
  grade: string;
  phone?: string;
  birthDate?: string;
  divingLevel?: string;
  emergencyContact?: string;
}

/**
 * 정산 계산.
 *
 * 부동소수점 누적 오차 방지를 위해 모든 잔액을 "정수 원" 단위로 다룬다.
 * - amount * rate 는 한 번에 곱한 뒤 즉시 round → 비용별 KRW 정수 확정
 * - 균등 분배의 1원 미만 끝수는 분배 인원에게 라운드-로빈으로 추가 부여하여
 *   sum(부담) === amountKRW 가 항상 성립하도록 한다 (총합 보존).
 * - 그리디 매칭 시 마지막 step 에서 잔액이 1원 미만이면 강제 흡수.
 */
export function calculateSettlement(tour: Tour): Settlement[] {
  const { participants, expenses } = tour;
  if (participants.length === 0 || expenses.length === 0) return [];

  const balances: Record<number, number> = {};
  for (const p of participants) {
    balances[p.id] = 0;
  }

  for (const expense of expenses) {
    const rate = expense.exchangeRate || 1;
    const amountKRW = Math.round(expense.amount * rate);

    if (balances[expense.paidBy] !== undefined) {
      balances[expense.paidBy] += amountKRW;
    }

    if (expense.splitType === "custom" && expense.splitAmounts) {
      // 커스텀: 사용자가 입력한 금액을 그대로 환산하여 정수화
      for (const [pid, amount] of Object.entries(expense.splitAmounts)) {
        const id = Number(pid);
        if (balances[id] !== undefined) {
          balances[id] -= Math.round(amount * rate);
        }
      }
    } else {
      const splitIds = expense.splitAmong.filter((id) => balances[id] !== undefined);
      const splitCount = splitIds.length;
      if (splitCount === 0) continue;
      const base = Math.floor(amountKRW / splitCount);
      let remainder = amountKRW - base * splitCount; // 0 ~ splitCount-1
      for (const pid of splitIds) {
        const share = base + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder--;
        balances[pid] -= share;
      }
    }
  }

  const creditors: { id: number; name: string; amount: number }[] = [];
  const debtors: { id: number; name: string; amount: number }[] = [];

  for (const p of participants) {
    const balance = balances[p.id] || 0;
    // 모든 값이 정수이므로 1원 단위에서 분류
    if (balance >= 1) {
      creditors.push({ id: p.id, name: p.name, amount: balance });
    } else if (balance <= -1) {
      debtors.push({ id: p.id, name: p.name, amount: -balance });
    }
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const settlements: Settlement[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const amount = Math.min(creditors[ci].amount, debtors[di].amount);
    if (amount >= 1) {
      settlements.push({
        from: debtors[di].id,
        fromName: debtors[di].name,
        to: creditors[ci].id,
        toName: creditors[ci].name,
        amount,
      });
    }
    creditors[ci].amount -= amount;
    debtors[di].amount -= amount;
    if (creditors[ci].amount < 1) ci++;
    if (debtors[di].amount < 1) di++;
  }

  return settlements;
}

export function formatKRW(amount: number): string {
  return new Intl.NumberFormat("ko-KR").format(Math.round(amount)) + "원";
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW" }).format(Math.round(amount));
}

export function formatDate(dateStr: string | Date | undefined): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return String(dateStr);
  }
}

export function formatDateTime(dateStr: string | Date | undefined): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString("ko-KR", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return String(dateStr);
  }
}
