/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, Unlock, CheckCircle, AlertTriangle, PlayCircle, Eye, HelpCircle, GraduationCap, Award, FileDown } from 'lucide-react';
import { Course, Chapter, Lesson, StudentQuestion } from '../types';
import { exportCourseToPdf } from '../utils/pdfExport';

interface CourseOutlineProps {
  course: Course;
  studentQuestions?: StudentQuestion[];
  onSelectLesson: (chapterId: string, lessonId: string) => void;
  onSelectQuiz: (chapterId: string, lessonId: string) => void;
  onSelectChapterExam: (chapterId: string) => void;
  onSelectFinalExam: () => void;
}

export default function CourseOutline({
  course,
  studentQuestions = [],
  onSelectLesson,
  onSelectQuiz,
  onSelectChapterExam,
  onSelectFinalExam,
}: CourseOutlineProps) {

  const [isExporting, setIsExporting] = useState(false);

  // Check if final exam can be unlocked (all chapters completed)
  const allChaptersPassed = course.chapters?.every(ch => ch.completed) ?? false;

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      // Small timeout to allow the loading spinner to render nicely
      await new Promise((resolve) => setTimeout(resolve, 600));
      exportCourseToPdf(course, studentQuestions);
    } catch (err) {
      console.error('Failed to generate study guide PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.99 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-8"
      id="outline-root"
    >
      {/* Course Info */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6" id="course-outline-banner">
        <div className="space-y-2 flex-1">
          <div className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-md px-2.5 py-0.5 inline-block uppercase">
            {course.difficultyLevel} Level Course
          </div>
          <h1 className="text-2.5xl font-sans font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
            {course.title}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-2xl leading-relaxed">
            {course.summary}
          </p>
        </div>
        
        {/* Progress summary & PDF Export Card */}
        <div className="flex flex-col gap-3 shrink-0 min-w-[240px]">
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 text-center">
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Course Progress</div>
            <div className="text-3xl font-mono font-bold text-emerald-600 dark:text-emerald-400">{course.progress}%</div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium scale-95 origin-center">Understanding unlocks downstream nodes</p>
          </div>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExporting}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed border border-transparent dark:border-slate-300"
            id="download-study-guide-pdf-btn"
          >
            <FileDown className={`h-4 w-4 ${isExporting ? 'animate-bounce' : ''}`} />
            {isExporting ? 'Generating Guide...' : 'Download Study Guide (PDF)'}
          </button>
        </div>
      </div>

      {/* Chapters Outline list */}
      <div className="space-y-6">
        {(course.chapters || []).map((chapter, chIdx) => {
          // A chapter unlocks if it is first path OR the previous chapter's exam was passed
          const isChapterUnlocked = !chapter.locked;

          return (
            <div
              key={chapter.chapterId}
              className={`bg-white border rounded-3xl overflow-hidden transition-all ${
                isChapterUnlocked ? 'border-slate-200 shadow-xs' : 'border-slate-150 opacity-75 bg-slate-50/50'
              }`}
              id={`chapter-card-${chapter.chapterId}`}
            >
              {/* Chapter Header */}
              <div className="border-b border-slate-100 bg-slate-50/50 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest bg-slate-200/50 rounded px-1.5 py-0.5">CH {chIdx + 1}</span>
                    <h3 className="text-lg font-bold text-slate-950 font-sans tracking-tight leading-tight">
                      {chapter.title}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-550 leading-relaxed max-w-3xl">
                    {chapter.summary}
                  </p>
                </div>
                
                {/* Status Indicator */}
                <div className="flex items-center gap-2 font-mono text-xs">
                  {chapter.completed ? (
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4" /> Passed
                    </span>
                  ) : isChapterUnlocked ? (
                    <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
                      <Unlock className="h-3.5 w-3.5" /> Unlocked
                    </span>
                  ) : (
                    <span className="bg-slate-100 text-slate-500 border border-slate-200 px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5" /> Locked
                    </span>
                  )}
                </div>
              </div>

              {/* Lessons inside chapter */}
              <div className="divide-y divide-slate-100 p-4 space-y-2">
                {chapter.lessons.map((lesson, lesIdx) => {
                  const isLessonWeak = course.weakTopics?.includes(lesson.mainConcept) ?? false;
                  const isLessonReviewNeeded = false; // Placeholder if needed

                  // Lock indicator
                  const isUnlocked = !lesson.locked && isChapterUnlocked;

                  // Retrieve lesson style
                  let statusBg = 'bg-white border-slate-200';
                  let statusText = 'text-slate-700';
                  let iconColor = 'text-slate-400';
                  let statusLabel = 'Locked';

                  if (!isUnlocked) {
                    statusBg = 'bg-slate-50/50 border-slate-100 opacity-60';
                    iconColor = 'text-slate-300';
                  } else if (lesson.completed) {
                    statusBg = 'bg-emerald-50/10 border-emerald-150 active:bg-emerald-50/30';
                    statusText = 'text-emerald-950 font-medium';
                    iconColor = 'text-emerald-500';
                    statusLabel = 'Completed';
                  } else if (isLessonWeak) {
                    statusBg = 'bg-rose-50/10 border-rose-250 hover:bg-rose-50/20';
                    iconColor = 'text-rose-500';
                    statusText = 'text-rose-950 font-medium';
                    statusLabel = 'Weak Area';
                  } else {
                    statusBg = 'bg-blue-50/5 border-blue-150 hover:bg-blue-50/15';
                    statusText = 'text-blue-950 font-medium';
                    iconColor = 'text-blue-500';
                    statusLabel = 'Unlocked';
                  }

                  return (
                    <div
                      key={lesson.lessonId}
                      className={`border rounded-2xl p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${statusBg}`}
                      id={`lesson-outline-${lesson.lessonId}`}
                    >
                      <div className="flex gap-4.5 items-start">
                        {/* Circle Status icon */}
                        <div className={`mt-0.5 rounded-full p-2 ${
                          lesson.completed ? 'bg-emerald-100/50' : isUnlocked ? 'bg-blue-100/40' : 'bg-slate-100'
                        }`}>
                          {lesson.completed ? (
                            <CheckCircle className={`h-5 w-5 ${iconColor}`} />
                          ) : isUnlocked ? (
                            <Unlock className={`h-5 w-5 ${iconColor}`} />
                          ) : (
                            <Lock className={`h-5 w-5 ${iconColor}`} />
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold text-slate-400">LES {chIdx + 1}.{lesIdx + 1}</span>
                            <h4 className="font-bold text-slate-900 text-sm tracking-tight">{lesson.title}</h4>
                            {isLessonWeak && (
                              <span className="bg-rose-100 text-rose-700 rounded-sm text-[9px] font-mono px-1 border border-rose-200">Needs Focus</span>
                            )}
                          </div>
                          <p className="text-slate-500 text-xs line-clamp-1">{lesson.mainConcept}</p>
                          {lesson.score > 0 && (
                            <div className="text-[10px] font-mono font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 inline-block">
                              Best Evaluation Grade: {lesson.score}%
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Triggers */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {isUnlocked ? (
                          <>
                            <button
                              onClick={() => onSelectLesson(chapter.chapterId, lesson.lessonId)}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1"
                            >
                              <PlayCircle className="h-4 w-4" />
                              Feynman Tutor
                            </button>
                            <button
                              onClick={() => onSelectQuiz(chapter.chapterId, lesson.lessonId)}
                              className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1"
                            >
                              <HelpCircle className="h-4 w-4 text-slate-400" />
                              Mini Quiz
                            </button>
                          </>
                        ) : (
                          <span className="text-slate-400 text-xs italic flex items-center gap-1 mr-2">
                            <Lock className="h-3 w-3" /> Locked until previous complete
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Chapter Exam block */}
                <div
                  className={`mt-4 border rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                    isChapterUnlocked && !chapter.lessons.some(l => !l.completed)
                      ? 'bg-purple-50/10 border-purple-200'
                      : 'bg-slate-50/30 border-slate-200/50 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`rounded-xl p-2.5 ${
                      chapter.completed ? 'bg-emerald-100/50 text-emerald-600' : 'bg-purple-100/50 text-purple-600'
                    }`}>
                      <GraduationCap className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-900 text-sm tracking-tight">Chapter Exam: {(chapter.title || '').split(':')[1]?.trim() || chapter.title || ''}</h4>
                      <p className="text-slate-550 text-xs max-w-xl">A comprehensive diagnostic testing Feynman simplification questions and real-world application challenges.</p>
                      <div className="flex items-center gap-2">
                        <span className="bg-purple-100 text-purple-700 rounded-md text-[9px] font-mono px-1.5 py-0.5 font-bold uppercase">Pass Requirement: 85%</span>
                      </div>
                    </div>
                  </div>

                  {/* Trigger */}
                  <div>
                    {chapter.completed ? (
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 self-start">
                        <CheckCircle className="h-4 w-4" /> Passed chapter
                      </span>
                    ) : isChapterUnlocked && !chapter.lessons.some(l => !l.completed) ? (
                      <button
                        onClick={() => onSelectChapterExam(chapter.chapterId)}
                        className="px-4.5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all"
                      >
                        Start Chapter Exam
                      </button>
                    ) : (
                      <span className="text-slate-400 text-xs italic flex items-center gap-1 mr-2 select-none">
                        <Lock className="h-3 w-3" /> Locked until lessons are passed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Course Final Exam Node */}
        <div
          className={`border rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all ${
            allChaptersPassed ? 'bg-amber-50/15 border-amber-250 shadow-sm' : 'bg-slate-50/20 border-slate-150 opacity-65'
          }`}
          id="final-exam-outline"
        >
          <div className="flex items-start gap-5">
            <div className={`rounded-2xl p-3.5 ${
              course.finalExamCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              <Award className="h-8 w-8" />
            </div>
            <div className="space-y-1.5">
              <span className="bg-amber-100 text-amber-800 font-mono font-bold text-[9px] px-2 py-0.5 rounded uppercase">Full Course Gateway</span>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight font-sans">Official Course Final Exam</h3>
              <p className="text-slate-500 text-xs max-w-xl">
                The ultimate evaluation testing your entire simplified comprehension. Revisit high-level ideas, map multiple systems together, and apply your knowledge to random real-life scenarios.
              </p>
              <span className="bg-rose-50 border border-rose-100 text-rose-700 px-2 py-0.5 rounded font-mono text-[9px] font-bold">Passing Score: 85%</span>
            </div>
          </div>

          <div>
            {course.finalExamCompleted ? (
              <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl p-4 text-center">
                <div className="text-[10px] uppercase font-bold text-slate-400">Final Grade</div>
                <div className="text-2xl font-mono font-bold">{course.finalExamScore || 90}%</div>
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 mt-1 justify-center">
                  <CheckCircle className="h-4 w-4" /> Certification Issued
                </span>
              </div>
            ) : allChaptersPassed ? (
              <button
                onClick={onSelectFinalExam}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-98"
                id="btn-start-final-exam"
              >
                Launch Final Exam
              </button>
            ) : (
              <span className="text-slate-400 text-xs font-medium italic flex items-center gap-1 select-none mr-2">
                <Lock className="h-3 w-3" /> Lock until Chapter Exams are completed
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
