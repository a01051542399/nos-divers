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

export function calculateSettlement(tour: Tour): Settlement[] {
  const { participants, expenses } = tour;
  if (participants.length === 0 || expenses.length === 0) return [];

  const balances: Record<number, number> = {};
  for (const p of participants) {
    balances[p.id] = 0;
  }

  for (const expense of expenses) {
    const rate = expense.exchangeRate || 1;
    const amountKRW = expense.amount * rate;

    if (balances[expense.paidBy] !== undefined) {
      balances[expense.paidBy] += amountKRW;
    }

    if (expense.splitType === "custom" && expense.splitAmounts) {
      for (const [pid, amount] of Object.entries(expense.splitAmounts)) {
        const id = Number(pid);
        if (balances[id] !== undefined) {
          balances[id] -= amount * rate;
        }
      }
    } else {
      const splitCount = expense.splitAmong.length;
      if (splitCount === 0) continue;
      const perPerson = amountKRW / splitCount;
      for (const pid of expense.splitAmong) {
        if (balances[pid] !== undefined) {
          balances[pid] -= perPerson;
        }
      }
    }
  }

  const creditors: { id: number; name: string; amount: number }[] = [];
  const debtors: { id: number; name: string; amount: number }[] = [];

  for (const p of participants) {
    const balance = balances[p.id] || 0;
    if (balance > 0.01) {
      creditors.push({ id: p.id, name: p.name, amount: balance });
    } else if (balance < -0.01) {
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
    if (amount > 0.01) {
      settlements.push({
        from: debtors[di].id,
        fromName: debtors[di].name,
        to: creditors[ci].id,
        toName: creditors[ci].name,
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
