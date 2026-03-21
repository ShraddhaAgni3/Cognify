import express from 'express';
import multer from 'multer';
import { unlink, readFile } from 'fs/promises';
import os from 'os';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const router = express.Router();
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ACCEPTED_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF, DOC, DOCX, or TXT files allowed'));
  }
});

async function extractText(filePath, mimetype) {
  const buffer = await readFile(filePath);

  // TXT — direct read
  if (mimetype === 'text/plain') {
    return buffer.toString('utf-8').trim();
  }

  // DOCX — use mammoth
  if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    try {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value?.trim();
      if (text && text.length > 50) {
        console.log('mammoth docx success, length:', text.length);
        return text;
      }
    } catch (e) {
      console.log('mammoth failed:', e.message);
    }
    return '';
  }

  // PDF — try pdf-parse
  if (mimetype === 'application/pdf') {
    try {
      const pdfParseModule = require('pdf-parse');
      const pdfParse = pdfParseModule.default || pdfParseModule;
      const data = await pdfParse(buffer);
      const text = data.text?.trim();
      if (text && text.length > 80 && /[a-zA-Z]{3,}/.test(text)) {
        console.log('pdf-parse success, length:', text.length);
        return text;
      }
    } catch (e) {
      console.log('pdf-parse failed:', e.message);
    }
    return '';
  }

  return '';
}

async function callGroq(resumeText) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: "system",
          content: "You are an ATS resume analyzer. Respond with ONLY a valid JSON object. No markdown, no code blocks, no explanation."
        },
        {
          role: "user",
          content: `Analyze this resume for ATS compatibility. Score 0-100.

Resume:
${resumeText.slice(0, 3500)}

Return ONLY this JSON:
{"score": <0-100>, "feedback": "<2-3 sentence assessment>", "suggestions": ["tip 1", "tip 2", "tip 3", "tip 4"]}`
        }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    })
  });
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}

router.post('/check', upload.single('resume'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  let resumeText = '';
  try {
    resumeText = await extractText(req.file.path, req.file.mimetype);
    await unlink(req.file.path).catch(() => {});
  } catch (err) {
    await unlink(req.file.path).catch(() => {});
    console.error('Extraction error:', err);
  }

  if (!resumeText || resumeText.length < 80) {
    return res.json({
      score: 0,
      feedback: 'Could not extract text from your file. Please try uploading a DOCX or TXT file for best results.',
      suggestions: [
        'Upload a .docx file (Word document) — works best',
        'Or save your resume as a .txt file',
        'PDF works only if it is text-based (not scanned)',
        'Avoid image-based or scanned PDFs'
      ]
    });
  }

  try {
    const response = await callGroq(resumeText);
    console.log('Groq response:', response.slice(0, 150));

    let cleaned = response.replace(/```json/gi, '').replace(/```/g, '').trim();
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    if (jsonStart === -1) throw new Error('No JSON');

    const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
    res.json({
      score: Math.min(100, Math.max(0, Number(parsed.score) || 0)),
      feedback: String(parsed.feedback || 'Analysis complete.'),
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 5) : []
    });
  } catch (err) {
    console.error('Groq error:', err.message);
    res.status(500).json({ error: 'Failed to analyze. Please try again.' });
  }
});

export default router;