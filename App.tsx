
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, PlusCircle, Search, Smartphone, Users, AlertTriangle, 
  CheckCircle, Clock, History, User, Zap, Tag, Edit2, ChevronUp, ChevronDown, 
  ArrowLeft, DollarSign, Trash2, TrendingDown, TrendingUp, ChevronRight, 
  Receipt, Phone, Calendar, X, Save, Activity, Star, RefreshCw, Cloud, Database
} from 'lucide-react';
import { Contract, ContractStatus, Customer, PaymentType, Payment } from './types.ts';
import { formatVND, formatDate, calculateInterest, calculateDaysBetween, formatNumber, parseNumber, removeDiacritics } from './utils/formatters.ts';
import StatusBadge from './components/StatusBadge.tsx';
import { estimateDeviceValue } from './services/geminiService.ts';
import { supabase, isSupabaseConfigured } from './services/supabaseClient.ts';

const CONFIG_KEY = 'pawn_config_v1';
const LOCAL_DATA_KEY = 'pawn_contracts_local_v1';

const App: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // FETCH DATA
  const fetchContracts = async () => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        // CLOUD MODE
        const { data, error } = await supabase
          .from('contracts')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          throw error;
        } else if (data) {
          const mappedData: Contract[] = data.map((item: any) => ({
            id: item.id,
            customer: { id: item.id, name: item.customer_name, phone: item.customer_phone, idCard: item.customer_id_card },
            device: { brand: item.device_brand, model: item.device_model, imei: item.device_imei, condition: item.device_condition, estimatedValue: 0 },
            loanAmount: Number(item.loan_amount),
            interestRate: Number(item.interest_rate),
            interestType: item.interest_type,
            startDate: item.start_date,
            dueDate: item.due_date,
            status: item.status as ContractStatus,
            isNoPaper: item.is_no_paper,
            notes: item.notes,
            payments: item.payments || [],
            residualInterest: Number(item.residual_interest || 0),
            lastInterestPaidDate: item.last_interest_paid_date
          }));
          setContracts(mappedData);
        }
      } else {
        // LOCAL MODE FALLBACK
        const localData = localStorage.getItem(LOCAL_DATA_KEY);
        if (localData) {
          try {
            setContracts(JSON.parse(localData));
          } catch (e) {
            console.error("Lỗi parse dữ liệu LocalStorage:", e);
            setContracts([]);
          }
        } else {
          setContracts([]);
        }
      }
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const saveLocalContracts = (updated: Contract[]) => {
    setContracts(updated);
    try {
      localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Lỗi khi lưu dữ liệu LocalStorage:", e);
    }
  };

  const [view, setView] = useState<'dashboard' | 'contracts' | 'add' | 'customers' | 'customer_history' | 'overdue'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ContractStatus>('ALL');
  const [selectedCustomerIdForHistory, setSelectedCustomerIdForHistory] = useState<string | null>(null);
  const [quickActionModal, setQuickActionModal] = useState<{ type: 'interest' | 'redeem' | 'details' | 'add_principal' | 'reduce_principal', contract: Contract | null }>({ type: 'details', contract: null });
  const [interestPaidAmount, setInterestPaidAmount] = useState('0');

  // Form states
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
    try {
      const saved = localStorage.getItem(CONFIG_KEY);
      return saved ? JSON.parse(saved).rate : '3000';
    } catch {
      return '3000';
    }
  });
  const [formInterestType, setFormInterestType] = useState<'ngày' | 'tháng'>(() => {
    try {
      const saved = localStorage.getItem(CONFIG_KEY);
      return saved ? JSON.parse(saved).type : 'ngày';
    } catch {
      return 'ngày';
    }
  });
  const [formDuration, setFormDuration] = useState(() => {
    try {
      const saved = localStorage.getItem(CONFIG_KEY);
      return saved ? JSON.parse(saved).duration : '30';
    } catch {
      return '30';
    }
  });

  useEffect(() => {
    if (!editingContractId && view === 'add') {
      localStorage.setItem(CONFIG_KEY, JSON.stringify({ rate: formInterestRate, type: formInterestType, duration: formDuration }));
    }
  }, [formInterestRate, formInterestType, formDuration, editingContractId, view]);

  const [isValuating, setIsValuating] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  useEffect(() => {
    if (quickActionModal.type === 'interest' && quickActionModal.contract) {
      const due = calculateInterest(quickActionModal.contract.loanAmount, quickActionModal.contract.interestRate, quickActionModal.contract.startDate, quickActionModal.contract.interestType, quickActionModal.contract.lastInterestPaidDate, quickActionModal.contract.residualInterest);
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
    return uniqueCustomers.filter(c => removeDiacritics(c.name).includes(removeDiacritics(formCustomerName)) || c.phone.includes(formCustomerName)).slice(0, 5);
  }, [formCustomerName, uniqueCustomers]);

  const clearForm = () => {
    const savedConfigString = localStorage.getItem(CONFIG_KEY);
    let config = { rate: '3000', type: 'ngày', duration: '30' };
    try {
      if (savedConfigString) config = JSON.parse(savedConfigString);
    } catch {}
    
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
    setFormInterestType(config.type as 'ngày' | 'tháng');
    setFormDuration(config.duration);
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

  const handleSubmitContract = async (e: React.FormEvent) => {
    e.preventDefault();
    const loan = parseNumber(formLoanAmount);
    const start = new Date(formStartDate);
    start.setDate(start.getDate() + Number(formDuration));
    const dueDate = start.toISOString().split('T')[0];

    const payloadCloud = {
      customer_name: formCustomerName,
      customer_phone: formCustomerPhone,
      customer_id_card: formCustomerIdCard,
      device_brand: formBrand,
      device_model: formModel,
      device_imei: formImei,
      device_condition: formCondition,
      loan_amount: loan,
      interest_rate: Number(formInterestRate),
      interest_type: formInterestType,
      start_date: formStartDate,
      due_date: dueDate,
      is_no_paper: formIsNoPaper,
      notes: formNotes,
    };

    if (isSupabaseConfigured && supabase) {
      if (editingContractId) {
        const { error } = await supabase.from('contracts').update(payloadCloud).eq('id', editingContractId);
        if (error) alert('Lỗi cập nhật Cloud: ' + error.message);
      } else {
        const newId = `HD-${Math.floor(1000 + Math.random() * 9000)}`;
        const { error } = await supabase.from('contracts').insert({ ...payloadCloud, id: newId });
        if (error) alert('Lỗi lưu mới Cloud: ' + error.message);
      }
      fetchContracts();
    } else {
      const newContract: Contract = {
        id: editingContractId || `HD-${Math.floor(1000 + Math.random() * 9000)}`,
        customer: { id: '', name: formCustomerName, phone: formCustomerPhone, idCard: formCustomerIdCard },
        device: { brand: formBrand, model: formModel, imei: formImei, condition: formCondition, estimatedValue: 0 },
        loanAmount: loan,
        interestRate: Number(formInterestRate),
        interestType: formInterestType as 'ngày' | 'tháng',
        startDate: formStartDate,
        dueDate: dueDate,
        status: ContractStatus.ACTIVE,
        isNoPaper: formIsNoPaper,
        notes: formNotes,
        payments: [],
        residualInterest: 0
      };

      let updated;
      if (editingContractId) {
        updated = contracts.map(c => c.id === editingContractId ? { ...c, ...newContract } : c);
      } else {
        updated = [newContract, ...contracts];
      }
      saveLocalContracts(updated);
    }
    
    setView('contracts');
    clearForm();
  };

  const handleStatusUpdate = async (contractId: string, status: ContractStatus) => {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('contracts').update({ status }).eq('id', contractId);
      fetchContracts();
    } else {
      const updated = contracts.map(c => c.id === contractId ? { ...c, status } : c);
      saveLocalContracts(updated);
    }
    setQuickActionModal({ type: 'details', contract: null });
  };

  const handlePayInterest = async (contractId: string) => {
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return;

    const amountPaid = parseNumber(interestPaidAmount);
    if (amountPaid <= 0) return;

    let dailyRate = 0;
    if (contract.interestType === 'ngày') {
      dailyRate = (contract.loanAmount / 1000000) * contract.interestRate;
    } else {
      dailyRate = (contract.loanAmount * (contract.interestRate / 100)) / 30;
    }

    const totalCash = amountPaid + (contract.residualInterest || 0);
    const extensionDays = Math.floor(totalCash / dailyRate);
    const remainingResidual = totalCash % dailyRate;

    const currentDueDate = new Date(contract.dueDate);
    currentDueDate.setDate(currentDueDate.getDate() + extensionDays);
    const newDueDate = currentDueDate.toISOString().split('T')[0];

    const refDate = contract.lastInterestPaidDate || contract.startDate;
    const nextPaidToDate = new Date(refDate);
    nextPaidToDate.setDate(nextPaidToDate.getDate() + Math.max(0, !contract.lastInterestPaidDate ? (extensionDays - 1) : extensionDays));
    const newPaidToDate = nextPaidToDate.toISOString().split('T')[0];

    const newPayment: Payment = {
      id: `PAY-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      amount: amountPaid,
      type: PaymentType.INTEREST,
      note: `Gia hạn ${extensionDays} ngày.`
    };

    if (isSupabaseConfigured && supabase) {
      await supabase.from('contracts').update({
        due_date: newDueDate,
        last_interest_paid_date: newPaidToDate,
        residual_interest: remainingResidual,
        payments: [...(contract.payments || []), newPayment],
        status: ContractStatus.ACTIVE
      }).eq('id', contractId);
      fetchContracts();
    } else {
      const updated = contracts.map(c => c.id === contractId ? {
        ...c,
        dueDate: newDueDate,
        lastInterestPaidDate: newPaidToDate,
        residualInterest: remainingResidual,
        payments: [...(c.payments || []), newPayment],
        status: ContractStatus.ACTIVE
      } : c);
      saveLocalContracts(updated);
    }

    setQuickActionModal({ type: 'details', contract: null });
    setInterestPaidAmount('0');
  };

  const deleteContract = async (id: string) => {
    if (confirm('Xóa vĩnh viễn hợp đồng này?')) {
      if (isSupabaseConfigured && supabase) {
        await supabase.from('contracts').delete().eq('id', id);
        fetchContracts();
      } else {
        const updated = contracts.filter(c => c.id !== id);
        saveLocalContracts(updated);
      }
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
    if (result) setFormLoanAmount(formatNumber(result.suggestedLoan));
    setIsValuating(false);
  };

  const stats = useMemo(() => {
    const active = contracts.filter(c => c.status === ContractStatus.ACTIVE);
    return {
      activeCount: active.length,
      overdueCount: contracts.filter(c => {
        const isExpired = calculateDaysBetween(c.dueDate) > 0;
        return isExpired && (c.status === ContractStatus.ACTIVE || c.status === ContractStatus.OVERDUE);
      }).length,
      totalLoaned: active.reduce((sum, c) => sum + c.loanAmount, 0),
    };
  }, [contracts]);

  const filteredContracts = useMemo(() => {
    let result = contracts;
    if (view === 'customer_history' && selectedCustomerIdForHistory) {
      result = result.filter(c => c.customer.name === selectedCustomerIdForHistory);
    } else if (view === 'overdue') {
      result = result.filter(c => {
        const isExpired = calculateDaysBetween(c.dueDate) > 0;
        return isExpired && (c.status === ContractStatus.ACTIVE || c.status === ContractStatus.OVERDUE);
      });
    }
    if (view === 'contracts' && statusFilter !== 'ALL') {
      result = result.filter(c => statusFilter === ContractStatus.OVERDUE ? (calculateDaysBetween(c.dueDate) > 0 && c.status !== ContractStatus.REDEEMED) : c.status === statusFilter);
    }
    const normSearch = removeDiacritics(searchTerm);
    if (normSearch) {
      result = result.filter(c => removeDiacritics(c.customer.name).includes(normSearch) || removeDiacritics(c.device.model).includes(normSearch) || c.id.toLowerCase().includes(normSearch) || c.customer.phone.includes(normSearch));
    }
    return result;
  }, [searchTerm, contracts, view, selectedCustomerIdForHistory, statusFilter]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-40 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          {view === 'customer_history' ? (
            <button onClick={() => setView('customers')} className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft className="w-6 h-6 text-slate-600" /></button>
          ) : (
            <div className="bg-slate-900 p-1.5 rounded-lg"><Smartphone className="w-5 h-5 text-emerald-400" /></div>
          )}
          <div className="flex flex-col">
            <h1 className="font-black text-lg text-slate-800 tracking-tight leading-none mb-0.5">
              {view === 'dashboard' && 'Tổng quan'} {view === 'contracts' && 'Sổ Cầm Đồ'} {view === 'customers' && 'Khách hàng'}
              {view === 'add' && (editingContractId ? 'Sửa Hợp đồng' : 'Lập HD Mới')} {view === 'customer_history' && 'Lịch sử Khách'}
              {view === 'overdue' && 'Quá Hạn & Thanh Lý'}
            </h1>
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Version: VerPro</span>
              <div className={`flex items-center gap-0.5 px-1 rounded-sm ${isSupabaseConfigured ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                {isSupabaseConfigured ? <Cloud className="w-2 h-2 text-emerald-500" /> : <Database className="w-2 h-2 text-amber-500" />}
                <span className={`text-[7px] font-black uppercase tracking-tighter ${isSupabaseConfigured ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {isSupabaseConfigured ? 'Cloud Sync' : 'Local Mode'}
                </span>
              </div>
            </div>
          </div>
        </div>
        <button onClick={fetchContracts} className={`p-2 rounded-full active:rotate-180 transition-transform ${isLoading ? 'animate-spin' : ''}`}>
          <RefreshCw className="w-5 h-5 text-slate-400" />
        </button>
      </header>

      {(view === 'contracts' || view === 'customers' || view === 'overdue') && (
        <div className="bg-white border-b border-slate-200 p-3 z-30 sticky top-[53px] space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder={view === 'customers' ? "Tên khách, SĐT..." : "Tên, model, mã HD..."} className="w-full pl-10 pr-4 py-3 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          {view === 'contracts' && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {(['ALL', ContractStatus.ACTIVE, ContractStatus.OVERDUE, ContractStatus.LIQUIDATED, ContractStatus.REDEEMED] as const).map(f => (
                <button key={f} onClick={() => setStatusFilter(f)} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase whitespace-nowrap border ${statusFilter === f ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200'}`}>{f === 'ALL' ? 'Tất cả' : f}</button>
              ))}
            </div>
          )}
        </div>
      )}

      <main className="flex-1 p-4 pb-24 overflow-x-hidden overflow-y-auto">
        {isLoading && <div className="flex flex-col items-center justify-center py-20 gap-4"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Đang tải dữ liệu...</p></div>}
        
        {!isLoading && view === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-2 gap-4">
              <div onClick={() => { setView('contracts'); setStatusFilter(ContractStatus.ACTIVE); }} className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col active:scale-95 transition-transform cursor-pointer">
                <div className="bg-emerald-100 w-10 h-10 rounded-2xl flex items-center justify-center mb-3"><Activity className="w-5 h-5 text-emerald-600" /></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Đang cầm</span>
                <span className="text-2xl font-black text-slate-800">{stats.activeCount}</span>
              </div>
              <div onClick={() => setView('overdue')} className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col active:scale-95 transition-transform cursor-pointer">
                <div className="bg-rose-100 w-10 h-10 rounded-2xl flex items-center justify-center mb-3"><AlertTriangle className="w-5 h-5 text-rose-600" /></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Quá hạn</span>
                <span className="text-2xl font-black text-slate-800">{stats.overdueCount}</span>
              </div>
            </div>
            <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
              <TrendingUp className="absolute right-[-10px] bottom-[-10px] w-48 h-48 opacity-5" />
              <div className="relative z-10">
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Tổng dư nợ hiện tại</p>
                <h3 className="text-4xl font-black mb-2">{formatVND(stats.totalLoaned)}</h3>
                <div className={`px-3 py-1 rounded-full border text-[10px] font-black tracking-widest inline-flex items-center gap-2 ${isSupabaseConfigured ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                  {isSupabaseConfigured ? <Zap className="w-3 h-3 fill-emerald-400" /> : <Database className="w-3 h-3" />}
                  {isSupabaseConfigured ? 'VerPro Cloud Active' : 'Local Data Mode'}
                </div>
              </div>
            </div>
          </div>
        )}

        {!isLoading && (view === 'contracts' || view === 'customer_history' || view === 'overdue') && (
          <div className="space-y-4 pb-8 animate-in fade-in duration-300">
            {filteredContracts.length === 0 ? (
              <div className="text-center py-20 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Không có dữ liệu</div>
            ) : filteredContracts.map(c => {
              const interest = calculateInterest(c.loanAmount, c.interestRate, c.startDate, c.interestType, c.lastInterestPaidDate, c.residualInterest);
              const overdueDays = calculateDaysBetween(c.dueDate);
              const isOverdue = overdueDays > 0 && c.status !== ContractStatus.REDEEMED && c.status !== ContractStatus.LIQUIDATED;
              return (
                <div key={c.id} className={`bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden active:shadow-md transition-all cursor-pointer ${isOverdue ? 'ring-2 ring-rose-500/20 bg-rose-50/10' : ''}`}>
                  <div onClick={() => setQuickActionModal({ type: 'details', contract: c })}>
                    <div className="p-4 flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl flex-shrink-0 ${isOverdue ? 'bg-rose-100 text-rose-600' : 'bg-slate-900 text-white'}`}>{c.customer.name.charAt(0)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1"><h4 className="font-black text-slate-800 text-base leading-none truncate pr-2">{c.customer.name}</h4><span className="text-[10px] font-mono font-bold text-slate-400">{c.id}</span></div>
                        <p className="text-xs text-slate-500 font-bold mb-2 flex items-center gap-1.5 truncate">{c.device.model} {c.isNoPaper && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">Ko giấy</span>}</p>
                        <div className="flex items-center gap-3"><StatusBadge status={isOverdue ? ContractStatus.OVERDUE : c.status} />{isOverdue && <span className="text-[10px] font-black text-rose-600 uppercase bg-rose-100 px-1.5 py-0.5 rounded">Trễ {overdueDays} ngày</span>}</div>
                      </div>
                    </div>
                    <div className="bg-slate-50 px-4 py-3 grid grid-cols-2 gap-4 border-t border-slate-100">
                      <div className="flex flex-col"><span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Tiền Gốc</span><span className="text-lg font-black text-slate-900">{formatVND(c.loanAmount)}</span></div>
                      <div className="flex flex-col text-right"><span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Tiền Lãi</span><span className="text-lg font-black text-emerald-600">{formatVND(interest)}</span></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!isLoading && view === 'add' && (
          <div className="animate-in slide-in-from-bottom duration-300 pb-10">
             <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-200 relative overflow-hidden">
                {!isSupabaseConfigured && (
                  <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
                    <Database className="w-5 h-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="text-xs font-black text-amber-700 uppercase tracking-tighter">Chế độ Lưu trữ Nội bộ</p>
                      <p className="text-[10px] text-amber-600 font-medium">Bạn chưa cấu hình Supabase. Dữ liệu sẽ chỉ được lưu trên trình duyệt này.</p>
                    </div>
                  </div>
                )}
                <form onSubmit={handleSubmitContract} className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2"><User className="w-4 h-4 text-emerald-500" /><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Khách hàng</label></div>
                    <div className="relative">
                      <input value={formCustomerName} onChange={(e) => { setFormCustomerName(e.target.value); setShowCustomerDropdown(true); }} onFocus={() => setShowCustomerDropdown(true)} required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-800 text-lg focus:ring-4 focus:ring-emerald-500/10" placeholder="Tên khách hàng..." />
                      {showCustomerDropdown && formCustomerName && (
                        <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                          {customerSuggestions.length > 0 ? (
                            <div className="p-1">{customerSuggestions.map(c => (
                                <button key={c.id} type="button" onClick={() => { setFormCustomerName(c.name); setFormCustomerPhone(c.phone); setFormCustomerIdCard(c.idCard); setShowCustomerDropdown(false); }} className="w-full text-left px-5 py-3 rounded-xl hover:bg-emerald-50 flex items-center justify-between group">
                                  <div className="flex flex-col"><span className="font-bold text-slate-800 text-sm">{c.name}</span><span className="text-[10px] text-slate-400 font-bold">{c.phone || 'N/A'}</span></div><ChevronRight className="w-4 h-4 text-slate-300" /></button>
                              ))}</div>
                          ) : <div className="p-4 bg-indigo-50/50 flex items-center justify-between"><span className="text-[10px] font-bold text-indigo-600">Khách mới</span><button type="button" onClick={() => setShowCustomerDropdown(false)} className="text-[10px] font-black text-indigo-600 border border-indigo-200 px-3 py-1 rounded-lg bg-white">Thêm</button></div>}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Smartphone className="w-4 h-4 text-emerald-500" /><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thiết bị</label></div><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formIsNoPaper} onChange={(e) => setFormIsNoPaper(e.target.checked)} className="w-5 h-5 accent-amber-500 rounded-lg" /><span className="text-[10px] font-black text-amber-600 uppercase">Ko giấy</span></label></div>
                    <div className="relative">
                      <input value={formModel} onChange={(e) => setFormModel(e.target.value)} required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-800" placeholder="Model (VD: iPhone 15...)" />
                      <button type="button" onClick={handleValuation} className="absolute right-2 top-2 p-2 bg-emerald-500 text-white rounded-xl shadow-lg text-[10px] font-black flex items-center gap-1"><Tag className={`w-3 h-3 ${isValuating ? 'animate-spin' : ''}`} /> GIÁ AI</button>
                    </div>
                    <div className="space-y-3"><div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-500" /><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tiền cầm</label></div><input value={formLoanAmount} onChange={handleMoneyMask} required className="w-full px-6 py-5 bg-slate-900 border-none rounded-[1.5rem] outline-none font-black text-white text-3xl text-center focus:ring-4 focus:ring-emerald-500/20" /></div>
                  </div>
                  <div className="pt-2">
                    <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-widest">{showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}{showAdvanced ? 'Thu gọn' : 'Cấu hình chi tiết'}</button>
                    {showAdvanced && (
                      <div className="space-y-4 pt-4 animate-in fade-in duration-300">
                        <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase">SĐT KHÁCH</label><input value={formCustomerPhone} onChange={(e) => setFormCustomerPhone(e.target.value)} type="tel" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm" /></div><div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase">LÃI (K/1TR)</label><input value={formInterestRate} onChange={(e) => setFormInterestRate(e.target.value)} type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm" /></div></div>
                        <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase">HẠN (NGÀY)</label><input value={formDuration} onChange={(e) => setFormDuration(e.target.value)} type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm" /></div><div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase">NGÀY CẦM</label><input value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} type="date" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs" /></div></div>
                      </div>
                    )}
                  </div>
                  <div className="pt-4 flex gap-3"><button type="button" onClick={() => { clearForm(); setView('contracts'); }} className="flex-1 py-4 bg-slate-100 text-slate-400 font-black rounded-2xl uppercase tracking-widest text-xs">Hủy</button><button type="submit" className="flex-[2] py-4 bg-emerald-500 text-white font-black rounded-2xl uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 text-xs active:scale-95 transition-transform"><CheckCircle className="w-5 h-5" /> {editingContractId ? 'Cập Nhật' : 'Xác Nhận'}</button></div>
                </form>
             </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-2 flex items-center justify-around z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-safe">
        <button onClick={() => setView('dashboard')} className={`flex flex-col items-center gap-1 flex-1 ${view === 'dashboard' ? 'text-emerald-500' : 'text-slate-400'}`}><LayoutDashboard className="w-6 h-6" /><span className="text-[9px] font-black uppercase">Home</span></button>
        <button onClick={() => { setView('contracts'); setStatusFilter('ALL'); }} className={`flex flex-col items-center gap-1 flex-1 ${view === 'contracts' ? 'text-emerald-500' : 'text-slate-400'}`}><History className="w-6 h-6" /><span className="text-[9px] font-black uppercase">Sổ Cầm</span></button>
        <button onClick={() => { clearForm(); setView('add'); }} className="flex-1 flex justify-center -mt-8 pointer-events-none"><div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-90 pointer-events-auto ${view === 'add' ? 'bg-slate-900 text-emerald-400' : 'bg-emerald-500 text-white'}`}><PlusCircle className="w-8 h-8" /></div></button>
        <button onClick={() => setView('overdue')} className={`flex flex-col items-center gap-1 flex-1 ${view === 'overdue' ? 'text-emerald-500' : 'text-slate-400'}`}><AlertTriangle className="w-6 h-6" /><span className="text-[9px] font-black uppercase">Quá hạn</span></button>
        <button onClick={() => setView('customers')} className={`flex flex-col items-center gap-1 flex-1 ${view === 'customers' ? 'text-emerald-500' : 'text-slate-400'}`}><Users className="w-6 h-6" /><span className="text-[9px] font-black uppercase">Khách</span></button>
      </nav>

      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }.pb-safe { padding-bottom: env(safe-area-inset-bottom); }.py-4.5 { padding-top: 1.125rem; padding-bottom: 1.125rem; }`}</style>
    </div>
  );
};

export default App;
