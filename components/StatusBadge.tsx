
import React from 'react';
import { ContractStatus } from '../types.ts';
import { Clock, AlertTriangle, CheckCircle, TrendingDown, HelpCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: ContractStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getConfig = () => {
    switch (status) {
      case ContractStatus.ACTIVE:
        return { 
          classes: 'bg-emerald-100 text-emerald-700 border-emerald-200',
          icon: Clock
        };
      case ContractStatus.OVERDUE:
        return { 
          classes: 'bg-rose-100 text-rose-700 border-rose-200',
          icon: AlertTriangle
        };
      case ContractStatus.REDEEMED:
        return { 
          classes: 'bg-blue-100 text-blue-700 border-blue-200',
          icon: CheckCircle
        };
      case ContractStatus.LIQUIDATED:
        return { 
          classes: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: TrendingDown
        };
      default:
        return { 
          classes: 'bg-gray-100 text-gray-700 border-gray-200',
          icon: HelpCircle
        };
    }
  };

  const { classes, icon: Icon } = getConfig();

  return (
    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border flex items-center gap-1 w-fit ${classes}`}>
      <Icon className="w-2.5 h-2.5" />
      {status}
    </span>
  );
};

export default StatusBadge;
