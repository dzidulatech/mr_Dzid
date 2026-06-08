/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Mic, AlertCircle } from 'lucide-react';

interface VoiceTypeButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export default function VoiceTypeButton({ onTranscript, className = '', size = 'md' }: VoiceTypeButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recognitionActiveRef = useRef(false);

  // Avoid recreating recognition by keeping onTranscript in a mutable ref
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false; // Focused push-to-dictate trigger
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsRecording(true);
        recognitionActiveRef.current = true;
        setError(null);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          onTranscriptRef.current(transcript);
        }
      };

      rec.onerror = (event: any) => {
        console.warn('Speech recognition warning:', event.error);
        recognitionActiveRef.current = false;
        if (event.error === 'not-allowed') {
          setError('Microphone permission blocked or locked.');
        } else if (event.error === 'no-speech') {
          console.warn('Speech recognition: no speech detected.');
        } else if (event.error === 'aborted') {
          console.log('Speech recognition session aborted.');
        } else {
          setError(`Voice typing error: ${event.error}`);
        }
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
        recognitionActiveRef.current = false;
      };

      setRecognition(rec);

      return () => {
        try {
          rec.abort();
        } catch (e) {
          // ignore
        }
      };
    }
  }, []);

  const toggleRecording = () => {
    if (!recognition) {
      setError('Voice typing not supported in this frame context.');
      return;
    }

    if (isRecording || recognitionActiveRef.current) {
      try {
        recognition.stop();
      } catch (err) {
        console.warn('Speech recognition stop error ignored:', err);
      }
      setIsRecording(false);
      recognitionActiveRef.current = false;
    } else {
      try {
        recognitionActiveRef.current = true;
        recognition.start();
      } catch (err: any) {
        // Handle "already started" or similar browser busy states gracefully
        const errMsg = String(err.message || err);
        if (errMsg.toLowerCase().includes('already started') || errMsg.toLowerCase().includes('already running')) {
          console.warn('Speech recognition was already starting/running, ignoring start command.');
        } else {
          console.warn('Failed to start speech recognition loop safely:', err);
          setError('Recognizer busy. Retry.');
          recognitionActiveRef.current = false;
          setIsRecording(false);
        }
      }
    }
  };

  if (!recognition) {
    return null; // Gracefully hide button if browser features are unavailable
  }

  return (
    <div className="relative inline-flex items-center gap-1.5" id="voice-typer-control">
      <button
        type="button"
        onClick={toggleRecording}
        title={isRecording ? "Stop voice typing" : "Dictate with your voice"}
        className={`relative flex items-center justify-center rounded-lg transition-all duration-200 cursor-pointer ${
          isRecording
            ? 'bg-rose-500 text-white animate-pulse shadow-sm ring-2 ring-rose-300 dark:ring-rose-950'
            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
        } ${size === 'sm' ? 'h-7 w-7 p-1' : 'h-8.5 w-8.5 p-2'} ${className}`}
      >
        <Mic className={`h-4 w-4 ${isRecording ? 'scale-110' : ''}`} />
      </button>

      {isRecording && (
        <span className="text-[10px] font-mono text-rose-500 dark:text-rose-450 font-bold animate-pulse">
          Listening...
        </span>
      )}

      {error && (
        <span className="absolute bottom-full mb-2 right-0 z-50 whitespace-nowrap bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-lg flex items-center gap-1.5 border border-slate-750">
          <AlertCircle className="h-3 w-3 text-rose-400 shrink-0" />
          <span>{error}</span>
          <button 
            type="button" 
            onClick={() => setError(null)} 
            className="ml-1 text-slate-400 hover:text-white font-bold font-mono cursor-pointer"
          >
            ×
          </button>
        </span>
      )}
    </div>
  );
}
