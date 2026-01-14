
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Search, 
  Smartphone, 
  Users, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  History,
  User,
  Zap,
  Tag,
  Edit2,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  DollarSign,
  XCircle,
  Trash2,
  TrendingDown,
  TrendingUp,
  ChevronRight,
  Receipt,
  Phone,
  Calendar,
  CreditCard,
  X,
  FileText,
  ShieldCheck,
  Plus,
  Minus,
  BarChart3,
  Contact2
} from 'lucide-react';
import { Contract, ContractStatus, Customer, PaymentType, Payment } from './types';
import { formatVND, formatDate, calculateInterest, calculateDaysBetween, formatNumber, parseNumber, removeDiacritics } from './utils/formatters';
import StatusBadge from './components/StatusBadge';
import { estimateDeviceValue } from './services/geminiService';

const CONFIG_KEY = 'pawn_config_v1';

const App: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>(() => {
    const saved = localStorage.getItem('pawn_contracts');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('pawn_contracts', JSON.stringify(contracts));
  }, [contracts]);

  const [view, setView] = useState<'dashboard' | 'contracts' | 'add' | 'customers' | 'customer_history'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedCustomerIdForHistory, setSelectedCustomerIdForHistory] = useState<string | null>(null);

  const [quickActionModal, setQuickActionModal] = useState<{ 
    type: 'interest' | 'redeem' | 'details' | 'add_principal' | 'reduce_principal', 
    contract: Contract | null 
  }>({ type: 'details', contract: null });

  const [principalAdjustAmount, setPrincipalAdjustAmount] = useState('0');
  const [interestPaidAmount, setInterestPaidAmount] = useState('0');

  // Form states (Recovered Old UI Version)
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [formBrand, setFormBrand] = useState('Apple');
  const [formModel, setFormModel] = useState('');
  const [formCondition, setFormCondition] = useState('99% (Như mới)');
  const [formLoanAmount, setFormLoanAmount] = useState('0');
  const [formCustomerName, setFormCustomerName] = useState('');
  const [formCustomerPhone, setFormCustomerPhone] = useState('');
  const [formCustomerIdCard, setFormCustomerIdCard] = useState('');
  const [formImei, setFormImei] = useState('');
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formIsNoPaper, setFormIsNoPaper] = useState(false);
  const [formNotes, setFormNotes] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [formInterestRate, setFormInterestRate] = useState(() => {
    const saved = localStorage.getItem(CONFIG_KEY);
    return saved ? JSON.parse(saved).rate : '3000';
  });
  const [formInterestType, setFormInterestType] = useState<'ngày' | 'tháng'>(() => {
    const saved = localStorage.getItem(CONFIG_KEY);
    return saved ? JSON.parse(saved).type : 'ngày';
  });
  const [formDuration, setFormDuration] = useState(() => {
    const saved = localStorage.getItem(CONFIG_KEY);
    return saved ? JSON.parse(saved).duration : '30';
  });

  useEffect(() => {
    if (!editingContractId) {
      localStorage.setItem(CONFIG_KEY, JSON.stringify({ rate: formInterestRate, type: formInterestType, duration: formDuration }));
    }
  }, [formInterestRate, formInterestType, formDuration, editingContractId]);

  const [aiValuation, setAiValuation] = useState<any>(null);
  const [isValuating, setIsValuating] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Pre-fill suggested interest payment
  useEffect(() => {
    if (quickActionModal.type === 'interest' && quickActionModal.contract) {
      const due = calculateInterest(
        quickActionModal.contract.loanAmount, 
        quickActionModal.contract.interestRate, 
        quickActionModal.contract.startDate, 
        quickActionModal.contract.interestType, 
        quickActionModal.contract.lastInterestPaidDate,
        quickActionModal.contract.residualInterest
      );
      setInterestPaidAmount(formatNumber(due));
    }
  }, [quickActionModal.type, quickActionModal.contract]);

  const uniqueCustomers = useMemo(() => {
    const map = new Map<string, Customer>();
    contracts.forEach(c => {
      const key = `${c.customer.name.toLowerCase()}_${c.customer.phone}`;
      if (!map.has(key)) map.set(key, c.customer);
    });
    return Array.from(map.values());
  }, [contracts]);

  const customerSuggestions = useMemo(() => {
    if (!formCustomerName) return [];
    return uniqueCustomers.filter(c => 
      removeDiacritics(c.name).includes(removeDiacritics(formCustomerName)) ||
      c.phone.includes(formCustomerName)
    ).slice(0, 5);
  }, [formCustomerName, uniqueCustomers]);

  const previousItemsForSelectedCustomer = useMemo(() => {
    if (!formCustomerName) return [];
    const items = new Map<string, { brand: string, loan: number }>();
    contracts
      .filter(c => c.customer.name.toLowerCase() === formCustomerName.toLowerCase())
      .forEach(c => {
        if (!items.has(c.device.model)) {
          items.set(c.device.model, { brand: c.device.brand, loan: c.loanAmount });
        }
      });
    return Array.from(items.entries()).map(([model, data]) => ({ model, ...data }));
  }, [formCustomerName, contracts]);

  const handleSelectPreviousItem = (item: { model: string, brand: string, loan: number }) => {
    setFormModel(item.model);
    setFormBrand(item.brand);
    if (formLoanAmount === '0' || formLoanAmount === '') setFormLoanAmount(formatNumber(item.loan));
  };

  const clearForm = () => {
    const savedConfig = localStorage.getItem(CONFIG_KEY);
    const config = savedConfig ? JSON.parse(savedConfig) : { rate: '3000', type: 'ngày', duration: '30' };
    setEditingContractId(null);
    setFormBrand('Apple');
    setFormModel('');
    setFormCondition('99% (Như mới)');
    setFormCustomerName('');
    setFormCustomerPhone('');
    setFormCustomerIdCard('');
    setFormImei('');
    setFormLoanAmount('0');
    setFormIsNoPaper(false);
    setFormNotes('');
    setFormStartDate(new Date().toISOString().split('T')[0]);
    setFormInterestRate(config.rate);
    setFormInterestType(config.type);
    setFormDuration(config.duration);
    setAiValuation(null);
    setShowAdvanced(false);
  };

  const startEditing = (contract: Contract) => {
    setEditingContractId(contract.id);
    setFormBrand(contract.device.brand);
    setFormModel(contract.device.model);
    setFormCondition(contract.device.condition);
    setFormCustomerName(contract.customer.name);
    setFormCustomerPhone(contract.customer.phone);
    setFormCustomerIdCard(contract.customer.idCard);
    setFormImei(contract.device.imei);
    setFormLoanAmount(formatNumber(contract.loanAmount));
    setFormIsNoPaper(contract.isNoPaper);
    setFormNotes(contract.notes || '');
    setFormStartDate(contract.startDate);
    setFormInterestRate(contract.interestRate.toString());
    setFormInterestType(contract.interestType);
    const dur = calculateDaysBetween(contract.startDate, contract.dueDate);
    setFormDuration(dur.toString());
    setView('add');
    setShowAdvanced(true);
    setQuickActionModal({ type: 'details', contract: null });
  };

  const handleSubmitContract = (e: React.FormEvent) => {
    e.preventDefault();
    const loan = parseNumber(formLoanAmount);
    const start = new Date(formStartDate);
    start.setDate(start.getDate() + Number(formDuration));
    const dueDate = start.toISOString().split('T')[0];

    if (editingContractId) {
      setContracts(prev => prev.map(c => c.id === editingContractId ? {
        ...c,
        customer: { ...c.customer, name: formCustomerName, phone: formCustomerPhone, idCard: formCustomerIdCard },
        device: { ...c.device, brand: formBrand, model: formModel, imei: formImei, condition: formCondition },
        loanAmount: loan, interestRate: Number(formInterestRate), interestType: formInterestType,
        startDate: formStartDate, dueDate: dueDate, isNoPaper: formIsNoPaper, notes: formNotes
      } : c));
    } else {
      const newContract: Contract = {
        id: `HD-${Math.floor(1000 + Math.random() * 9000)}`,
        customer: { id: `C${Math.random()}`, name: formCustomerName, phone: formCustomerPhone, idCard: formCustomerIdCard || 'Chưa cập nhật' },
        device: { brand: formBrand, model: formModel, imei: formImei || 'Chưa có', condition: formCondition, estimatedValue: aiValuation?.marketValue || loan * 1.5 },
        loanAmount: loan, interestRate: Number(formInterestRate), interestType: formInterestType,
        startDate: formStartDate, dueDate: dueDate, status: ContractStatus.ACTIVE, isNoPaper: formIsNoPaper,
        notes: formNotes, payments: [], residualInterest: 0, lastInterestPaidDate: undefined
      };
      setContracts([newContract, ...contracts]);
    }
    setView('contracts');
    clearForm();
  };

  const handleStatusUpdate = (contractId: string, status: ContractStatus) => {
    setContracts(prev => prev.map(c => c.id === contractId ? { ...c, status } : c));
    setQuickActionModal({ type: 'details', contract: null });
  };

  const handlePayInterest = (contractId: string) => {
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return;

    const amountPaid = parseNumber(interestPaidAmount);
    if (amountPaid <= 0) return;

    // Tính lãi ngày thực tế
    let dailyRate = 0;
    if (contract.interestType === 'ngày') {
      dailyRate = (contract.loanAmount / 1000000) * contract.interestRate;
    } else {
      dailyRate = (contract.loanAmount * (contract.interestRate / 100)) / 30;
    }

    // Tiền mặt hữu dụng = Tiền đóng + Tiền lẻ dư kỳ trước
    const totalCash = amountPaid + (contract.residualInterest || 0);
    
    // Gia hạn dựa trên tiền đóng
    const extensionDays = Math.floor(totalCash / dailyRate);
    const remainingResidual = totalCash % dailyRate;

    // Cập nhật ngày đáo hạn
    const currentDueDate = new Date(contract.dueDate);
    currentDueDate.setDate(currentDueDate.getDate() + extensionDays);
    const newDueDate = currentDueDate.toISOString().split('T')[0];

    // Cập nhật ngày mốc tính lãi tiếp theo (lastInterestPaidDate)
    const refDate = contract.lastInterestPaidDate || contract.startDate;
    const nextPaidToDate = new Date(refDate);
    // Lần đầu tính từ startDate (+1 bao gồm ngày cầm máy), các lần sau tính thêm extensionDays
    const isFirstTime = !contract.lastInterestPaidDate;
    const increment = isFirstTime ? (extensionDays - 1) : extensionDays;
    nextPaidToDate.setDate(nextPaidToDate.getDate() + increment);
    const newPaidToDate = nextPaidToDate.toISOString().split('T')[0];

    const newPayment: Payment = {
      id: `PAY-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      amount: amountPaid,
      type: PaymentType.INTEREST,
      note: `Đóng lãi gia hạn ${extensionDays} ngày. Tiền dư tích lũy: ${formatVND(remainingResidual)}`
    };

    setContracts(prev => prev.map(c => c.id === contractId ? {
      ...c,
      dueDate: newDueDate,
      lastInterestPaidDate: newPaidToDate,
      residualInterest: remainingResidual,
      payments: [...(c.payments || []), newPayment],
      status: ContractStatus.ACTIVE // Reset trạng thái nếu đang quá hạn
    } : c));

    setQuickActionModal({ type: 'details', contract: null });
    setInterestPaidAmount('0');
    alert(`Đã đóng lãi ${formatVND(amountPaid)}. Gia hạn thêm ${extensionDays} ngày. Ngày đáo hạn mới: ${formatDate(newDueDate)}`);
  };

  const handleAdjustPrincipal = (contractId: string, type: 'add' | 'reduce') => {
    const amount = parseNumber(principalAdjustAmount);
    if (amount <= 0) return;

    const newPayment: Payment = {
      id: `PAY-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      amount: amount,
      type: PaymentType.PRINCIPAL,
      note: type === 'add' ? 'Lấy thêm gốc' : 'Trả bớt gốc'
    };

    setContracts(prev => prev.map(c => {
      if (c.id === contractId) {
        const newLoanAmount = type === 'add' ? c.loanAmount + amount : Math.max(0, c.loanAmount - amount);
        return {
          ...c,
          loanAmount: newLoanAmount,
          payments: [...(c.payments || []), newPayment]
        };
      }
      return c;
    }));

    setQuickActionModal({ type: 'details', contract: null });
    setPrincipalAdjustAmount('0');
  };

  const deleteContract = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn hủy hợp đồng này?')) {
      setContracts(prev => prev.filter(c => c.id !== id));
      setQuickActionModal({ type: 'details', contract: null });
    }
  };

  const handleMoneyMask = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormLoanAmount(formatNumber(Number(e.target.value.replace(/\D/g, ""))));
  };

  const handleValuation = async () => {
    if (!formModel) return;
    setIsValuating(true);
    const result = await estimateDeviceValue(formBrand, formModel, formCondition);
    setAiValuation(result);
    if (result) setFormLoanAmount(formatNumber(result.suggestedLoan));
    setIsValuating(false);
  };

  const stats = useMemo(() => {
    const active = contracts.filter(c => c.status === ContractStatus.ACTIVE);
    return {
      activeCount: active.length,
      overdueCount: contracts.filter(c => {
        const isExpired = calculateDaysBetween(c.dueDate) > 0;
        return isExpired && c.status === ContractStatus.ACTIVE;
      }).length,
      totalLoaned: active.reduce((sum, c) => sum + c.loanAmount, 0),
      redeemedCount: contracts.filter(c => c.status === ContractStatus.REDEEMED).length,
    };
  }, [contracts]);

  const viewCustomerHistory = (customer: Customer) => {
    setSelectedCustomerIdForHistory(customer.name);
    setView('customer_history');
  };

  const filteredContracts = useMemo(() => {
    let result = contracts;
    if (view === 'customer_history' && selectedCustomerIdForHistory) {
      result = result.filter(c => c.customer.name === selectedCustomerIdForHistory);
    }
    const normSearch = removeDiacritics(searchTerm);
    if (normSearch) {
      result = result.filter(c => 
        removeDiacritics(c.customer.name).includes(normSearch) || 
        removeDiacritics(c.device.model).includes(normSearch) ||
        c.id.toLowerCase().includes(normSearch)
      );
    }
    return result;
  }, [searchTerm, contracts, view, selectedCustomerIdForHistory]);

  const sortedCustomers = useMemo(() => {
    return uniqueCustomers.filter(c => 
      removeDiacritics(c.name).includes(removeDiacritics(searchTerm)) || 
      c.phone.includes(searchTerm)
    );
  }, [uniqueCustomers, searchTerm]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20 md:pb-0">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-40 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          {view === 'customer_history' ? (
            <button onClick={() => setView('customers')} className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6 text-slate-600" />
            </button>
          ) : (
            <div className="bg-emerald-500 p-1.5 rounded-lg">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
          )}
          <h1 className="font-black text-lg text-slate-800 tracking-tight truncate">
            {view === 'dashboard' && 'Dashboard'}
            {view === 'contracts' && 'Hợp đồng'}
            {view === 'customers' && 'Khách hàng'}
            {view === 'add' && (editingContractId ? 'Sửa Hợp đồng' : 'Lập HD Mới')}
            {view === 'customer_history' && 'Lịch sử Khách'}
          </h1>
        </div>
        
        <div className="flex items-center gap-1">
          {(view === 'contracts' || view === 'customers') && (
            <button 
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className={`p-2 rounded-full transition-colors ${isSearchOpen ? 'bg-emerald-100 text-emerald-600' : 'text-slate-500'}`}
            >
              <Search className="w-6 h-6" />
            </button>
          )}
        </div>
      </header>

      {isSearchOpen && (view === 'contracts' || view === 'customers') && (
        <div className="bg-white border-b border-slate-200 p-3 animate-in slide-in-from-top duration-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              autoFocus
              type="text" 
              placeholder="Tìm kiếm nhanh..." 
              className="w-full pl-10 pr-4 py-3 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
        </div>
      )}

      <main className="flex-1 p-4 overflow-x-hidden">
        {view === 'dashboard' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
                <div className="bg-emerald-100 p-3 rounded-2xl mb-2">
                  <Clock className="w-6 h-6 text-emerald-600" />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang cầm</span>
                <span className="text-xl font-black text-slate-800">{stats.activeCount}</span>
              </div>
              <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
                <div className="bg-rose-100 p-3 rounded-2xl mb-2">
                  <AlertTriangle className="w-6 h-6 text-rose-600" />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quá hạn</span>
                <span className="text-xl font-black text-slate-800">{stats.overdueCount}</span>
              </div>
            </div>
            
            <div className="bg-slate-900 p-6 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
              <TrendingUp className="absolute right-[-10px] bottom-[-10px] w-32 h-32 opacity-10" />
              <div className="relative z-10">
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">Tổng dư nợ hiện tại</p>
                <h3 className="text-3xl font-black">{formatVND(stats.totalLoaned)}</h3>
              </div>
            </div>

            <div className="bg-white p-5 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest">Giao dịch gần đây</h4>
                <button onClick={() => setView('contracts')} className="text-[10px] font-black text-emerald-600 uppercase">Tất cả</button>
              </div>
              <div className="space-y-4">
                {contracts.slice(0, 3).map(c => (
                  <div key={c.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">
                      {c.customer.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 leading-none mb-1 truncate pr-2">{c.customer.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{c.device.model}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900">+{formatVND(c.loanAmount)}</p>
                      <StatusBadge status={c.status} />
                    </div>
                  </div>
                ))}
                {contracts.length === 0 && (
                  <div className="py-4 text-center">
                    <p className="text-xs font-bold text-slate-400">Chưa có giao dịch nào</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {(view === 'contracts' || view === 'customer_history') && (
          <div className="space-y-3 pb-20">
            {filteredContracts.map(c => {
              const interest = calculateInterest(c.loanAmount, c.interestRate, c.startDate, c.interestType, c.lastInterestPaidDate, c.residualInterest);
              const overdueDays = calculateDaysBetween(c.dueDate);
              const isOverdue = overdueDays > 0 && c.status === ContractStatus.ACTIVE;

              return (
                <div 
                  key={c.id} 
                  className={`bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden active:scale-[0.98] transition-all ${isOverdue ? 'ring-2 ring-rose-500/20 bg-rose-50/10' : ''}`}
                  onClick={() => setQuickActionModal({ type: 'details', contract: c })}
                >
                  <div className="p-4 flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl flex-shrink-0 ${isOverdue ? 'bg-rose-100 text-rose-600' : 'bg-slate-900 text-white'}`}>
                      {c.customer.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-black text-slate-800 text-base leading-none truncate pr-2">{c.customer.name}</h4>
                        <span className="text-[10px] font-mono font-bold text-slate-400">{c.id}</span>
                      </div>
                      <p className="text-xs text-slate-500 font-bold mb-2 flex items-center gap-1.5 truncate">
                        {c.device.model}
                        {c.isNoPaper && (
                          <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[8px] font-black uppercase flex items-center gap-0.5 whitespace-nowrap">
                            <Zap className="w-2 h-2" /> Ko giấy
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={isOverdue ? ContractStatus.OVERDUE : c.status} />
                        {isOverdue && (
                          <span className="text-[10px] font-black text-rose-600 uppercase bg-rose-100 px-1.5 py-0.5 rounded">Trễ {overdueDays} ngày</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 px-4 py-3 grid grid-cols-2 gap-4 border-t border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Tiền Gốc</span>
                      <span className="text-sm font-black text-slate-900">{formatVND(c.loanAmount)}</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Tiền Lãi</span>
                      <span className="text-sm font-black text-emerald-600">{formatVND(interest)}</span>
                    </div>
                  </div>

                  <div className="bg-white px-4 py-3 flex gap-2 border-t border-slate-50">
                     <button 
                      onClick={(e) => { e.stopPropagation(); setQuickActionModal({ type: 'interest', contract: c }); }}
                      className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                    >
                      <Receipt className="w-3 h-3" /> Đóng lãi gia hạn
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setQuickActionModal({ type: 'redeem', contract: c }); }}
                      className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-3 h-3" /> Chuộc máy
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {view === 'customers' && (
          <div className="grid grid-cols-1 gap-4">
            {sortedCustomers.map(customer => {
              const customerContracts = contracts.filter(c => c.customer.name === customer.name);
              const activeCount = customerContracts.filter(c => c.status === ContractStatus.ACTIVE).length;
              return (
                <div 
                  key={customer.name + customer.phone} 
                  className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4 active:bg-slate-50 transition-colors"
                  onClick={() => viewCustomerHistory(customer)}
                >
                  <div className="w-14 h-14 rounded-[1.2rem] bg-slate-900 text-white flex items-center justify-center font-black text-2xl">
                    {customer.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-slate-800 text-lg leading-none mb-1 truncate">{customer.name}</h3>
                    <p className="text-xs text-slate-400 font-bold flex items-center gap-1"><Phone className="w-3 h-3" /> {customer.phone || 'N/A'}</p>
                  </div>
                  <div className="text-center bg-emerald-50 px-3 py-2 rounded-2xl border border-emerald-100">
                    <p className="text-[9px] font-black text-emerald-600 uppercase mb-0.5">Đang cầm</p>
                    <p className="text-lg font-black text-emerald-700">{activeCount}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300" />
                </div>
              );
            })}
            {sortedCustomers.length === 0 && (
              <div className="py-20 text-center">
                <Users className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <p className="text-sm font-bold text-slate-400 uppercase">Chưa có khách hàng nào</p>
              </div>
            )}
          </div>
        )}

        {view === 'add' && (
          <div className="animate-in slide-in-from-bottom duration-300 pb-10">
             <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-200 relative overflow-hidden">
                <form onSubmit={handleSubmitContract} className="space-y-6">
                  {/* Step 1: Khách hàng */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-emerald-500" />
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Khách hàng</label>
                    </div>
                    <div className="relative">
                      <input 
                        value={formCustomerName}
                        onChange={(e) => { setFormCustomerName(e.target.value); setShowCustomerDropdown(true); }}
                        onFocus={() => setShowCustomerDropdown(true)}
                        required
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-800 text-lg focus:ring-4 focus:ring-emerald-500/10"
                        placeholder="Tên khách hàng..."
                      />
                      {showCustomerDropdown && formCustomerName && (
                        <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                          {customerSuggestions.length > 0 ? (
                            <div className="p-1">
                              {customerSuggestions.map(c => (
                                <button key={c.id} type="button" onClick={() => { setFormCustomerName(c.name); setFormCustomerPhone(c.phone); setFormCustomerIdCard(c.idCard); setShowCustomerDropdown(false); }} className="w-full text-left px-5 py-3 rounded-xl hover:bg-emerald-50 flex items-center justify-between group">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-slate-800 text-sm">{c.name}</span>
                                    <span className="text-[10px] text-slate-400 font-bold">{c.phone || 'N/A'}</span>
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-slate-300" />
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="p-4 bg-indigo-50/50 flex items-center justify-between">
                              <span className="text-[10px] font-bold text-indigo-600">Khách mới</span>
                              <button type="button" onClick={() => setShowCustomerDropdown(false)} className="text-[10px] font-black text-indigo-600 border border-indigo-200 px-3 py-1 rounded-lg bg-white">Thêm</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 2: Thiết bị & Tiền */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-emerald-500" />
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thiết bị</label>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={formIsNoPaper} onChange={(e) => setFormIsNoPaper(e.target.checked)} className="w-5 h-5 accent-amber-500 rounded-lg" />
                        <span className="text-[10px] font-black text-amber-600 uppercase">Ko giấy</span>
                      </label>
                    </div>
                    <div className="relative">
                      <input value={formModel} onChange={(e) => setFormModel(e.target.value)} required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-800" placeholder="Model (VD: iPhone 15...)" />
                      <button type="button" onClick={handleValuation} className="absolute right-2 top-2 p-2 bg-emerald-500 text-white rounded-xl shadow-lg text-[10px] font-black flex items-center gap-1">
                        <Tag className={`w-3 h-3 ${isValuating ? 'animate-spin' : ''}`} /> GIÁ AI
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tiền cầm</label>
                      </div>
                      <input value={formLoanAmount} onChange={handleMoneyMask} required className="w-full px-6 py-5 bg-slate-900 border-none rounded-[1.5rem] outline-none font-black text-white text-3xl text-center focus:ring-4 focus:ring-emerald-500/20" />
                    </div>
                  </div>

                  {/* Step 3: Toggle chi tiết */}
                  <div className="pt-2">
                    <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-widest transition-all">
                      {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {showAdvanced ? 'Thu gọn chi tiết' : 'Thông tin chi tiết (Lãi suất, SĐT, Ghi chú...)'}
                    </button>
                    {showAdvanced && (
                      <div className="space-y-4 pt-4 animate-in fade-in duration-300">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase">SĐT KHÁCH</label>
                            <input value={formCustomerPhone} onChange={(e) => setFormCustomerPhone(e.target.value)} type="tel" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase">LÃI (K/1TR)</label>
                            <input value={formInterestRate} onChange={(e) => setFormInterestRate(e.target.value)} type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase">HẠN (NGÀY)</label>
                            <input value={formDuration} onChange={(e) => setFormDuration(e.target.value)} type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase">NGÀY CẦM</label>
                            <input value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} type="date" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase">GHI CHÚ</label>
                          <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-medium resize-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase">CCCD / CMND</label>
                            <input value={formCustomerIdCard} onChange={(e) => setFormCustomerIdCard(e.target.value)} type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase">SỐ IMEI</label>
                            <input value={formImei} onChange={(e) => setFormImei(e.target.value)} type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-xs font-bold" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button type="button" onClick={() => { clearForm(); setView('contracts'); }} className="flex-1 py-4 bg-slate-100 text-slate-400 font-black rounded-2xl uppercase tracking-widest text-xs">Hủy</button>
                    <button type="submit" className="flex-[2] py-4 bg-emerald-500 text-white font-black rounded-2xl uppercase tracking-widest shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 text-xs">
                      <CheckCircle className="w-5 h-5" /> {editingContractId ? 'Cập nhật HD' : 'Xác nhận lập phiếu'}
                    </button>
                  </div>
                </form>
             </div>
          </div>
        )}
      </main>

      {/* QUICK ACTION BOTTOM DRAWER */}
      {quickActionModal.contract && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300 p-4">
          <div className="bg-white w-full rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200 max-h-[90vh] flex flex-col">
            <div className="p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-8 bg-emerald-500 rounded-full"></div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                    {quickActionModal.type === 'interest' ? 'Đóng tiền lãi' : 
                     quickActionModal.type === 'redeem' ? 'Chuộc máy' : 
                     quickActionModal.type === 'add_principal' ? 'Lấy thêm gốc' :
                     quickActionModal.type === 'reduce_principal' ? 'Trả bớt gốc' :
                     'Chi tiết hợp đồng'}
                  </h3>
                </div>
                <button onClick={() => setQuickActionModal({ type: 'details', contract: null })} className="p-2 bg-slate-100 rounded-full">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {quickActionModal.type === 'details' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-100">
                    <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-2xl">
                      {quickActionModal.contract.customer.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-black text-slate-800 truncate">{quickActionModal.contract.customer.name}</h4>
                      <div className="flex items-center gap-2 text-xs text-slate-400 font-bold">
                        <Phone className="w-3 h-3" /> {quickActionModal.contract.customer.phone || 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-emerald-50 p-4 rounded-[2rem] border border-emerald-100">
                      <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Tiền gốc</p>
                      <p className="text-xl font-black text-emerald-700">{formatVND(quickActionModal.contract.loanAmount)}</p>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-[2rem] border border-amber-100">
                      <p className="text-[10px] font-black text-amber-600 uppercase mb-1">Lãi (Đến hôm nay)</p>
                      <p className="text-xl font-black text-amber-700">
                        {formatVND(calculateInterest(quickActionModal.contract.loanAmount, quickActionModal.contract.interestRate, quickActionModal.contract.startDate, quickActionModal.contract.interestType, quickActionModal.contract.lastInterestPaidDate, quickActionModal.contract.residualInterest))}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setQuickActionModal({ ...quickActionModal, type: 'add_principal' })} className="py-3.5 bg-slate-900 text-white font-black rounded-2xl uppercase text-[10px] flex items-center justify-center gap-2">
                      <Plus className="w-4 h-4 text-emerald-400" /> Lấy thêm gốc
                    </button>
                    <button onClick={() => setQuickActionModal({ ...quickActionModal, type: 'reduce_principal' })} className="py-3.5 bg-slate-900 text-white font-black rounded-2xl uppercase text-[10px] flex items-center justify-center gap-2">
                      <Minus className="w-4 h-4 text-rose-400" /> Trả bớt gốc
                    </button>
                  </div>

                  <div className="space-y-2">
                    <button onClick={() => setQuickActionModal({ ...quickActionModal, type: 'interest' })} className="w-full py-4 bg-emerald-500 text-white font-black rounded-2xl uppercase text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                      <Receipt className="w-4 h-4" /> Đóng lãi gia hạn
                    </button>
                    <button onClick={() => setQuickActionModal({ ...quickActionModal, type: 'redeem' })} className="w-full py-4 bg-blue-500 text-white font-black rounded-2xl uppercase text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
                      <CheckCircle className="w-4 h-4" /> Chuộc máy
                    </button>
                    <div className="grid grid-cols-3 gap-2">
                      <button onClick={() => startEditing(quickActionModal.contract!)} className="py-3 bg-slate-100 text-slate-600 font-black rounded-xl uppercase text-[9px] flex items-center justify-center gap-1">
                        <Edit2 className="w-3 h-3" /> Sửa
                      </button>
                      <button onClick={() => handleStatusUpdate(quickActionModal.contract!.id, ContractStatus.LIQUIDATED)} className="py-3 bg-amber-50 text-amber-600 font-black rounded-xl uppercase text-[9px] flex items-center justify-center gap-1 border border-amber-100">
                        <TrendingDown className="w-3 h-3" /> T.Lý
                      </button>
                      <button onClick={() => deleteContract(quickActionModal.contract!.id)} className="py-3 bg-rose-50 text-rose-600 font-black rounded-xl uppercase text-[9px] flex items-center justify-center gap-1 border border-rose-100">
                        <Trash2 className="w-3 h-3" /> Hủy
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {quickActionModal.type === 'interest' && (
                <div className="space-y-6">
                  <div className="bg-emerald-50 p-5 rounded-3xl border border-emerald-100 text-center">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Tiền lãi cần thu (Đến nay)</p>
                    <h4 className="text-3xl font-black text-emerald-700">
                      {formatVND(calculateInterest(quickActionModal.contract!.loanAmount, quickActionModal.contract!.interestRate, quickActionModal.contract!.startDate, quickActionModal.contract!.interestType, quickActionModal.contract!.lastInterestPaidDate, quickActionModal.contract!.residualInterest))}
                    </h4>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Số tiền khách đóng</label>
                    <input 
                      autoFocus
                      value={interestPaidAmount} 
                      onChange={(e) => setInterestPaidAmount(formatNumber(Number(e.target.value.replace(/\D/g, ""))))} 
                      className="w-full px-6 py-5 bg-slate-900 border-none rounded-3xl outline-none font-black text-white text-3xl text-center focus:ring-4 focus:ring-emerald-500/20"
                    />
                    <p className="text-[10px] text-slate-400 font-bold italic text-center">
                      Tiền đóng sẽ tự quy đổi ra số ngày gia hạn. Tiền lẻ dư sẽ cộng dồn.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setQuickActionModal({ ...quickActionModal, type: 'details' })} className="flex-1 py-5 bg-slate-100 text-slate-400 font-black rounded-3xl uppercase tracking-widest text-sm">Hủy</button>
                    <button 
                      onClick={() => handlePayInterest(quickActionModal.contract!.id)} 
                      className="flex-[2] py-5 bg-emerald-500 text-white font-black rounded-3xl uppercase tracking-widest shadow-xl shadow-emerald-500/30 text-sm"
                    >
                      Xác nhận đóng lãi
                    </button>
                  </div>
                </div>
              )}

              {(quickActionModal.type === 'add_principal' || quickActionModal.type === 'reduce_principal') && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Số tiền {quickActionModal.type === 'add_principal' ? 'lấy thêm' : 'trả bớt'}</label>
                    <input 
                      autoFocus
                      value={principalAdjustAmount} 
                      onChange={(e) => setPrincipalAdjustAmount(formatNumber(Number(e.target.value.replace(/\D/g, ""))))} 
                      className="w-full px-6 py-5 bg-slate-900 border-none rounded-3xl outline-none font-black text-white text-3xl text-center"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setQuickActionModal({ ...quickActionModal, type: 'details' })} className="flex-1 py-5 bg-slate-100 text-slate-400 font-black rounded-3xl uppercase tracking-widest text-sm">Hủy</button>
                    <button 
                      onClick={() => handleAdjustPrincipal(quickActionModal.contract!.id, quickActionModal.type === 'add_principal' ? 'add' : 'reduce')} 
                      className={`flex-[2] py-5 text-white font-black rounded-3xl uppercase tracking-widest shadow-xl text-sm ${quickActionModal.type === 'add_principal' ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-rose-500 shadow-rose-500/30'}`}
                    >
                      Xác nhận
                    </button>
                  </div>
                </div>
              )}

              {quickActionModal.type === 'redeem' && (
                <div className="space-y-4">
                  <div className="py-10 bg-blue-50 rounded-[2rem] border border-blue-100 text-center">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Tổng gốc + lãi chuộc</p>
                    <h4 className="text-4xl font-black text-blue-700">
                      {formatVND(quickActionModal.contract.loanAmount + calculateInterest(quickActionModal.contract.loanAmount, quickActionModal.contract.interestRate, quickActionModal.contract.startDate, quickActionModal.contract.interestType, quickActionModal.contract.lastInterestPaidDate, quickActionModal.contract.residualInterest))}
                    </h4>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setQuickActionModal({ ...quickActionModal, type: 'details' })} className="flex-1 py-5 bg-slate-100 text-slate-400 font-black rounded-3xl uppercase tracking-widest text-sm">Quay lại</button>
                    <button onClick={() => handleStatusUpdate(quickActionModal.contract!.id, ContractStatus.REDEEMED)} className="flex-[2] py-5 bg-blue-500 text-white font-black rounded-3xl uppercase tracking-widest shadow-xl shadow-blue-500/30 text-sm">Xác nhận chuộc</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-2 flex items-center justify-around z-50 shadow-lg">
        <button onClick={() => setView('dashboard')} className={`flex flex-col items-center gap-1 flex-1 transition-colors ${view === 'dashboard' ? 'text-emerald-500' : 'text-slate-400'}`}>
          <LayoutDashboard className="w-6 h-6" />
          <span className="text-[9px] font-black uppercase">Tổng quan</span>
        </button>
        <button onClick={() => setView('contracts')} className={`flex flex-col items-center gap-1 flex-1 transition-colors ${view === 'contracts' ? 'text-emerald-500' : 'text-slate-400'}`}>
          <History className="w-6 h-6" />
          <span className="text-[9px] font-black uppercase">Sổ Cầm</span>
        </button>
        <button onClick={() => { clearForm(); setView('add'); }} className="flex-1 flex justify-center -mt-8">
           <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-90 ${view === 'add' ? 'bg-slate-900 text-emerald-400' : 'bg-emerald-500 text-white'}`}>
             <PlusCircle className="w-8 h-8" />
           </div>
        </button>
        <button onClick={() => setView('customers')} className={`flex flex-col items-center gap-1 flex-1 transition-colors ${view === 'customers' ? 'text-emerald-500' : 'text-slate-400'}`}>
          <Contact2 className="w-6 h-6" />
          <span className="text-[9px] font-black uppercase">Khách</span>
        </button>
        <button onClick={() => alert('Báo cáo thống kê sẽ cập nhật ở bản sau')} className="flex flex-col items-center gap-1 flex-1 text-slate-400 transition-colors">
          <BarChart3 className="w-6 h-6" />
          <span className="text-[9px] font-black uppercase">Thống kê</span>
        </button>
      </nav>
      
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default App;
