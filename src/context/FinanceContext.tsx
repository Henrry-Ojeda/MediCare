import React, { createContext, useContext, useState } from 'react';
import { BcvHistoryEntry, PaymentRecord } from '../types/medical';
import { medicareApi } from '../api/medicareApi';
import { getAuthToken } from '../api/client';

interface FinanceContextValue {
  payments: PaymentRecord[];
  bcvRate: number;
  bcvHistory: BcvHistoryEntry[];
  setPayments: React.Dispatch<React.SetStateAction<PaymentRecord[]>>;
  setBcvRate: React.Dispatch<React.SetStateAction<number>>;
  updateClinicBcvRate: (newRate: number, updatedBy?: string) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextValue | undefined>(undefined);

/**
 * Contexto dedicado de Finanzas / Caja y Tasa BCV (Plan Clínico),
 * desacoplado del núcleo clínico para evitar re-renders globales.
 */
export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [bcvRate, setBcvRate] = useState<number>(64.5);
  const [bcvHistory, setBcvHistory] = useState<BcvHistoryEntry[]>([]);

  const updateClinicBcvRate = async (newRate: number, updatedBy = 'Administrador') => {
    if (!Number.isFinite(newRate) || newRate <= 0) return;
    if (getAuthToken()) {
      await medicareApi.updateBcvRate(newRate).catch(() => null);
    }
    setBcvRate(newRate);
    setBcvHistory((prev) => [
      {
        id: `bcv-${Date.now()}`,
        tasa: newRate,
        origen: updatedBy,
        recordedAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  return (
    <FinanceContext.Provider
      value={{ payments, bcvRate, bcvHistory, setPayments, setBcvRate, updateClinicBcvRate }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) {
    throw new Error('useFinance debe usarse dentro de <FinanceProvider>');
  }
  return ctx;
}
