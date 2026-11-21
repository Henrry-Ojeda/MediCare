export type GeminiModelOption = 'gemini-2.5-flash' | 'gemini-2.0-flash' | 'gemini-1.5-flash';

export interface DoctorAiConfig {
  enabled: boolean;
  apiKey: string;
  model: GeminiModelOption;
  enableDictationAi: boolean;
  enableRecipeVisionAi: boolean;
}

const DEFAULT_AI_CONFIG: DoctorAiConfig = {
  enabled: true,
  apiKey: '',
  model: 'gemini-2.5-flash',
  enableDictationAi: true,
  enableRecipeVisionAi: true,
};

export const getAiConfigKey = (userId?: string) => `medicare_ai_config_${userId || 'default'}`;

export const loadDoctorAiConfig = (userId?: string): DoctorAiConfig => {
  try {
    const raw = localStorage.getItem(getAiConfigKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DoctorAiConfig>;
      return { ...DEFAULT_AI_CONFIG, ...parsed };
    }
  } catch {
    // ignore storage errors
  }
  return { ...DEFAULT_AI_CONFIG };
};

export const saveDoctorAiConfig = (userId: string | undefined, config: DoctorAiConfig) => {
  try {
    localStorage.setItem(getAiConfigKey(userId), JSON.stringify(config));
  } catch {
    // ignore storage errors
  }
};
