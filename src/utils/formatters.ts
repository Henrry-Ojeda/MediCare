export function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatVes(amount: number): string {
  return `Bs. ${amount.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function calculateAgeInMonths(birthDateStr: string): number {
  const birth = new Date(birthDateStr);
  const now = new Date();
  return Math.max(
    0,
    (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  );
}

export function calculateBmi(weightKg: number, heightCm: number): number {
  const heightMeters = heightCm / 100;
  if (heightMeters <= 0) return 0;
  return Number((weightKg / (heightMeters * heightMeters)).toFixed(1));
}

