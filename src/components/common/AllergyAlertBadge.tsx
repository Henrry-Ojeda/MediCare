import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface AllergyAlertBadgeProps {
  allergies: string[];
  compact?: boolean;
}

export const AllergyAlertBadge: React.FC<AllergyAlertBadgeProps> = ({ allergies, compact }) => {
  if (!allergies || allergies.length === 0) {
    if (compact) return null;
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
        Sin alergias conocidas
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-xl bg-rose-50 border border-rose-200 text-[#E11D48] font-bold ${
        compact ? 'px-2.5 py-1 text-[11px]' : 'px-3.5 py-2 text-xs'
      }`}
    >
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      <span>{allergies.join(' · ')}</span>
    </div>
  );
};
