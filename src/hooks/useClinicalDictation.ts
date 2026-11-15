import { useState, useEffect, useRef, useCallback } from 'react';
import { DictationAiResult } from '../types/consultation.types';
import { medicareApi } from '../api/medicareApi';

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      0: { transcript: string };
    };
  };
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function useClinicalDictation() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'completed'>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [speechSupported, setSpeechSupported] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [micError, setMicError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const isRecordingRef = useRef(false);
  const isPausedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    setSpeechSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  useEffect(() => {
    if (!isRecording || isPaused) return;
    const timer = setInterval(() => setSecondsElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [isRecording, isPaused]);

  const cleanupAudioGraph = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  const stopMediaTracks = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupAudioGraph();
      stopMediaTracks();
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
    };
  }, [cleanupAudioGraph, stopMediaTracks]);

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    isPausedRef.current = false;

    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    recognitionRef.current = null;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }

    cleanupAudioGraph();
    setInterimTranscript('');
    setIsRecording(false);
    setIsPaused(false);
    setStatus((prev) => (prev === 'listening' ? 'idle' : prev));
  }, [cleanupAudioGraph]);

  const startSpeechRecognition = useCallback(() => {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechCtor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechCtor) return;

    try {
      const recognition = new SpeechCtor();
      recognition.lang = 'es-ES';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        let finalText = '';
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const piece = event.results[i][0]?.transcript || '';
          if (event.results[i].isFinal) {
            finalText += piece + ' ';
          } else {
            interim += piece;
          }
        }
        if (finalText.trim()) {
          setTranscript((prev) => `${prev} ${finalText.trim()}`.trim());
        }
        setInterimTranscript(interim.trim());
      };

      recognition.onerror = (event) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setMicError('Permiso de micrófono o reconocimiento de voz bloqueado por el navegador.');
        } else if (event.error === 'audio-capture') {
          setMicError('No se detectó ningún micrófono conectado.');
        } else if (event.error === 'network') {
          setMicError('El audio se está grabando, pero la transcripción automática requiere conexión HTTPS/internet.');
        }
      };

      recognition.onend = () => {
        setInterimTranscript('');
        if (isRecordingRef.current && !isPausedRef.current) {
          try {
            recognition.start();
          } catch {
            // ignore restart error
          }
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      // Fallback: MediaRecorder sigue grabando audio
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (typeof window === 'undefined') return;
    setMicError(null);
    setInterimTranscript('');
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setMicError('Este navegador/contexto no permite acceso al micrófono (use localhost o HTTPS).');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      recorder.onstop = () => {
        if (audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          setAudioUrl(URL.createObjectURL(blob));
        }
        stopMediaTracks();
      };
      recorder.start(250);
      mediaRecorderRef.current = recorder;

      // Medidor visual de nivel de audio en vivo
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        audioContextRef.current = ctx;

        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          if (!isRecordingRef.current) return;
          if (!isPausedRef.current) {
            analyser.getByteFrequencyData(data);
            const avg = data.reduce((a, b) => a + b, 0) / data.length;
            setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
          } else {
            setAudioLevel(0);
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      }

      isRecordingRef.current = true;
      isPausedRef.current = false;
      setSecondsElapsed(0);
      setIsRecording(true);
      setIsPaused(false);
      setStatus('listening');

      startSpeechRecognition();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setMicError(
        msg.toLowerCase().includes('denied') || msg.toLowerCase().includes('permission')
          ? 'Permiso de micrófono denegado. Habilite el micrófono en la barra del navegador.'
          : 'No se pudo iniciar la grabación de audio. Verifique su micrófono.'
      );
      stopMediaTracks();
      cleanupAudioGraph();
      setIsRecording(false);
      setStatus('idle');
    }
  }, [audioUrl, cleanupAudioGraph, startSpeechRecognition, stopMediaTracks]);

  const togglePause = useCallback(() => {
    if (!isRecording) return;
    setIsPaused((prev) => {
      const nextPaused = !prev;
      isPausedRef.current = nextPaused;
      if (mediaRecorderRef.current) {
        try {
          if (nextPaused && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.pause();
          } else if (!nextPaused && mediaRecorderRef.current.state === 'paused') {
            mediaRecorderRef.current.resume();
          }
        } catch {
          // ignore
        }
      }
      if (nextPaused) {
        try {
          recognitionRef.current?.stop();
        } catch {
          // ignore
        }
      } else {
        startSpeechRecognition();
      }
      return nextPaused;
    });
  }, [isRecording, startSpeechRecognition]);

  const processTranscriptWithAi = useCallback(
    async (context: {
      patientName: string;
      patientAge: string;
      weightKg: number;
    }): Promise<{ source: string; data: DictationAiResult | null }> => {
      setStatus('processing');
      try {
        const res = await medicareApi.processConsultationAi({
          transcript,
          patientName: context.patientName,
          patientAge: context.patientAge,
          weightKg: context.weightKg,
          specialty: 'Pediatría',
        });
        setStatus('completed');
        return { source: res.source, data: res.data as DictationAiResult | null };
      } catch {
        setStatus('completed');
        return { source: 'local-clinical-fallback', data: null };
      }
    },
    [transcript]
  );

  return {
    isRecording,
    isPaused,
    secondsElapsed,
    status,
    transcript,
    interimTranscript,
    speechSupported,
    audioUrl,
    audioLevel,
    micError,
    setTranscript,
    startRecording,
    stopRecording,
    togglePause,
    processTranscriptWithAi,
  };
}
