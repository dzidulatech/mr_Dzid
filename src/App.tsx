/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  BookOpen, 
  Map, 
  GraduationCap, 
  Trophy, 
  Users, 
  Settings as SettingsIcon, 
  Sparkles, 
  Compass, 
  ChevronRight, 
  Menu, 
  X,
  UserCheck,
  Sun,
  Moon,
  Eye,
  EyeOff
} from 'lucide-react';

import { Course, ReviewTask, Flashcard, StudentQuestion, AISettings, Badge, MindMapNode, MindMapEdge } from './types';
import Dashboard from './components/Dashboard';
import SourceUpload from './components/SourceUpload';
import CourseOutline from './components/CourseOutline';
import MindMap from './components/MindMap';
import LessonTutor from './components/LessonTutor';
import QuizExam from './components/QuizExam';
import ProgressTracker from './components/ProgressTracker';
import TeachTheAi from './components/TeachTheAi';
import Settings from './components/Settings';

import { 
  db, 
  auth, 
  signInWithGoogle, 
  signOutUser, 
  handleFirestoreError, 
  OperationType 
} from './firebase';
import { 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  deleteDoc,
  getDocFromServer
} from 'firebase/firestore';

export default function App() {
  const [activePage, setActivePage] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Authentication & Database State Managers
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [dbConnected, setDbConnected] = useState<boolean>(false);
  const [isLoadingDb, setIsLoadingDb] = useState<boolean>(false);

  // Connection testing dry-run validation on boot
  useEffect(() => {
    async function testDbConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
        setDbConnected(true);
      } catch (error) {
        console.warn("Firestore connection check dry-run completed safely:", error);
        if (error instanceof Error && error.message.includes('the client is offline')) {
          setDbConnected(false);
        } else {
          setDbConnected(true);
        }
      }
    }
    testDbConnection();
  }, []);

  // Google Login and Logout callback utilities
  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (e) {
      console.error("Sign in failed:", e);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await signOutUser();
      setCurrentUser(null);
    } catch (e) {
      console.error("Sign out failed:", e);
    }
  };

  // Late-night 'Deep Charcoal' study theme switch manager
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('feynman_dark_mode') === 'true';
    } catch {
      return false;
    }
  });

  // Cool Zen Mode focus state manager
  const [isZenMode, setIsZenMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('feynman_zen_mode') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('feynman_zen_mode', String(isZenMode));
    } catch (_) {}
  }, [isZenMode]);

  useEffect(() => {
    try {
      localStorage.setItem('feynman_dark_mode', String(isDarkMode));
    } catch (_) {}
    if (isDarkMode) {
      document.body.classList.add('dark-theme');
      document.documentElement.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
      document.documentElement.classList.remove('dark-theme');
    }
  }, [isDarkMode]);

  // Core State Managers
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  // Spaced Repetition Review metrics and Badge state
  const [reviewStreak, setReviewStreak] = useState<number>(3); // Set default to 3 days so they are close to 5-day streak goal for testing
  const [unlockedBadgeNotify, setUnlockedBadgeNotify] = useState<Badge | null>(null);
  const [badges, setBadges] = useState<Badge[]>([
    {
      id: 'course_complete',
      title: 'Feynman Master',
      description: 'Awarded for completing 100% course progression or passing the comprehensive final exam.',
      iconName: 'Award',
      unlocked: false,
      requirementType: 'course_complete'
    },
    {
      id: 'streak_5',
      title: 'Memory Consolidation Dynamo',
      description: 'Achieve a continuous 5-day spaced repetition review streak.',
      iconName: 'Flame',
      unlocked: false,
      requirementType: 'review_streak'
    },
    {
      id: 'analogy_architect',
      title: 'Analogy Architect',
      description: 'Unlocked by crafting custom simplified peer explanations with zero structural concept gaps.',
      iconName: 'Trophy',
      unlocked: true, // Start pre-unlocked to enrich presentation on initial view
      unlockedAt: new Date(Date.now() - 172800000).toLocaleDateString(),
      requirementType: 'course_complete'
    }
  ]);

  // Flashcards and Spaced Repetition Review queue state
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [reviewSchedule, setReviewSchedule] = useState<ReviewTask[]>([]);
  const [studentQuestions, setStudentQuestions] = useState<StudentQuestion[]>([]);

  // Custom Settings
  const [aiSettings, setAiSettings] = useState<AISettings>(() => {
    try {
      const saved = localStorage.getItem('feynman_ai_settings');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Could not load settings from localStorage', e);
    }
    return {
      provider: 'gemini',
      modelName: 'gemini-3.5-flash',
      apiKey: '',
    };
  });

  // Daily Study Goal and metrics state managers
  const [dailyGoal, setDailyGoal] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('feynman_daily_goal');
      return saved ? parseInt(saved, 10) : 3;
    } catch {
      return 3;
    }
  });

  const [completedLessonsToday, setCompletedLessonsToday] = useState<{ lessonId: string; dateStr: string }[]>(() => {
    try {
      const saved = localStorage.getItem('feynman_completed_lessons_today');
      if (saved) {
        const parsed = JSON.parse(saved);
        const todayStr = new Date().toDateString();
        // Clear old dates dynamically and only keep today's lesson completions
        return parsed.filter((item: any) => item.dateStr === todayStr);
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Real-time synchronization loader and hydrator
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        setIsLoadingDb(true);
        try {
          // 1. Load User Profile details
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            if (data.dailyGoal !== undefined) setDailyGoal(data.dailyGoal);
            if (data.reviewStreak !== undefined) setReviewStreak(data.reviewStreak);
            if (data.completedLessonsToday !== undefined) setCompletedLessonsToday(data.completedLessonsToday);
          } else {
            // Setup new profile
            await setDoc(userDocRef, {
              uid: user.uid,
              dailyGoal,
              reviewStreak,
              completedLessonsToday
            });
          }

          // 2. Fetch User Courses
          const coursesColRef = collection(db, 'users', user.uid, 'courses');
          const coursesSnapshot = await getDocs(coursesColRef);
          const dbCourses: Course[] = [];
          coursesSnapshot.forEach(docSnap => {
            dbCourses.push(docSnap.data() as Course);
          });

          // 3. Fetch Flashcards
          const flashcardsColRef = collection(db, 'users', user.uid, 'flashcards');
          const flashcardsSnapshot = await getDocs(flashcardsColRef);
          const dbFlashcards: Flashcard[] = [];
          flashcardsSnapshot.forEach(docSnap => {
            dbFlashcards.push(docSnap.data() as Flashcard);
          });

          // 4. Fetch Review Tasks
          const reviewTasksColRef = collection(db, 'users', user.uid, 'reviewTasks');
          const reviewTasksSnapshot = await getDocs(reviewTasksColRef);
          const dbReviewTasks: ReviewTask[] = [];
          reviewTasksSnapshot.forEach(docSnap => {
            dbReviewTasks.push(docSnap.data() as ReviewTask);
          });

          // If the cloud already has user courses, load them!
          if (dbCourses.length > 0) {
            setCourses(dbCourses);
            setSelectedCourseId(dbCourses[0].id);
          } else {
            // Upload current preloaded template courses to live Firestore
            for (const c of courses) {
              const enriched = { ...c, userId: user.uid };
              await setDoc(doc(db, 'users', user.uid, 'courses', c.id), enriched)
                .catch(err => handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/courses/${c.id}`));
            }
          }

          if (dbFlashcards.length > 0) {
            setFlashcards(dbFlashcards);
          } else {
            for (const f of flashcards) {
              const enriched = { ...f, userId: user.uid };
              await setDoc(doc(db, 'users', user.uid, 'flashcards', f.id), enriched)
                .catch(err => handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/flashcards/${f.id}`));
            }
          }

          if (dbReviewTasks.length > 0) {
            setReviewSchedule(dbReviewTasks);
          } else {
            for (const r of reviewSchedule) {
              const enriched = { ...r, userId: user.uid };
              await setDoc(doc(db, 'users', user.uid, 'reviewTasks', r.id), enriched)
                .catch(err => handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/reviewTasks/${r.id}`));
            }
          }

        } catch (e) {
          console.error("Hydration from cloud database failed:", e);
        } finally {
          setIsLoadingDb(false);
        }
      }
    });
    return () => unsubscribe();
  }, [auth]);

  // Sync profile edits back to cloud database
  useEffect(() => {
    if (currentUser && !isLoadingDb) {
      const userDocRef = doc(db, 'users', currentUser.uid);
      setDoc(userDocRef, {
        uid: currentUser.uid,
        dailyGoal,
        reviewStreak,
        completedLessonsToday
      }, { merge: true }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`));
    }
  }, [dailyGoal, reviewStreak, completedLessonsToday, currentUser, isLoadingDb]);

  // Sync state modifications of courses back to cloud database
  useEffect(() => {
    if (currentUser && !isLoadingDb && courses.length > 0) {
      courses.forEach(async (course) => {
        const enriched = { ...course, userId: currentUser.uid };
        await setDoc(doc(db, 'users', currentUser.uid, 'courses', course.id), enriched)
          .catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}/courses/${course.id}`));
      });
    }
  }, [courses, currentUser, isLoadingDb]);

  // Sync flashcards back to cloud database
  useEffect(() => {
    if (currentUser && !isLoadingDb && flashcards.length > 0) {
      flashcards.forEach(async (card) => {
        const enriched = { ...card, userId: currentUser.uid };
        await setDoc(doc(db, 'users', currentUser.uid, 'flashcards', card.id), enriched)
          .catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}/flashcards/${card.id}`));
      });
    }
  }, [flashcards, currentUser, isLoadingDb]);

  // Sync review schedule tasks back to cloud database
  useEffect(() => {
    if (currentUser && !isLoadingDb && reviewSchedule.length > 0) {
      reviewSchedule.forEach(async (task) => {
        const enriched = { ...task, userId: currentUser.uid };
        await setDoc(doc(db, 'users', currentUser.uid, 'reviewTasks', task.id), enriched)
          .catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}/reviewTasks/${task.id}`));
      });
    }
  }, [reviewSchedule, currentUser, isLoadingDb]);

  // Monitor badge eligibility and trigger toasts
  useEffect(() => {
    const isCourseCompleted = courses.some(c => c.progress >= 100 || c.finalExamCompleted);
    const isStreakMet = reviewStreak >= 5;

    setBadges(prev => {
      let isChanged = false;
      const nextBadges = prev.map(badge => {
        if (badge.unlocked) return badge;

        let shouldUnlock = false;
        if (badge.id === 'course_complete' && isCourseCompleted) {
          shouldUnlock = true;
        } else if (badge.id === 'streak_5' && isStreakMet) {
          shouldUnlock = true;
        }

        if (shouldUnlock) {
          isChanged = true;
          const updatedBadge = {
            ...badge,
            unlocked: true,
            unlockedAt: new Date().toLocaleDateString()
          };
          // Trigger the beautiful announcement modal!
          setUnlockedBadgeNotify(updatedBadge);
          return updatedBadge;
        }
        return badge;
      });
      return isChanged ? nextBadges : prev;
    });
  }, [courses, reviewStreak]);

  
  // Custom Settings effect tracker
  useEffect(() => {
    try {
      localStorage.setItem('feynman_ai_settings', JSON.stringify(aiSettings));
    } catch (e) {
      console.warn('Could not save settings to localStorage', e);
    }
  }, [aiSettings]);

  const handleUpdateDailyGoal = (newGoal: number) => {
    setDailyGoal(newGoal);
    try {
      localStorage.setItem('feynman_daily_goal', String(newGoal));
    } catch (e) {
      console.warn('Could not save goal to localStorage', e);
    }
  };

  // Load defaults on component mount (Mock Brain and Learning Course for perfect presentation)
  useEffect(() => {
    const defaultCourse: Course = {
      id: 'course_brain',
      title: 'Brain and Learning Mechanisms',
      summary: 'A comprehensive neuroscience course unpacking how synaptic plasticity, memory consolidation, and spacing triggers build permanent retention paths in your gray matter.',
      sourceType: 'pdf',
      sourceTitle: 'Neurobiology of Memory.pdf',
      difficultyLevel: 'Intermediate',
      progress: 42,
      currentChapterId: 'chap_2',
      currentLessonId: 'less_2_1',
      chapters: [
        {
          chapterId: 'chap_1',
          title: 'Chapter 1: Synaptic Plasticity Foundations',
          summary: 'The physical building blocks of thinking: how neurons fire, communicate, and physically re-wire connection cables to record inputs.',
          learningGoals: ['Explain synaptic adaptation simply', 'Map chemical loops to everyday traffic metaphors'],
          locked: false,
          completed: true,
          score: 90,
          lessons: [
            {
              lessonId: 'less_1_1',
              chapterId: 'chap_1',
              title: 'Lesson 1.1: What are Neurons?',
              mainConcept: 'Neurons are biological messenger cells that relay electric pulses to coordinate signals in the nervous system.',
              simpleExplanation: 'Imagine your brains neurons like people standing in a long line, playing a game of grapevine whispers. Each person (neuron) stays stationary, but they pass a message (electric signal) to the next helper by quick whispers. In this system, whispers fly across the whole network in milliseconds to register thoughts, just like passing water buckets to save a house.',
              analogy: 'Like stationary phone towers passing wireless audio feeds consecutively from city to city.',
              example: 'Wiggling your thumb triggers a cascade of sequential cellular whispers from the sensory brain down to spine motor nodes.',
              keyTerms: ['Sensory Neurons', 'Synaptic Terminals', 'Signal Cascade'],
              commonMisconceptions: ['Cells touch physically during thinking', 'Electric fields leak across cells without insulated pathways'],
              feynmanPrompt: 'Explain how neurons transmit signal whispers to a 10-year old using a playground analogy.',
              originalText: 'Neurons are highly specialized sensory and signaling cells characterized by dendritic extensions, a cell body (soma), and a myelinated axonal projection. When stimuli cross structural thresholds, action potentials propagate saltatorily down the axon via voltage-gated ion channels. Rapid neurotransmitter vesicle release occurs at synaptic terminals, diffusing molecules across the synaptic cleft to bind post-synaptic receptors and generate graded potentials.',
              miniQuiz: [
                {
                  questionId: 'q_1_1_1',
                  type: 'multiple_choice',
                  questionText: 'What is the primary role of biological neurons?',
                  options: ['Direct structural support only', 'Relay electric signal pulses consecutively', 'Destroy synapse connections on demand'],
                  correctAnswer: 'Relay electric signal pulses consecutively',
                }
              ],
              locked: false,
              completed: true,
              score: 95,
              attemptsCount: 1,
            },
            {
              lessonId: 'less_1_2',
              chapterId: 'chap_1',
              title: 'Lesson 1.2: Synaptic Adaptation (Plasticity)',
              mainConcept: 'Synapes re-size and adjust connection strength based on active signal volume to consolidate paths.',
              simpleExplanation: "Think about synaptic adaptation like a grass walking pathway behind school houses. If students only walk on the grass once, the grass bends slightly but springs right back: no permanent path exists. But if hundreds of students stamp on that exact route every single morning, the grass gets cleared away to reveal a permanent dirt trail. Your brain's synapses do the same thing: repeatedly triggered paths grow thick and fast; unused pathways fade.",
              analogy: "Like a pipeline expanding in thickness because fluid volume demand keeps increasing.",
              example: "Repeatedly strumming a guitar chord consolidates fingertip motor pathways so they trigger automatically.",
              keyTerms: ['Hebbian Learning', 'Re-wiring', 'Pruning Decay'],
              commonMisconceptions: ['Brain pathways are set in stone from birth', 'All neural pathways stay active forever without decay'],
              feynmanPrompt: 'Using a garden or road analogy, explain how synaptic plasticity rewires connection cords.',
              originalText: 'Synaptic plasticity is the dynamic physiological process wherein junctions scale signaling efficiency or structural density based on continuous firing activity. According to Hebbian theory, synchronous persistent activity of presynaptic and postsynaptic neurons strengthens communication pathways (Long-Term Potentiation), while low-frequency or asynchronous inputs induce depletion (Long-Term Depression), facilitating continuous circuit adaptation.',
              miniQuiz: [
                {
                  questionId: 'q_1_2_1',
                  type: 'true_false',
                  questionText: 'True or False: Repeated pathway triggers thicken and adapt synaptic wire connection strength.',
                  options: ['True', 'False'],
                  correctAnswer: 'True',
                }
              ],
              locked: false,
              completed: true,
              score: 85,
              attemptsCount: 2,
            }
          ],
          chapterExam: [
            {
              questionId: 'q_ch1_exam_1',
              type: 'explain_back',
              questionText: 'Contrast cellular telephone relay signals versus neural synaptic whisper networks simply.',
              gradeRubric: 'Expect Hebbian principles mapped correctly to wire strength adjustments.'
            }
          ]
        },
        {
          chapterId: 'chap_2',
          title: 'Chapter 2: Memory Consolidation Mechanisms',
          summary: 'How temporary brain activity during sleep is replayed to write permanent structures inside safe memory archives.',
          learningGoals: ['Differentiate sensory buffers and permanent directories', 'Evaluate sleep role in memory writing'],
          locked: false, // Unlocked since Chapter 1 exam is complete
          completed: false,
          score: 0,
          lessons: [
            {
              lessonId: 'less_2_1',
              chapterId: 'chap_2',
              title: 'Lesson 2.1: Memory Consolidation & Hippocampus',
              mainConcept: 'Consolidation transfers fragile temporary memories from the short-term Hippocampus to the permanent safe neocortex.',
              simpleExplanation: "Think of your brain's memory process like writing sticky notes. When you study during the afternoon, you categorize ideas on sticky notes (Hippocampus short-term buffer) because it is fast and simple. But sticky notes slip off and get lost easily. Memory consolidation is like an archiver taking those fragile sticky notes during sleep, copying them into heavy leather ledgers, and cataloging them in deep storage shelves (Neocortex) so they are forever safe.",
              analogy: 'An office worker dumping loose scrap files into a heavy steel database vault for permanent logging.',
              example: 'Studying vocabulary leaves temporary chemical traces, which sleeping brain waves replicate to build solid protein structures.',
              keyTerms: ['Hippocampus', 'Neocortex', 'Sparsely Distributed Directories'],
              commonMisconceptions: ['Memories are stored like finished video files on a disk', 'The short-term archive is massive enough to hold years of raw data'],
              feynmanPrompt: 'Using a sticky-note and iron-archive metaphor, explain how short term buffers transfer concepts securely.',
              originalText: 'Memory consolidation processes govern the progressive stabilization of labile memory traces following initialization. Initially, information acquisition rests within transient neural networks centered in the medially-located Hippocampus. Over time, particularly during slow-wave sleep cycles, high-frequency synchronization events stimulate direct mapping transfers to highly distributed micro-assemblies in the Neocortex, cementing storage integrity.',
              miniQuiz: [
                {
                  questionId: 'q_2_1_1',
                  type: 'multiple_choice',
                  questionText: 'Which brain region serves as the temporary fragile memory buffer?',
                  options: ['Hippocampus', 'Neocortex', 'Spinal Cord'],
                  correctAnswer: 'Hippocampus',
                }
              ],
              locked: false, // First lesson of chapter 2 is unlocked
              completed: false,
              score: 0,
              attemptsCount: 0,
            },
            {
              lessonId: 'less_2_2',
              chapterId: 'chap_2',
              title: 'Lesson 2.2: Spaced Repetition Triggers',
              mainConcept: 'Forced recall spikes retrieval signals right before structural paths decay, optimizing permanent paths.',
              simpleExplanation: "Spacing reviews acts like walking on your grass path right before the flat dirt route begins to grow green sprouts again. If you stamp again right at that verge of forgetting, the footprint is incredibly deep and efficient, making the road last twice as long with much less footwork overall.",
              analogy: 'Watering delicate garden crops with small cups of water continuously instead of drowning them in a deluge once.',
              example: 'Using flashcard box spacing where successful recalls push cards to 3-day and 7-day schedules.',
              keyTerms: ['Forgetting Curve', 'Recall Spikes', 'Leitner spacing intervals'],
              commonMisconceptions: ['Brute forcing study cards for 14 hours straight build long-term retention'],
              feynmanPrompt: 'Explain how spacing reviews optimizes memory retention over cramming.',
              originalText: 'The Ebbinghaus logarithmic forgetting curve states that memory retention decreases rapidly within hours of acquisition, unless actively retrieved. Spaced repetition methodologies exploit this retention threshold. Forcing cognitive recall triggers right when retrieval paths approach critical degradation thresholds maximizes long-term synaptic trace consolidation. Spacing optimizes metabolic expenditure compared to consecutive massed practice (cramming).',
              miniQuiz: [
                {
                  questionId: 'q_2_2_1',
                  type: 'multiple_choice',
                  questionText: 'What is the benefit of spaced recollection triggers?',
                  options: ['Requires continuous 24-hour cram sessions', 'Reduces overall study time while flattening memory decay paths', 'Deletes weak topics on demand'],
                  correctAnswer: 'Reduces overall study time while flattening memory decay paths',
                }
              ],
              locked: true, // Locked until Lesson 2.1 is completed!
              completed: false,
              score: 0,
              attemptsCount: 0,
            }
          ],
          chapterExam: [
            {
              questionId: 'q_ch2_exam_1',
              type: 'explain_back',
              questionText: 'Explain the chemical forgetting decay curve simply using a disappearing path metaphor.',
              gradeRubric: 'Expect concepts of threshold retrieval spikes.'
            }
          ]
        }
      ],
      finalExam: [
        {
          questionId: 'q_final_1',
          type: 'apply_real_life',
          questionText: 'Demonstrate how space consolidations and Hebbian pathway rules help you master playing piano simply.',
          gradeRubric: 'Requires integration of structural traffic wires, sleep replaying, and spacing curves.'
        }
      ],
      finalExamCompleted: false,
      mindMap: {
        nodes: [
          { id: 'course_root', label: 'Brain Learning Paths', type: 'course', status: 'available', summary: 'Neural consolidation pathways course root.', score: null },
          
          { id: 'chap_1', label: 'Chapter 1: Synapses Plasticity', type: 'chapter', status: 'completed', summary: 'Physiology of learning coordinates.', score: 90, chapterId: 'chap_1' },
          { id: 'less_1_1', label: 'Lesson 1.1: What are Neurons?', type: 'lesson', status: 'completed', summary: 'Message carrier cells and signal whispering lines.', score: 95, chapterId: 'chap_1', lessonId: 'less_1_1' },
          { id: 'concept_1_1', label: 'Concept: whispers chain', type: 'concept', status: 'completed', summary: 'Neurons fire in sequential telegraph chain metrics.', score: null, chapterId: 'chap_1', lessonId: 'less_1_1' },
          { id: 'less_1_2', label: 'Lesson 1.2: Synaptic Adaptation', type: 'lesson', status: 'completed', summary: 'Connection adjustments based on usage paths.', score: 85, chapterId: 'chap_1', lessonId: 'less_1_2' },
          
          { id: 'chap_2', label: 'Chapter 2: Consolidations', type: 'chapter', status: 'available', summary: 'Fragile buffers sleep writing procedures.', score: null, chapterId: 'chap_2' },
          { id: 'less_2_1', label: 'Lesson 2.1: Memory Consolidation', type: 'lesson', status: 'available', summary: 'Copiers archiving sticky files to deep safe vaults.', score: null, chapterId: 'chap_2', lessonId: 'less_2_1' },
          { id: 'less_2_2', label: 'Lesson 2.2: Spacing Triggers', type: 'lesson', status: 'locked', summary: 'Stamping memory roads right before forgetting resets.', score: null, chapterId: 'chap_2', lessonId: 'less_2_2' }
        ],
        edges: [
          { from: 'course_root', to: 'chap_1' },
          { from: 'chap_1', to: 'less_1_1' },
          { from: 'less_1_1', to: 'concept_1_1' },
          { from: 'chap_1', to: 'less_1_2' },
          { from: 'course_root', to: 'chap_2' },
          { from: 'chap_2', to: 'less_2_1' },
          { from: 'chap_2', to: 'less_2_2' }
        ]
      },
      weakTopics: ['Memory consolidation', 'spaced repetition']
    };

    const initialFlashcards: Flashcard[] = [
      {
        id: 'card_1',
        courseId: 'course_brain',
        question: 'What is Synaptic Plasticity?',
        answer: "Your brain's ability to physically re-shape structure: heavily used roads expand into wide dirt avenues, while unused paths cover over with grass decay.",
        category: 'Chapter 1',
        box: 1,
        nextReviewDate: new Date().toISOString(),
      },
      {
        id: 'card_2',
        courseId: 'course_brain',
        question: 'What does the Hippocampus do?',
        answer: 'Serves as a temporary short-term buffer, writing quick sticky notes that sleep consolidation copying routines write safely to dry storage vaults.',
        category: 'Chapter 2',
        box: 2,
        nextReviewDate: new Date(Date.now() + 86400000).toISOString(),
      },
      {
        id: 'card_3',
        courseId: 'course_brain',
        question: 'Why does spaced repetition work?',
        answer: 'Forces your brain to work right as memory paths fade. This deep footprint spikes proteins, making roads last twice as long with half the cram study work.',
        category: 'Chapter 2',
        box: 1,
        nextReviewDate: new Date().toISOString(),
      }
    ];

    const initialSchedule: ReviewTask[] = [
      {
        id: 'rev_1',
        concept: 'Memory consolidation details',
        courseId: 'course_brain',
        lessonId: 'less_2_1',
        type: 'explain_again',
        scheduledDate: new Date().toISOString(),
        completed: false,
      },
      {
        id: 'rev_2',
        concept: 'Hebbian signal whispering networks',
        courseId: 'course_brain',
        lessonId: 'less_1_1',
        type: 'teach_the_ai',
        scheduledDate: new Date().toISOString(),
        completed: false,
      }
    ];

    setCourses([defaultCourse]);
    setSelectedCourseId(defaultCourse.id);
    setFlashcards(initialFlashcards);
    setReviewSchedule(initialSchedule);
  }, []);

  const handleCourseSelected = (courseId: string) => {
    setSelectedCourseId(courseId);
    setActivePage('outline');
  };

  const handleDeleteCourse = (courseId: string) => {
    setCourses(prev => prev.filter(c => c.id !== courseId));
    setReviewSchedule(prev => prev.filter(t => t.courseId !== courseId));
    if (selectedCourseId === courseId) {
      setSelectedCourseId(null);
      setSelectedChapterId(null);
      setSelectedLessonId(null);
    }
  };

  // Process newly generated course from text uploads
  const handleNewCourseGenerated = (rawCourse: any) => {
    // Sanitize and normalize the course object to adhere strictly to the Course interface
    const formattedTitle = rawCourse.title || rawCourse.courseTitle || 'New Course';
    const formattedSummary = rawCourse.summary || rawCourse.courseSummary || 'Course Summary';
    
    const sanitizedChapters = (rawCourse.chapters || []).map((ch: any, chIdx: number) => {
      const chId = ch.chapterId || `chap_${chIdx + 1}`;
      return {
        chapterId: chId,
        title: ch.title || `Chapter ${chIdx + 1}`,
        summary: ch.summary || '',
        learningGoals: ch.learningGoals || [],
        locked: chIdx > 0, // only chapter 1 is unlocked initially
        completed: ch.completed || false,
        score: ch.score || 0,
        lessons: (ch.lessons || []).map((l: any, lesIdx: number) => {
          const lId = l.lessonId || `less_${chIdx + 1}_${lesIdx + 1}`;
          return {
            lessonId: lId,
            chapterId: chId,
            title: l.title || `Lesson ${chIdx + 1}.${lesIdx + 1}`,
            mainConcept: l.mainConcept || '',
            simpleExplanation: l.simpleExplanation || '',
            analogy: l.analogy || '',
            example: l.example || '',
            keyTerms: l.keyTerms || [],
            commonMisconceptions: l.commonMisconceptions || [],
            feynmanPrompt: l.feynmanPrompt || 'Explain this in your own words.',
            miniQuiz: (l.miniQuiz || []).map((q: any, qIdx: number) => ({
              questionId: q.questionId || `q_${chIdx + 1}_${lesIdx + 1}_${qIdx + 1}`,
              type: q.type || 'multiple_choice',
              questionText: q.questionText || '',
              options: q.options || [],
              correctAnswer: q.correctAnswer || '',
              gradeRubric: q.gradeRubric || ''
            })),
            locked: chIdx > 0 || lesIdx > 0, // lock all lessons except first lesson of first chapter
            completed: l.completed || false,
            score: l.score || 0,
            attemptsCount: l.attemptsCount || 0
          };
        }),
        chapterExam: (ch.chapterExam || []).map((q: any, qIdx: number) => ({
          questionId: q.questionId || `ch_exam_${chId}_${qIdx + 1}`,
          type: q.type || 'explain_back',
          questionText: q.questionText || '',
          options: q.options || [],
          correctAnswer: q.correctAnswer || '',
          gradeRubric: q.gradeRubric || ''
        }))
      };
    });

    const mappedNodes: MindMapNode[] = [];
    const mappedEdges: MindMapEdge[] = [];

    // Reconstruct a sturdy mindMap or sanitize the existing one
    if (rawCourse.mindMap && Array.isArray(rawCourse.mindMap.nodes)) {
      rawCourse.mindMap.nodes.forEach((n: any) => {
        mappedNodes.push({
          id: n.id,
          label: n.label || '',
          type: n.type || 'concept',
          status: n.status || 'available',
          summary: n.summary || '',
          score: n.score !== undefined ? n.score : null,
          chapterId: n.chapterId,
          lessonId: n.lessonId,
        });
      });
      if (Array.isArray(rawCourse.mindMap.edges)) {
        rawCourse.mindMap.edges.forEach((e: any) => {
          mappedEdges.push({
            from: e.from,
            to: e.to,
            label: e.label,
          });
        });
      }
    } else {
      // Fallback: build a correct mind map from computed chapters & lessons
      mappedNodes.push({
        id: 'course_root',
        label: formattedTitle,
        type: 'course',
        status: 'available',
        summary: formattedSummary,
        score: null
      });

      sanitizedChapters.forEach((ch: any) => {
        mappedNodes.push({
          id: ch.chapterId,
          label: ch.title,
          type: 'chapter',
          status: ch.locked ? 'locked' : 'available',
          summary: ch.summary,
          score: null,
          chapterId: ch.chapterId
        });
        mappedEdges.push({ from: 'course_root', to: ch.chapterId });

        ch.lessons.forEach((l: any) => {
          mappedNodes.push({
            id: l.lessonId,
            label: l.title,
            type: 'lesson',
            status: l.locked ? 'locked' : 'available',
            summary: l.mainConcept,
            score: null,
            chapterId: ch.chapterId,
            lessonId: l.lessonId
          });
          mappedEdges.push({ from: ch.chapterId, to: l.lessonId });

          l.keyTerms?.forEach((term: string, tIdx: number) => {
            const conceptId = `concept_${l.lessonId}_${tIdx}`;
            mappedNodes.push({
              id: conceptId,
              label: `Concept: ${term}`,
              type: 'concept',
              status: l.locked ? 'locked' : 'available',
              summary: `Key term in ${l.title}`,
              score: null,
              chapterId: ch.chapterId,
              lessonId: l.lessonId
            });
            mappedEdges.push({ from: l.lessonId, to: conceptId });
          });
        });
      });
    }

    const sanitizedCourse: Course = {
      id: rawCourse.id || `course_${Date.now()}`,
      title: formattedTitle,
      summary: formattedSummary,
      sourceType: rawCourse.sourceType || 'text',
      sourceTitle: rawCourse.sourceTitle || 'Uploaded Doc',
      difficultyLevel: rawCourse.difficultyLevel || 'Medium',
      progress: rawCourse.progress || 0,
      currentChapterId: sanitizedChapters[0]?.chapterId || '',
      currentLessonId: sanitizedChapters[0]?.lessons?.[0]?.lessonId || '',
      chapters: sanitizedChapters,
      finalExam: (rawCourse.finalExam || []).map((q: any, qIdx: number) => ({
        questionId: q.questionId || `q_final_${qIdx + 1}`,
        type: q.type || 'apply_real_life',
        questionText: q.questionText || '',
        options: q.options || [],
        correctAnswer: q.correctAnswer || '',
        gradeRubric: q.gradeRubric || ''
      })),
      finalExamCompleted: rawCourse.finalExamCompleted || false,
      mindMap: {
        nodes: mappedNodes,
        edges: mappedEdges
      },
      weakTopics: rawCourse.weakTopics || []
    };

    setCourses(prev => [sanitizedCourse, ...prev]);
    setSelectedCourseId(sanitizedCourse.id);
    setSelectedChapterId(sanitizedCourse.currentChapterId);
    setSelectedLessonId(sanitizedCourse.currentLessonId);
    
    // Seed flashcards dynamically for the new course
    const generatedFlashcards: Flashcard[] = [];
    let idCounter = 1;
    sanitizedCourse.chapters.forEach(ch => {
      ch.lessons.forEach(l => {
        generatedFlashcards.push({
          id: `fc_new_${Date.now()}_${idCounter++}`,
          courseId: sanitizedCourse.id,
          question: `What is the core idea of "${l.title}"?`,
          answer: l.mainConcept,
          category: (ch.title || '').split(':')[0] || 'General',
          box: 1,
          nextReviewDate: new Date().toISOString()
        });
      });
    });
    setFlashcards(prev => [...generatedFlashcards, ...prev]);

    // Go to roadmap
    setActivePage('outline');
  };

  // Nav to review triggers
  const handleNavigateToReview = (task: ReviewTask) => {
    // Navigate to Lesson Tutor for review
    const targetCourse = courses.find(c => c.id === task.courseId);
    if (targetCourse) {
      setSelectedCourseId(task.courseId);
      // Retrieve chapter context of lesson
      const chapterCtx = targetCourse.chapters.find(ch => ch.lessons.some(l => l.lessonId === task.lessonId));
      if (chapterCtx && task.lessonId) {
        setSelectedChapterId(chapterCtx.chapterId);
        setSelectedLessonId(task.lessonId);
        setActivePage('lesson');
      }
    }
  };

  // Append student Q&A to specific mind map node
  const handleSaveQuestion = (qText: string, aText: string) => {
    if (!selectedCourseId) return;

    // Default target mind map node represents the currently active lesson context
    const activeNodeId = selectedLessonId || 'course_root';
    const newQ: StudentQuestion = {
      id: 'q_' + Date.now(),
      courseId: selectedCourseId,
      nodeId: activeNodeId,
      questionText: qText,
      answerText: aText,
      timestamp: new Date().toISOString(),
    };

    setStudentQuestions(prev => [newQ, ...prev]);
  };

  // Lesson passed callback! Implement locking rules perfectly:
  // "A lesson unlocks after previous lesson is passed. Chapter exam unlocks after all chapter lessons passed..."
  const handleLessonPassed = (lessonId: string, finalScore: number, confidenceRating: number) => {
    if (!selectedCourseId) return;

    // Record lesson completion for the daily study goal
    const todayStr = new Date().toDateString();
    setCompletedLessonsToday(prev => {
      if (prev.some(item => item.lessonId === lessonId && item.dateStr === todayStr)) {
        return prev;
      }
      const updated = [...prev, { lessonId, dateStr: todayStr }];
      try {
        localStorage.setItem('feynman_completed_lessons_today', JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not save completed lessons today to localStorage', e);
      }
      return updated;
    });

    setCourses(prevCourses => {
      return prevCourses.map(course => {
        if (course.id !== selectedCourseId) return course;

        // Traverse chapters to find lesson
        const updatedChapters = course.chapters.map(chapter => {
          let updatedLessons = chapter.lessons.map((lesson, idx) => {
            if (lesson.lessonId === lessonId) {
              return {
                ...lesson,
                completed: true,
                score: Math.max(lesson.score, finalScore),
                attemptsCount: lesson.attemptsCount + 1,
                confidenceRating,
              };
            }
            return lesson;
          });

          // Check if previous lesson passed, unlock next lesson in this chapter
          updatedLessons = updatedLessons.map((lesson, idx, arr) => {
            if (idx > 0 && arr[idx - 1].completed) {
              return { ...lesson, locked: false };
            }
            return lesson;
          });

          // Check if all lessons within chapter are passed -> Chapter completed is NOT automatically true, 
          // user must pass the chapter exam! But chapter completion triggers/locks change.
          return {
            ...chapter,
            lessons: updatedLessons,
          };
        });

        // Compute updated course outline progress
        const total = updatedChapters.reduce((sum, ch) => sum + ch.lessons.length, 0);
        const complete = updatedChapters.reduce((sum, ch) => sum + ch.lessons.filter(l => l.completed).length, 0);
        const nextProgress = Math.floor((complete / total) * 100);

        // Update active placement pointing to next lesson in line
        let nextLId = course.currentLessonId;
        let nextChId = course.currentChapterId;
        
        let foundCurrent = false;
        let setNext = false;
        
        updatedChapters?.forEach(ch => {
          ch?.lessons?.forEach(l => {
            if (foundCurrent && !setNext) {
              nextLId = l.lessonId;
              nextChId = ch.chapterId;
              setNext = true;
            }
            if (l.lessonId === lessonId) {
              foundCurrent = true;
            }
          });
        });

        // Assemble updated nodes inside SVG map
        const updatedMindMapNodes = course.mindMap.nodes.map(node => {
          if (node.lessonId === lessonId) {
            return { ...node, status: 'completed' as const, score: finalScore };
          }
          // Unlock next lesson node on SVG map
          if (node.lessonId === nextLId && setNext) {
            return { ...node, status: 'available' as const };
          }
          return node;
        });

        return {
          ...course,
          chapters: updatedChapters,
          progress: Math.max(course.progress, nextProgress),
          currentChapterId: nextChId,
          currentLessonId: nextLId,
          mindMap: {
            ...course.mindMap,
            nodes: updatedMindMapNodes,
          }
        };
      });
    });

    // Mark corresponding Review Task as resolved if lesson was part of the spaced review queue
    setReviewSchedule(prev => prev.map(t => t.lessonId === lessonId ? { ...t, completed: true } : t));

    // Return to outline
    setActivePage('outline');
  };

  // Mini quiz or chapter exam completed callback
  const handleTestingFinished = (passed: boolean, finalScore: number, responses: any, aiFeedback: string) => {
    if (!selectedCourseId) return;

    if (activePage === 'quiz' && selectedLessonId) {
      if (passed) {
        // Automatically invoke complete course updater
        handleLessonPassed(selectedLessonId, finalScore, 4);
      } else {
        // Schedule review earlier due to failure
        const activeLesson = courses.find(c => c.id === selectedCourseId)
          ?.chapters.flatMap(ch => ch.lessons)
          .find(l => l.lessonId === selectedLessonId);

        if (activeLesson) {
          const earlyReview: ReviewTask = {
            id: 'rev_fail_' + Date.now(),
            concept: `Review: ${activeLesson.title}`,
            courseId: selectedCourseId,
            lessonId: selectedLessonId,
            type: 'explain_again',
            scheduledDate: new Date().toISOString(), // Immediate
            completed: false,
          };
          setReviewSchedule(prev => [earlyReview, ...prev]);
        }
        setActivePage('outline');
      }
    } else if (activePage === 'exam' && selectedChapterId) {
      // Chapter Exam passed -> Unlocks next chapter!
      if (passed) {
        setCourses(prevCourses => {
          return prevCourses.map(course => {
            if (course.id !== selectedCourseId) return course;

            const updatedChapters = course.chapters.map((ch, idx, arr) => {
              if (ch.chapterId === selectedChapterId) {
                return { ...ch, completed: true, score: finalScore };
              }
              // Unlock downstream chapter
              if (idx > 0 && arr[idx - 1].chapterId === selectedChapterId) {
                return { 
                  ...ch, 
                  locked: false,
                  lessons: ch.lessons.map((l, lIdx) => lIdx === 0 ? { ...l, locked: false } : l)
                };
              }
              return ch;
            });

            // Update SVG Mindmap
            const updatedNodes = course.mindMap.nodes.map(node => {
              if (node.chapterId === selectedChapterId && node.type === 'chapter') {
                return { ...node, status: 'completed' as const, score: finalScore };
              }
              // Unlock next chapter nodes on map
              const chTargetIdx = course.chapters.findIndex(c => c.chapterId === selectedChapterId);
              const nextChapter = course.chapters[chTargetIdx + 1];
              if (nextChapter && node.chapterId === nextChapter.chapterId) {
                return { ...node, status: 'available' as const };
              }
              return node;
            });

            return {
              ...course,
              chapters: updatedChapters,
              progress: Math.min(course.progress + 15, 100),
              mindMap: {
                ...course.mindMap,
                nodes: updatedNodes,
              }
            };
          });
        });
      }
      setActivePage('outline');
    } else if (activePage === 'exam' && !selectedChapterId) {
      // Final exam passed! Mark course complete
      if (passed) {
        setCourses(prev => prev.map(c => c.id === selectedCourseId ? {
          ...c,
          progress: 100,
          finalExamCompleted: true,
          finalExamScore: finalScore,
        } : c));
      }
      setActivePage('outline');
    }
  };

  // Leitner rating trigger
  const handleReviewFlashcard = (cardId: string, remembered: boolean) => {
    setFlashcards(prev => prev.map(c => {
      if (c.id === cardId) {
        const nextBox = remembered ? Math.min(c.box + 1, 5) : 1;
        // Interval spacing in days: Box 1=1d, 2=3d, 3=7d, 4=14d, 5=30d
        const days = nextBox === 1 ? 1 : nextBox === 2 ? 3 : nextBox === 3 ? 7 : nextBox === 4 ? 14 : 30;
        return {
          ...c,
          box: nextBox,
          nextReviewDate: new Date(Date.now() + days * 86400000).toISOString(),
        };
      }
      return c;
    }));
  };

  // Retrieve active selected components references
  const activeCourse = courses.find(c => c.id === selectedCourseId) || courses[0];
  const activeChapter = activeCourse?.chapters?.find(ch => ch.chapterId === selectedChapterId);
  const activeLesson = activeChapter?.lessons?.find(l => l.lessonId === selectedLessonId);

  return (
    <div className={`min-h-screen bg-slate-50 flex text-slate-800 font-sans ${isDarkMode ? 'dark-theme' : 'light-theme'}`} id="app-wrapper">
      {/* SIDEBAR NAVIGATION SHELL */}
      <aside className={`hidden md:flex flex-col ${isZenMode ? 'w-18' : 'w-64'} bg-slate-900 text-slate-300 border-r border-slate-850 shrink-0 transition-all duration-300 ease-in-out`} id="app-sidebar">
        <div className={`p-6 border-b border-slate-850 flex items-center ${isZenMode ? 'justify-center' : 'gap-4'}`} id="sidebar-header">
          <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-serif font-bold text-xl shadow-sm cursor-pointer" id="app-logo" onClick={() => setIsZenMode(!isZenMode)} title={isZenMode ? 'Double click or tap to expand sidebar' : 'Feynman AI Logo'}>
            Φ
          </div>
          {!isZenMode && (
            <div className="animate-fade-in">
              <h1 className="font-bold text-white text-base tracking-tight font-serif leading-tight">Feynman AI</h1>
              <span className="text-[9px] text-blue-100 font-bold uppercase tracking-widest block mt-0.5">MASTERY THROUGH TEACHING</span>
            </div>
          )}
        </div>

        {/* Sidebar Nav anchors */}
        <nav className={`flex-1 p-4 space-y-1.5 transition-all duration-300 ease-in-out ${isZenMode ? 'w-18' : 'w-64'}`} id="sidebar-nav">
          <button
            onClick={() => { setActivePage('dashboard'); setMobileMenuOpen(false); }}
            className={`w-full text-left rounded-xl text-xs font-bold transition-all flex items-center ${isZenMode ? 'justify-center p-3 w-10 h-10 mx-auto' : 'px-4 py-3 gap-3'} cursor-pointer ${
              activePage === 'dashboard' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800'
            }`}
            title={isZenMode ? 'Student Dashboard' : ''}
          >
            <Compass className="h-4.5 w-4.5 shrink-0" />
            {!isZenMode && <span>Student Dashboard</span>}
          </button>

          {activeCourse && (
            <>
              <button
                onClick={() => { setActivePage('outline'); setMobileMenuOpen(false); }}
                className={`w-full text-left rounded-xl text-xs font-bold transition-all flex items-center ${isZenMode ? 'justify-center p-3 w-10 h-10 mx-auto' : 'px-4 py-3 gap-3'} cursor-pointer ${
                  activePage === 'outline' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800'
                }`}
                title={isZenMode ? 'Course Outline' : ''}
              >
                <BookOpen className="h-4.5 w-4.5 shrink-0" />
                {!isZenMode && <span>Course Outline</span>}
              </button>
              <button
                onClick={() => { setActivePage('mindmap'); setMobileMenuOpen(false); }}
                className={`w-full text-left rounded-xl text-xs font-bold transition-all flex items-center ${isZenMode ? 'justify-center p-3 w-10 h-10 mx-auto' : 'px-4 py-3 gap-3'} cursor-pointer ${
                  activePage === 'mindmap' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800'
                }`}
                title={isZenMode ? 'Mind Map Tree' : ''}
              >
                <Map className="h-4.5 w-4.5 shrink-0" />
                {!isZenMode && <span>Mind Map Tree</span>}
              </button>
              <button
                onClick={() => { setActivePage('progress'); setMobileMenuOpen(false); }}
                className={`w-full text-left rounded-xl text-xs font-bold transition-all flex items-center ${isZenMode ? 'justify-center p-3 w-10 h-10 mx-auto' : 'px-4 py-3 gap-3'} cursor-pointer ${
                  activePage === 'progress' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800'
                }`}
                title={isZenMode ? 'Spaced Recall' : ''}
              >
                <Trophy className="h-4.5 w-4.5 shrink-0" />
                {!isZenMode && <span>Spaced Recall</span>}
              </button>
              <button
                onClick={() => { setActivePage('teachtheai'); setMobileMenuOpen(false); }}
                className={`w-full text-left rounded-xl text-xs font-bold transition-all flex items-center ${isZenMode ? 'justify-center p-3 w-10 h-10 mx-auto' : 'px-4 py-3 gap-3'} cursor-pointer ${
                  activePage === 'teachtheai' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800'
                }`}
                title={isZenMode ? 'Teach the AI Mode' : ''}
              >
                <UserCheck className="h-4.5 w-4.5 shrink-0" />
                {!isZenMode && <span>Teach the AI Mode</span>}
              </button>
            </>
          )}

          <button
            onClick={() => { setActivePage('settings'); setMobileMenuOpen(false); }}
            className={`w-full text-left rounded-xl text-xs font-bold transition-all flex items-center ${isZenMode ? 'justify-center p-3 w-10 h-10 mx-auto' : 'px-4 py-3 gap-3'} cursor-pointer ${
              activePage === 'settings' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800'
            }`}
            title={isZenMode ? 'AI Configurations' : ''}
          >
            <SettingsIcon className="h-4.5 w-4.5 shrink-0" />
            {!isZenMode && <span>AI Configurations</span>}
          </button>

          {/* Zen Focus Mode Toggle Button */}
          <button
            type="button"
            onClick={() => setIsZenMode(!isZenMode)}
            className={`w-full rounded-xl text-xs font-bold transition-all flex items-center cursor-pointer mt-6 border border-dashed ${
              isZenMode 
                ? 'justify-center p-3 w-10 h-10 mx-auto text-blue-400 bg-blue-955/20 border-blue-500/20 hover:bg-slate-800' 
                : 'px-4 py-3 gap-3 text-slate-400 border-slate-850 hover:bg-slate-800 hover:text-slate-200'
            }`}
            title={isZenMode ? 'Exit Zen Focus Mode (Expand)' : 'Enter Zen Focus Mode (Collapse)'}
            id="zen-mode-toggle"
          >
            {isZenMode ? (
              <Eye className="h-4.5 w-4.5 text-blue-400 animate-pulse shrink-0" />
            ) : (
              <EyeOff className="h-4.5 w-4.5 text-slate-500 shrink-0" />
            )}
            {!isZenMode && (
              <div className="flex-1 flex items-center justify-between">
                <span>Zen Focus Mode</span>
                <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-blue-955/40 text-blue-400 border border-blue-900/30 uppercase tracking-wide">
                  Zen
                </span>
              </div>
            )}
          </button>
        </nav>

        {/* Theme select option */}
        {!isZenMode ? (
          <div className="px-4 py-3 mx-4 mb-2 bg-slate-850/40 rounded-xl border border-slate-850/60 flex items-center justify-between" id="theme-toggle-box">
            <span className="text-[11px] font-bold text-slate-400 font-sans tracking-wide">STUDY LIGHTS</span>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-300 hover:text-white transition-all cursor-pointer shadow-2xs hover:border-slate-700 hover:bg-slate-850"
              title="Toggle between Classical sand wood styling and Deep Charcoal dark mode"
              id="theme-toggle-button"
            >
              {isDarkMode ? (
                <>
                  <Moon className="h-3.5 w-3.5 text-blue-100 fill-blue-100/20" />
                  <span>Midnight</span>
                </>
              ) : (
                <>
                  <Sun className="h-3.5 w-3.5 text-blue-100" />
                  <span>Classic</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex justify-center mb-4" id="theme-toggle-box">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-850 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer shadow-2xs hover:border-slate-750"
              title="Toggle theme mode"
              id="theme-toggle-button"
            >
              {isDarkMode ? (
                <Moon className="h-4.5 w-4.5 text-blue-100 fill-blue-100/20" />
              ) : (
                <Sun className="h-4.5 w-4.5 text-orange-400" />
              )}
            </button>
          </div>
        )}

        {/* User Badge footer */}
        <div className={`p-4 border-t border-slate-850 text-xs text-slate-500`} id="sidebar-footer">
          {isZenMode ? (
            <div className="flex flex-col items-center gap-2">
              <span className="text-slate-400 font-bold" title="Scholar active">🎓</span>
              <div 
                className={`h-2.5 w-2.5 rounded-full ${currentUser ? 'bg-emerald-500 animate-pulse' : 'bg-slate-650'}`} 
                title={currentUser ? `Connected as ${currentUser.email}` : "Localized Mode (Not logged in)"}
              />
            </div>
          ) : (
            <div>
              {currentUser ? (
                <div className="space-y-2 text-left">
                  <div className="flex items-center gap-2.5">
                    {currentUser.photoURL ? (
                      <img src={currentUser.photoURL} alt={currentUser.displayName || ''} className="h-6.5 w-6.5 rounded-full border border-slate-700" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="h-6.5 w-6.5 bg-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white uppercase font-sans">
                        {currentUser.displayName ? currentUser.displayName[0] : 'S'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-slate-200 truncate leading-tight font-sans">
                        {currentUser.displayName || 'Learner'}
                      </p>
                      <p className="text-[9px] text-emerald-400 font-semibold flex items-center gap-1.5 mt-0.5 leading-none font-sans">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-450 animate-ping shrink-0" />
                        Firestore Synced
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleGoogleSignOut}
                    className="w-full text-center py-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-[10px] font-bold text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors cursor-pointer font-sans"
                  >
                    Disconnect Cloud
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5 text-left">
                  <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider leading-none">Database Storage</p>
                  <button
                    onClick={handleGoogleSignIn}
                    className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 hover:shadow-md text-[11px] font-bold text-white flex items-center justify-center gap-2 transition-all cursor-pointer font-sans"
                    id="sidebar-google-connect-btn"
                  >
                    Connect Database
                  </button>
                  <p className="text-[9px] text-slate-550 leading-relaxed font-sans mt-1">
                    Sign in with Google to establish cloud database syncing.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* MOBILE HEADER RESPONSIVE TOGGLES */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-serif font-bold text-base shadow-sm">
              Φ
            </div>
            <span className="font-bold text-sm tracking-tight font-serif">Feynman AI Tutor</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 pointer-events-auto flex items-center justify-center"
              title="Toggle theme"
              id="mobile-theme-toggle"
            >
              {isDarkMode ? <Sun className="h-4 w-4 text-blue-100" /> : <Moon className="h-4 w-4 text-blue-100" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 pointer-events-auto"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </header>

        {/* Mobile Navigation overlay drawer */}
        {mobileMenuOpen && (
          <nav className="md:hidden bg-slate-950 text-white p-4 border-b border-slate-800 space-y-2 z-50">
            <button
              onClick={() => { setActivePage('dashboard'); setMobileMenuOpen(false); }}
              className="w-full text-left p-3 rounded-xl text-xs font-bold block"
            >
              Dashboard
            </button>
            {activeCourse && (
              <>
                <button
                  onClick={() => { setActivePage('outline'); setMobileMenuOpen(false); }}
                  className="w-full text-left p-3 rounded-xl text-xs font-bold block"
                >
                  Outline
                </button>
                <button
                  onClick={() => { setActivePage('mindmap'); setMobileMenuOpen(false); }}
                  className="w-full text-left p-3 rounded-xl text-xs font-bold block"
                >
                  Mind Map
                </button>
                <button
                  onClick={() => { setActivePage('progress'); setMobileMenuOpen(false); }}
                  className="w-full text-left p-3 rounded-xl text-xs font-bold block"
                >
                  Recall & analytics
                </button>
                <button
                  onClick={() => { setActivePage('teachtheai'); setMobileMenuOpen(false); }}
                  className="w-full text-left p-3 rounded-xl text-xs font-bold block"
                >
                  Teach the AI Mode
                </button>
              </>
            )}
            <button
              onClick={() => { setActivePage('settings'); setMobileMenuOpen(false); }}
              className="w-full text-left p-3 rounded-xl text-xs font-bold block"
            >
              AI Settings
            </button>
          </nav>
        )}

        {/* MAIN DYNAMIC CONTENT ROUTER */}
        <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full overflow-y-auto">
          <AnimatePresence mode="wait">
            {activePage === 'dashboard' && (
              <Dashboard
                courses={courses}
                reviewSchedule={reviewSchedule}
                onSelectCourse={handleCourseSelected}
                onNavigateToUpload={() => setActivePage('upload')}
                onNavigateToReview={handleNavigateToReview}
                dailyGoal={dailyGoal}
                completedLessonsCountToday={completedLessonsToday.length}
                onUpdateDailyGoal={handleUpdateDailyGoal}
                onDeleteCourse={handleDeleteCourse}
                currentUser={currentUser}
                onSignIn={handleGoogleSignIn}
              />
            )}

            {activePage === 'upload' && (
              <SourceUpload
                settings={aiSettings}
                onCourseGenerated={handleNewCourseGenerated}
              />
            )}

            {activePage === 'outline' && activeCourse && (
              <CourseOutline
                course={activeCourse}
                studentQuestions={studentQuestions}
                onSelectLesson={(chId, lesId) => {
                  setSelectedChapterId(chId);
                  setSelectedLessonId(lesId);
                  setActivePage('lesson');
                }}
                onSelectQuiz={(chId, lesId) => {
                  setSelectedChapterId(chId);
                  setSelectedLessonId(lesId);
                  setActivePage('quiz');
                }}
                onSelectChapterExam={(chId) => {
                  setSelectedChapterId(chId);
                  setSelectedLessonId(null);
                  setActivePage('exam');
                }}
                onSelectFinalExam={() => {
                  setSelectedChapterId(null);
                  setSelectedLessonId(null);
                  setActivePage('exam');
                }}
              />
            )}

            {activePage === 'mindmap' && activeCourse && (
              <MindMap
                course={activeCourse}
                studentQuestions={studentQuestions}
                onNavigateToLesson={(chId, lesId) => {
                  setSelectedChapterId(chId);
                  setSelectedLessonId(lesId);
                  setActivePage('lesson');
                }}
              />
            )}

            {activePage === 'lesson' && activeCourse && activeChapter && activeLesson && (
              <LessonTutor
                course={activeCourse}
                chapter={activeChapter}
                lesson={activeLesson}
                settings={aiSettings}
                onBackToOutline={() => setActivePage('outline')}
                onSaveQuestion={handleSaveQuestion}
                onLessonPassed={handleLessonPassed}
              />
            )}

            {(activePage === 'quiz' || activePage === 'exam') && activeCourse && (
              <QuizExam
                course={activeCourse}
                chapter={activeChapter || undefined}
                lesson={activeLesson || undefined}
                settings={aiSettings}
                type={activePage === 'quiz' ? 'quiz' : selectedChapterId ? 'chapter_exam' : 'final_exam'}
                questions={
                  activePage === 'quiz' && activeLesson
                    ? activeLesson.miniQuiz
                    : selectedChapterId && activeChapter
                    ? activeChapter.chapterExam
                    : activeCourse.finalExam
                }
                onBackToOutline={() => setActivePage('outline')}
                onGradingFinished={handleTestingFinished}
              />
            )}

            {activePage === 'progress' && activeCourse && (
              <ProgressTracker
                course={activeCourse}
                flashcards={flashcards.filter(f => f.courseId === activeCourse.id)}
                reviewSchedule={reviewSchedule.filter(r => r.courseId === activeCourse.id)}
                onReviewFlashcard={handleReviewFlashcard}
                onNavigateToReview={handleNavigateToReview}
                reviewStreak={reviewStreak}
                onSetReviewStreak={setReviewStreak}
                badges={badges}
                onTriggerUnlockBadge={(badgeId) => {
                  setBadges(prev => prev.map(b => b.id === badgeId ? { ...b, unlocked: true, unlockedAt: new Date().toLocaleDateString() } : b));
                }}
                onResetBadges={() => {
                  setReviewStreak(3);
                  // Restore initial progress block
                  setCourses(prev => prev.map(c => c.id === activeCourse.id ? { ...c, progress: 42, finalExamCompleted: false } : c));
                  setBadges(prev => prev.map(b => b.id === 'analogy_architect' ? b : { ...b, unlocked: false, unlockedAt: undefined }));
                }}
                onSetCourseCompleteMock={() => {
                  setCourses(prev => prev.map(c => c.id === activeCourse.id ? { ...c, progress: 100, finalExamCompleted: true } : c));
                }}
              />
            )}

            {activePage === 'teachtheai' && activeCourse && (
              <TeachTheAi
                course={activeCourse}
                settings={aiSettings}
                onBackToOutline={() => setActivePage('outline')}
              />
            )}

            {activePage === 'settings' && (
              <Settings
                settings={aiSettings}
                onSaveSettings={setAiSettings}
              />
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Badge Achievement Celebration Overlay */}
      <AnimatePresence>
        {unlockedBadgeNotify && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-sans"
            id="badge-celebration-overlay"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 max-w-sm w-full relative space-y-4 text-center overflow-hidden"
              id="celebration-card-body"
            >
              {/* Confetti decor highlights */}
              <div className="absolute top-0 left-0 w-32 h-32 bg-blue-50 rounded-full mix-blend-multiply opacity-60 filter blur-xl -translate-x-12 -translate-y-12" />
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-rose-50 rounded-full mix-blend-multiply opacity-60 filter blur-xl translate-x-12 translate-y-12" />

              <div className="relative space-y-3">
                <button
                  onClick={() => setUnlockedBadgeNotify(null)}
                  className="absolute -top-1 -right-1 p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full cursor-pointer transition-all"
                >
                  <X className="h-4.5 w-4.5" />
                </button>

                <div className="inline-flex p-4 bg-gradient-to-br from-amber-100 to-amber-200 text-amber-600 rounded-full shadow-xs mb-1">
                  <Trophy className="h-9 w-9 animate-bounce" />
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-indigo-600 tracking-widest font-mono">Achievement Unlocked!</span>
                  <h3 className="text-lg font-extrabold text-slate-900">{unlockedBadgeNotify.title}</h3>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed px-1">
                  {unlockedBadgeNotify.description}
                </p>

                <div className="bg-blue-50/60 border border-blue-100 p-2.5 rounded-xl text-[10px] font-mono text-blue-700">
                  UNLOCKED SUCCESSFULLY!
                </div>

                <button
                  onClick={() => setUnlockedBadgeNotify(null)}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
                >
                  Acknowledge Mastery
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
