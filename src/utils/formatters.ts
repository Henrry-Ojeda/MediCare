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
  return new Date().toISOString().slice(0, 10);
}

export function getCurrentTimeLabel(): string {
  return new Date().toLocaleTimeString('es-VE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
