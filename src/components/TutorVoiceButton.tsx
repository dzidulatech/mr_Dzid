/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Pause, Play, Square, Settings } from 'lucide-react';

interface TutorVoiceButtonProps {
  text: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Global reference to currently active utterance or cancellation function to avoid overlapping speak.
let globalStopActiveUtterance: (() => void) | null = null;

export default function TutorVoiceButton({ text, size = 'md', className = '' }: TutorVoiceButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0); // Allow rate control for accessible learners
  const [showRateMenu, setShowRateMenu] = useState(false);
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Clean the text to optimize it for voice readouts (removing markdown, emojis, bracket markup, etc.)
  const cleanTextForSpeech = (rawText: string): string => {
    if (!rawText) return '';
    let clean = rawText
      .replace(/#{1,6}\s+/g, '') // strip headers markdown
      .replace(/\*{1,3}/g, '') // strip bold/italics markers
      .replace(/_([^_]+)_/g, '$1') // strip underlines
      .replace(/`([^`]+)`/g, '$1') // strip backticks
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // strip links, keep anchor text
      // Strip popular emojis that make voice synthesis sound robotic or skip randomly
      .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '');

    return clean.trim();
  };

  const handleStop = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsPaused(false);
    if (globalStopActiveUtterance === handleStop) {
      globalStopActiveUtterance = null;
    }
  };

  useEffect(() => {
    // Cleanup if component unmounts while speaking
    return () => {
      if (globalStopActiveUtterance === handleStop) {
        handleStop();
      }
    };
  }, []);

  const handleToggleSpeak = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.warn('Speech synthesis is not supported in this environment.');
      return;
    }

    if (isPlaying) {
      if (isPaused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
      } else {
        window.speechSynthesis.pause();
        setIsPaused(true);
      }
      return;
    }

    // Stop whatever else is speaking in the app first
    if (globalStopActiveUtterance) {
      globalStopActiveUtterance();
    }

    const cleanBody = cleanTextForSpeech(text);
    if (!cleanBody) return;

    // Create a new synthesis utterance
    const utterance = new SpeechSynthesisUtterance(cleanBody);
    
    // Choose a premium voice if available
    const voices = window.speechSynthesis.getVoices();
    // Default to a premium-sounding English voice
    const chosenVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Premium'))) 
      || voices.find(v => v.lang.startsWith('en')) 
      || voices[0];
    
    if (chosenVoice) {
      utterance.voice = chosenVoice;
    }

    utterance.rate = speechRate;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
      if (globalStopActiveUtterance === handleStop) {
        globalStopActiveUtterance = null;
      }
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis utterance encountered a state anomaly:', e);
      setIsPlaying(false);
      setIsPaused(false);
      if (globalStopActiveUtterance === handleStop) {
        globalStopActiveUtterance = null;
      }
    };

    utteranceRef.current = utterance;
    globalStopActiveUtterance = handleStop;

    window.speechSynthesis.speak(utterance);
    
    // Fallback for browsers that fail to trigger onstart immediately
    setTimeout(() => {
      if (window.speechSynthesis.speaking && !isPlaying) {
        setIsPlaying(true);
      }
    }, 100);
  };

  // Adjust speech speed on key update while speaking
  const handleRateChange = (newRate: number) => {
    setSpeechRate(newRate);
    setShowRateMenu(false);
    if (isPlaying) {
      // Re-trigger current speak with updated speed to prevent disorientation
      const currentText = text;
      handleStop();
      setTimeout(() => {
        // Run with new speed helper
        setSpeechRate(newRate);
        const cleanBody = cleanTextForSpeech(currentText);
        const utterance = new SpeechSynthesisUtterance(cleanBody);
        const voices = window.speechSynthesis.getVoices();
        const chosenVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural'))) || voices.find(v => v.lang.startsWith('en')) || voices[0];
        if (chosenVoice) utterance.voice = chosenVoice;
        utterance.rate = newRate;
        utterance.pitch = 1.0;
        utterance.onstart = () => {
          setIsPlaying(true);
          setIsPaused(false);
        };
        utterance.onend = () => {
          setIsPlaying(false);
          setIsPaused(false);
          globalStopActiveUtterance = null;
        };
        utterance.onerror = () => {
          setIsPlaying(false);
          setIsPaused(false);
          globalStopActiveUtterance = null;
        };
        utteranceRef.current = utterance;
        globalStopActiveUtterance = handleStop;
        window.speechSynthesis.speak(utterance);
      }, 100);
    }
  };

  // Choose styling depending on sizes
  if (size === 'sm') {
    return (
      <div className={`inline-flex items-center gap-1 shrink-0 ${className}`} id="tutor-voice-sm-wrapper">
        <button
          type="button"
          onClick={handleToggleSpeak}
          title={isPlaying ? (isPaused ? "Resume speaking" : "Pause tutor voice") : "Listen to this message"}
          className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
            isPlaying
              ? (isPaused ? 'bg-amber-100 dark:bg-amber-950 text-amber-700' : 'bg-blue-600 text-white animate-pulse shadow-sm')
              : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-705 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          {isPlaying ? (
            isPaused ? (
              <Play className="h-3 w-3 fill-current" />
            ) : (
              <Pause className="h-3 w-3 fill-current" />
            )
          ) : (
            <Volume2 className="h-3.5 w-3.5" />
          )}
        </button>

        {isPlaying && (
          <button
            type="button"
            onClick={handleStop}
            title="Stop speaking"
            className="h-7 w-7 rounded-lg flex items-center justify-center bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 text-rose-600 hover:text-rose-700 transition-all cursor-pointer"
          >
            <Square className="h-3 w-3 fill-current" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`relative inline-flex items-center gap-2 ${className}`} id="tutor-voice-panel-wrapper">
      <div className="flex items-center bg-slate-100 hover:bg-slate-150 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl p-1 shadow-2xs border border-slate-200/55 dark:border-slate-850">
        <button
          type="button"
          onClick={handleToggleSpeak}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            isPlaying
              ? 'bg-blue-600 text-white shadow-sm font-extrabold shadow-blue-500/10'
              : 'text-slate-700 dark:text-slate-300 hover:text-slate-900'
          }`}
          title={isPlaying ? "Pause or Resume Voice Feed" : "Click to hear the simplified study guide read aloud"}
          id="speak-aloud-primary-btn"
        >
          {isPlaying ? (
            isPaused ? (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Resume Voice</span>
              </>
            ) : (
              <>
                <Pause className="h-3.5 w-3.5 fill-current animate-bounce" />
                <span>Pause Voice</span>
              </>
            )
          ) : (
            <>
              <Volume2 className="h-3.5 w-3.5" />
              <span>Hear Aloud</span>
            </>
          )}
        </button>

        {isPlaying && (
          <button
            type="button"
            onClick={handleStop}
            className="p-1.5 hover:bg-rose-100/60 dark:hover:bg-rose-950/30 text-rose-500 hover:text-rose-600 rounded-lg transition-all cursor-pointer mr-0.5"
            title="Stop speech"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
          </button>
        )}

        {/* Speed Adjustment Controls */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowRateMenu(!showRateMenu)}
            title="Configure Tutor Voice Rate"
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-650 text-slate-500 dark:text-slate-400 hover:text-slate-700 rounded-lg transition-all cursor-pointer"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>

          {showRateMenu && (
            <div className="absolute right-0 bottom-full mb-2 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-2 w-28 text-left space-y-1">
              <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 block px-1.5 py-0.5 font-mono">Tutor Speed</span>
              {[0.8, 1.0, 1.25, 1.5].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => handleRateChange(rate)}
                  className={`w-full text-left px-2 py-1 rounded text-xs font-medium cursor-pointer flex items-center justify-between ${
                    speechRate === rate 
                      ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-450'
                  }`}
                >
                  <span>{rate}x</span>
                  {speechRate === rate && <span className="h-1.5 w-1.5 rounded-full bg-blue-505" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {isPlaying && !isPaused && (
        <div className="hidden sm:flex items-end gap-0.5 h-3 px-1 animate-pulse" id="tutor-voice-soundwave">
          <span className="w-0.5 bg-blue-500 h-2.5 animate-bounce" style={{ animationDelay: '0.1s' }} />
          <span className="w-0.5 bg-blue-400 h-3 animate-bounce" style={{ animationDelay: '0.3s' }} />
          <span className="w-0.5 bg-blue-600 h-1.5 animate-bounce" style={{ animationDelay: '0.2s' }} />
          <span className="w-0.5 bg-blue-500 h-3 animate-bounce" style={{ animationDelay: '0s' }} />
          <span className="w-0.5 bg-blue-300 h-2 animate-bounce" style={{ animationDelay: '0.4s' }} />
        </div>
      )}
    </div>
  );
}
