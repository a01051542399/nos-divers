export interface Tour {
  id: number;
  name: string;
  date: string;
  location: string;
  inviteCode: string;
  accessCode: string;
  createdBy: string;
  participants: Participant[];
  expenses: Expense[];
  createdAt: string;
}

export interface Participant {
  id: number;
  tourId: number;
  name: string;
  createdAt: string;
}

export interface Expense {
  id: number;
  tourId: number;
  name: string;
  amount: number;
  paidBy: number;
  splitAmong: number[];
  splitType: "equal" | "custom";
  splitAmounts: Record<string, number> | null;
  createdAt: string;
}

export interface WaiverPersonalInfo {
  name: string;
  birthDate: string;
  phone: string;
  divingLevel: string;
  tourPeriod: string;
  tourLocation: string;
  emergencyContact: string;
}

export interface Waiver {
  id: number;
  tourId: number;
  signerName: string;
  personalInfo: WaiverPersonalInfo;
  healthChecklist: boolean[];
  healthOther: string | null;
  signatureImage: string;
  signedAt: string;
}

export interface Settlement {
  from: number;
  fromName: string;
  to: number;
  toName: string;
  amount: number;
}
