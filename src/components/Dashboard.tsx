/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Sparkles, Brain, AlertTriangle, ArrowRight, Plus, CheckCircle, Calendar, RefreshCw, Target, Trash2 } from 'lucide-react';
import { Course, ReviewTask } from '../types';

interface DashboardProps {
  courses: Course[];
  reviewSchedule: ReviewTask[];
  onSelectCourse: (courseId: string) => void;
  onNavigateToUpload: () => void;
  onNavigateToReview: (task: ReviewTask) => void;
  dailyGoal: number;
  completedLessonsCountToday: number;
  onUpdateDailyGoal: (newGoal: number) => void;
  onDeleteCourse: (courseId: string) => void;
}

export default function Dashboard({
  courses,
  reviewSchedule,
  onSelectCourse,
  onNavigateToUpload,
  onNavigateToReview,
  dailyGoal,
  completedLessonsCountToday,
  onUpdateDailyGoal,
  onDeleteCourse,
}: DashboardProps) {
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);
  const activeCourse = courses[0]; // Highlight or use the first active course
  const pendingReviews = reviewSchedule.filter(task => !task.completed);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
      id="dashboard-root"
    >
      {/* Header Banner */}
      <div className="bg-radial from-slate-900 to-slate-950 text-white rounded-3xl p-8 border border-slate-800 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6" id="dashboard-banner">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent pointer-events-none" />
        <div className="space-y-3 z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 bg-blue-500/15 border border-blue-500/20 px-3 py-1 rounded-full text-blue-400 text-xs font-mono">
            <Sparkles className="h-3.5 w-3.5" />
            Empowered by the Feynman Method
          </div>
          <h1 className="text-3.5xl font-sans font-bold tracking-tight bg-gradient-to-r from-slate-100 via-white to-slate-200 bg-clip-text text-transparent">
            Welcome back, Student
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            "If you want to master something, teach it simply." Turn complex source PDFs, websites, or text into tailored study materials and prove your comprehension to progress.
          </p>
        </div>
        <button
          onClick={onNavigateToUpload}
          className="z-10 cursor-pointer inline-flex items-center gap-2.5 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3.5 rounded-2xl font-medium shadow-lg shadow-blue-900/20 active:scale-98 transition-all duration-200"
          id="btn-create-course-db"
        >
          <Plus className="h-5 w-5" />
          Create New Course
        </button>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="dashboard-grid">
        {/* Left Col: Existing Courses List */}
        <div className="lg:col-span-2 space-y-6" id="dashboard-courses-section">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 font-sans tracking-tight inline-flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              Your Customized Courses
            </h2>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">
              {courses.length} Active
            </span>
          </div>

          <div className="space-y-4" id="courses-list">
            {courses.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl" id="empty-courses">
                <Brain className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No courses available. Create your first course in seconds!</p>
                <button
                  onClick={onNavigateToUpload}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-medium"
                >
                  Generate First Course
                </button>
              </div>
            ) : (
                courses.map((course) => {
                  const currentChapter = course.chapters?.find(c => c.chapterId === course.currentChapterId);
                  const currentLesson = currentChapter?.lessons?.find(l => l.lessonId === course.currentLessonId);

                  return (
                    <div
                      key={course.id}
                      onClick={() => {
                        if (courseToDelete === course.id) return;
                        onSelectCourse(course.id);
                      }}
                      className="group cursor-pointer bg-white hover:bg-slate-50/50 border border-slate-200 hover:border-slate-300 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden"
                      id={`course-card-${course.id}`}
                    >
                      {/* Delete confirmation overlay */}
                      {courseToDelete === course.id && (
                        <div
                          className="absolute inset-0 bg-slate-900/95 flex flex-col justify-center items-center text-center p-6 space-y-4 z-20"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <AlertTriangle className="h-8 w-8 text-rose-500 animate-bounce" />
                          <div className="space-y-1 px-4">
                            <h4 className="text-sm font-bold text-white">Delete this course?</h4>
                            <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                              Are you sure you want to delete <span className="font-semibold text-slate-200">"{course.title}"</span>? This will permanently erase progress and review schedules.
                            </p>
                          </div>
                          <div className="flex items-center gap-3 w-full max-w-[240px]">
                            <button
                              type="button"
                              onClick={() => setCourseToDelete(null)}
                              className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteCourse(course.id);
                                setCourseToDelete(null);
                              }}
                              className="flex-1 px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                            >
                              Yes, Delete
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-start gap-4 flex-wrap mb-4">
                        <div>
                          <div className="text-xs font-semibold text-slate-400 capitalize mb-1 inline-flex items-center gap-1">
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-mono border border-slate-200 uppercase">
                              {course.sourceType}
                            </span>
                            • {course.difficultyLevel}
                          </div>
                          <h3 className="text-lg font-bold text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
                            {course.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                            <CheckCircle className="h-4 w-4" />
                            {course.progress}% Passed
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCourseToDelete(course.id);
                            }}
                            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Course"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-5">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>

                      {/* Current active placement */}
                      {currentLesson && (
                        <div className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 flex items-center justify-between text-xs text-slate-600 mb-4">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Currently Learning</span>
                            <span className="font-semibold text-slate-800 line-clamp-1">{currentChapter?.title}</span>
                            <span className="text-slate-500 line-clamp-1">{currentLesson.title}</span>
                          </div>
                          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                        </div>
                      )}

                      {/* Weak areas snippet */}
                      {course.weakTopics && course.weakTopics.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold text-rose-500 uppercase flex items-center gap-0.5 mr-1">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Needs Focus:
                          </span>
                          {course.weakTopics.map((topic, i) => (
                            <span key={i} className="bg-rose-50 text-rose-600 border border-rose-100 rounded-md px-2 py-0.5 text-[10px] font-medium max-w-[150px] truncate">
                              {topic}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 group-hover:underline">
                          Continue Course
                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
          </div>
        </div>

        {/* Right Col: Weak Areas / Spaced Repetition Triggers */}
        <div className="space-y-8" id="dashboard-widgets-section">
          {/* Daily Study Goal widget */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4" id="daily-study-goal-card">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 inline-flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-500" />
                Daily Study Goal
              </h3>
              {completedLessonsCountToday >= dailyGoal && (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Goal Met!
                </span>
              )}
            </div>

            <div className="flex items-center gap-5">
              {/* Circular Progress Ring */}
              <div className="relative shrink-0 flex items-center justify-center">
                <svg className="w-20 h-20 transform -rotate-90">
                  {/* Outer circle track */}
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    className="stroke-slate-100"
                    strokeWidth="6"
                    fill="transparent"
                  />
                  {/* Inner dynamic circle */}
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    className="stroke-blue-500 transition-all duration-500 ease-out"
                    strokeWidth="6"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 34}
                    strokeDashoffset={
                      (2 * Math.PI * 34) - (Math.min(completedLessonsCountToday, dailyGoal) / dailyGoal) * (2 * Math.PI * 34)
                    }
                    strokeLinecap="round"
                  />
                </svg>
                {/* Numeric center overlay */}
                <span className="absolute text-center leading-none flex flex-col items-center">
                  <span className="text-sm font-extrabold font-mono text-slate-800 leading-none">
                    {completedLessonsCountToday}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 font-mono leading-none mt-0.5">
                    / {dailyGoal}
                  </span>
                </span>
              </div>

              {/* Status and description */}
              <div className="flex-1 space-y-1">
                <h4 className="text-xs font-bold text-slate-800">
                  {completedLessonsCountToday === 0 ? (
                    'Kickstart your learning'
                  ) : completedLessonsCountToday < dailyGoal ? (
                    'Making great progress!'
                  ) : (
                    'Daily target achieved!'
                  )}
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {completedLessonsCountToday === 0 ? (
                    'Complete a simplified peer explanation to secure your first target!'
                  ) : completedLessonsCountToday < dailyGoal ? (
                    `You are ${dailyGoal - completedLessonsCountToday} ${dailyGoal - completedLessonsCountToday === 1 ? 'lesson' : 'lessons'} away from hitting your daily feynman target.`
                  ) : (
                    "Feynman target fully consolidated for today. Outstanding focus!"
                  )}
                </p>
              </div>
            </div>

            {/* Daily Goal Adjuster */}
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-150 rounded-xl p-2">
              <button
                type="button"
                onClick={() => onUpdateDailyGoal(Math.max(1, dailyGoal - 1))}
                className="h-7 w-7 text-xs font-bold font-mono text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs cursor-pointer flex items-center justify-center transition-all"
                title="Decrease Daily Goal"
              >
                -
              </button>
              <div className="flex-1 text-center font-mono text-[11px] font-semibold text-slate-600">
                Daily Goal: <span className="font-bold text-slate-850 dark:text-slate-800">{dailyGoal} lessons</span>
              </div>
              <button
                type="button"
                onClick={() => onUpdateDailyGoal(Math.min(10, dailyGoal + 1))}
                className="h-7 w-7 text-xs font-bold font-mono text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs cursor-pointer flex items-center justify-center transition-all"
                title="Increase Daily Goal"
              >
                +
              </button>
            </div>
          </div>

          {/* Spaced repetition review notifications */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 inline-flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-500" />
              Spaced Review Queue
            </h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Richard Feynman discovered that returning to concepts at 1-day, 3-day, and 7-day intervals transitions concepts permanently into deep retention.
            </p>

            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {pendingReviews.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  <CheckCircle className="h-6 w-6 text-emerald-500 mx-auto mb-1.5 opacity-80" />
                  All concept pathways fully consolidated! No review due.
                </div>
              ) : (
                pendingReviews.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => onNavigateToReview(task)}
                    className="w-full text-left bg-white hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-200 rounded-xl p-3 flex items-center justify-between gap-3 text-xs transition-all cursor-pointer shadow-2xs group"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                        {task.concept}
                      </div>
                      <div className="flex items-center gap-2 text-slate-400 text-[10px]">
                        <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-mono uppercase">
                          {task.type.replace(/_/g, ' ')}
                        </span>
                        <span>Due {new Date(task.scheduledDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <RefreshCw className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 group-hover:rotate-45 transition-all" />
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Quick Stats widget */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4" id="quick-principles">
            <h3 className="font-bold text-slate-900 inline-flex items-center gap-2">
              <Brain className="h-5 w-5 text-pink-500" />
              Feynman Principles Guide
            </h3>
            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex gap-2.5 items-start">
                <span className="bg-amber-100 text-amber-700 h-5 w-5 rounded-full font-bold flex items-center justify-center shrink-0">1</span>
                <div>
                  <h4 className="font-bold text-slate-800">Choose a Concept</h4>
                  <p className="text-[11px] text-slate-500">Study a topic, document, or webpage simply.</p>
                </div>
              </div>
              <div className="flex gap-2.5 items-start">
                <span className="bg-pink-100 text-pink-700 h-5 w-5 rounded-full font-bold flex items-center justify-center shrink-0">2</span>
                <div>
                  <h4 className="font-bold text-slate-800">Explain to a Child</h4>
                  <p className="text-[11px] text-slate-500">Explain the underlying mechanism in plain language without jargon.</p>
                </div>
              </div>
              <div className="flex gap-2.5 items-start">
                <span className="bg-blue-100 text-blue-700 h-5 w-5 rounded-full font-bold flex items-center justify-center shrink-0">3</span>
                <div>
                  <h4 className="font-bold text-slate-800">Identify Gap In Understand</h4>
                  <p className="text-[11px] text-slate-500">Understand your weak regions through custom AI diagnostic grading.</p>
                </div>
              </div>
              <div className="flex gap-2.5 items-start">
                <span className="bg-emerald-100 text-emerald-700 h-5 w-5 rounded-full font-bold flex items-center justify-center shrink-0">4</span>
                <div>
                  <h4 className="font-bold text-slate-800">Simpify, Metaphor & Review</h4>
                  <p className="text-[11px] text-slate-500">Establish dynamic analogies and retry until passing grade (80%) is met.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
