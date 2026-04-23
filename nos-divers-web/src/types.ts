/**
 * 다이빙 투어 정산 & 면책동의서 앱 데이터 타입
 * v45 기준
 */

export interface Participant {
  id: number;
  tourId: number;
  name: string;
  addedBy?: string;
  lastModifiedBy?: string;
  createdAt?: string;
}

export interface Expense {
  id: number;
  tourId: number;
  name: string;
  amount: number;
  currency?: string;        // "KRW", "USD", "PHP" etc. (default: "KRW")
  exchangeRate?: number;    // 1 외화 = N원 (KRW일 때 1)
  paidBy: number;
  splitAmong: number[];
  splitType: "equal" | "custom";
  splitAmounts: Record<string, number> | null;
  receiptImage?: string;  // base64 data URL of receipt photo
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
  deletedAt?: string;
}

export interface TourListItem {
  id: number;
  name: string;
  date: string;
  location: string;
  inviteCode: string;
  accessCode: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
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
  from: number;
  fromName: string;
  to: number;
  toName: string;
  amount: number;
}

export interface Comment {
  id: number;
  tourId: number;
  authorName: string;
  text: string;
  createdAt: string;
  edited?: boolean;
}

export interface Announcement {
  id: number;
  title: string;
  body: string;
  targetTourId: number | null; // null = 전체 공지
  pinned: boolean;
  authorName: string;
  createdAt: string;
  read: boolean;
}
