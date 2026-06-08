/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Award, Brain, Info, Layers, RefreshCw, Star, Flame, Trophy, AlertCircle, FileText, CheckCircle2, Lock } from 'lucide-react';
import { Course, Flashcard, ReviewTask, Badge } from '../types';

interface ProgressTrackerProps {
  course: Course;
  flashcards: Flashcard[];
  reviewSchedule: ReviewTask[];
  onReviewFlashcard: (cardId: string, remembered: boolean) => void;
  onNavigateToReview: (task: ReviewTask) => void;
  reviewStreak: number;
  onSetReviewStreak: (value: number | ((prev: number) => number)) => void;
  badges: Badge[];
  onTriggerUnlockBadge: (badgeId: string) => void;
  onResetBadges: () => void;
  onSetCourseCompleteMock: () => void;
}

export default function ProgressTracker({
  course,
  flashcards,
  reviewSchedule,
  onReviewFlashcard,
  onNavigateToReview,
  reviewStreak,
  onSetReviewStreak,
  badges,
  onTriggerUnlockBadge,
  onResetBadges,
  onSetCourseCompleteMock,
}: ProgressTrackerProps) {
  const [activeTab, setActiveTab] = useState<'metrics' | 'flashcards' | 'notes'>('metrics');
  
  // Flashcard flipped states
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const activeCard = flashcards[currentCardIdx];

  const handleCardRating = (remembered: boolean) => {
    if (activeCard) {
      onReviewFlashcard(activeCard.id, remembered);
      setIsFlipped(false);
      // Advance to next card or loop back
      if (currentCardIdx < flashcards.length - 1) {
        setCurrentCardIdx(currentCardIdx + 1);
      } else {
        setCurrentCardIdx(0);
      }
    }
  };

  // Compute stat sums
  const totalLessons = course.chapters?.reduce((sum, c) => sum + (c.lessons?.length || 0), 0) || 0;
  const completedLessons = course.chapters?.reduce((sum, c) => sum + (c.lessons?.filter(l => l.completed).length || 0), 0) || 0;
  const averageBestScore = Math.floor(
    (course.chapters?.reduce((sum, c) => sum + (c.lessons?.reduce((acc, l) => acc + (l.score || 0), 0) || 0), 0) || 0) / (totalLessons || 1)
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
      id="progress-tracker-root"
    >
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Trophy className="h-6 w-6 text-amber-500" />
          Progress & Spaced Repetition Analytics
        </h2>
        <p className="text-slate-505 text-xs">
          Track active path retention metrics, review generated Leitner flashcards, and schedule recall intervals automatically.
        </p>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 gap-4" id="progress-tab-menu">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`pb-2.5 text-xs font-bold transition-all relative ${
            activeTab === 'metrics' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Study Analytics
          {activeTab === 'metrics' && <motion.div layoutId="track-tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
        </button>
        <button
          onClick={() => setActiveTab('flashcards')}
          className={`pb-2.5 text-xs font-bold transition-all relative ${
            activeTab === 'flashcards' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Spaced Flashcards ({flashcards.length})
          {activeTab === 'flashcards' && <motion.div layoutId="track-tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`pb-2.5 text-xs font-bold transition-all relative ${
            activeTab === 'notes' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Feynman Study Notes
          {activeTab === 'notes' && <motion.div layoutId="track-tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'metrics' && (
          <motion.div
            key="metrics"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {/* Stat Cards */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider block">Completed Pathways</span>
              <div className="text-3xl font-mono font-bold text-slate-905">{completedLessons} / {totalLessons}</div>
              <p className="text-[10px] text-slate-500">Unlocks achieved through proving concept simplicity.</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider block">Average Recall Score</span>
              <div className="text-3xl font-mono font-bold text-emerald-600">{averageBestScore}%</div>
              <p className="text-[10px] text-slate-500">Based on subjective AI grades and written explanation inputs.</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider block">Saved Questions</span>
              <div className="text-3xl font-mono font-bold text-blue-600">
                {(course.weakTopics || []).length} Needed Areas
              </div>
              <p className="text-[10px] text-slate-500">Topics flagged for Leitner spacing cycles.</p>
            </div>

            {/* Spaced repetition schedule trigger widget */}
            <div className="md:col-span-2 bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl p-6 border border-slate-200 space-y-4">
              <h3 className="font-bold text-slate-900 inline-flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                Active Leitner Spaced-Recall Sequences
              </h3>
              
              <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                {reviewSchedule.map((task) => (
                  <div
                    key={task.id}
                    className="bg-white border border-slate-200 rounded-xl p-3 flex justify-between items-center gap-4 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-800">{task.concept}</div>
                      <div className="text-[10px] text-slate-400">Review scheduled: {new Date(task.scheduledDate).toLocaleDateString()}</div>
                    </div>

                    <div>
                      {task.completed ? (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full px-2 py-0.5 text-[10px] font-bold">Consolidated</span>
                      ) : (
                        <button
                          onClick={() => onNavigateToReview(task)}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold shrink-0 shadow-2xs cursor-pointer"
                        >
                          Review Now
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick explanation guide on spaced loops */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="font-semibold text-slate-900 leading-tight inline-flex items-center gap-1.5">
                <Info className="h-4.5 w-4.5 text-blue-500" /> Key Spaced Metrics
              </h3>
              <p className="text-xs text-slate-650 leading-relaxed">
                By prompting written recall at 1, 3, 7, and 14 days, neural cognitive pathways decay slower. If you score low during examinations, study triggers reschedule closer to consolidate correctly.
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 text-[11px] font-mono text-slate-500">
                Weak Topics Redistribution: 1 Day delta
              </div>
            </div>

            {/* Conceptual Mastery Badges Grid */}
            <div className="md:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 inline-flex items-center gap-2">
                    <Award className="h-5 w-5 text-blue-600 animate-pulse" />
                    Conceptual Mastery Badges
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Prove simplifications to the AI tutor or complete spacing cycles to unlock permanent knowledge achievements.
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {badges.map((badge) => {
                  const getBadgeIcon = (name: string) => {
                    if (name === 'Award') return Award;
                    if (name === 'Flame') return Flame;
                    return Trophy;
                  };
                  const IconComponent = getBadgeIcon(badge.iconName);
                  
                  return (
                    <motion.div 
                      key={badge.id}
                      whileHover={{ scale: 1.02 }}
                      className={`relative border rounded-2xl p-4 flex flex-col items-center text-center justify-between transition-all ${
                        badge.unlocked 
                          ? 'bg-blue-50/40 border-blue-200 shadow-xs' 
                          : 'bg-slate-50/50 border-slate-200/60 opacity-60'
                      }`}
                    >
                      {/* Lock status corner indicator */}
                      <span className="absolute top-2.5 right-2.5">
                        {badge.unlocked ? (
                          <span className="flex h-2.5 w-2.5 rounded-full bg-blue-500 animate-ping" />
                        ) : (
                          <Lock className="h-3 w-3 text-slate-400" />
                        )}
                      </span>

                      <div className="space-y-2 flex flex-col items-center">
                        <div className={`p-3 rounded-full ${badge.unlocked ? 'bg-blue-100 text-blue-600 shadow-xs' : 'bg-slate-200/60 text-slate-400'}`}>
                          <IconComponent className="h-6 w-6" />
                        </div>
                        <h4 className="font-bold text-xs text-slate-800 leading-tight">{badge.title}</h4>
                        <p className="text-[10px] text-slate-500 leading-normal">{badge.description}</p>
                      </div>

                      <div className="mt-4 pt-1.5 border-t border-slate-150/65 w-full text-[9px] font-mono">
                        {badge.unlocked ? (
                          <span className="text-blue-600 font-bold uppercase">Unlocked: {badge.unlockedAt}</span>
                        ) : (
                          <span className="text-slate-400 uppercase tracking-wider font-bold">LOCKED</span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Spaced Review Streak Meter Card */}
            <div className="bg-gradient-to-br from-rose-50/60 to-orange-50/40 border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <h3 className="font-bold text-slate-900 inline-flex items-center gap-1.5">
                  <Flame className="h-5 w-5 text-rose-500 animate-bounce" />
                  Spacing Streak Meter
                </h3>
                
                <div className="flex items-center gap-4 bg-white/70 p-3.5 rounded-2xl border border-rose-100/50">
                  <div className="relative">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center text-white font-mono font-bold text-lg shadow-sm ${
                      reviewStreak >= 5 ? 'bg-rose-600 ring-4 ring-rose-200' : 'bg-rose-500'
                    }`}>
                      <Flame className="h-5 w-5 fill-current text-white" />
                    </div>
                    {reviewStreak >= 5 && (
                      <span className="absolute -top-1 -right-1 bg-amber-400 border border-white text-white rounded-full p-0.5 text-[8px] font-bold">
                        <Star className="h-2 w-2 fill-current" />
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="text-xl font-mono font-bold text-slate-900">{reviewStreak} {reviewStreak === 1 ? 'Day' : 'Days'}</div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 font-mono font-sans">Active Review Streak</span>
                  </div>
                </div>

                <p className="text-[10.5px] text-slate-500 leading-relaxed">
                  Your streak represents daily spaced review consistency. Hit a <strong>5-day daily streak</strong> to unlock the <em>Memory Consolidation Dynamo</em> badge and flatten your forgetting decay curve!
                </p>
              </div>

              {/* Sandbox Simulator Controls for checking validation ease */}
              <div className="pt-2.5 border-t border-rose-100/50 space-y-2">
                <span className="text-[8.5px] uppercase font-bold text-rose-500 block tracking-widest font-mono">Sandbox Verification Hub</span>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onSetReviewStreak(prev => Math.min(prev + 1, 10))}
                    className="py-1.5 px-2 bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-[9px] font-bold transition-all shadow-2xs cursor-pointer text-center"
                  >
                    +1 Day Streak
                  </button>
                  <button
                    onClick={onSetCourseCompleteMock}
                    className="py-1.5 px-2 bg-white hover:bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-[9px] font-bold transition-all shadow-2xs cursor-pointer text-center"
                  >
                    Complete Course
                  </button>
                </div>
                
                <button
                  onClick={onResetBadges}
                  className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[9px] font-bold font-mono transition-all cursor-pointer rounded-lg text-center"
                >
                  Reset Spaced Streaks & Badges
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* 3D-Flip flashcard Slider */}
        {activeTab === 'flashcards' && (
          <motion.div
            key="flashcards"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6 max-w-lg mx-auto"
          >
            {flashcards.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 border border-slate-200 rounded-3xl">
                <Layers className="h-8 w-8 text-slate-350 mx-auto mb-2" />
                <p className="text-slate-500 text-xs text-center">No active flashcards generated for this course.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 3D card layout */}
                <div
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="bg-slate-950 border border-slate-800 text-white rounded-3xl relative h-[250px] cursor-pointer shadow-md select-none transform hover:scale-101 active:scale-99 transition-all flex items-center justify-center p-8 text-center"
                >
                  <div className="absolute top-4 left-4 text-[10px] font-mono font-bold text-slate-500 uppercase">
                    Leitner Card {currentCardIdx + 1} of {flashcards.length} • Box {activeCard?.box || 1}
                  </div>

                  <div className="absolute top-4 right-4 text-[9px] bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded font-bold uppercase transition-all">
                    {isFlipped ? 'SHOWING ANSWER' : 'TAP TO REVEAL'}
                  </div>

                  <AnimatePresence mode="wait">
                    {isFlipped ? (
                      <motion.div
                        key="back"
                        initial={{ opacity: 0, rotateY: 90 }}
                        animate={{ opacity: 1, rotateY: 0 }}
                        exit={{ opacity: 0, rotateY: -90 }}
                        className="space-y-2 p-4 text-xs leading-relaxed max-w-sm"
                      >
                        <h4 className="font-bold text-indigo-400 text-sm">Simplification:</h4>
                        <p className="text-slate-200 font-sans">{activeCard?.answer}</p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="front"
                        initial={{ opacity: 0, rotateY: -90 }}
                        animate={{ opacity: 1, rotateY: 0 }}
                        exit={{ opacity: 0, rotateY: 90 }}
                        className="space-y-2 p-4 max-w-sm"
                      >
                        <h4 className="font-mono font-bold text-amber-400 text-xs">Question:</h4>
                        <p className="font-sans font-bold text-slate-100 text-md leading-relaxed">{activeCard?.question}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Rating options */}
                <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 gap-2">
                  <button
                    onClick={() => handleCardRating(false)}
                    className="flex-1 py-3 text-xs bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl font-bold cursor-pointer transition-all uppercase"
                  >
                    Forgot Concept
                  </button>
                  <button
                    onClick={() => handleCardRating(true)}
                    className="flex-1 py-3 text-xs bg-emerald-600 text-white hover:bg-emerald-500 rounded-xl font-bold cursor-pointer transition-all uppercase"
                  >
                    I Remember Simple Metaphor
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Dynamic Study Notes block */}
        {activeTab === 'notes' && (
          <motion.div
            key="notes"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {(course.chapters || []).map((chapter) => (
              <div key={chapter.chapterId} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="font-extrabold text-slate-900 border-b border-slate-100 pb-2 text-sm leading-snug">
                  {chapter.title} Notes
                </h3>
                <p className="text-slate-500 text-xs">{chapter.summary}</p>
                
                <div className="space-y-3 pt-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase">Key Definitions</h4>
                  <div className="space-y-2">
                    {(chapter.lessons || []).flatMap(l => l.keyTerms || []).slice(0, 3).map((term, idx) => (
                      <div key={idx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                        <strong className="text-indigo-600 block">{term}</strong>
                        <span className="text-slate-500 text-[11px]">Core variable representing dynamic pathways of the study scope.</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase">Common Mistakes to Avoid</h4>
                  <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1">
                    {chapter.lessons.flatMap(l => l.commonMisconceptions).slice(0, 2).map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
