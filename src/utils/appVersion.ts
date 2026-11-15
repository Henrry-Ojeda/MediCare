export const APP_VERSION = '2.4.0';
export const APK_VERSION_CODE = 6;
export const APK_VERSION_NAME = '1.5';

export interface NativeApkUpdateCheck {
  hasUpdate: boolean;
  latestVersionName?: string;
  downloadUrl?: string;
}

function resolveWebOriginForApk(): string {
  const envWeb = import.meta.env.VITE_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
  if (envWeb) return envWeb;
  const envApi = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, '');
  if (envApi) {
    try {
      const u = new URL(envApi);
      return `${u.protocol}//${u.hostname}${u.port === '5189' ? ':3010' : u.port ? `:${u.port}` : ''}`;
    } catch {
      // ignore URL parse error
    }
  }
  return 'http://192.168.1.111:3010';
}

export async function checkNativeApkUpdate(): Promise<NativeApkUpdateCheck> {
  try {
    const origin = resolveWebOriginForApk();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${origin}/api/system/network-info`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { hasUpdate: false };
    const data = (await res.json()) as {
      apkAvailable?: boolean;
      apkVersionCode?: number;
      apkVersionName?: string;
      downloadPageUrl?: string;
    };
    if (
      data.apkAvailable &&
      typeof data.apkVersionCode === 'number' &&
      data.apkVersionCode > APK_VERSION_CODE
    ) {
      return {
        hasUpdate: true,
        latestVersionName: data.apkVersionName || String(data.apkVersionCode),
        downloadUrl: data.downloadPageUrl || `${origin}/descargar`,
      };
    }
    return { hasUpdate: false };
  } catch {
    return { hasUpdate: false };
  }
}

export async function forceAppUpdate(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.update().catch(() => {})));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    // ignore cache cleanup errors
  }
}
