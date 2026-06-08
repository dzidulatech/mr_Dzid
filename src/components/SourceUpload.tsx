/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { motion } from 'motion/react';
import { Upload, Link, AlignLeft, FileText, Check, AlertCircle, Sparkles, BookOpen } from 'lucide-react';
import { SourceType, AISettings } from '../types';

interface SourceUploadProps {
  settings?: AISettings;
  onCourseGenerated: (courseData: any) => void;
}

export default function SourceUpload({ settings, onCourseGenerated }: SourceUploadProps) {
  const [sourceType, setSourceType] = useState<SourceType>('text');
  const [sourceTitle, setSourceTitle] = useState('');
  const [textInput, setTextInput] = useState('');
  const [linkInput, setLinkInput] = useState('');
  
  // PDF state simulation
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Status indicators
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [estimatedDifficulty, setEstimatedDifficulty] = useState<'Beginner' | 'Medium' | 'Advanced' | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-calculate properties upon preview update
  const handlePreviewUpdated = (text: string, title?: string) => {
    setPreviewText(text);
    if (title && !sourceTitle) {
      setSourceTitle(title);
    }
    const wordCount = (text || '').trim().split(/\s+/).length;
    if (wordCount < 200) {
      setEstimatedDifficulty('Beginner');
    } else if (wordCount < 1000) {
      setEstimatedDifficulty('Medium');
    } else {
      setEstimatedDifficulty('Advanced');
    }
  };

  // URL extraction trigger
  const handleExtractUrl = async () => {
    if (!linkInput) return;
    setIsExtracting(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/extract-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: linkInput }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      handlePreviewUpdated(data.text, data.title || 'Extracted Website');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to connect to the webpage.');
    } finally {
      setIsExtracting(false);
    }
  };

  // Drag-and-drop files
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        processPdfFile(file);
      } else {
        setErrorMsg('Only PDF files are supported here.');
      }
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processPdfFile(e.target.files[0]);
    }
  };

  const loadPdfjs = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      const existing = document.getElementById('pdfjs-library-loader');
      if (existing && (window as any).pdfjsLib) {
        resolve((window as any).pdfjsLib);
        return;
      }
      if ((window as any).pdfjsLib) {
        resolve((window as any).pdfjsLib);
        return;
      }

      const script = document.createElement('script');
      script.id = 'pdfjs-library-loader';
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
      script.onload = () => {
        const pdfjsLib = (window as any).pdfjsLib;
        if (pdfjsLib) {
          // Point to worker
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
          resolve(pdfjsLib);
        } else {
          reject(new Error('PDF.js loaded but the global lib object is missing.'));
        }
      };
      script.onerror = () => {
        reject(new Error('Failed to load PDF parsing engine from CDN. Check your network.'));
      };
      document.head.appendChild(script);
    });
  };

  const processPdfFile = (file: File) => {
    setPdfFile(file);
    setIsExtracting(true);
    setErrorMsg('');
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        if (!arrayBuffer) {
          throw new Error('Could not read the PDF file buffer.');
        }

        const pdfjsLib = await loadPdfjs();
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdf = await loadingTask.promise;
        
        let extractedText = '';
        const limitPages = Math.min(pdf.numPages, 10); // Extract up to 10 pages for performance and context limits
        
        for (let i = 1; i <= limitPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          
          if (pageText.trim()) {
            extractedText += pageText + '\n\n';
          }
        }
        
        const finalizedText = extractedText.trim();
        if (!finalizedText) {
          throw new Error('This PDF appears to have no selectable plain-text layer (it might be scanned/images-only). Please try a digital PDF or paste the text directly.');
        }

        handlePreviewUpdated(finalizedText, file.name.replace(/\.pdf$/i, ''));
      } catch (err: any) {
        console.error('PDF extraction error:', err);
        setErrorMsg(`Failed to parse PDF: ${err.message || 'Check if file is corrupted.'}`);
      } finally {
        setIsExtracting(false);
      }
    };

    reader.onerror = () => {
      setErrorMsg('Error reading the local file.');
      setIsExtracting(false);
    };

    reader.readAsArrayBuffer(file);
  };

  // Trigger main Course Generation
  const handleGenerateCourse = async () => {
    const textToGenerate = sourceType === 'text' ? textInput : previewText;
    const finalTitle = sourceTitle || (sourceType === 'text' ? 'Pasted Text Concept' : 'Imported Syllabus');

    if (!textToGenerate || textToGenerate.length < 30) {
      setErrorMsg('Please input or extract at least 30 characters of content to build a structured course.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/generate-course', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sourceText: textToGenerate, title: finalTitle, settings }),
      });

      if (!res.ok) {
        throw new Error('Course generation request failed.');
      }

      const data = await res.json();
      data.sourceType = sourceType;
      data.sourceTitle = finalTitle;
      data.id = 'course_' + Date.now();
      
      // Send generated course upward
      onCourseGenerated(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Could not trigger Feynman curriculum designer. Please check settings or retry.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="max-w-4xl mx-auto space-y-8"
      id="source-upload-root"
    >
      <div className="space-y-2">
        <h2 className="text-2.5xl font-sans font-bold tracking-tight text-slate-900 inline-flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-blue-600" />
          Create New Course
        </h2>
        <p className="text-slate-500 text-sm">
          Select your input source type. Our AI curriculum designer will model a complete course structure including chapters, lessons, quizzes, examinations, and an interactive mind map.
        </p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 bg-slate-100 p-1.5 rounded-2xl border border-slate-200" id="upload-tabs">
        <button
          onClick={() => { setSourceType('text'); setErrorMsg(''); }}
          className={`flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
            sourceType === 'text' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlignLeft className="h-4 w-4" />
          Paste Text
        </button>
        <button
          onClick={() => { setSourceType('link'); setErrorMsg(''); }}
          className={`flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
            sourceType === 'link' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Link className="h-4 w-4" />
          Website Link
        </button>
        <button
          onClick={() => { setSourceType('pdf'); setErrorMsg(''); }}
          className={`flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
            sourceType === 'pdf' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Upload className="h-4 w-4" />
          Upload PDF
        </button>
      </div>

      {/* Source Input Panels */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6" id="upload-panel-body">
        {sourceType === 'text' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Topic Title</label>
              <input
                type="text"
                placeholder="e.g. Memory and Learning Consolidation"
                value={sourceTitle}
                onChange={(e) => setSourceTitle(e.target.value)}
                className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-350 focus:border-blue-500 px-4 py-3 rounded-xl text-sm focus:outline-none transition-all"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Study Source Materials</label>
              <textarea
                rows={8}
                placeholder="Paste the raw chapter text, key concepts, syllabus summaries, or meeting transcripts here..."
                value={textInput}
                onChange={(e) => handlePreviewUpdated(e.target.value)}
                className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-350 focus:border-blue-500 px-4 py-3 rounded-xl text-sm focus:outline-none transition-all font-sans"
              />
            </div>
          </div>
        )}

        {sourceType === 'link' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Website/Article Address</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://wikipedia.org/wiki/Feynman_Technique"
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  className="flex-1 bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-350 focus:border-blue-500 px-4 py-3 rounded-xl text-sm focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={handleExtractUrl}
                  disabled={isExtracting || !linkInput}
                  className="px-5 py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 text-white disabled:text-slate-400 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 shrink-0"
                >
                  {isExtracting ? 'Extracting...' : 'Extract Content'}
                </button>
              </div>
            </div>
          </div>
        )}

        {sourceType === 'pdf' && (
          <div className="space-y-4">
            <label className="text-xs font-bold text-slate-500 uppercase">Upload PDF Document</label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all duration-200 ${
                isDragging ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 bg-slate-50/30 hover:bg-slate-50/80'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="application/pdf"
                className="hidden"
              />
              <Upload className="h-10 w-10 text-slate-400 mx-auto mb-3" />
              {pdfFile ? (
                <div className="space-y-1 inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-xs font-semibold border border-blue-100">
                  <Check className="h-4 w-4" />
                  {pdfFile.name}
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="font-bold text-slate-700 text-sm">Drag & Drop your PDF here, or <span className="text-blue-600">click to browse</span></p>
                  <p className="text-slate-400 text-xs">Only PDF documents up to 20MB are currently parsed</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dynamic Extracted Preview Panel for Website or PDF */}
        {(sourceType !== 'text' && previewText) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3"
          >
            <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-150">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-500" />
                <div>
                  <div className="text-[10px] font-bold text-slate-450 uppercase">Extracted Title Suggestion</div>
                  <input
                    type="text"
                    value={sourceTitle}
                    onChange={(e) => setSourceTitle(e.target.value)}
                    placeholder="Provide a course title..."
                    className="font-bold text-slate-800 text-sm bg-transparent border-none outline-none focus:ring-0 p-0 m-0 max-w-[280px]"
                  />
                </div>
              </div>
              {estimatedDifficulty && (
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Reading Difficulty</div>
                  <span className="text-xs font-bold text-amber-600 font-mono bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                    {estimatedDifficulty}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Text Extraction Preview</div>
              <div className="bg-white border border-slate-150 rounded-xl p-3.5 text-xs text-slate-650 max-h-[140px] overflow-y-auto font-mono whitespace-pre-wrap">
                {previewText}
              </div>
            </div>
          </motion.div>
        )}

        {/* Error Notification */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-start gap-2.5 text-xs">
            <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <p>{errorMsg}</p>
          </div>
        )}

        {/* Course Generation Triggers */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4 flex-wrap">
          <div className="text-slate-400 text-xs flex items-center gap-1">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Generates 2 custom chapters, 4 lessons, interactive SVG mind maps, quizzes, and exams.
          </div>
          
          <button
            onClick={handleGenerateCourse}
            disabled={isLoading || isExtracting}
            className="w-full sm:w-auto cursor-pointer inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white rounded-2xl text-sm font-semibold shadow-md shadow-blue-500/10 active:scale-98 transition-all"
            id="btn-generate-course-run"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Parsing Curriculum Data...
              </>
            ) : (
              <>
                Generate Course Outline
                <Sparkles className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
