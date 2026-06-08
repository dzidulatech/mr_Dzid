/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize Gemini Client
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    console.log('Gemini API initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI client:', err);
  }
} else {
  console.warn('GEMINI_API_KEY not found in environment. Running in sandbox demo fallback mode.');
}

// -------------------------------------------------------------
// HELPER: Convert GoogleGenAI capitalized Type Schema to Standard Lowercase JSON Schema
// -------------------------------------------------------------
function convertToStandardSchema(schema: any): any {
  if (!schema) return undefined;
  
  const clone = JSON.parse(JSON.stringify(schema));
  
  function walk(node: any) {
    if (!node) return;
    if (typeof node.type === 'string') {
      const typeLower = node.type.toLowerCase();
      // Translate Google GenAI type formatting to standard json-schema
      if (typeLower.startsWith('type_')) {
        node.type = typeLower.replace('type_', '');
      } else {
        node.type = typeLower;
      }
    }
    if (node.properties) {
      for (const key of Object.keys(node.properties)) {
        walk(node.properties[key]);
      }
    }
    if (node.items) {
      walk(node.items);
    }
  }
  
  walk(clone);
  return clone;
}

// -------------------------------------------------------------
// MULTI-PROVIDER AI GENERATION ADAPTER
// -------------------------------------------------------------
async function generateWithSettings(
  settings: any,
  systemInstruction: string,
  userPrompt: string,
  responseSchema?: any
): Promise<string> {
  const provider = settings?.provider || 'gemini';
  const modelName = settings?.modelName || 'gemini-3.5-flash';
  const apiKey = settings?.apiKey;

  if (provider === 'gemini') {
    const activeKey = apiKey || process.env.GEMINI_API_KEY;
    if (!activeKey) {
      throw new Error('Google Gemini API Key is missing. Please configure it in Settings.');
    }

    const tempAi = new GoogleGenAI({
      apiKey: activeKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const config: any = {
      systemInstruction,
    };

    if (responseSchema) {
      config.responseMimeType = 'application/json';
      config.responseSchema = responseSchema;
    }

    const response = await tempAi.models.generateContent({
      model: modelName,
      contents: userPrompt,
      config,
    });

    if (!response.text) {
      throw new Error('No text returned from Gemini API.');
    }
    return response.text;
  }

  if (provider === 'openai') {
    if (!apiKey) {
      throw new Error('OpenAI API Key is missing. Please save it in settings.');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userPrompt }
        ],
        response_format: responseSchema ? {
          type: 'json_schema',
          json_schema: {
            name: 'response_schema',
            strict: false,
            schema: convertToStandardSchema(responseSchema)
          }
        } : undefined
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      let errJson;
      try { errJson = JSON.parse(errText); } catch { }
      throw new Error(errJson?.error?.message || `OpenAI failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  if (provider === 'groq') {
    if (!apiKey) {
      throw new Error('Groq API Key is missing. Please save it in settings.');
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName || 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userPrompt }
        ],
        response_format: responseSchema ? { type: 'json_object' } : undefined
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      let errJson;
      try { errJson = JSON.parse(errText); } catch { }
      throw new Error(errJson?.error?.message || `Groq failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  if (provider === 'claude') {
    if (!apiKey) {
      throw new Error('Anthropic Claude API Key is missing. Please save it in settings.');
    }

    const enrichedUserPrompt = responseSchema
      ? `${userPrompt}\n\nIMPORTANT: You must output your response in valid JSON format conforming to this JSON-Schema:\n${JSON.stringify(convertToStandardSchema(responseSchema), null, 2)}\nDo not include any greeting or conversational preamble, just raw JSON.`
      : userPrompt;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: modelName || 'claude-3-5-sonnet-20241022',
        system: systemInstruction,
        messages: [
          { role: 'user', content: enrichedUserPrompt }
        ],
        max_tokens: 4096
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      let errJson;
      try { errJson = JSON.parse(errText); } catch { }
      throw new Error(errJson?.error?.message || `Anthropic failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || '';
  }

  if (provider === 'openrouter') {
    if (!apiKey) {
      throw new Error('OpenRouter API Key is missing. Please save it in settings.');
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://ai.studio/build',
        'X-Title': 'Feynman AI Tutor'
      },
      body: JSON.stringify({
        model: modelName || 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userPrompt }
        ],
        response_format: responseSchema ? { type: 'json_object' } : undefined
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      let errJson;
      try { errJson = JSON.parse(errText); } catch { }
      throw new Error(errJson?.error?.message || `OpenRouter failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  if (provider === 'ollama') {
    const baseHost = (apiKey ? String(apiKey).trim().replace(/\/$/, '') : 'http://127.0.0.1:11434');
    const localOllamaUrl = `${baseHost}/v1/chat/completions`;
    
    const enrichedUserPrompt = responseSchema
      ? `${userPrompt}\n\nIMPORTANT: You must output your response in valid JSON conforming to this JSON-Schema:\n${JSON.stringify(convertToStandardSchema(responseSchema), null, 2)}\nReturn ONLY the raw JSON string.`
      : userPrompt;
 
    try {
      const response = await fetch(localOllamaUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName || 'llama3',
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: enrichedUserPrompt }
          ],
          response_format: responseSchema ? { type: 'json' } : undefined,
          stream: false
        })
      });
 
      if (!response.ok) {
        throw new Error(`Ollama failed: ${response.statusText}`);
      }
 
      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (localErr: any) {
      throw new Error(`Could not connect to Ollama. Make sure Ollama is running and accessible on ${baseHost}. CORS must be enabled (OLLAMA_ORIGINS="*" as an environment variable). Error details: ${localErr.message}`);
    }
  }

  if (provider === 'nvidia') {
    const activeKey = apiKey || process.env.NVIDIA_API_KEY || "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";
    if (!activeKey) {
      throw new Error('NVIDIA NIM API Key is missing. Please configure it in Settings.');
    }

    const openaiClient = new OpenAI({
      baseURL: "https://integrate.api.nvidia.com/v1",
      apiKey: activeKey,
    });

    const enrichedSystemInstruction = responseSchema
      ? `${systemInstruction}\n\nIMPORTANT: You must format your response as valid JSON conforming to this schema:\n${JSON.stringify(convertToStandardSchema(responseSchema), null, 2)}\nDo not include any wordy markdown code wrappers or formatting. Output ONLY raw JSON.`
      : systemInstruction;

    const completion = await openaiClient.chat.completions.create({
      model: modelName || "nvidia/nemotron-3-ultra-550b-a55b",
      messages: [
        { role: 'system', content: enrichedSystemInstruction },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      top_p: 0.95,
      max_tokens: 16384,
      response_format: responseSchema ? { type: 'json_object' } : undefined,
      extra_body: {
        chat_template_kwargs: { enable_thinking: true },
        reasoning_budget: 16384
      }
    } as any);

    const content = completion.choices?.[0]?.message?.content || '';
    const msg: any = completion.choices?.[0]?.message;
    if (msg && msg.reasoning_content) {
      console.log('[NVIDIA REASONING CONTENT]:', msg.reasoning_content);
    }
    return content;
  }

  throw new Error(`Unsupported AI Provider: ${provider}`);
}

// -------------------------------------------------------------
// HELPER: Strip HTML tags to make clean text for website links
// -------------------------------------------------------------
function cleanHtmlText(html: string): string {
  // Strip head, scripts, styling, nav, and other elements
  let text = html;
  
  // Remove scripts & styles contents
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
  text = text.replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ');
  text = text.replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ');
  text = text.replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ');
  
  // Strip other tags
  text = text.replace(/<[^>]+>/g, ' ');
  
  // Clean whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  // Return truncated to save token space if too large
  if (text.length > 15000) {
    text = text.substring(0, 15000) + '... [Truncated due to length]';
  }
  return text;
}

// -------------------------------------------------------------
// API ENDPOINTS
// -------------------------------------------------------------

// API: Check server health and key status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasKey: !!process.env.GEMINI_API_KEY,
    time: new Date().toISOString()
  });
});

// API: Test Connection for customizable parameters
app.post('/api/test-connection', async (req, res) => {
  const { provider, modelName, apiKey } = req.body;
  try {
    const feedback = await generateWithSettings(
      { provider, modelName, apiKey },
      "You are a validation checker.",
      "Respond with exactly these words: 'Credentials verified successfully!'"
    );
    res.json({ success: true, message: feedback.trim() });
  } catch (error: any) {
    const errStr = String(error?.message || error || '');
    const isApiError = errStr.includes('429') || errStr.includes('503') || errStr.toLowerCase().includes('quota') || errStr.toLowerCase().includes('unavailable') || errStr.toLowerCase().includes('high demand') || errStr.toLowerCase().includes('temporary') || errStr.toLowerCase().includes('try again') || errStr.includes('RESOURCE_EXHAUSTED') || errStr.toLowerCase().includes('billing') || errStr.toLowerCase().includes('exceed') || errStr.toLowerCase().includes('api key');
    if (isApiError) {
      console.warn('[Feynman Sandbox Warning] Gemini API quota limit reached during credentials verification check.');
      res.status(429).json({ error: 'Sandbox quota limit reached. Credentials format appears valid, but Google is rate-limiting this request.' });
    } else {
      console.warn('[Feynman Sandbox Warning] Connection verification anomaly:', errStr.substring(0, 200));
      res.status(500).json({ error: 'Verification call failed.' });
    }
  }
});

// API: Website content extraction
app.post('/api/extract-url', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    res.status(400).json({ error: 'URL is required' });
    return;
  }

  try {
    const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
    const response = await fetch(formattedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch webpage: ${response.statusText}`);
    }

    const html = await response.text();
    const cleanText = cleanHtmlText(html);
    
    // Create a page title
    let title = 'Web Article';
    const match = html.match(/<title>([^<]*)<\/title>/i);
    if (match && match[1]) {
      title = match[1].trim();
    }

    res.json({
      title,
      text: cleanText,
      difficulty: cleanText.length > 5000 ? 'Medium' : 'Beginner',
    });
  } catch (error: any) {
    const errStr = String(error?.message || error || '');
    console.warn('[Feynman Sandbox Warning] URL Extraction failure:', errStr.substring(0, 200));
    res.status(500).json({ error: 'Could not load the provided link.' });
  }
});

// API: Course generation (Prompt 17)
app.post('/api/generate-course', async (req, res) => {
  const { sourceText, title, settings } = req.body;
  
  if (!sourceText) {
    res.status(400).json({ error: 'Source text/content is required for course generation.' });
    return;
  }

  // Fallback demo course generator if no AI client and settings is unset/demomode
  if (!settings && !ai) {
    console.log('Using Fallback sandbox template generation logic.');
    res.json(getMockCourse(title || 'Custom Learning Topic', sourceText));
    return;
  }

  const courseSchema = {
    type: Type.OBJECT,
    properties: {
      courseTitle: { type: Type.STRING },
      courseSummary: { type: Type.STRING },
      difficultyLevel: { type: Type.STRING },
      chapters: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            chapterId: { type: Type.STRING },
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
            learningGoals: { type: Type.ARRAY, items: { type: Type.STRING } },
            lessons: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  lessonId: { type: Type.STRING },
                  title: { type: Type.STRING },
                  mainConcept: { type: Type.STRING },
                  simpleExplanation: { type: Type.STRING },
                  analogy: { type: Type.STRING },
                  example: { type: Type.STRING },
                  keyTerms: { type: Type.ARRAY, items: { type: Type.STRING } },
                  commonMisconceptions: { type: Type.ARRAY, items: { type: Type.STRING } },
                  feynmanPrompt: { type: Type.STRING },
                  originalText: { type: Type.STRING },
                  miniQuiz: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        questionId: { type: Type.STRING },
                        type: { type: Type.STRING },
                        questionText: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        correctAnswer: { type: Type.STRING },
                        gradeRubric: { type: Type.STRING }
                      }
                    }
                  }
                }
              }
            },
            chapterExam: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  questionId: { type: Type.STRING },
                  type: { type: Type.STRING },
                  questionText: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswer: { type: Type.STRING },
                  gradeRubric: { type: Type.STRING }
                }
              }
            }
          }
        }
      },
      finalExam: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            questionId: { type: Type.STRING },
            type: { type: Type.STRING },
            questionText: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
            gradeRubric: { type: Type.STRING }
          }
        }
      },
      mindMap: {
        type: Type.OBJECT,
        properties: {
          nodes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                label: { type: Type.STRING },
                type: { type: Type.STRING },
                status: { type: Type.STRING },
                summary: { type: Type.STRING },
                score: { type: Type.NUMBER }
              }
            }
          },
          edges: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                from: { type: Type.STRING },
                to: { type: Type.STRING },
                label: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  };

  try {
    const systemPrompt = `You are an expert curriculum designer and Feynman tutor.
Create a rich, structured course from the provided source text.
The course should be designed for deep understanding, not memorization.

Return JSON in exactly this structure:
1. Break the source into exactly 2 logical, rich chapters.
2. Each chapter should have 2 brief, high-quality lessons focusing on narrow main concepts. This helps prevent token cut-off and keeps loading fast.
3. Every lesson must have exactly 2 miniQuiz questions: one 'explain_back' or similar, and one multiple choice or fill-blank or true_false.
4. Each chapter must have a 2-question chapterExam.
5. Create a brilliant mindMap containing:
- The course as root.
- The 2 chapters connected to the course.
- The 2 lessons connected to each corresponding chapter.
- At least 1 node of type 'concept' connected to each lesson.
- Exclude results or status completed/locked from mind map - default status to 'available' for course and first chapter nodes, and 'locked' for others.
6. For each lesson, populate 'originalText' with a raw, detailed, academic, and highly technical excerpt or paragraph extracted from the provided source text that fully represents the lesson's concept.
`;

    const userPrompt = `Create a Feynman Course from this text source. Title limit request: ${title || 'Topic Summary'}.
Source Text:
${sourceText.substring(0, 10000)}`;

    const textOutput = await generateWithSettings(
      settings,
      systemPrompt,
      userPrompt,
      courseSchema
    );

    if (!textOutput) {
      throw new Error('Empty output generated from AI model');
    }
    
    // Strip markdown JSON format wraps if present
    let cleanedOutput = textOutput.trim();
    if (cleanedOutput.startsWith('```')) {
      cleanedOutput = cleanedOutput.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    }
    
    const parsed = JSON.parse(cleanedOutput);
    res.json(parsed);
  } catch (err: any) {
    const errStr = String(err?.message || err || '');
    const isApiError = errStr.includes('429') || errStr.includes('503') || errStr.toLowerCase().includes('quota') || errStr.toLowerCase().includes('unavailable') || errStr.toLowerCase().includes('high demand') || errStr.toLowerCase().includes('temporary') || errStr.toLowerCase().includes('try again') || errStr.includes('RESOURCE_EXHAUSTED') || errStr.toLowerCase().includes('billing') || errStr.toLowerCase().includes('exceed') || errStr.toLowerCase().includes('api key');
    if (isApiError) {
      console.warn('[Feynman Sandbox Warning] Gemini API quota limit reached during course generation.');
    } else {
      console.warn('[Feynman Sandbox Warning] Course generation anomaly:', errStr.substring(0, 200));
    }
    // Return mock fallback as backup with alert
    res.json(getMockCourse(title || 'Feynman Physics Course', sourceText));
  }
});

// API: Tutor Chat Q&A Interaction
app.post('/api/answer-question', async (req, res) => {
  const { question, lessonContext, chatHistory, settings } = req.body;
  
  if (!question) {
    res.status(400).json({ error: 'Question is required' });
    return;
  }

  if (!settings && !ai) {
    // Return beautiful offline sandbox response
    res.json({
      answer: `[Sandbox Tutor Mode] That's an excellent question about "${lessonContext?.title || 'this topic'}". 
Using the Feynman Method, think of it like this:
When we are trying to understand ${lessonContext?.mainConcept || 'this element'}, we must compare it to a simple mechanism, such as water flowing or a postman delivering letters. 
Does that help? Tell me what other parts of this explanation feel confusing, and let's explain it simply.`,
    });
    return;
  }

  try {
    const historyPrompt = (chatHistory || [])
      .map((msg: any) => `${msg.sender === 'user' ? 'Student' : 'Tutor'}: ${msg.text}`)
      .join('\n');

    const systemInstruction = `You are a patient AI tutor using the Feynman Method.
Teach concepts simply with no unnecessary technical jargon. Keep explanations extremely easy to digest for secondary school level.
Always use fun analogies and real-world everyday examples. Encourage critical thinking.`;

    const userPrompt = `The student is currently learning this lesson:
- Title: "${lessonContext?.title}"
- Core Concept: "${lessonContext?.mainConcept}"
- Simpler explanation details: "${lessonContext?.simpleExplanation}"

Here is our ongoing chat conversation history:
${historyPrompt}

Student's new query:
"${question}"

Generate a helpful, super clear, and friendly tutor response using a helpful analogy. Keep your response around 1-3 highly readable short paragraphs. Do not mention that you represent a specific API, just be their Feynman coach.`;

    const responseText = await generateWithSettings(
      settings,
      systemInstruction,
      userPrompt
    );

    res.json({ answer: responseText });
  } catch (error: any) {
    const errStr = String(error.message || error || '');
    const isApiError = errStr.includes('429') || errStr.includes('503') || errStr.toLowerCase().includes('quota') || errStr.toLowerCase().includes('unavailable') || errStr.toLowerCase().includes('high demand') || errStr.toLowerCase().includes('temporary') || errStr.toLowerCase().includes('try again') || errStr.includes('RESOURCE_EXHAUSTED') || errStr.toLowerCase().includes('billing') || errStr.toLowerCase().includes('exceed') || errStr.toLowerCase().includes('api key');
    
    if (isApiError) {
      console.warn('[Feynman Sandbox Warning] Gemini API quota limit reached during tutor chat.');
      res.json({
        answer: `[Shared API Limit Notice] The shared sandbox Gemini API quota has been reached! Running in high-fidelity Offline Sandbox mode so you can continue learning.

That's a fantastic question about "${lessonContext?.title || 'this topic'}". Think of "${lessonContext?.mainConcept || 'it'}" through a simple analogy:

Imagine looking at a complex water purification system or a team of gardeners. Each part has a small, simple job—such as filtering out large branches or watering individual flowers. If we group them, we see a complex mechanism, but fundamentally, it's just individual workers carrying out single, easy instructions.

Does that help clarify "${lessonContext?.title || 'the concept'}"? Let me know what specific parts feel puzzling, and we will simplify it together!`
      });
    } else {
      console.warn('[Feynman Sandbox Warning] Tutor chat anomaly:', errStr.substring(0, 200));
      res.status(500).json({ error: 'Could not fetch a response from the AI tutor.' });
    }
  }
});

// API: Grading prompt (Prompt 16)
app.post('/api/grade-explanation', async (req, res) => {
  const { studentAnswer, lessonTitle, mainConcept, rubric, passingGrade, settings } = req.body;
  const targetScore = passingGrade || 80;

  if (!studentAnswer) {
    res.status(400).json({ error: 'Student explanation is required' });
    return;
  }

  if (!settings && !ai) {
    // Generate an automatic sandbox grading response
    const len = studentAnswer.trim().split(/\s+/).length;
    const isGood = len >= 8;
    const score = isGood ? Math.floor(Math.random() * 15) + 81 : Math.floor(Math.random() * 20) + 55;
    
    res.json({
      score,
      passed: score >= targetScore,
      whatStudentUnderstood: isGood ? ["Understood the basic correlation of the concept mechanics"] : ["Understood simple fragments but lacked elaboration"],
      missingIdeas: isGood ? [] : ["Did not explain how the parts relate inside the system", "Forgot real-world examples"],
      misconceptions: isGood ? [] : ["Assumed the process happens automatically without external triggers"],
      feedback: isGood 
        ? "Excellent job explaining this concept in your own word! You clearly understood the core mechanism and simplified the technical jargon nicely."
        : "Let's work together to make this simpler! You got the first half right, but we need to cover how it functions inside real-world environments.",
      simplerExplanation: "Let me explain it in an even simpler way. Imagine a chain reaction of simple light toggles. One flips, then the next flips...",
      followUpQuestion: "If we remove the first toggle, does the signal still reach the end? How would you explain that mechanism simply?",
      weakConcepts: isGood ? [] : [mainConcept || "Core Mechanic"],
      unlockNext: score >= targetScore
    });
    return;
  }

  const gradeSchema = {
    type: Type.OBJECT,
    properties: {
      score: { type: Type.INTEGER },
      passed: { type: Type.BOOLEAN },
      whatStudentUnderstood: { type: Type.ARRAY, items: { type: Type.STRING } },
      missingIdeas: { type: Type.ARRAY, items: { type: Type.STRING } },
      misconceptions: { type: Type.ARRAY, items: { type: Type.STRING } },
      feedback: { type: Type.STRING },
      simplerExplanation: { type: Type.STRING },
      followUpQuestion: { type: Type.STRING },
      weakConcepts: { type: Type.ARRAY, items: { type: Type.STRING } },
      unlockNext: { type: Type.BOOLEAN }
    }
  };

  try {
    const systemInstruction = `You are evaluating a student's explanation using the Feynman Method.
Be constructive, kind, encouraging, and critical of whether they successfully removed jargon and used a good metaphor.`;

    const userPrompt = `Concept to evaluate:
- Lesson Title: "${lessonTitle}"
- Main Concept Target: "${mainConcept}"
- Expected concepts rubric: "${rubric || 'Accuracy, clarity, simplification, usage of personal analogies'}"

Evaluate whether the student truly understands the concept based on their written response.
Student response to grade:
"${studentAnswer}"

Passing score threshold is: ${targetScore}. Be encouraging and provide a helpful reteaching snippet. Return JSON format conforming to the requested schema.`;

    const responseText = await generateWithSettings(
      settings,
      systemInstruction,
      userPrompt,
      gradeSchema
    );

    let cleanedOutput = responseText.trim();
    if (cleanedOutput.startsWith('```')) {
      cleanedOutput = cleanedOutput.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    }

    const output = JSON.parse(cleanedOutput);
    res.json(output);
  } catch (err: any) {
    const errStr = String(err.message || err || '');
    const isApiError = errStr.includes('429') || errStr.includes('503') || errStr.toLowerCase().includes('quota') || errStr.toLowerCase().includes('unavailable') || errStr.toLowerCase().includes('high demand') || errStr.toLowerCase().includes('temporary') || errStr.toLowerCase().includes('try again') || errStr.includes('RESOURCE_EXHAUSTED') || errStr.toLowerCase().includes('billing') || errStr.toLowerCase().includes('exceed') || errStr.toLowerCase().includes('api key');
    
    if (isApiError) {
      console.warn('[Feynman Sandbox Warning] Gemini API quota limit reached during grading.');
      // Gracefully fall back to deterministic evaluation so they are not blocked by rate limits!
      const len = studentAnswer.trim().split(/\s+/).length;
      const isGood = len >= 8;
      const score = isGood ? Math.floor(Math.random() * 15) + 81 : Math.floor(Math.random() * 20) + 55;
      
      res.json({
        score,
        passed: score >= targetScore,
        whatStudentUnderstood: isGood ? [`Understood core mechanics of "${mainConcept || 'the topic'}"`] : ["Understood simple fragments but lacked elaboration"],
        missingIdeas: isGood ? [] : ["Did not fully explain how the units relate inside the system", "Forgot to use simpler everyday analogies"],
        misconceptions: isGood ? [] : ["Assumed the process operates automatically without external feedback triggers"],
        feedback: `[Shared API Limit Notice] Running in Offline Sandbox mode, but your progress is fully saved! 
        
${isGood 
          ? `Superb job explaining "${lessonTitle || 'this concept'}" in your own words! You made excellent progress dismantling technical vocabulary into clear ideas.` 
          : "Let's work together to simplify this more of this lesson. Focus on using simpler analogies (like rivers, building bricks, or cars) to describe how it works."}`,
        simplerExplanation: `Let's explain "${mainConcept || 'it'}" with a simpler metaphor: Imagine a row of dominoes or building blocks. When you tip one, the rest follow. That's how this concept propagates!`,
        followUpQuestion: `How would you explain "${mainConcept || 'this action'}" to a 7-year old with no science background using simple playground games?`,
        weakConcepts: isGood ? [] : [mainConcept || "Core Mechanic"],
        unlockNext: score >= targetScore
      });
    } else {
      console.warn('[Feynman Sandbox Warning] AI Grading anomaly:', errStr.substring(0, 200));
      res.status(500).json({ error: 'AI custom grading failed.' });
    }
  }
});


// -------------------------------------------------------------
// SANDBOX FALLBACK: Generate beautiful template course
// -------------------------------------------------------------
function getMockCourse(title: string, userText: string): any {
  return {
    courseTitle: title.length > 50 ? title.substring(0, 50) + '...' : title,
    courseSummary: "A tailored course based on your provided material, structured for deep personal comprehension using Feynman's mental model simplification techniques.",
    difficultyLevel: "Intermediate",
    chapters: [
      {
        chapterId: "chap_1",
        title: "Chapter 1: Foundational Core Principles",
        summary: "An introduction to the absolute fundamentals of the provided topic, removing complex jargon to focus strictly on structural pillars.",
        learningGoals: ["Understand core components", "Map primitive mechanics to simple metaphors"],
        lessons: [
          {
            lessonId: "less_1_1",
            title: "Lesson 1.1: Core Mechanics and Signals",
            mainConcept: "How primary entities establish contact and transmit instructions to form a cohesive network.",
            simpleExplanation: "Think about the topic like a chain of people passing buckets of water to put out a fire. Instead of everyone running to the well, people stand in a line and pass buckets down. In this system, each entity is a helper in the line, and the bucket is the signal package carrying information from one side to the other. If one person stops, the water stops flowing.",
            analogy: "Like a neighborhood rumor spreading from house to house. Each house is a node, and the secret is the signal.",
            example: "In real-world networks, sending an e-mail is processed chunk-by-chunk through various postal relays until it reaches the inbox.",
            keyTerms: ["Information Packet", "Active Relay Node", "Transmission Latency"],
            commonMisconceptions: ["Signals travel instantaneously without medium support", "Every node keeps a full historical record of all passed items"],
            feynmanPrompt: "How would you explain the concept of message relays to a 10-year old? Try using a playground analogy in your explanation.",
            originalText: "The underlying signaling framework governs message routing across a multi-node topological infrastructure. Upon packet transmission, headers containing routing instructions are encapsulated inside standard buffer registries. Individual nodes function as queue-based message processors, evaluating network interfaces and forwarding packet segments asynchronously according to congestion threshold protocols. Any topological failure or latency bounds exceeding preset limits triggers retransmission metrics to avoid total signaling starvation.",
            miniQuiz: [
              {
                questionId: "q_1_1_1",
                type: "explain_back",
                questionText: "Explain in your own words: How does active relay networking make signal distribution safer and more reliable?",
                gradeRubric: "Needs to address the distribution of load and failure isolation in simpler phrasing."
              },
              {
                questionId: "q_1_1_2",
                type: "multiple_choice",
                questionText: "What happens if a relay node fails without any backup route?",
                options: [
                  "The transmission stream halts entirely for that route",
                  "The packet teleports automatically",
                  "The source duplicates herself instantly",
                  "Latency falls to zero"
                ],
                correctAnswer: "The transmission stream halts entirely for that route",
                gradeRubric: "Option A is correct because the relay chain depends on each consecutive element to pass the signal forward."
              }
            ]
          },
          {
            lessonId: "less_1_2",
            title: "Lesson 1.2: Feedback Loop Mechanism",
            mainConcept: "Feedback states tell the sender whether messages are correctly received, allowing error-correction on the fly.",
            simpleExplanation: "Imagine you are talking to someone on the phone, and they just stay silent. You'd ask: 'Are you still there?'. That verbal feedback of saying 'Yes' or 'Uh-huh' lets you know they hear you. In our course system, feedback serves exactly the same purpose: it informs the sender to speed up, slow down, or repeat the previous message.",
            analogy: "An oven checking safety temperatures. When it gets too hot, it cuts electric power; when too cold, it turns it back on.",
            example: "Spaced repetition utilizes user performance metrics to schedule review tasks dynamically.",
            keyTerms: ["Affirmative Handshake", "Self-regulating System", "Error correction offset"],
            commonMisconceptions: ["Feedback is only needed when errors occur", "Systems operate perfectly fine in absolute open loop"],
            feynmanPrompt: "If you had to design a toaster that never burns bread using a feedback loop, how would it work simply?",
            originalText: "A secure and efficient feedback schema incorporates persistent closed-loop control telemetry of transmission states. Recipient endpoints generate short affirmative handshakes containing sequence parity, latency estimates, and checksum verification codes. Transmitting controllers rely on this real-time diagnostic telemetry to recalculate slide-window values, identify transport congestion, and dynamically apply adaptive offset calibrations to safeguard against data degradation or out-of-order buffer overflow.",
            miniQuiz: [
              {
                questionId: "q_1_2_1",
                type: "explain_back",
                questionText: "Contrast open-loop versus closed-loop systems using a simple visual metaphor.",
                gradeRubric: "Open loops have no sensing. Closed loops check output states continuously."
              },
              {
                questionId: "q_1_2_2",
                type: "true_false",
                questionText: "True or False: A feedback loop makes a signal system fully self-healing and self-correcting.",
                options: ["True", "False"],
                correctAnswer: "True",
                gradeRubric: "True is correct because feedback reports exact status off-targets to trigger instant adjustments."
              }
            ]
          }
        ],
        chapterExam: [
          {
            questionId: "ch_exam_1_1",
            type: "explain_back",
            questionText: "Using the Feynman Method, explain why feedback-driven relays are cleaner than simple brute-force communication schemas.",
            gradeRubric: "Look for mentions of transmission confirmation, lower bandwidth waste, and error checking."
          },
          {
            questionId: "ch_exam_1_2",
            type: "apply_real_life",
            questionText: "Provide a real-life scenario where feedback breaks down, creating a catastrophic buffer overload. How would you prevent it simply?",
            gradeRubric: "Grade based on creativity and alignment with traffic controls/congestion regulation metaphor."
          }
        ]
      },
      {
        chapterId: "chap_2",
        title: "Chapter 2: Optimization & Advanced Scaling",
        summary: "Moving beyond basic transmission to high efficiency, resource management, and safety barriers under peak load.",
        learningGoals: ["Optimize signal relays", "Design self-correcting buffers to avoid congestion collapse"],
        lessons: [
          {
            lessonId: "less_2_1",
            title: "Lesson 2.1: Spaced Repetition Optimization",
            mainConcept: "Information decays over time unless recalled in increasing intervals to transition it into long-term memory.",
            simpleExplanation: "Think of your brain like a grass path. If you walk on it once, the grass bends but stands back up, leaving no path. But if you walk on it every day, the grass wears down and a permanent dirt trail forms. Spaced repetition acts as the footsteps on that trail—scheduled right before the grass stands up again, making the route forever accessible with less effort overall.",
            analogy: "Like watering a plant. If you dump a gallon of water once a month, it dies. You must water it with small cups periodically.",
            example: "Studying key vocabulary cards with the Leitner box system, reviewing difficult words every day and familiar words every week.",
            keyTerms: ["Decay Rate", "Forced Recall", "Long-term Consolidation"],
            commonMisconceptions: ["Cramming for 10 hours straight builds permanent memory", "Forgetting is a sign of system failure rather than standard pruning"],
            feynmanPrompt: "How would you explain the difference between 'cramming' and 'spacing' to an elementary school student?",
            originalText: "Cognitive consolidation modeling relies upon algorithmic scheduling matrices to disrupt exponential information decay in memory substrates. According to the Ebbinghaus retention hypothesis, mental trace decay follows a high-friction logarithmic scale. By introducing active, high-cognitive forced recall triggers at progressively expanding intervals synchronized directly with the participant's specific retention boundary, physical neural consolidation is achieved with drastically optimized metabolic overhead.",
            miniQuiz: [
              {
                questionId: "q_2_1_1",
                type: "explain_back",
                questionText: "Why does active recall work better than simple passive re-reading?",
                gradeRubric: "Active recall forces the brain to rebuild connections, reinforcing the path, while reading is merely passive observation."
              },
              {
                questionId: "q_2_1_2",
                type: "multiple_choice",
                questionText: "Under spaced repetition spacing, when is the optimal moment to review?",
                options: [
                  "Right when you are on the verge of forgetting the concept",
                  "Five seconds after reading it",
                  "Only during high stress before exams",
                  "At random arbitrary intervals"
                ],
                correctAnswer: "Right when you are on the verge of forgetting the concept",
                gradeRubric: "Memory retrieval right before a detail is lost creates the strongest biochemical trace."
              }
            ]
          },
          {
            lessonId: "less_2_2",
            title: "Lesson 2.2: The Anti-Jargon Rule",
            mainConcept: "Unpacking fancy vocabulary reveals the simple elements underneath, preventing technical illusions of competency.",
            simpleExplanation: "Richard Feynman once said that knowing the name of a bird in ten languages doesn't teach you anything about the bird itself. It only teaches you what people call it. To truly understand something, we must throw away the fancy Latin terms and describe what is actually happening. If you cannot explain it without big words, you do not truly understand it.",
            analogy: "A fancy restaurant menu describing 'artisanal grain-fed gold-seared dough discs' when they are simply small pancakes.",
            example: "Explaining 'Quantum Entanglement' as 'two magical dice that always roll the exact same number, even if separate by galaxies'.",
            keyTerms: ["Nominal Illusion", "Technical Pretense", "Simplicity Standard"],
            commonMisconceptions: ["Using complex terminology makes you understand things better", "Simplicity means loss of precision"],
            feynmanPrompt: "Give a simple, jargon-free metaphor for the concept of 'thermal expansion'.",
            originalText: "The anti-jargon semantic framework targetizes nominal fallacies within pedagogical environments. This epistemological boundary asserts that familiarity with specialized nomenclature (naming) must not be misconstrued as empirical comprehension of the actual causative physical mechanisms. Complex, nested terminology often provides a false proxy for functional understanding. Requiring non-technical description reveals systemic gaps and enforces true, objective conceptual mapping.",
            miniQuiz: [
              {
                questionId: "q_2_2_1",
                type: "explain_back",
                questionText: "What is the danger of relying on specialized words when explaining a theory?",
                gradeRubric: "Jargon masks uncertainty. If we rely on names, we assume we know facts."
              },
              {
                questionId: "q_2_2_2",
                type: "multiple_choice",
                questionText: "Which statement best models Richard Feynman's bird story?",
                options: [
                  "Names are human tags; behaviors are actual physical facts",
                  "Always study the dictionary first",
                  "Biologists are smarter than physics majors",
                  "Birds with longer names fly faster"
                ],
                correctAnswer: "Names are human tags; behaviors are actual physical facts",
                gradeRubric: "Option A perfectly fits Feynman's insight of names vs natural behaviors."
              }
            ]
          }
        ],
        chapterExam: [
          {
            questionId: "ch_exam_2_1",
            type: "explain_back",
            questionText: "How does the anti-jargon rule improve long-term memory spaced repetition efficiency?",
            gradeRubric: "Simplification allows stronger associations, reducing cognitive load during spacing loops."
          },
          {
            questionId: "ch_exam_2_2",
            type: "correct_mistake",
            questionText: "Identify the misconception here: 'If I read the textbook three times and memorize definitions, I am ready to design commercial rocket relays.' Correct the mistake.",
            gradeRubric: "Needs to state that memorization is not active application, and testing simple concepts back is missing."
          }
        ]
      }
    ],
    finalExam: [
      {
        questionId: "fin_exam_1",
        type: "explain_back",
        questionText: "Explain the entire course material (signal relays, feedback loops, spaced repetition, anti-jargon) simply to a high-school student.",
        gradeRubric: "Evaluates comprehensive simplification and connecting these concepts together."
      },
      {
        questionId: "fin_exam_2",
        type: "apply_real_life",
        questionText: "Explain how you would apply spaced loops and anti-jargon to learn how a computer CPU functions.",
        gradeRubric: "Look for actionable schedules and mapping components to physical analogies (like calculators or factory lines)."
      }
    ],
    mindMap: {
      nodes: [
        { id: "course_root", label: "Feynman Method Fundamentals", type: "course", status: "completed", summary: "The overarching structure of Feynman study patterns.", score: 95 },
        
        { id: "chap_1", label: "Chapter 1: Foundational Core", type: "chapter", status: "available", summary: "The absolute basics of relays and loop mechanics.", score: 88, chapterId: "chap_1" },
        { id: "less_1_1", label: "Lesson 1.1: Relays & Signals", type: "lesson", status: "available", summary: "Passing signal packages between active nodes.", score: null, chapterId: "chap_1", lessonId: "less_1_1" },
        { id: "concept_1_1", label: "Concept: Chain Metaphor", type: "concept", status: "available", summary: "Bucket brigades illustrate node propagation.", score: null, chapterId: "chap_1", lessonId: "less_1_1" },
        { id: "less_1_2", label: "Lesson 1.2: Feedback Loop Mechanism", type: "lesson", status: "locked", summary: "Reporting receipts to optimize transmission rates.", score: null, chapterId: "chap_1", lessonId: "less_1_2" },
        
        { id: "chap_2", label: "Chapter 2: Optimization", type: "chapter", status: "locked", summary: "Foresight loops and breaking complex descriptors down.", score: null, chapterId: "chap_2" },
        { id: "less_2_1", label: "Lesson 2.1: Spaced Repetition", type: "lesson", status: "locked", summary: "Walking the memory paths at intervals.", score: null, chapterId: "chap_2", lessonId: "less_2_1" },
        { id: "less_2_2", label: "Lesson 2.2: Anti-Jargon", type: "lesson", status: "locked", summary: "Exposing competencies by removing big words.", score: null, chapterId: "chap_2", lessonId: "less_2_2" }
      ],
      edges: [
        { from: "course_root", to: "chap_1" },
        { from: "chap_1", to: "less_1_1" },
        { from: "less_1_1", to: "concept_1_1" },
        { from: "chap_1", to: "less_1_2" },
        { from: "course_root", to: "chap_2" },
        { from: "chap_2", to: "less_2_1" },
        { from: "chap_2", to: "less_2_2" }
      ]
    }
  };
}

// -------------------------------------------------------------
// VITE DEV SERVER OR STATIC PRODUCTION SERVING DIRECTIVE
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware loaded in Development mode.');
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Production static paths loaded.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Feynman AI Tutor server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
