import { describe, expect, it } from "vitest";
import type { Participant, Expense, Settlement, WaiverPersonalInfo, Waiver } from "../lib/types";

/**
 * 정산 계산 로직 (store.ts의 calculateSettlement와 동일한 로직)
 * DB 기반: id는 number 타입
 */
function calculateSettlement(
  participants: Participant[],
  expenses: Expense[]
): Settlement[] {
  const balances: Record<number, number> = {};
  participants.forEach((p) => {
    balances[p.id] = 0;
  });

  expenses.forEach((expense) => {
    if (!expense.paidBy || expense.splitAmong.length === 0) return;

    if (balances[expense.paidBy] !== undefined) {
      balances[expense.paidBy] += expense.amount;
    }

    if (expense.splitType === "custom" && expense.splitAmounts) {
      expense.splitAmong.forEach((pid) => {
        const customAmount = expense.splitAmounts?.[String(pid)] ?? 0;
        if (balances[pid] !== undefined) {
          balances[pid] -= customAmount;
        }
      });
    } else {
      const perPerson = expense.amount / expense.splitAmong.length;
      expense.splitAmong.forEach((pid) => {
        if (balances[pid] !== undefined) {
          balances[pid] -= perPerson;
        }
      });
    }
  });

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

describe("정산 계산 로직", () => {
  it("2명이 균등 분배할 때 정산 결과가 올바르다", () => {
    const participants: Participant[] = [
      { id: 1, tourId: 1, name: "김철수" },
      { id: 2, tourId: 1, name: "이영희" },
    ];
    const expenses: Expense[] = [
      { id: 1, tourId: 1, name: "보트비", amount: 100000, paidBy: 1, splitAmong: [1, 2], splitType: "equal", splitAmounts: null },
    ];

    const result = calculateSettlement(participants, expenses);

    expect(result).toHaveLength(1);
    expect(result[0].from).toBe(2);
    expect(result[0].to).toBe(1);
    expect(result[0].amount).toBe(50000);
  });

  it("3명이 균등 분배할 때 정산 결과가 올바르다", () => {
    const participants: Participant[] = [
      { id: 1, tourId: 1, name: "김철수" },
      { id: 2, tourId: 1, name: "이영희" },
      { id: 3, tourId: 1, name: "박민수" },
    ];
    const expenses: Expense[] = [
      { id: 1, tourId: 1, name: "숙소비", amount: 300000, paidBy: 1, splitAmong: [1, 2, 3], splitType: "equal", splitAmounts: null },
    ];

    const result = calculateSettlement(participants, expenses);

    const totalToA = result.filter((s) => s.to === 1).reduce((sum, s) => sum + s.amount, 0);
    expect(totalToA).toBe(200000);
  });

  it("여러 비용이 있을 때 상쇄 계산이 올바르다", () => {
    const participants: Participant[] = [
      { id: 1, tourId: 1, name: "김철수" },
      { id: 2, tourId: 1, name: "이영희" },
    ];
    const expenses: Expense[] = [
      { id: 1, tourId: 1, name: "보트비", amount: 100000, paidBy: 1, splitAmong: [1, 2], splitType: "equal", splitAmounts: null },
      { id: 2, tourId: 1, name: "식비", amount: 60000, paidBy: 2, splitAmong: [1, 2], splitType: "equal", splitAmounts: null },
    ];

    const result = calculateSettlement(participants, expenses);

    expect(result).toHaveLength(1);
    expect(result[0].from).toBe(2);
    expect(result[0].to).toBe(1);
    expect(result[0].amount).toBe(20000);
  });

  it("비용이 없으면 정산 결과가 비어있다", () => {
    const participants: Participant[] = [
      { id: 1, tourId: 1, name: "김철수" },
      { id: 2, tourId: 1, name: "이영희" },
    ];
    const expenses: Expense[] = [];

    const result = calculateSettlement(participants, expenses);
    expect(result).toHaveLength(0);
  });

  it("한 명만 모든 비용을 부담하고 전원 분배할 때", () => {
    const participants: Participant[] = [
      { id: 1, tourId: 1, name: "강사" },
      { id: 2, tourId: 1, name: "참가자1" },
      { id: 3, tourId: 1, name: "참가자2" },
      { id: 4, tourId: 1, name: "참가자3" },
    ];
    const expenses: Expense[] = [
      { id: 1, tourId: 1, name: "보트비", amount: 400000, paidBy: 1, splitAmong: [1, 2, 3, 4], splitType: "equal", splitAmounts: null },
      { id: 2, tourId: 1, name: "숙소비", amount: 200000, paidBy: 1, splitAmong: [1, 2, 3, 4], splitType: "equal", splitAmounts: null },
    ];

    const result = calculateSettlement(participants, expenses);

    const totalToA = result.filter((s) => s.to === 1).reduce((sum, s) => sum + s.amount, 0);
    expect(totalToA).toBe(450000);
    expect(result.every((s) => s.amount === 150000)).toBe(true);
  });

  it("특정 인원만 분담하는 비용 처리", () => {
    const participants: Participant[] = [
      { id: 1, tourId: 1, name: "김철수" },
      { id: 2, tourId: 1, name: "이영희" },
      { id: 3, tourId: 1, name: "박민수" },
    ];
    const expenses: Expense[] = [
      { id: 1, tourId: 1, name: "장비 대여", amount: 100000, paidBy: 1, splitAmong: [1, 2], splitType: "equal", splitAmounts: null },
    ];

    const result = calculateSettlement(participants, expenses);

    expect(result).toHaveLength(1);
    expect(result[0].from).toBe(2);
    expect(result[0].to).toBe(1);
    expect(result[0].amount).toBe(50000);
  });

  it("커스텀 금액 정산: 참여자별 다른 금액 분배", () => {
    const participants: Participant[] = [
      { id: 1, tourId: 1, name: "A군" },
      { id: 2, tourId: 1, name: "B군" },
      { id: 3, tourId: 1, name: "C군" },
      { id: 4, tourId: 1, name: "D군" },
    ];
    // 10만원 점심값: A군 7만원, B·C·D군 각 1만원
    const expenses: Expense[] = [
      {
        id: 1,
        tourId: 1,
        name: "점심값",
        amount: 100000,
        paidBy: 1,
        splitAmong: [1, 2, 3, 4],
        splitType: "custom",
        splitAmounts: { "1": 70000, "2": 10000, "3": 10000, "4": 10000 },
      },
    ];

    const result = calculateSettlement(participants, expenses);

    // A가 10만원 냈고 자기 몫이 7만원이므로 3만원 받아야 함
    // B, C, D 각각 1만원씩 A에게 보내야 함
    const totalToA = result.filter((s) => s.to === 1).reduce((sum, s) => sum + s.amount, 0);
    expect(totalToA).toBe(30000);
    expect(result.every((s) => s.amount === 10000)).toBe(true);
  });

  it("커스텀 금액 정산: 다른 사람이 결제한 경우", () => {
    const participants: Participant[] = [
      { id: 1, tourId: 1, name: "A" },
      { id: 2, tourId: 1, name: "B" },
      { id: 3, tourId: 1, name: "C" },
    ];
    // B가 15만원 결제, A 5만원, B 5만원, C 5만원
    const expenses: Expense[] = [
      {
        id: 1,
        tourId: 1,
        name: "저녁식사",
        amount: 150000,
        paidBy: 2,
        splitAmong: [1, 2, 3],
        splitType: "custom",
        splitAmounts: { "1": 50000, "2": 50000, "3": 50000 },
      },
    ];

    const result = calculateSettlement(participants, expenses);

    // B가 15만원 냈고 자기 몫 5만원, 10만원 받아야 함
    const totalToB = result.filter((s) => s.to === 2).reduce((sum, s) => sum + s.amount, 0);
    expect(totalToB).toBe(100000);
  });

  it("균등분배와 커스텀 혼합 정산", () => {
    const participants: Participant[] = [
      { id: 1, tourId: 1, name: "A" },
      { id: 2, tourId: 1, name: "B" },
    ];
    const expenses: Expense[] = [
      // 균등: A가 10만원 결제, 5만원씩
      { id: 1, tourId: 1, name: "보트비", amount: 100000, paidBy: 1, splitAmong: [1, 2], splitType: "equal", splitAmounts: null },
      // 커스텀: B가 8만원 결제, A 3만원, B 5만원
      {
        id: 2,
        tourId: 1,
        name: "장비",
        amount: 80000,
        paidBy: 2,
        splitAmong: [1, 2],
        splitType: "custom",
        splitAmounts: { "1": 30000, "2": 50000 },
      },
    ];

    const result = calculateSettlement(participants, expenses);

    // A: +100000 -50000 -30000 = +20000 (받을 돈)
    // B: +80000 -50000 -50000 = -20000 (보낼 돈)
    expect(result).toHaveLength(1);
    expect(result[0].from).toBe(2);
    expect(result[0].to).toBe(1);
    expect(result[0].amount).toBe(20000);
  });
});

describe("면책동의서 데이터 타입", () => {
  it("WaiverPersonalInfo 타입이 올바르게 생성된다", () => {
    const info: WaiverPersonalInfo = {
      name: "김철수",
      birthDate: "1990-01-01",
      phone: "010-1234-5678",
      divingLevel: "PADI AOW",
      tourPeriod: "2026.03.15 ~ 03.17",
      tourLocation: "제주 서귀포",
      emergencyContact: "010-9876-5432 (배우자)",
    };

    expect(info.name).toBe("김철수");
    expect(info.divingLevel).toBe("PADI AOW");
  });

  it("Waiver 타입이 올바르게 생성된다", () => {
    const waiver: Waiver = {
      id: 1,
      tourId: 1,
      signerName: "이영희",
      personalInfo: {
        name: "이영희",
        birthDate: "1985-05-20",
        phone: "010-5555-1234",
        divingLevel: "SSI AA",
        tourPeriod: "2026.04.01 ~ 04.03",
        tourLocation: "필리핀 세부",
        emergencyContact: "010-1111-2222 (부모)",
      },
      healthChecklist: [false, true, false, false, false, false],
      healthOther: "",
      signatureImage: "data:image/svg+xml;base64,dGVzdA==",
      signedAt: new Date().toISOString(),
      agreed: true,
    };

    const info = waiver.personalInfo as WaiverPersonalInfo;
    expect(info.name).toBe("이영희");
    expect(waiver.healthChecklist).toHaveLength(6);
    expect((waiver.healthChecklist as boolean[])[1]).toBe(true);
    expect(waiver.agreed).toBe(true);
  });
});
