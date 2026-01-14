
export enum ContractStatus {
  ACTIVE = 'Đang cầm',
  OVERDUE = 'Quá hạn',
  REDEEMED = 'Đã chuộc',
  LIQUIDATED = 'Thanh lý'
}

export enum PaymentType {
  INTEREST = 'Tiền lãi',
  PRINCIPAL = 'Tiền gốc',
  REDEEM = 'Chuộc máy (Gốc + Lãi)'
}

export interface Payment {
  id: string;
  date: string;
  amount: number;
  type: PaymentType;
  note?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  idCard: string;
}

export interface DeviceInfo {
  brand: string;
  model: string;
  imei: string;
  condition: string;
  estimatedValue: number;
}

export interface Contract {
  id: string;
  customer: Customer;
  device: DeviceInfo;
  loanAmount: number;
  interestRate: number; // Tiền lãi trên 1 triệu (VD: 3000)
  interestType: 'ngày' | 'tháng';
  startDate: string;
  dueDate: string;
  status: ContractStatus;
  notes?: string;
  privateNotes?: string;
  isNoPaper: boolean;
  payments?: Payment[];
  residualInterest?: number; // Tiền lãi dư từ lần đóng trước
  lastInterestPaidDate?: string; // Ngày đã tính lãi đến hết ngày đó
}

export interface DashboardStats {
  totalActiveLoans: number;
  totalReceivable: number;
  overdueCount: number;
  revenueThisMonth: number;
}
