'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type SpeechEngine = {
  start: () => void;
  stop: () => void;
  abort: () => void;
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  error?: string;
};

const getSpeechRecognition = () => {
  if (typeof window === 'undefined') return null;
  const BrowserSpeechRecognition =
    (window as typeof window & {
      webkitSpeechRecognition?: new () => any;
      SpeechRecognition?: new () => any;
    }).webkitSpeechRecognition ||
    (window as typeof window & { SpeechRecognition?: new () => any }).SpeechRecognition;
  if (!BrowserSpeechRecognition) return null;
  return new BrowserSpeechRecognition();
};

export const useSpeechRecognition = (
  onFinalResult?: (transcript: string) => void
): SpeechEngine => {
  const recognitionRef = useRef<any>(null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | undefined>();

  const isSupported = useMemo(() => typeof window !== 'undefined' && !!getSpeechRecognition(), []);

  useEffect(() => {
    if (!isSupported) return;
    const recognition = getSpeechRecognition();
    if (!recognition) return;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let interim = '';
      let finalTranscript = '';

      for (let i = 0; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcriptText = result[0].transcript;
        if (result.isFinal) {
          finalTranscript += transcriptText;
        } else {
          interim += transcriptText;
        }
      }

      setTranscript(finalTranscript || interim);
      if (finalTranscript) {
        onFinalResult?.(finalTranscript.trim());
      }
    };

    recognition.onstart = () => {
      setIsListening(true);
      setError(undefined);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      setError(event.error);
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [isSupported, onFinalResult]);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const abort = useCallback(() => {
    recognitionRef.current?.abort();
    setIsListening(false);
  }, []);

  return {
    start,
    stop,
    abort,
    transcript,
    isListening,
    isSupported,
    error
  };
};
