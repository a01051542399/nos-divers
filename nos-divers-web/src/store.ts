import type { Tour, Participant, Expense, Waiver, Settlement } from "./types";

const STORAGE_KEY = "nos_divers_data";

interface AppData {
  tours: Tour[];
  waivers: Waiver[];
  nextTourId: number;
  nextParticipantId: number;
  nextExpenseId: number;
  nextWaiverId: number;
}

function getDefaultData(): AppData {
  return {
    tours: [],
    waivers: [],
    nextTourId: 1,
    nextParticipantId: 1,
    nextExpenseId: 1,
    nextWaiverId: 1,
  };
}

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return getDefaultData();
}

function saveData(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Tour operations
export function listTours(): Tour[] {
  return loadData().tours;
}

export function getTourById(id: number): Tour | undefined {
  return loadData().tours.find((t) => t.id === id);
}

export function createTour(input: {
  name: string;
  date: string;
  location: string;
  accessCode: string;
  createdBy: string;
}): Tour {
  const data = loadData();
  const tour: Tour = {
    id: data.nextTourId++,
    name: input.name,
    date: input.date,
    location: input.location,
    inviteCode: generateInviteCode(),
    accessCode: input.accessCode || "0000",
    createdBy: input.createdBy,
    participants: [],
    expenses: [],
    createdAt: new Date().toISOString(),
  };
  data.tours.push(tour);
  saveData(data);
  return tour;
}

export function deleteTour(id: number) {
  const data = loadData();
  data.tours = data.tours.filter((t) => t.id !== id);
  data.waivers = data.waivers.filter((w) => w.tourId !== id);
  saveData(data);
}

export function getTourByInviteCode(code: string): Tour | undefined {
  return loadData().tours.find((t) => t.inviteCode === code);
}

export function verifyTourAccessCode(tourId: number, code: string): boolean {
  const tour = getTourById(tourId);
  return tour?.accessCode === code;
}

// Participant operations
export function addParticipant(tourId: number, name: string): Participant {
  const data = loadData();
  const tour = data.tours.find((t) => t.id === tourId);
  if (!tour) throw new Error("투어를 찾을 수 없습니다");

  const participant: Participant = {
    id: data.nextParticipantId++,
    tourId,
    name,
    createdAt: new Date().toISOString(),
  };
  tour.participants.push(participant);
  saveData(data);
  return participant;
}

export function removeParticipant(tourId: number, participantId: number) {
  const data = loadData();
  const tour = data.tours.find((t) => t.id === tourId);
  if (!tour) return;
  tour.participants = tour.participants.filter((p) => p.id !== participantId);
  // Also remove from expenses splitAmong
  for (const exp of tour.expenses) {
    exp.splitAmong = exp.splitAmong.filter((id) => id !== participantId);
    if (exp.paidBy === participantId) {
      // Keep expense but mark payer as removed
    }
  }
  saveData(data);
}

// Expense operations
export function addExpense(input: {
  tourId: number;
  name: string;
  amount: number;
  paidBy: number;
  splitAmong: number[];
  splitType?: "equal" | "custom";
  splitAmounts?: Record<string, number> | null;
}): Expense {
  const data = loadData();
  const tour = data.tours.find((t) => t.id === input.tourId);
  if (!tour) throw new Error("투어를 찾을 수 없습니다");

  const expense: Expense = {
    id: data.nextExpenseId++,
    tourId: input.tourId,
    name: input.name,
    amount: input.amount,
    paidBy: input.paidBy,
    splitAmong: input.splitAmong,
    splitType: input.splitType || "equal",
    splitAmounts: input.splitAmounts || null,
    createdAt: new Date().toISOString(),
  };
  tour.expenses.push(expense);
  saveData(data);
  return expense;
}

export function removeExpense(tourId: number, expenseId: number) {
  const data = loadData();
  const tour = data.tours.find((t) => t.id === tourId);
  if (!tour) return;
  tour.expenses = tour.expenses.filter((e) => e.id !== expenseId);
  saveData(data);
}

// Waiver operations
export function listWaiversByTour(tourId: number): Waiver[] {
  return loadData().waivers.filter((w) => w.tourId === tourId);
}

export function createWaiver(input: {
  tourId: number;
  signerName: string;
  personalInfo: Waiver["personalInfo"];
  healthChecklist: boolean[];
  healthOther?: string;
  signatureImage: string;
}): Waiver {
  const data = loadData();
  const waiver: Waiver = {
    id: data.nextWaiverId++,
    tourId: input.tourId,
    signerName: input.signerName,
    personalInfo: input.personalInfo,
    healthChecklist: input.healthChecklist,
    healthOther: input.healthOther || null,
    signatureImage: input.signatureImage,
    signedAt: new Date().toISOString(),
  };
  data.waivers.push(waiver);
  saveData(data);
  return waiver;
}

export function deleteWaiver(waiverId: number) {
  const data = loadData();
  data.waivers = data.waivers.filter((w) => w.id !== waiverId);
  saveData(data);
}

// Settlement calculation
export function calculateSettlement(tour: Tour): Settlement[] {
  const { participants, expenses } = tour;
  if (participants.length === 0 || expenses.length === 0) return [];

  const balances: Record<number, number> = {};
  for (const p of participants) {
    balances[p.id] = 0;
  }

  for (const expense of expenses) {
    if (balances[expense.paidBy] !== undefined) {
      balances[expense.paidBy] += expense.amount;
    }

    if (expense.splitType === "custom" && expense.splitAmounts) {
      for (const [pid, amount] of Object.entries(expense.splitAmounts)) {
        const id = Number(pid);
        if (balances[id] !== undefined) {
          balances[id] -= amount;
        }
      }
    } else {
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
