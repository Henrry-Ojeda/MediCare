export {
  calculateAgeInMonths,
  calculateExactAgeLabel,
  calculateBmi,
} from './pediatricCalculations';

export function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatVes(amount: number): string {
  return `Bs. ${amount.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getCurrentTimeLabel(): string {
  return new Date().toLocaleTimeString('es-VE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
