export type CalendarSlotInterval = 15 | 30 | 45 | 60;

export interface AgendaPrefs {
  slotInterval: CalendarSlotInterval;
  workingDays: number[];
}

export const WORKING_DAY_OPTIONS = [
  { day: 1, label: 'Lun' },
  { day: 2, label: 'Mar' },
  { day: 3, label: 'Mié' },
  { day: 4, label: 'Jue' },
  { day: 5, label: 'Vie' },
  { day: 6, label: 'Sáb' },
  { day: 0, label: 'Dom' },
];

export const getAgendaPrefsKey = (userId?: string) =>
  `medicare_agenda_prefs_${userId || 'default'}`;

export const loadAgendaPrefs = (userId?: string): AgendaPrefs => {
  try {
    const raw = localStorage.getItem(getAgendaPrefsKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AgendaPrefs>;
      const slotInterval =
        parsed.slotInterval && [15, 30, 45, 60].includes(parsed.slotInterval)
          ? parsed.slotInterval
          : 30;
      const workingDays =
        Array.isArray(parsed.workingDays) && parsed.workingDays.length > 0
          ? parsed.workingDays
          : [1, 2, 3, 4, 5, 6];
      return { slotInterval, workingDays };
    }
  } catch {
    // ignore storage errors
  }
  return { slotInterval: 30, workingDays: [1, 2, 3, 4, 5, 6] };
};

export const saveAgendaPrefs = (userId: string | undefined, prefs: AgendaPrefs) => {
  try {
    localStorage.setItem(getAgendaPrefsKey(userId), JSON.stringify(prefs));
  } catch {
    // ignore storage errors
  }
};
