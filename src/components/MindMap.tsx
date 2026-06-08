/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Play, Award, AwardIcon, HelpCircle, Check, Info, FileText } from 'lucide-react';
import { Course, MindMapNode, MindMapEdge, StudentQuestion } from '../types';

interface MindMapProps {
  course: Course;
  studentQuestions: StudentQuestion[];
  onNavigateToLesson: (chapterId: string, lessonId: string) => void;
}

export default function MindMap({
  course,
  studentQuestions,
  onNavigateToLesson,
}: MindMapProps) {
  const [selectedNode, setSelectedNode] = useState<MindMapNode | null>(null);

  // Layout node coordinates natively & adaptively based on ID for top-notch responsivity
  const getNodeCoordinates = (nodeId: string): { x: number; y: number } => {
    // Map of custom node coordinates designed to fit elegantly into an 800x500 box
    const coordinates: { [id: string]: { x: number; y: number } } = {
      course_root: { x: 400, y: 240 },
      // Chapter 1 sub-branch (Left Side)
      chap_1: { x: 220, y: 160 },
      less_1_1: { x: 80, y: 110 },
      concept_1_1: { x: 60, y: 40 },
      less_1_2: { x: 120, y: 230 },
      concept_1_2: { x: 50, y: 300 },
      // Chapter 2 sub-branch (Right Side)
      chap_2: { x: 580, y: 160 },
      less_2_1: { x: 720, y: 110 },
      concept_2_1: { x: 740, y: 45 },
      less_2_2: { x: 680, y: 230 },
      concept_2_2: { x: 750, y: 300 },
      // Exams
      ch_exam_chap_1: { x: 200, y: 340 },
      ch_exam_chap_2: { x: 600, y: 340 },
    };

    if (coordinates[nodeId]) return coordinates[nodeId];

    // Fallback dynamic placement logic if unrecognized nodes are generated
    const hash = (nodeId || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const angle = (hash % 360) * (Math.PI / 180);
    const radius = 180 + (hash % 80);
    return {
      x: 400 + Math.cos(angle) * radius,
      y: 240 + Math.sin(angle) * (radius * 0.7),
    };
  };

  // Associate styles to statuses
  const getNodeColorClass = (node: MindMapNode) => {
    if (node.type === 'concept') {
      const isWeak = (course.weakTopics || []).includes(node.label) || (course.weakTopics || []).some(w => node.id.includes(w));
      if (isWeak) return { bg: 'bg-rose-50', border: 'border-rose-400 text-rose-700', fill: '#F4EAE1', stroke: '#BC6C25' };
      return { bg: 'bg-indigo-50', border: 'border-indigo-200 text-indigo-700', fill: '#EAE4D9', stroke: '#5A7D6F' };
    }

    switch (node.status) {
      case 'completed':
        return { bg: 'bg-emerald-500 text-white', border: 'border-emerald-600', fill: '#5A7D6F', stroke: '#466256' };
      case 'review':
        return { bg: 'bg-amber-400 text-slate-900', border: 'border-amber-500', fill: '#DDE5B6', stroke: '#BC6C25' };
      case 'weak':
        return { bg: 'bg-rose-500 text-white', border: 'border-rose-600', fill: '#BC6C25', stroke: '#A25B1D' };
      case 'available':
        return { bg: 'bg-blue-500 text-white', border: 'border-blue-600', fill: '#719385', stroke: '#5A7D6F' };
      case 'locked':
      default:
        return { bg: 'bg-slate-200 text-slate-400', border: 'border-slate-300', fill: '#E6E2D3', stroke: '#C2BEB4' };
    }
  };

  const getPopNodeStatusBadge = (node: MindMapNode) => {
    const isWeak = (course.weakTopics || []).includes(node.label) || node.status === 'weak';
    if (isWeak) return <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5">Weak Area</span>;
    if (node.status === 'completed') return <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5">Understood</span>;
    if (node.status === 'available') return <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5">Available</span>;
    if (node.status === 'review') return <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-150 rounded px-1.5 py-0.5">Needs Review</span>;
    return <span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5">Locked</span>;
  };

  // Click handler to route
  const handleActionClick = (node: MindMapNode) => {
    let targetCh = node.chapterId || course.chapters?.[0]?.chapterId;
    let targetLes = node.lessonId || course.chapters?.[0]?.lessons?.[0]?.lessonId;
    
    // Find chapter context if node belongs to a certain chapter or lesson
    if (node.id.includes('1_1')) {
      targetCh = 'chap_1'; targetLes = 'less_1_1';
    } else if (node.id.includes('1_2')) {
      targetCh = 'chap_1'; targetLes = 'less_1_2';
    } else if (node.id.includes('2_1')) {
      targetCh = 'chap_2'; targetLes = 'less_2_1';
    } else if (node.id.includes('2_2')) {
      targetCh = 'chap_2'; targetLes = 'less_2_2';
    }

    if (targetCh && targetLes) {
      onNavigateToLesson(targetCh, targetLes);
    }
  };

  // Nodes to paint
  const nodes: MindMapNode[] = course.mindMap?.nodes || [];
  const edges: MindMapEdge[] = course.mindMap?.edges || [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
      id="mind-map-view"
    >
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold font-sans text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="h-5.5 w-5.5 text-blue-600 animate-pulse" />
            Knowledge Mind Map
          </h2>
          <p className="text-slate-500 text-xs">
            A dynamic, structured visualization of your course outline. Hover or tap nodes to review micro-explanations, student questions, and scores.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-[10px] shadow-2xs font-medium text-slate-600">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Understood</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Ready</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Weak Area</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Needs Review</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-slate-300" /> Locked</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Mind map canvas */}
        <div className="lg:col-span-3 bg-slate-950 border border-slate-800 rounded-3xl p-6 relative overflow-hidden h-[480px] select-none shadow-inner flex items-center justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-35" />
          
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 800 480" preserveAspectRatio="xMidYMid meet">
            {/* Draw connectors/edges */}
            {edges.map((edge, idx) => {
              const start = getNodeCoordinates(edge.from);
              const end = getNodeCoordinates(edge.to);
              const labelX = (start.x + end.x) / 2;
              const labelY = (start.y + end.y) / 2;

              // Bezier curve coordinate modifier
              const dx = end.x - start.x;
              const dy = end.y - start.y;
              const cx1 = start.x + dx * 0.4;
              const cy1 = start.y;
              const cx2 = start.x + dx * 0.6;
              const cy2 = end.y;

              const rootIsUnlocked = course.chapters?.some(c => !c.locked) ?? false;

              return (
                <g key={idx}>
                  <path
                    d={`M ${start.x} ${start.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${end.x} ${end.y}`}
                    fill="none"
                    stroke={rootIsUnlocked ? '#1e293b' : '#334155'}
                    strokeWidth={2}
                    className="stroke-slate-700/60 transition-all duration-300"
                  />
                  {edge.label && (
                    <text
                      x={labelX}
                      y={labelY - 5}
                      fill="#64748b"
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                      className="font-medium bg-slate-950 px-1"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Render Nodes in visual space */}
            {nodes.map((node) => {
              const coords = getNodeCoordinates(node.id);
              const style = getNodeColorClass(node);
              const isSelected = selectedNode?.id === node.id;
              
              // Map types to radius or forms
              const isMainCourse = node.type === 'course';
              const isChapter = node.type === 'chapter';
              const isExam = node.type === 'exam';
              const isLesson = node.type === 'lesson';

              let r = 16;
              if (isMainCourse) r = 24;
              else if (isChapter) r = 20;

              return (
                <g key={node.id} className="cursor-pointer">
                  {/* Glowing perimeter rings */}
                  {(isSelected || node.status === 'review') && (
                    <circle
                      cx={coords.x}
                      cy={coords.y}
                      r={r + 8}
                      fill="none"
                      stroke={style.stroke}
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      className="animate-spin"
                      style={{ animationDuration: '10s' }}
                    />
                  )}
                  
                  {/* Core Node shape */}
                  <circle
                    cx={coords.x}
                    cy={coords.y}
                    r={r}
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth={isSelected ? 4 : 2}
                    onClick={() => setSelectedNode(node)}
                    className="hover:scale-110 active:scale-95 transition-all duration-200"
                    style={{ pointerEvents: 'all' }}
                  />

                  {/* Node Label Text */}
                  <text
                    x={coords.x}
                    y={coords.y + r + 16}
                    fill="#f1f5f9"
                    fontSize="10"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="pointer-events-none drop-shadow-sm truncate max-w-[120px]"
                  >
                    {node.label.length > 20 ? node.label.substring(0, 18) + '..' : node.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Right Col: Collapsible node detail popup cards */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between" id="node-popover-panel">
          <AnimatePresence mode="wait">
            {selectedNode ? (
              <motion.div
                key={selectedNode.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-5 h-full flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
                      {selectedNode.type} NODE
                    </span>
                    {getPopNodeStatusBadge(selectedNode)}
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-md font-bold text-slate-900 leading-tight">
                      {selectedNode.label}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {selectedNode.summary || 'Summary concepts placeholder for diagnostic tracking.'}
                    </p>
                  </div>

                  {/* Best evaluation grade for node */}
                  {selectedNode.score !== null && (
                    <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 p-2.5 rounded-xl flex justify-between items-center text-xs font-semibold">
                      <span>Highest score:</span>
                      <span className="font-mono">{selectedNode.score}%</span>
                    </div>
                  )}

                  {/* Student Questions list linked to this specific nodeId */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <h4 className="text-[11px] font-bold text-slate-450 uppercase tracking-wider inline-flex items-center gap-1.5">
                      <HelpCircle className="h-4 w-4 text-slate-450" />
                      Saved Node Questions ({studentQuestions.filter(q => q.nodeId === selectedNode.id).length})
                    </h4>
                    
                    <div className="space-y-2 max-h-[140px] overflow-y-auto">
                      {studentQuestions.filter(q => q.nodeId === selectedNode.id).length === 0 ? (
                        <div className="text-[11px] text-slate-400 italic">No questions saved here yet. Ask questions anytime during tutor sessions to attach them!</div>
                      ) : (
                        studentQuestions
                          .filter(q => q.nodeId === selectedNode.id)
                          .map((q) => (
                            <div key={q.id} className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-[11px] space-y-1">
                              <div className="font-bold text-slate-800">Q: {q.questionText}</div>
                              <div className="text-slate-550 italic line-clamp-2">A: {q.answerText}</div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Navigation CTA to relevant node content */}
                {selectedNode.status !== 'locked' && (selectedNode.type === 'lesson' || selectedNode.type === 'concept') ? (
                  <button
                    onClick={() => handleActionClick(selectedNode)}
                    className="w-full cursor-pointer mt-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/10 active:scale-98"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    Open Lesson Tutor
                  </button>
                ) : selectedNode.status === 'locked' ? (
                  <div className="text-xs text-slate-400 italic text-center py-2 bg-slate-50 border border-slate-200 rounded-xl mt-4">
                    Unlock previous nodes to access this content.
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic text-center py-2 bg-slate-50 border border-slate-250 border-dashed rounded-xl mt-4">
                    Course Outline anchor node. Select a lesson branch.
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="text-center py-20 text-slate-400 text-xs space-y-2.5 h-full flex flex-col justify-center items-center">
                <Info className="h-8 w-8 text-slate-300" />
                <p>Tap any circle node on the SVG mind map map layout to inspect custom diagnostic parameters, scores, and questions.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
