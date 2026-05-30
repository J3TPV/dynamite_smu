// Thin React hook over the Web Speech API (SpeechRecognition). Falls back
// gracefully when the browser doesn't support it (e.g. Firefox) — callers can
// still type commands.

import { useCallback, useEffect, useRef, useState } from 'react';

type SpeechRecognition = any;

function getRecognitionCtor(): (new () => SpeechRecognition) | null {
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export interface SpeechState {
  supported: boolean;
  listening: boolean;
  transcript: string;
  interim: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useSpeech(onFinal?: (text: string) => void): SpeechState {
  const Ctor = getRecognitionCtor();
  const supported = !!Ctor;
  const recRef = useRef<SpeechRecognition | null>(null);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Ctor) return;
    const rec: SpeechRecognition = new Ctor();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (event: any) => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interimText += res[0].transcript;
      }
      if (interimText) setInterim(interimText);
      if (finalText) {
        setTranscript(prev => (prev ? prev + ' ' : '') + finalText.trim());
        setInterim('');
        onFinalRef.current?.(finalText.trim());
      }
    };
    rec.onerror = (e: any) => {
      if (e.error === 'no-speech') setError("Didn't catch that — try again.");
      else if (e.error === 'not-allowed') setError('Microphone access blocked. Allow it in your browser.');
      else setError(`Speech error: ${e.error}`);
      setListening(false);
    };
    rec.onend = () => setListening(false);

    recRef.current = rec;
    return () => {
      try { rec.abort(); } catch { /* noop */ }
      recRef.current = null;
    };
  }, [Ctor]);

  const start = useCallback(() => {
    if (!recRef.current) return;
    setError(null);
    setInterim('');
    try {
      recRef.current.start();
      setListening(true);
    } catch {
      // start() throws if already started; ignore
    }
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setInterim('');
    setError(null);
  }, []);

  return { supported, listening, transcript, interim, error, start, stop, reset };
}
