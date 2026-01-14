
export const formatVND = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

export const formatNumber = (num: number): string => {
  if (!num && num !== 0) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export const parseNumber = (str: string | number): number => {
  if (typeof str === 'number') return str;
  if (!str) return 0;
  return Number(str.replace(/\./g, ''));
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('vi-VN');
};

export const calculateDaysBetween = (start: string, end: string = new Date().toISOString().split('T')[0]): number => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  const diffTime = endDate.getTime() - startDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Tính lãi suất dựa trên dư nợ hiện tại:
 * - Nếu chưa đóng lãi (lastPaidDate undefined): (Ngày hiện tại - Ngày bắt đầu) + 1.
 * - Nếu đã đóng lãi: (Ngày hiện tại - Ngày đã đóng lãi gần nhất).
 * - Luôn khấu trừ tiền dư tích lũy (residualInterest).
 */
export const calculateInterest = (
  loan: number, 
  rate: number, 
  startDate: string, 
  type: 'ngày' | 'tháng',
  lastPaidDate?: string,
  residualInterest: number = 0
): number => {
  const referenceDate = lastPaidDate || startDate;
  const daysDiff = calculateDaysBetween(referenceDate);
  
  // Quy tắc: Ngày đầu tiên cầm máy tính là 1 ngày lãi.
  // Nếu đã đóng lãi rồi thì chênh lệch ngày chính là số ngày cần trả tiếp theo.
  const actualDays = lastPaidDate ? daysDiff : daysDiff + 1;
  const safeDays = Math.max(0, actualDays);

  let dailyRate = 0;
  if (type === 'ngày') {
    dailyRate = (loan / 1000000) * rate;
  } else {
    dailyRate = (loan * (rate / 100)) / 30;
  }

  const totalInterestNeeded = Math.round(dailyRate * safeDays);
  // Khấu trừ tiền lẻ dư từ lần đóng trước
  return Math.max(0, totalInterestNeeded - residualInterest);
};

export const removeDiacritics = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
};
