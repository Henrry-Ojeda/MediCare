const API_SERVER_OVERRIDE_KEY = 'medicare_api_base_url';

function resolveApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '');
  if (envUrl) return envUrl;

  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(API_SERVER_OVERRIDE_KEY)?.trim().replace(/\/$/, '');
      if (saved) return saved;
    } catch {
      // ignore storage errors
    }

    const isCapacitorNative =
      Boolean((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()) ||
      window.location.protocol === 'capacitor:';

    if (isCapacitorNative) {
      return 'http://192.168.1.111:5189/api';
    }

    if (window.location.hostname) {
      return `http://${window.location.hostname}:5189/api`;
    }
  }

  return 'http://localhost:5189/api';
}

const API_BASE_URL = resolveApiBaseUrl();

const TOKEN_STORAGE_KEY = 'medicare_jwt_token';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errPayload = await res.json().catch(() => ({}));
    throw new Error(errPayload?.message || `Error HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

