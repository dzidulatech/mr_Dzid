/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Brain, Code, ArrowRight, CornerDownRight, HelpCircle, FileText, Send, CheckCircle2, AlertCircle, RefreshCw, Star, ArrowLeft } from 'lucide-react';
import { Lesson, Chapter, StudentQuestion, Course, AISettings } from '../types';
import VoiceTypeButton from './VoiceTypeButton';
import TutorVoiceButton from './TutorVoiceButton';

interface LessonTutorProps {
  course: Course;
  chapter: Chapter;
  lesson: Lesson;
  settings?: AISettings;
  onBackToOutline: () => void;
  onSaveQuestion: (questionText: string, answerText: string) => void;
  onLessonPassed: (lessonId: string, finalScore: number, confidence: number) => void;
}

export default function LessonTutor({
  course,
  chapter,
  lesson,
  settings,
  onBackToOutline,
  onSaveQuestion,
  onLessonPassed,
}: LessonTutorProps) {
  // Tutor Workspace Mode
  const [stage, setStage] = useState<'study' | 'test' | 'feedback'>('study');
  
  // Custom display content in the AI text pane
  const [tutorText, setTutorText] = useState(lesson.simpleExplanation);
  const [tutorSubTitle, setTutorSubTitle] = useState('Simplified Summary');

  // Split side-by-side text viewer toggle (enabled by default)
  const [showSplitView, setShowSplitView] = useState(true);

  // Student Questions section
  const [questionInput, setQuestionInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ sender: 'user' | 'tutor'; text: string }[]>([
    { sender: 'tutor', text: `Hi! I am your Feynman tutor. I have simplified this lesson down to its core mechanism: "${lesson.mainConcept}"\n\nTake a look, or click "Give Analogy" and "Give Example" to analyze it deeper. Feel free to ask me questions anytime! Once you feel comfortable, click **"Test Me"** to explain it back.` }
  ]);
  const [isAsking, setIsAsking] = useState(false);

  // Testing / Written explanation phase
  const [studentAnswer, setStudentAnswer] = useState('');
  const [isGrading, setIsGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState<any>(null);

  // Spaced confidence rating state (shown on pass)
  const [confidence, setConfidence] = useState<number>(4);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  useEffect(() => {
    if (lesson) {
      setTutorText(lesson.simpleExplanation);
      setTutorSubTitle('Simplified Summary');
      setChatHistory([
        { sender: 'tutor', text: `Hi! I am your Feynman tutor. I have simplified this lesson down to its core mechanism: "${lesson.mainConcept}"\n\nTake a look, or click "Give Analogy" and "Give Example" to analyze it deeper. Feel free to ask me questions anytime! Once you feel comfortable, click **"Test Me"** to explain it back.` }
      ]);
      setStudentAnswer('');
      setStage('study');
      setGradeResult(null);
    }
  }, [lesson?.lessonId]);

  // Handle action buttons
  const triggerShowAnalogy = () => {
    setTutorText(lesson.simpleExplanation + `\n\n### 💡 Analogy\n` + lesson.analogy);
    setTutorSubTitle('Feynman Analogy');
  };

  const triggerShowExample = () => {
    setTutorText(lesson.simpleExplanation + `\n\n### 🔧 Real-world Example\n` + lesson.example);
    setTutorSubTitle('Practical Example');
  };

  const triggerExplainAgain = async () => {
    setIsAsking(true);
    try {
      const res = await fetch('/api/answer-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: 'Can you please explain that lesson concept again in an even simpler way? Break it down for a completely new student.',
          lessonContext: lesson,
          chatHistory: [],
          settings,
        }),
      });
      const data = await res.json();
      setTutorText(data.answer);
      setTutorSubTitle('Simpler Explanation');
    } catch {
      setTutorText(lesson.simpleExplanation + '\n\n[Sandbox Reteach] Think of it like a set of building blocks fitting together sequentially. If we omit a single block, the structural integrity collapses.');
    } finally {
      setIsAsking(false);
    }
  };

  // Chat Q&A submitter
  const handleAskQuestion = async (e: FormEvent) => {
    e.preventDefault();
    if (!questionInput.trim()) return;

    const userQ = questionInput.trim();
    setQuestionInput('');
    setChatHistory(prev => [...prev, { sender: 'user', text: userQ }]);
    setIsAsking(true);

    try {
      const res = await fetch('/api/answer-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userQ,
          lessonContext: lesson,
          chatHistory: chatHistory.slice(-6), // Send last 3 back & forths
          settings,
        }),
      });
      const data = await res.json();
      
      setChatHistory(prev => [...prev, { sender: 'tutor', text: data.answer }]);
      
      // Save question records & link to current mind map node
      onSaveQuestion(userQ, data.answer);
    } catch (err) {
      setChatHistory(prev => [...prev, { sender: 'tutor', text: '[Tutor Feedback Error] Could not reach AI server. Try checking connections or key settings.' }]);
    } finally {
      setIsAsking(false);
    }
  };

  // Submit Free-form explanation for evaluation / grading
  const handleSubmitExplanation = async () => {
    if (!studentAnswer.trim() || studentAnswer.trim().split(/\s+/).length < 5) {
      alert('Please write a thorough, detailed explanation of the concept in your own words before submitting.');
      return;
    }

    setIsGrading(true);
    try {
      const res = await fetch('/api/grade-explanation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentAnswer,
          lessonTitle: lesson.title,
          mainConcept: lesson.mainConcept,
          rubric: lesson.feynmanPrompt,
          passingGrade: 80,
          settings,
        }),
      });

      const grading = await res.json();
      setGradeResult(grading);
      setStage('feedback');
    } catch (err) {
      console.error(err);
      alert('AI Grading failed. Retrying fallback calculation.');
    } finally {
      setIsGrading(false);
    }
  };

  // Reset lesson and let user try again
  const handleTryAgain = () => {
    setStudentAnswer('');
    setGradeResult(null);
    setStage('study');
    setTutorText(lesson.simpleExplanation);
    setTutorSubTitle('Simplified Reteach Summary');
  };

  // Finish Lesson on high score
  const handleCompleteLessonAndContinue = () => {
    if (gradeResult && gradeResult.score >= 80) {
      onLessonPassed(lesson.lessonId, gradeResult.score, confidence);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
      id="lesson-workspace"
    >
      {/* Workspace Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 flex-wrap gap-4">
        <button
          onClick={onBackToOutline}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to outline
        </button>

        <div className="text-right">
          <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">{chapter.title}</span>
          <span className="text-sm font-bold text-slate-900 block">{lesson.title}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left column (8 Span): Core Explain text panel */}
        <div className="lg:col-span-7 flex flex-col gap-4 grid-cols-1">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-105 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-xs font-bold text-slate-450 uppercase font-mono tracking-wider">
                    🧪 {tutorSubTitle}
                  </h3>
                  <TutorVoiceButton text={tutorText} size="md" />
                </div>
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                  <button
                    onClick={() => setShowSplitView(false)}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${!showSplitView ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Feynman Only
                  </button>
                  <button
                    onClick={() => setShowSplitView(true)}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${showSplitView ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Side-by-Side
                  </button>
                </div>
              </div>

              {/* Central text display */}
              {showSplitView ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1 select-text">
                  {/* Left Column: Original complex / verbose raw material */}
                  <div className="space-y-3 bg-slate-50/70 border border-slate-150 rounded-2xl p-4 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase font-mono font-bold tracking-tight pb-2 border-b border-slate-200">
                        <FileText className="h-3.5 w-3.5 text-slate-450" />
                        Original Source Excerpt
                      </div>
                      <p className="text-slate-650 leading-relaxed text-xs italic font-medium pr-1">
                        {lesson.originalText || "No original academic excerpt has been indexed for this lesson yet. Try uploading a PDF or web source to map exact technical lines."}
                      </p>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono pt-3 border-t border-slate-100">
                      Complexity Level: Academic Reference
                    </div>
                  </div>

                  {/* Right Column: AI Simplification */}
                  <div className="space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-[10px] text-blue-600 uppercase font-mono font-bold tracking-tight pb-2 border-b border-blue-100">
                        <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                        Feynman Simple Translation
                      </div>
                      <div className="prose prose-sm text-slate-755 max-w-none text-xs leading-relaxed space-y-3 pr-1">
                        {(tutorText || '').split('\n\n').map((paragraph, index) => {
                          if (paragraph.startsWith('###')) {
                            return <h4 key={index} className="font-bold text-slate-950 mt-3 text-xs">{paragraph.replace('###', '').trim()}</h4>;
                          }
                          return <p key={index}>{paragraph}</p>;
                        })}
                      </div>
                    </div>
                    <div className="text-[10px] text-blue-550 font-mono pt-3 border-t border-slate-100">
                      Focus: Jargon-free comprehension mapping
                    </div>
                  </div>
                </div>
              ) : (
                /* Original Feynman Only View */
                <div className="prose prose-sm text-slate-705 max-w-none text-xs leading-relaxed space-y-4 min-h-[180px] select-text">
                  {(tutorText || '').split('\n\n').map((paragraph, index) => {
                    if (paragraph.startsWith('###')) {
                      return <h4 key={index} className="font-bold text-slate-900 mt-4 text-xs">{paragraph.replace('###', '').trim()}</h4>;
                    }
                    return <p key={index}>{paragraph}</p>;
                  })}
                </div>
              )}
            </div>

            {/* Prompt actions footer */}
            <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100 bg-slate-50/10 p-2 rounded-2xl">
              <button
                onClick={triggerShowAnalogy}
                className="bg-white hover:bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-[11px] font-bold text-slate-705 cursor-pointer transition-all flex items-center gap-1"
              >
                💡 Give Analogy
              </button>
              <button
                onClick={triggerShowExample}
                className="bg-white hover:bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-[11px] font-bold text-slate-705 cursor-pointer transition-all flex items-center gap-1"
              >
                🔧 Give Example
              </button>
              <button
                onClick={triggerExplainAgain}
                disabled={isAsking}
                className="bg-white hover:bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-[11px] font-bold text-slate-705 cursor-pointer transition-all flex items-center gap-1"
              >
                <RefreshCw className={`h-3 w-3 ${isAsking ? 'animate-spin' : ''}`} />
                Explain Simpler
              </button>
            </div>
          </div>

          {/* Prompt 15/16 Testing Flow Area */}
          <div className="bg-radial from-slate-900 to-slate-950 text-white rounded-3xl p-6 border border-slate-800 shadow-lg relative overflow-hidden space-y-4">
            <h3 className="font-sans font-bold text-lg tracking-tight inline-flex items-center gap-2">
              <Brain className="h-5.5 w-5.5 text-blue-400" />
              Active Feynman Test-bench
            </h3>

            <AnimatePresence mode="wait">
              {stage === 'study' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Ready to prove your understanding? Feynman's method demonstrates that written elaboration under prompt testing forms the blueprint of permanent knowledge paths.
                  </p>
                  <button
                    onClick={() => setStage('test')}
                    className="cursor-pointer inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs px-5 py-3 rounded-xl transition-all shadow-md shadow-blue-500/10 active:scale-98"
                  >
                    Test My Understanding
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </motion.div>
              )}

              {stage === 'test' && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 text-xs font-medium space-y-1">
                    <span className="text-blue-400 font-bold uppercase block text-[10px]">AI Feynman Tutor Prompt:</span>
                    <p className="italic text-slate-300">"{lesson.feynmanPrompt}"</p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center gap-2">
                      <label className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">Your handwritten explanation</label>
                      <VoiceTypeButton
                        size="sm"
                        onTranscript={(text) => {
                          setStudentAnswer(prev => prev ? `${prev.trim()} ${text}.` : `${text}.`);
                        }}
                      />
                    </div>
                    <textarea
                      rows={5}
                      value={studentAnswer}
                      onChange={(e) => setStudentAnswer(e.target.value)}
                      placeholder="Write your explanation simply, without fancy words, using an analogy or standard real-world mapping to verify complete understanding..."
                      className="w-full bg-slate-850 hover:bg-slate-800 border border-slate-700 focus:border-blue-500 px-4 py-3 rounded-xl text-xs text-slate-100 focus:outline-none transition-all placeholder:text-slate-500"
                    />
                    <div className="text-[10px] text-slate-400 text-right">
                      {studentAnswer.trim().split(/\s+/).filter(Boolean).length} words
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSubmitExplanation}
                      disabled={isGrading || !studentAnswer.trim()}
                      className="cursor-pointer bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white disabled:text-slate-400 font-bold text-xs px-5 py-3.5 rounded-xl transition-all shrink-0 inline-flex items-center gap-1.5"
                    >
                      {isGrading ? (
                        <>
                          <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Evaluating Simple Metaphors...
                        </>
                      ) : (
                        'Submit Explanation'
                      )}
                    </button>
                    <button
                      onClick={() => setStage('study')}
                      className="px-4 py-3 bg-transparent hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold whitespace-nowrap"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}

              {stage === 'feedback' && gradeResult && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-5"
                >
                  <div className="flex justify-between items-center bg-slate-800/40 border border-slate-800 p-4 rounded-2xl flex-wrap gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold font-mono text-slate-450 block">Evaluation Score</span>
                      <div className={`text-4xl font-mono font-black ${
                        gradeResult.score >= 80 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {gradeResult.score}%
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold font-mono text-slate-450 block">Grade Outcome</span>
                      {gradeResult.score >= 80 ? (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4" /> Passed required 80%
                        </div>
                      ) : (
                        <div className="bg-rose-500/15 border border-rose-500/20 text-rose-400 font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                          <AlertCircle className="h-4 w-4" /> Score is below required 80%
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Grading breakdown */}
                  <div className="space-y-3.5 text-xs text-slate-300">
                    <div>
                      <h4 className="font-bold text-slate-100 mb-1">💡 AI Feynman Advisor Remarks:</h4>
                      <p className="text-slate-400 text-xs italic leading-relaxed">"{gradeResult.feedback}"</p>
                    </div>

                    {gradeResult.whatStudentUnderstood && gradeResult.whatStudentUnderstood.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase">Correct mappings you stated:</span>
                        <ul className="list-disc pl-5 text-slate-400 space-y-0.5">
                          {gradeResult.whatStudentUnderstood.map((item: string, i: number) => <li key={i}>{item}</li>)}
                        </ul>
                      </div>
                    )}

                    {gradeResult.missingIdeas && gradeResult.missingIdeas.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-rose-450 uppercase">Important elements you omitted:</span>
                        <ul className="list-disc pl-5 text-slate-400 space-y-0.5">
                          {gradeResult.missingIdeas.map((item: string, i: number) => <li key={i}>{item}</li>)}
                        </ul>
                      </div>
                    )}

                    {gradeResult.misconceptions && gradeResult.misconceptions.length > 0 && (
                      <div className="space-y-1 bg-rose-500/5 border border-rose-500/10 p-3 rounded-xl">
                        <span className="text-[10px] font-bold text-rose-450 uppercase block mb-1">Misconceptions Detected & Corrected:</span>
                        <ul className="list-disc pl-5 text-slate-350 space-y-1">
                          {gradeResult.misconceptions.map((item: string, i: number) => <li key={i}>{item}</li>)}
                        </ul>
                      </div>
                    )}

                    {!gradeResult.passed && gradeResult.simplerExplanation && (
                      <div className="bg-slate-800/80 border border-slate-700/50 p-4 rounded-2xl text-xs text-slate-300 space-y-2">
                        <span className="text-amber-400 font-bold block uppercase text-[10px]">Alternative breakdown explanation:</span>
                        <p className="leading-relaxed font-sans">{gradeResult.simplerExplanation}</p>
                        {gradeResult.followUpQuestion && (
                          <div className="border-t border-slate-705 pt-2 text-[11px] text-blue-300">
                            <strong>Follow-up Focus question:</strong> "{gradeResult.followUpQuestion}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions depending on passing */}
                  <div className="pt-3 border-t border-slate-800">
                    {gradeResult.passed ? (
                      <div className="space-y-4">
                        <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-2xl space-y-2">
                          <span className="text-blue-400 text-[10px] font-bold font-mono uppercase block">CONSOLIDATION TRIGGER</span>
                          <span className="text-xs text-slate-300 block">How confident do you feel teaching this concept back yourself?</span>
                          
                          <div className="flex bg-slate-900 border border-slate-850 p-1.5 rounded-xl justify-between">
                            {[1, 2, 3, 4, 5].map((val) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setConfidence(val)}
                                className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg shrink-0 cursor-pointer transition-all ${
                                  confidence === val ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-450 hover:text-slate-300'
                                }`}
                              >
                                {val}
                                <span className="block text-[8px] opacity-75">
                                  {val === 1 && 'Lost'}
                                  {val === 2 && 'Unsure'}
                                  {val === 3 && 'Okay'}
                                  {val === 4 && 'Confident'}
                                  {val === 5 && 'I Teach It'}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={handleCompleteLessonAndContinue}
                          className="w-full cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3.5 rounded-xl transition-all text-center block"
                        >
                          Complete and Unlock Downstream Lessons
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleTryAgain}
                        className="w-full cursor-pointer bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-3 rounded-xl transition-all"
                      >
                        Try Simplifying Again
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right column (4 Span): Interactive supportive Q&A discussion */}
        <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-3xl p-5 shadow-inner flex flex-col justify-between max-h-[640px]">
          <div className="space-y-4 flex flex-col h-full min-h-0">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider bg-white p-2.5 rounded-xl border border-slate-150 inline-flex items-center gap-2">
              <HelpCircle className="h-4.5 w-4.5 text-blue-600" />
              Tutor Conversation Sandbox
            </h4>

            {/* Message Stack */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[300px]">
              {chatHistory.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2 text-xs ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'tutor' && (
                    <TutorVoiceButton text={msg.text} size="sm" className="mt-1.5" />
                  )}
                  <div
                    className={`p-3.5 rounded-2xl max-w-[80%] leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-none text-right font-medium'
                        : 'bg-white border border-slate-200 text-slate-705 rounded-tl-none font-sans select-text shadow-2xs'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
              {isAsking && (
                <div className="flex gap-2 justify-start items-center text-xs text-slate-400 italic">
                  <div className="h-4 w-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
                  AI Tutor is simplified mapping...
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleAskQuestion} className="mt-4 pt-3 border-t border-slate-200 flex gap-2 items-center">
            <input
              type="text"
              placeholder="Ask: Simpler please? Why does X happen? Give another analogy..."
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              className="flex-1 bg-white border border-slate-200 px-4 py-3 rounded-xl text-xs focus:outline-none focus:border-blue-500 shadow-2xs placeholder:text-slate-400"
            />
            <VoiceTypeButton
              size="md"
              onTranscript={(text) => {
                setQuestionInput(prev => prev ? `${prev.trim()} ${text}` : text);
              }}
            />
            <button
              type="submit"
              disabled={isAsking || !questionInput.trim()}
              className="p-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-100 text-white disabled:text-slate-400 rounded-xl hover:shadow-md cursor-pointer transition-all flex items-center justify-center shrink-0"
            >
              <Send className="h-4.5 w-4.5" />
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
