/**
 * Emite un timbre clínico suave usando Web Audio API y vibración en dispositivos móviles.
 */
export function playClinicalChime(variant: 'patient' | 'assistant_urgent' | 'notification' = 'notification'): void {
  try {
    // Vibración en teléfonos móviles / tablets compatibles
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      if (variant === 'assistant_urgent') {
        navigator.vibrate([180, 100, 180, 100, 260]);
      } else {
        navigator.vibrate([120]);
      }
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playTone = (freq: number, startOffset: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + startOffset);
      gain.gain.setValueAtTime(0.08, now + startOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration);
    };

    if (variant === 'assistant_urgent') {
      playTone(659.25, 0, 0.2); // E5
      playTone(880.0, 0.22, 0.25); // A5
      playTone(1046.5, 0.48, 0.35); // C6
    } else if (variant === 'patient') {
      playTone(587.33, 0, 0.18); // D5
      playTone(880.0, 0.18, 0.35); // A5
    } else {
      playTone(783.99, 0, 0.2); // G5
    }
  } catch {
    // Ignorar restricciones de autoplay si el usuario aún no interactuó con la página
  }
}

/**
 * Envía una notificación nativa del navegador / móvil si el usuario concedió permiso.
 */
export function triggerBrowserNotification(title: string, body: string): void {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  } catch {
    // Ignorar en entornos sin soporte
  }
}
