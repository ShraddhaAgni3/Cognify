import express from 'express';
import multer from 'multer';
import fs from 'fs';
import os from 'os';
import { createRequire } from 'module';
import GuestUsage from '../models/Guestusage.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const router = express.Router();
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const MAX_FREE_CHECKS = 5;

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF, DOC, DOCX, or TXT files allowed'));
  }
});

async function extractText(filePath, mimetype) {
  if (mimetype === 'text/plain') {
    return fs.readFileSync(filePath, 'utf-8').trim();
  }
  if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      const text = result.value?.trim();
      if (text && text.length > 50) { console.log('DOCX parsed, length:', text.length); return text; }
    } catch (e) { console.log('DOCX failed:', e.message); }
    return '';
  }
  if (mimetype === 'application/pdf') {
    try {
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      const text = data.text?.trim();
      if (text && text.length > 80) { console.log('PDF parsed, length:', text.length); return text; }
      else console.log('PDF text too short');
    } catch (e) { console.log('PDF failed:', e.message); }
    return '';
  }
  return '';
}

async function callGroq(resumeText) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: "You are an ATS resume analyzer. Always respond ONLY in JSON." },
        { role: "user", content: `Analyze this resume. Score 0-100.\n\nResume:\n${resumeText.slice(0, 3500)}\n\nReturn JSON:\n{"score": number, "feedback": "text", "suggestions": ["tip1","tip2","tip3","tip4"]}` }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    })
  });
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}

// ── GET remaining checks for a guest ──
router.get('/usage/:clientId', async (req, res) => {
  const { clientId } = req.params;
  if (!clientId) return res.json({ checksLeft: MAX_FREE_CHECKS });
  try {
    const usage = await GuestUsage.findOne({ clientId });
    const used = usage?.atsChecks || 0;
    res.json({ checksLeft: Math.max(0, MAX_FREE_CHECKS - used), used });
  } catch (err) {
    res.json({ checksLeft: MAX_FREE_CHECKS });
  }
});

// ── CHECK ATS ──
router.post('/check', upload.single('resume'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const filePath = req.file.path;
  const clientId = req.body.clientId || req.headers['x-client-id'];
  const isLoggedIn = req.body.isLoggedIn === 'true' || req.headers['x-logged-in'] === 'true';

  // ── Check guest limit ──
  if (!isLoggedIn) {
    if (!clientId) {
      try { fs.unlinkSync(filePath); } catch (e) {}
      return res.status(403).json({ error: 'limit_reached', message: 'Please sign in to continue.' });
    }
    try {
      const usage = await GuestUsage.findOne({ clientId });
      const used = usage?.atsChecks || 0;
      if (used >= MAX_FREE_CHECKS) {
        try { fs.unlinkSync(filePath); } catch (e) {}
        return res.status(403).json({
          error: 'limit_reached',
          message: `You have used all ${MAX_FREE_CHECKS} free checks. Please sign in for unlimited access.`,
          checksLeft: 0
        });
      }
    } catch (err) {
      console.error('Usage check error:', err);
    }
  }

  // ── Extract text ──
  let resumeText = '';
  try {
    resumeText = await extractText(filePath, req.file.mimetype);
  } catch (err) {
    console.error('Extraction error:', err);
  } finally {
    try { fs.unlinkSync(filePath); } catch (e) {}
  }

  if (!resumeText || resumeText.length < 80) {
    return res.json({
      score: 0,
      feedback: 'Could not extract text properly.',
      suggestions: ['Upload DOCX (best format)', 'Avoid scanned PDFs', 'Use text-based resume', 'Try saving from Word/Google Docs']
    });
  }

  // ── Analyze ──
  try {
    const response = await callGroq(resumeText);
    let cleaned = response.replace(/```json/gi, '').replace(/```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1) throw new Error('Invalid JSON');
    const parsed = JSON.parse(cleaned.slice(start, end + 1));

    // ── Increment guest usage in DB ──
    if (!isLoggedIn && clientId) {
      try {
        await GuestUsage.findOneAndUpdate(
          { clientId },
          { $inc: { atsChecks: 1 }, $set: { lastUsed: new Date() } },
          { upsert: true, new: true }
        );
      } catch (err) {
        console.error('Usage update error:', err);
      }
    }

    // ── Get remaining checks ──
    let checksLeft = null;
    if (!isLoggedIn && clientId) {
      const usage = await GuestUsage.findOne({ clientId });
      checksLeft = Math.max(0, MAX_FREE_CHECKS - (usage?.atsChecks || 0));
    }

    return res.json({
      score: Math.min(100, Math.max(0, Number(parsed.score) || 0)),
      feedback: parsed.feedback || 'Analysis done',
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 5) : [],
      checksLeft
    });

  } catch (err) {
    console.error('Groq error:', err.message);
    return res.status(500).json({ error: 'Analysis failed' });
  }
});

export default router;