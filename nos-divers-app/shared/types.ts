// ── Shared type definitions ──────────────────────────

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
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface TourListItem {
  id: number;
  name: string;
  date: string;
  location: string;
  inviteCode: string;
  createdBy: string;
  createdAt: Date | null;
}

export interface Participant {
  id: number;
  tourId: number;
  name: string;
  lastModifiedBy: string;
  createdAt: Date | null;
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
  lastModifiedBy: string;
  createdAt: Date | null;
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
  signedAt: Date | null;
  agreed: boolean | null;
}

export interface Settlement {
  from: number;
  fromName: string;
  to: number;
  toName: string;
  amount: number;
}

export interface AuthUser {
  id: number;
  providerId: string;
  provider: string;
  name: string | null;
  email: string | null;
  profileImage: string | null;
  role: "user" | "admin" | null;
  lastSignedIn: Date | null;
}
