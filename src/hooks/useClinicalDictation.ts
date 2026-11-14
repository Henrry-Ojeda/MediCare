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
  const [speechSupported, setSpeechSupported] = useState<boolean>(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

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

  const stopRecording = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    setIsRecording(false);
    setIsPaused(false);
    setStatus((prev) => (prev === 'listening' ? 'idle' : prev));
  }, []);

  const startRecording = useCallback(() => {
    if (typeof window === 'undefined') return;
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechCtor = w.SpeechRecognition || w.webkitSpeechRecognition;

    setSecondsElapsed(0);
    setIsRecording(true);
    setIsPaused(false);
    setStatus('listening');

    if (!SpeechCtor) {
      // Fallback en navegadores sin Web Speech API: mantiene cronómetro activo para edición manual/demo
      return;
    }

    try {
      const recognition = new SpeechCtor();
      recognition.lang = 'es-ES';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        let finalText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalText += event.results[i][0].transcript + ' ';
          }
        }
        if (finalText.trim()) {
          setTranscript((prev) => `${prev} ${finalText.trim()}`.trim());
        }
      };

      recognition.onerror = () => {
        setIsRecording(false);
        setStatus('idle');
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      // Si el permiso del micrófono falla, sigue permitiendo editar manualmente
    }
  }, []);

  const togglePause = useCallback(() => {
    if (!isRecording) return;
    setIsPaused((prev) => !prev);
  }, [isRecording]);

  const processTranscriptWithAi = useCallback(
    async (params: {
      patientName: string;
      patientAge: string;
      weightKg: number;
    }): Promise<{ source: string; data: DictationAiResult | null }> => {
      stopRecording();
      setStatus('processing');
      try {
        const result = await medicareApi.processConsultationAi({
          transcript,
          patientName: params.patientName,
          patientAge: params.patientAge,
          weightKg: params.weightKg,
          specialty: 'Pediatría',
        });
        if (result?.data) {
          setStatus('completed');
          return { source: result.source || 'gemini', data: result.data as DictationAiResult };
        }
      } catch {
        // Fallback local si no hay API key o conexión
      }
      setStatus('completed');
      return { source: 'local-pediatric-engine', data: null };
    },
    [transcript, stopRecording]
  );

  return {
    isRecording,
    isPaused,
    secondsElapsed,
    status,
    transcript,
    speechSupported,
    setTranscript,
    startRecording,
    stopRecording,
    togglePause,
    processTranscriptWithAi,
  };
}
