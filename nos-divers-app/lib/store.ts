import type { Tour, Expense, Participant, Settlement } from "../shared/types";

// ── Settlement Calculation ───────────────────────────
// Greedy algorithm: match creditors to debtors

export function calculateSettlement(tour: {
  participants: Participant[];
  expenses: Expense[];
}): Settlement[] {
  const { participants, expenses } = tour;

  if (participants.length === 0 || expenses.length === 0) return [];

  // Calculate balance per participant
  const balances: Record<number, number> = {};
  for (const p of participants) {
    balances[p.id] = 0;
  }

  for (const expense of expenses) {
    // Add to payer
    if (balances[expense.paidBy] !== undefined) {
      balances[expense.paidBy] += expense.amount;
    }

    // Subtract from split recipients
    if (expense.splitType === "custom" && expense.splitAmounts) {
      for (const [pid, amount] of Object.entries(expense.splitAmounts)) {
        const id = Number(pid);
        if (balances[id] !== undefined) {
          balances[id] -= amount;
        }
      }
    } else {
      // Equal split
      const splitCount = expense.splitAmong.length;
      if (splitCount === 0) continue;
      const perPerson = expense.amount / splitCount;

      for (const pid of expense.splitAmong) {
        if (balances[pid] !== undefined) {
          balances[pid] -= perPerson;
        }
      }
    }
  }

  // Separate creditors (positive) and debtors (negative)
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

  // Sort descending
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  // Greedy matching
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

// ── Formatting helpers ───────────────────────────────
export function formatKRW(amount: number): string {
  return new Intl.NumberFormat("ko-KR").format(Math.round(amount)) + "원";
}

export function formatSettlement(s: Settlement): string {
  return `${s.fromName} → ${s.toName}: ${formatKRW(s.amount)}`;
}
