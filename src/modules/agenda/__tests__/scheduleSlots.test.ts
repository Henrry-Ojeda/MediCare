import { describe, expect, it } from 'vitest';
import {
  generateTimeSlots,
  isMoreThan24HoursAhead,
  isSlotInPast,
} from '../AppointmentFormModal';

describe('scheduleSlots', () => {
  it('detecta que las 08:00 AM ya pasaron cuando son las 10:00 AM del mismo día', () => {
    const tenAm = new Date(2026, 10, 20, 10, 0, 0);
    expect(isSlotInPast('2026-11-20', '08:00 AM', tenAm)).toBe(true);
    expect(isSlotInPast('2026-11-20', '09:30 AM', tenAm)).toBe(true);
    expect(isSlotInPast('2026-11-20', '10:30 AM', tenAm)).toBe(false);
    expect(isSlotInPast('2026-11-20', '02:00 PM', tenAm)).toBe(false);
  });

  it('genera bloques según intervalo configurado (15, 30, 45, 60 min)', () => {
    expect(generateTimeSlots(60, 8, 10)).toEqual(['08:00 AM', '09:00 AM', '10:00 AM']);
    expect(generateTimeSlots(15, 8, 9)).toEqual([
      '08:00 AM',
      '08:15 AM',
      '08:30 AM',
      '08:45 AM',
      '09:00 AM',
    ]);
  });

  it('detecta citas agendadas con más de 24 horas de anticipación para WhatsApp', () => {
    const tenAm = new Date(2026, 10, 20, 10, 0, 0);
    expect(isMoreThan24HoursAhead('2026-11-21', '09:00 AM', tenAm)).toBe(false);
    expect(isMoreThan24HoursAhead('2026-11-21', '11:00 AM', tenAm)).toBe(true);
    expect(isMoreThan24HoursAhead('2026-11-23', '09:00 AM', tenAm)).toBe(true);
  });
});
