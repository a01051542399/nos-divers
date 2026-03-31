/**
 * 다이빙 투어 정산 & 면책동의서 앱 데이터 타입
 * DB 기반 (id는 number)
 */

export interface Participant {
  id: number;
  tourId: number;
  name: string;
  lastModifiedBy?: string;
  createdAt?: string;
}

export interface Expense {
  id: number;
  tourId: number;
  name: string;
  amount: number;
  paidBy: number; // participant id
  splitAmong: number[]; // participant ids
  splitType: "equal" | "custom"; // 균등분배 or 커스텀
  splitAmounts: Record<string, number> | null; // 커스텀일 때 {participantId: amount}
  lastModifiedBy?: string;
  createdAt?: string;
}

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
  createdAt?: string;
  updatedAt?: string;
}

export interface TourListItem {
  id: number;
  name: string;
  date: string;
  location: string;
  inviteCode: string;
  accessCode: string;
  createdBy: string;
  createdAt: string | Date;
  updatedAt: string | Date;
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
  personalInfo: WaiverPersonalInfo | string;
  healthChecklist: boolean[] | string;
  healthOther: string | null;
  signatureImage: string;
  signedAt: string | Date;
  agreed: boolean;
}

export interface Settlement {
  from: number; // participant id
  fromName: string;
  to: number; // participant id
  toName: string;
  amount: number;
}
