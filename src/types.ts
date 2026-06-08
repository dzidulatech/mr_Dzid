/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SourceType = 'pdf' | 'link' | 'text';

export type NodeStatus = 'locked' | 'available' | 'completed' | 'weak' | 'review';
export type NodeType = 'course' | 'chapter' | 'lesson' | 'concept' | 'example' | 'exam';

export interface MindMapNode {
  id: string;
  label: string;
  type: NodeType;
  status: NodeStatus;
  summary: string;
  score: number | null;
  chapterId?: string;
  lessonId?: string;
}

export interface MindMapEdge {
  from: string;
  to: string;
  label?: string;
}

export interface MindMap {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
}

export interface QuizQuestion {
  questionId: string;
  type: 'explain_back' | 'multiple_choice' | 'true_false' | 'example' | 'correct_mistake' | 'fill_blank' | 'apply_real_life';
  questionText: string;
  options?: string[]; // For multiple choice
  correctAnswer?: string; // For auto-graded mc/tf/blank
  gradeRubric?: string; // Guidance for GPT/Gemini grading
}

export interface QuizResult {
  passed: boolean;
  score: number;
  answers: { [questionId: string]: string };
  feedback: string;
  reviewExplanation?: string;
}

export interface Lesson {
  lessonId: string;
  chapterId: string;
  title: string;
  mainConcept: string;
  simpleExplanation: string;
  analogy: string;
  example: string;
  keyTerms: string[];
  commonMisconceptions: string[];
  feynmanPrompt: string;
  originalText?: string;
  miniQuiz: QuizQuestion[];
  
  // Progress tracking
  locked: boolean;
  completed: boolean;
  score: number;
  attemptsCount: number;
  confidenceRating?: number; // 1 to 5
}

export interface Chapter {
  chapterId: string;
  title: string;
  summary: string;
  learningGoals: string[];
  lessons: Lesson[];
  chapterExam: QuizQuestion[];
  
  // Progress
  locked: boolean;
  completed: boolean;
  score: number;
}

export interface Course {
  id: string;
  title: string;
  summary: string;
  sourceType: SourceType;
  sourceTitle: string;
  difficultyLevel: string;
  progress: number; // calculated overall completed %
  currentChapterId: string;
  currentLessonId: string;
  chapters: Chapter[];
  finalExam: QuizQuestion[];
  finalExamCompleted: boolean;
  finalExamScore?: number;
  mindMap: MindMap;
  weakTopics: string[];
}

export interface StudentQuestion {
  id: string;
  courseId: string;
  nodeId: string; // Linked mind map node
  questionText: string;
  answerText: string;
  timestamp: string;
}

export interface LessonAttempt {
  id: string;
  lessonId: string;
  studentAnswer: string;
  score: number;
  passed: boolean;
  feedback: string;
  simplerExplanation?: string;
  followUpQuestion?: string;
  weakConcepts: string[];
  timestamp: string;
}

export interface Flashcard {
  id: string;
  courseId: string;
  question: string;
  answer: string;
  category: string; // chapter/lesson context
  box: number; // Leitner box 1-5
  nextReviewDate: string; // ISO string
}

export interface ReviewTask {
  id: string;
  concept: string;
  courseId: string;
  chapterId?: string;
  lessonId?: string;
  type: 'explain_again' | 'flashcards' | 'quiz' | 'teach_the_ai';
  scheduledDate: string;
  completed: boolean;
}

export interface AISettings {
  provider: 'gemini' | 'groq' | 'openrouter' | 'openai' | 'claude' | 'ollama' | 'nvidia';
  modelName: string;
  apiKey: string;
}

export interface GradingResponse {
  score: number;
  passed: boolean;
  whatStudentUnderstood: string[];
  missingIdeas: string[];
  misconceptions: string[];
  feedback: string;
  simplerExplanation: string;
  followUpQuestion: string;
  weakConcepts: string[];
  unlockNext: boolean;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  iconName: string;
  unlocked: boolean;
  unlockedAt?: string;
  requirementType: 'course_complete' | 'review_streak';
}

