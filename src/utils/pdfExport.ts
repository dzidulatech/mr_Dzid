/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import { Course, StudentQuestion } from '../types';

export function exportCourseToPdf(course: Course, studentQuestions: StudentQuestion[]) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20;
  const maxContentWidth = pageWidth - (margin * 2); // 170mm
  let y = 25;
  let pageNum = 1;

  // Header and Footer draw helpers
  const drawHeaderFooter = () => {
    // Top border line
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.2);
    doc.line(margin, 12, pageWidth - margin, 12);

    // Header text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('Feynman Method AI Tutor - Personalized Study Guide', margin, 9);
    doc.text(course.title, pageWidth - margin, 9, { align: 'right' });

    // Footer lines
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.text(`Page ${pageNum}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
    doc.text('Prepared for active, simplified learning recall.', margin, pageHeight - 8);
  };

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 20) {
      doc.addPage();
      pageNum++;
      y = 25;
      drawHeaderFooter();
    }
  };

  // Helper to draw text with seamless height feedback
  const printText = (
    text: string, 
    fontSize = 10, 
    fontStyle: 'normal' | 'bold' | 'italic' | 'bolditalic' = 'normal', 
    color: [number, number, number] = [15, 23, 42], // slate-900
    align: 'left' | 'center' | 'right' = 'left',
    lineSpacing = 5,
    marginBottom = 4
  ) => {
    doc.setFont('helvetica', fontStyle);
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);

    const lines: string[] = doc.splitTextToSize(text, maxContentWidth);
    const textHeight = lines.length * lineSpacing;
    checkPageBreak(textHeight + marginBottom);

    let currentY = y;
    lines.forEach((line) => {
      let x = margin;
      if (align === 'center') x = pageWidth / 2;
      else if (align === 'right') x = pageWidth - margin;
      
      doc.text(line, x, currentY, { align });
      currentY += lineSpacing;
    });

    y = currentY - lineSpacing + marginBottom;
  };

  // Helper to draw callout card blocks (like Analogies or Warnings)
  const printCallout = (
    title: string,
    content: string,
    tag: string,
    themeColor: [number, number, number], // bg edge border
    bgColor: [number, number, number] // soft body background
  ) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    
    // Calculate simulated height so that card stays single-page
    const titleLines = doc.splitTextToSize(`[${tag}] ${title}`, maxContentWidth - 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const contentLines = doc.splitTextToSize(content, maxContentWidth - 8);
    
    const cardPadding = 6;
    const itemHeight = 4.5;
    const totalLinesHeight = (titleLines.length + contentLines.length) * itemHeight + 3;
    const cardHeight = totalLinesHeight + (cardPadding * 2);

    checkPageBreak(cardHeight + 4);

    // Draw background block
    doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
    doc.rect(margin, y, maxContentWidth, cardHeight, 'F');

    // Draw a prominent thick colored sidebar
    doc.setFillColor(themeColor[0], themeColor[1], themeColor[2]);
    doc.rect(margin, y, 2.5, cardHeight, 'F');

    let innerY = y + cardPadding + 2;

    // Draw Tag & Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(themeColor[0], themeColor[1], themeColor[2]);
    doc.text(`${tag}:`, margin + 5, innerY);
    
    const tagOffset = doc.getTextWidth(`${tag}: `);
    doc.setTextColor(15, 23, 42); // deep text
    
    // Draw remaining title text wrapped nicely
    const titleTextLines = doc.splitTextToSize(title, maxContentWidth - 10 - tagOffset);
    let titleY = innerY;
    titleTextLines.forEach((tLine, i) => {
      doc.text(tLine, margin + 5 + (i === 0 ? tagOffset : 0), titleY);
      titleY += itemHeight;
    });

    innerY = titleY + 1.5;

    // Draw body content
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105); // slate-600
    contentLines.forEach((cLine) => {
      doc.text(cLine, margin + 5, innerY);
      innerY += itemHeight;
    });

    y = y + cardHeight + 4;
  };

  // 1. FIRST PAGE: PREMIUM HIGH-FIDELITY COVER
  // Background style element: Nice left side border bar
  doc.setFillColor(37, 99, 235); // solid blue accent
  doc.rect(10, 0, 5, pageHeight, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(32);
  doc.setTextColor(15, 23, 42);
  doc.text('FEYNMAN STUDY SUMMARY', 25, 60);

  // Subtitle / Course main title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(37, 99, 235);
  // Split title if long
  const titleWords = doc.splitTextToSize(course.title, 150);
  let titleY = 75;
  titleWords.forEach((tw: string) => {
    doc.text(tw, 25, titleY);
    titleY += 10;
  });

  // Course overview descriptor box
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);
  const summaryLines = doc.splitTextToSize(course.summary, 160);
  let summaryY = titleY + 8;
  summaryLines.forEach((sLine: string) => {
    doc.text(sLine, 25, summaryY);
    summaryY += 6;
  });

  // Solid Stats line container
  const statsY = summaryY + 20;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.rect(25, statsY, 160, 48, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('COURSE PORTFOLIO HIGHLIGHTS', 32, statsY + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`Difficulty Level:`, 32, statsY + 18);
  doc.setFont('helvetica', 'normal');
  doc.text(course.difficultyLevel, 80, statsY + 18);

  doc.setFont('helvetica', 'bold');
  doc.text(`Course Progress:`, 32, statsY + 25);
  doc.setFont('helvetica', 'normal');
  doc.text(`${course.progress}% Completed`, 80, statsY + 25);

  doc.setFont('helvetica', 'bold');
  doc.text(`Estimated Content size:`, 32, statsY + 32);
  doc.setFont('helvetica', 'normal');
  const totalLessons = course.chapters.reduce((sum, ch) => sum + ch.lessons.length, 0);
  doc.text(`${course.chapters.length} Chapters • ${totalLessons} Core Feynman Lessons`, 80, statsY + 32);

  doc.setFont('helvetica', 'bold');
  doc.text(`Source Reference:`, 32, statsY + 39);
  doc.setFont('helvetica', 'normal');
  doc.text(`${course.sourceType.toUpperCase()}: ${course.sourceTitle || 'Custom'}`, 80, statsY + 39);

  // Bottom stamp footer
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(37, 99, 235);
  doc.text('GENERATE COMPREHENSION', 25, pageHeight - 40);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  const nowStr = new Date().toLocaleString();
  doc.text(`Personal study binder downloaded on ${nowStr}`, 25, pageHeight - 34);
  doc.text('Constructed by Feynman AI tutor with Gemini deep explanations.', 25, pageHeight - 29);

  // 2. SUBSEQUENT CHAPTERS AND LESSONS
  course.chapters.forEach((chapter, chIdx) => {
    // Start chapter on a fresh page
    doc.addPage();
    pageNum++;
    y = 25;
    drawHeaderFooter();

    // Draw Chapter Header
    printText(`CHAPTER ${chIdx + 1}`, 11, 'bold', [100, 116, 139], 'left', 5, 2);
    printText(chapter.title, 18, 'bold', [15, 23, 42], 'left', 7, 4);
    
    // Draw Chapter Summary
    printText(chapter.summary, 10, 'italic', [71, 85, 105], 'left', 5.5, 8);

    // Learning Goals bullet points if any
    if (chapter.learningGoals && chapter.learningGoals.length > 0) {
      printText('Primary Learning Objectives:', 9.5, 'bold', [15, 23, 42], 'left', 5, 2);
      chapter.learningGoals.forEach((goal) => {
        printText(`•  ${goal}`, 9, 'normal', [71, 85, 105], 'left', 5, 1.5);
      });
      y += 5; // space divider
    }

    // Lessons inside chapter
    chapter.lessons.forEach((lesson, lesIdx) => {
      checkPageBreak(30); // secure a headstart limit
      
      // Divider bar
      doc.setDrawColor(241, 245, 249); // slate-100
      doc.setLineWidth(0.4);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;

      // Lesson Index label + Title
      printText(`LESSON ${chIdx + 1}.${lesIdx + 1}: ${lesson.title}`, 13, 'bold', [37, 99, 235], 'left', 6, 2.5);
      printText(`Core Concept Focus: ${lesson.mainConcept}`, 9.5, 'bold', [15, 23, 42], 'left', 5, 5);

      // Student Performance pill if available
      if (lesson.completed) {
        doc.setFillColor(240, 253, 244); // emerald-50
        doc.setDrawColor(187, 247, 208); // emerald-200
        doc.rect(margin, y, 170, 8, 'FD');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(22, 101, 52); // emerald-800
        doc.text(`✓ Verified Lesson Passed   |   Score achieved: ${lesson.score}%   |   Confidence scale: ${lesson.confidenceRating || 4}/5`, margin + 4, y + 5.5);
        y += 12;
      }

      // Simplified explanation paragraph
      printText('Simplified Explanation (Feynman Method):', 10, 'bold', [15, 23, 42], 'left', 5, 2);
      printText(lesson.simpleExplanation, 9.5, 'normal', [51, 65, 85], 'left', 5, 5);

      // Analogy Block
      if (lesson.analogy) {
        printCallout(
          'Intuitive Analogy & Metaphor',
          lesson.analogy,
          'ANALOGY',
          [37, 99, 235], // blue
          [240, 249, 255] // sky-50
        );
      }

      // Real-World Example
      if (lesson.example) {
        printCallout(
          'Fictional / Real-World Showcase',
          lesson.example,
          'PRACTICAL EXAMPLE',
          [16, 185, 129], // emerald
          [240, 253, 244] // emerald-50
        );
      }

      // Key Terms list
      if (lesson.keyTerms && lesson.keyTerms.length > 0) {
        printText('Essential Core Ideas & Jargon-Free Terms:', 9.5, 'bold', [15, 23, 42], 'left', 5, 2);
        
        const termsStr = lesson.keyTerms.join('  •  ');
        printText(`•  ${termsStr}`, 9, 'normal', [71, 85, 105], 'left', 4.5, 4);
      }

      // Common misconceptions
      if (lesson.commonMisconceptions && lesson.commonMisconceptions.length > 0) {
        printText('Misconceptions & Pitfalls to Avoid:', 9.5, 'bold', [15, 23, 42], 'left', 5, 2);
        lesson.commonMisconceptions.forEach((mis) => {
          printText(`✕  ${mis}`, 9, 'italic', [220, 38, 38], 'left', 4.5, 1.5);
        });
        y += 3;
      }

      // Space divider
      y += 4;
    });
  });

  // 3. PERSONAL TUTORING INTERACTION HISTORY log
  const relevantQuestions = studentQuestions.filter(q => q.courseId === course.id);
  if (relevantQuestions.length > 0) {
    doc.addPage();
    pageNum++;
    y = 25;
    drawHeaderFooter();

    printText('PERSONAL TUTOR COMPREHENSION CHAT MANUAL', 11, 'bold', [100, 116, 139], 'left', 5, 2);
    printText('Saved Clarification Q&As', 18, 'bold', [15, 23, 42], 'left', 7, 4);
    printText('The following are specific, highly targeted follow-up explanations you requested directly from your feynman tutor during active chatbot learning rounds.', 9.5, 'italic', [71, 85, 105], 'left', 5, 8);

    relevantQuestions.forEach((q, idx) => {
      checkPageBreak(25);
      
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.4);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;

      // Question box
      printText(`QUESTION ${idx + 1}:`, 10, 'bold', [37, 99, 235], 'left', 5, 2);
      printText(`"${q.questionText}"`, 9.5, 'italic', [15, 23, 42], 'left', 5, 3.5);

      // Answer box
      printText('TUTOR COHESIVE EXPLANATION:', 9, 'bold', [100, 116, 139], 'left', 5, 2);
      printText(q.answerText, 9, 'normal', [51, 65, 85], 'left', 4.5, 6);
    });
  }

  // Save PDF out
  const cleanTitle = course.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 30);
  doc.save(`feynman-study-guide-${cleanTitle}.pdf`);
}
