import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Download, ExternalLink, QrCode, Smartphone, Wifi } from 'lucide-react';
import { Modal } from './Modal';

interface MobileAppQrModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NetworkInfoResponse {
  ip: string;
  port: number;
  url: string;
  publicUrl?: string | null;
  apkAvailable?: boolean;
  apkUrl?: string;
  allIps: string[];
}

export const MobileAppQrModal: React.FC<MobileAppQrModalProps> = ({ isOpen, onClose }) => {
  const [appUrl, setAppUrl] = useState<string>('');
  const [apkAvailable, setApkAvailable] = useState(false);
  const [mode, setMode] = useState<'apk' | 'web'>('apk');
  const [allIps, setAllIps] = useState<string[]>([]);
  const [port, setPort] = useState<number>(3010);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const activeTargetUrl =
    mode === 'apk' && apkAvailable && appUrl ? `${appUrl}/descargar` : appUrl;

  useEffect(() => {
    if (!isOpen) return;
    let active = true;

    fetch('/api/system/network-info')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: NetworkInfoResponse | null) => {
        if (!active) return;
        const browserOrigin = typeof window !== 'undefined' ? window.location.origin : '';
        const browserHost = typeof window !== 'undefined' ? window.location.hostname : '';
        const isLocalhost = browserHost === 'localhost' || browserHost === '127.0.0.1';

        if (data) {
          const resolvedUrl =
            data.publicUrl || (!isLocalhost && browserOrigin ? browserOrigin : data.url);
          setAppUrl(resolvedUrl);
          setPort(data.port || 3010);
          setApkAvailable(Boolean(data.apkAvailable));
          setMode(data.apkAvailable ? 'apk' : 'web');
          setAllIps(isLocalhost && Array.isArray(data.allIps) ? data.allIps : []);
        } else if (browserOrigin) {
          setAppUrl(browserOrigin);
          setMode('web');
        }
      })
      .catch(() => {
        if (active && typeof window !== 'undefined') {
          setAppUrl(window.location.origin);
          setMode('web');
        }
      });

    return () => {
      active = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!activeTargetUrl) return;
    let active = true;
    QRCode.toDataURL(activeTargetUrl, {
      width: 240,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [activeTargetUrl]);

  const handleCopy = async () => {
    if (!activeTargetUrl) return;
    try {
      await navigator.clipboard.writeText(activeTargetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Abrir / Instalar App Móvil en el Teléfono"
      subtitle="Escanee el código QR o copie el enlace desde cualquier red (Wi-Fi o datos móviles)"
      maxWidthClass="max-w-md"
    >
      <div className="space-y-4">
        {apkAvailable && (
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setMode('apk')}
              className={`py-2 rounded-lg text-xs font-bold cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                mode === 'apk' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              <Download className="w-3.5 h-3.5" /> Descargar APK (Android)
            </button>
            <button
              type="button"
              onClick={() => setMode('web')}
              className={`py-2 rounded-lg text-xs font-bold cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                mode === 'web' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" /> Versión Web Móvil
            </button>
          </div>
        )}

        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50/80 p-5 space-y-3">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="QR para abrir MediCare en el teléfono"
              className="w-52 h-52 rounded-xl border border-slate-200 bg-white p-2 shadow-xs"
            />
          ) : (
            <div className="w-52 h-52 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-400">
              <QrCode className="w-10 h-10 animate-pulse" />
            </div>
          )}

          <div className="w-full space-y-2">
            <label className="block text-[11px] font-bold text-slate-500 text-center uppercase tracking-wider">
              {mode === 'apk' && apkAvailable
                ? 'Página de descarga MediCare.apk'
                : 'Enlace directo para el teléfono'}
            </label>
            <div className="flex items-center gap-2">
              <a
                href={activeTargetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-3 py-2 rounded-xl border border-sky-200 bg-white text-xs font-mono font-bold text-sky-700 hover:underline truncate flex items-center gap-1.5"
              >
                {mode === 'apk' && apkAvailable ? (
                  <Download className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                ) : (
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                )}
                <span className="truncate">{activeTargetUrl || 'Cargando...'}</span>
              </a>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shrink-0 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          {allIps.length > 1 && (
            <div className="w-full pt-1">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Adaptador de red (si el teléfono no abre el primero, pruebe otro):
              </label>
              <select
                value={appUrl}
                onChange={(e) => setAppUrl(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-mono"
              >
                {allIps.map((ip) => {
                  const candidate = `http://${ip}:${port}`;
                  return (
                    <option key={ip} value={candidate}>
                      {candidate}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>

        <div className="rounded-xl bg-sky-50/70 border border-sky-200 p-3.5 space-y-2 text-xs text-sky-950">
          <p className="font-bold flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-sky-600" /> Cómo instalarla como App en el teléfono:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-[11px] text-sky-900">
            <li className="flex items-start gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
              <span>Si está en servidor en la nube, funciona desde cualquier red (Wi-Fi o datos). En pruebas locales, use el mismo Wi-Fi del equipo.</span>
            </li>
            <li>Escanee el código QR con la cámara del teléfono o abra el enlace de arriba.</li>
            <li>
              En Chrome (Android) o Safari (iPhone), pulse <strong>Compartir / Menú → "Agregar a pantalla de inicio"</strong> para usarla como app instalada.
            </li>
          </ol>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
};
