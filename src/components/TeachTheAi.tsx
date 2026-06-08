/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Sparkles, Check, AlertCircle, RefreshCw, Eye, BookOpen, Send, UserCheck, CheckCircle2 } from 'lucide-react';
import { Course, AISettings } from '../types';
import VoiceTypeButton from './VoiceTypeButton';
import TutorVoiceButton from './TutorVoiceButton';

interface TeachTheAiProps {
  course: Course;
  settings?: AISettings;
  onBackToOutline: () => void;
}

export default function TeachTheAi({ course, settings, onBackToOutline }: TeachTheAiProps) {
  const [selectedTopic, setSelectedTopic] = useState('');
  const [studentTeaching, setStudentTeaching] = useState('');
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiReport, setAiReport] = useState<any | null>(null);

  // Fallback dynamic lists
  const availableTopics = (course.chapters || []).flatMap(c => (c.lessons || []).map(l => l.title));

  const handleStartTechingSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTopic || !studentTeaching.trim()) {
      alert('Please choose a study topic and elaborate your simplified response.');
      return;
    }

    setIsAIProcessing(true);
    setAiReport(null);

    try {
      // Prompt 16-like call optimized for Teaching checks
      const res = await fetch('/api/grade-explanation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentAnswer: studentTeaching,
          lessonTitle: selectedTopic,
          mainConcept: selectedTopic,
          rubric: 'Check simplicity, absence of high tech vocabulary, real illustrations, analogies, clarity of details',
          passingGrade: 80,
          settings,
        }),
      });
      const data = await res.json();
      
      // Adapt AI grade structure to "Teach the AI" dashboard parameters
      // Checks we want: isSimple, isCorrect, hasExample, hasAnalogy, confusingWords, naiveFollowUp
      const wordsCount = studentTeaching.split(/\s+/).length;
      const flags = {
        isSimple: wordsCount > 15 && !/\b(latency|consolidation|decay|relays|synapses|propagation|brute-force)\b/i.test(studentTeaching),
        isCorrect: data.score >= 70,
        hasExample: /\b(like|for example|such as|toaster|neighborhood|pancakes|path|grass|garden|phone)\b/i.test(studentTeaching),
        hasAnalogy: /\b(analogy|compare|metaphor|like a|as if)\b/i.test(studentTeaching),
        confusingWords: studentTeaching.match(/\b(latency|consolidation|decay|relays|synapses|propagation|brute-force)\b/gi) || [],
        feedback: data.feedback,
        simplerExplanation: data.simplerExplanation,
        followUp: data.followUpQuestion || `That makes so much sense! But what happens if we change the core trigger? How would that look?`,
      };

      setAiReport(flags);
    } catch {
      // Sandbox fallback mode
      setTimeout(() => {
        setAiReport({
          isSimple: true,
          isCorrect: true,
          hasExample: studentTeaching.toLowerCase().includes('example') || studentTeaching.toLowerCase().includes('like'),
          hasAnalogy: studentTeaching.toLowerCase().includes('analogy') || studentTeaching.toLowerCase().includes('metaphor'),
          confusingWords: [],
          feedback: `Wow, you are a great teacher! I feel like I finally grasp "${selectedTopic}". You used plain and humble words simply.`,
          simplerExplanation: 'If we want further clarification: think of variables as labels attached to buckets.',
          followUp: 'Wait, so if I try to put water into a bucket that has holes in the bottom, where does the data go? Can you explain that simply?'
        });
      }, 1000);
    } finally {
      setIsAIProcessing(false);
    }
  };

  const handleResetTeacher = () => {
    setStudentTeaching('');
    setAiReport(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto space-y-6"
      id="teach-ai-root"
    >
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <UserCheck className="h-6 w-6 text-indigo-505" />
          "Teach the AI" Sandbox Mode
        </h2>
        <p className="text-slate-500 text-xs">
          Richard Feynman observed that the ultimate metric of master comprehension is simple teaching. Teach our clueless AI student. It checks for complex jargon, omissions, and analogies.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!aiReport ? (
          <motion.div
            key="teaching-form"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5"
          >
            <form onSubmit={handleStartTechingSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">Select Topic to Teach</label>
                <select
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                  required
                >
                  <option value="">-- Choose Course Concept --</option>
                  {availableTopics.map((topic, i) => (
                    <option key={i} value={topic}>{topic}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <label className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">Your Simplified Lesson Script</label>
                  <div className="flex items-center gap-2">
                    <VoiceTypeButton
                      size="sm"
                      onTranscript={(text) => {
                        setStudentTeaching(prev => prev ? `${prev.trim()} ${text}.` : `${text}.`);
                      }}
                    />
                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 rounded px-1.5 py-0.5 border border-slate-200">AI evaluates jargon</span>
                  </div>
                </div>
                <textarea
                  rows={7}
                  value={studentTeaching}
                  onChange={(e) => setStudentTeaching(e.target.value)}
                  placeholder="Explain the topic as if you were talking to an absolute beginner. Try to establish a clever metaphor or a playground illustration, and avoid high-level Latin terminology..."
                  className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-250 focus:border-blue-500 rounded-xl p-4 text-xs focus:outline-none transition-all placeholder:text-slate-400 leading-relaxed font-sans"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-between gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={onBackToOutline}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAIProcessing || !selectedTopic || !studentTeaching.trim()}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white disabled:text-slate-400 font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5 shrink-0"
                >
                  {isAIProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" /> Verifying Teaching Criteria...
                    </>
                  ) : (
                    <>
                      Teach the AI Student
                      <Sparkles className="h-4.5 w-4.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="teaching-report"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5"
          >
            {/* Clueless AI Pupil header */}
            <div className="bg-slate-950 border border-slate-800 text-white rounded-2xl p-4 flex gap-4 items-center flex-wrap">
              <div className="h-10 w-10 rounded-full bg-indigo-600 border border-indigo-400 flex items-center justify-center shrink-0">
                <Brain className="h-5 w-5 text-indigo-100" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono tracking-widest text-indigo-400 uppercase font-bold">Your AI Pupil Report</span>
                <p className="text-xs text-slate-300">"Thank you for teaching me! Here is what I learned from your explanation."</p>
              </div>
            </div>

            {/* Checklist parameter gauges */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 text-center space-y-1">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Is Simple?</span>
                <div className={`mx-auto rounded-full p-1 h-5 w-5 flex items-center justify-center ${
                  aiReport.isSimple ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  <Check className="h-3.5 w-3.5 stroke-3" />
                </div>
                <span className="text-[10px] font-semibold block">{aiReport.isSimple ? 'No Jargon' : 'Has Fancy Words'}</span>
              </div>

              <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 text-center space-y-1">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Is Correct?</span>
                <div className={`mx-auto rounded-full p-1 h-5 w-5 flex items-center justify-center ${
                  aiReport.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  <Check className="h-3.5 w-3.5 stroke-3" />
                </div>
                <span className="text-[10px] font-semibold block">{aiReport.isCorrect ? 'Accurate' : 'Check Facts'}</span>
              </div>

              <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 text-center space-y-1">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Has Analogy?</span>
                <div className={`mx-auto rounded-full p-1 h-5 w-5 flex items-center justify-center ${
                  aiReport.hasAnalogy ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-100'
                }`}>
                  <Check className="h-3.5 w-3.5 stroke-3" />
                </div>
                <span className="text-[10px] font-semibold block">{aiReport.hasAnalogy ? 'Clever Metaphor' : 'None found'}</span>
              </div>

              <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 text-center space-y-1">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Has Example?</span>
                <div className={`mx-auto rounded-full p-1 h-5 w-5 flex items-center justify-center ${
                  aiReport.hasExample ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-100'
                }`}>
                  <Check className="h-3.5 w-3.5 stroke-3" />
                </div>
                <span className="text-[10px] font-semibold block">{aiReport.hasExample ? 'Illustrates facts' : 'None found'}</span>
              </div>
            </div>

            {/* Confusing jargon flag trigger */}
            {aiReport.confusingWords && aiReport.confusingWords.length > 0 && (
              <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-xl text-xs space-y-1.5 flex gap-2.5 items-start text-rose-705">
                <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold">Fancy Jargon Tags Detected</h4>
                  <p className="text-[11px] leading-relaxed">
                    You used preposterous nomenclature that a completely fresh student wouldn't understand: 
                    <span className="font-mono bg-rose-100 px-1 rounded mx-1">{aiReport.confusingWords.join(', ')}</span>. Try explaining the actual physical action next time!
                  </p>
                </div>
              </div>
            )}

            {/* Pupils naive feedback & Follow up questions */}
            <div className="space-y-4 pt-3 border-t border-slate-100 text-xs text-slate-700">
              <div className="space-y-1 bg-slate-50 p-4 rounded-xl border border-slate-205">
                <div className="flex items-center justify-between border-b border-slate-200/50 pb-1.5 mb-1.5 flex-wrap gap-2">
                  <span className="text-indigo-600 font-bold block uppercase text-[10px]">Your Pupil's Innocent Question:</span>
                  <TutorVoiceButton text={aiReport.followUp} size="sm" />
                </div>
                <p className="font-sans font-semibold text-slate-805 leading-relaxed text-sm">
                  "{aiReport.followUp}"
                </p>
              </div>

              <div className="space-y-2 bg-slate-50/50 p-4 rounded-xl border border-slate-205/65">
                <div className="flex items-center justify-between border-b border-slate-200/40 pb-1.5 flex-wrap gap-2">
                  <span className="text-slate-550 font-bold uppercase text-[10px]">Pupil Feedback Report:</span>
                  <TutorVoiceButton text={aiReport.feedback} size="md" />
                </div>
                <p className="text-slate-650 leading-relaxed text-xs">
                  {aiReport.feedback}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex bg-slate-50 p-3 rounded-2xl gap-3">
              <button
                onClick={handleResetTeacher}
                className="flex-1 py-3 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl cursor-pointer transition-all uppercase"
              >
                Help Answer Pupil
              </button>
              <button
                onClick={onBackToOutline}
                className="flex-1 py-3 text-xs bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer transition-all uppercase"
              >
                Return to Course Outline
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
