import React from 'react';
import { Baby, HeartPulse } from 'lucide-react';
import { PerinatalRecord } from '../../../../types/patient.types';

interface PerinatalRecordTabProps {
  perinatal: PerinatalRecord;
}

export const PerinatalRecordTab: React.FC<PerinatalRecordTabProps> = ({ perinatal }) => {
  const items = [
    { label: 'Edad Gestacional', value: `${perinatal.gestationalWeeks} semanas` },
    { label: 'Tipo de Parto', value: perinatal.deliveryType },
    { label: 'APGAR 1 / 5 min', value: `${perinatal.apgar1Min} / ${perinatal.apgar5Min}` },
    { label: 'Peso al Nacer', value: `${perinatal.birthWeightKg} kg` },
    { label: 'Talla al Nacer', value: `${perinatal.birthHeightCm} cm` },
    { label: 'Perímetro Cefálico Nacer', value: `${perinatal.birthHeadCircumferenceCm} cm` },
    { label: 'Grupo Sanguíneo Materno', value: perinatal.maternalBloodType },
    { label: 'Lactancia Materna Exclusiva', value: `${perinatal.exclusiveBreastfeedingMonths} meses` },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
      <div className="flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
          <Baby className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">Antecedentes Perinatales y Neonatales</h2>
          <p className="text-xs text-slate-500">Historia obstétrica y condiciones del nacimiento.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <p className="text-[11px] font-semibold text-slate-500">{item.label}</p>
            <p className="text-sm font-bold text-slate-900 mt-1">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1">
          <HeartPulse className="w-4 h-4 text-rose-500" /> Complicaciones Neonatales
        </p>
        <p className="text-xs text-slate-600">
          {perinatal.neonatalComplications || 'Sin complicaciones neonatales reportadas.'}
        </p>
      </div>
    </div>
  );
};
