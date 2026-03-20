import { useEffect, useState } from 'react';
import { SignedIn, UserButton, useAuth } from '@clerk/clerk-react';
import './App.css';
import { useUser } from '@clerk/clerk-react';

const Recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
Recognition.continuous = true;
Recognition.interimResults = true;

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display:ital@0;1&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .cognify-app {
    font-family: 'DM Sans', sans-serif;
    background: #F7F6F3;
    min-height: 100vh;
  }

  /* SIDEBAR */
  .sidebar {
    position: fixed;
    top: 0; left: 0;
    width: 260px;
    height: 100vh;
    background: #1A1A2E;
    display: flex;
    flex-direction: column;
    padding: 0;
    z-index: 100;
    overflow: hidden;
  }

  .sidebar-header {
    padding: 24px 20px 20px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .sidebar-logo {
    width: 38px; height: 38px;
    border-radius: 10px;
    object-fit: cover;
  }

  .sidebar-brand {
    font-family: 'DM Serif Display', serif;
    color: #fff;
    font-size: 20px;
    letter-spacing: -0.3px;
  }

  .sidebar-section-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.3);
    padding: 20px 20px 8px;
  }

  .sidebar-entries {
    flex: 1;
    overflow-y: auto;
    padding: 0 12px;
  }

  .sidebar-entries::-webkit-scrollbar { width: 3px; }
  .sidebar-entries::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }

  .sidebar-entry-btn {
    width: 100%;
    text-align: left;
    padding: 10px 12px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: rgba(255,255,255,0.55);
    font-size: 13px;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    margin-bottom: 2px;
    transition: all 0.15s;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.4;
  }

  .sidebar-entry-btn:hover {
    background: rgba(255,255,255,0.07);
    color: #fff;
  }

  .sidebar-entry-btn.active {
    background: rgba(99,102,241,0.2);
    color: #A5B4FC;
  }

  .sidebar-footer {
    padding: 16px 12px;
    border-top: 1px solid rgba(255,255,255,0.06);
  }

  .btn-clear {
    width: 100%;
    padding: 10px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.1);
    background: transparent;
    color: rgba(255,255,255,0.4);
    font-size: 12px;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  .btn-clear:hover {
    border-color: rgba(239,68,68,0.4);
    color: #FCA5A5;
    background: rgba(239,68,68,0.08);
  }

  /* MAIN CONTENT */
  .main-content {
    margin-left: 260px;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  /* TOPBAR */
  .topbar {
    position: sticky;
    top: 0;
    z-index: 50;
    background: rgba(247,246,243,0.85);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(0,0,0,0.06);
    padding: 14px 32px;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .domain-input {
    flex: 1;
    min-width: 200px;
    max-width: 280px;
    padding: 10px 16px;
    border-radius: 10px;
    border: 1.5px solid rgba(0,0,0,0.1);
    background: #fff;
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
    outline: none;
    transition: border-color 0.15s;
    color: #1a1a1a;
  }

  .domain-input:focus {
    border-color: #6366F1;
    box-shadow: 0 0 0 3px rgba(99,102,241,0.08);
  }

  .domain-input::placeholder { color: #aaa; }

  .btn-primary {
    padding: 10px 20px;
    border-radius: 10px;
    border: none;
    background: #6366F1;
    color: #fff;
    font-size: 14px;
    font-weight: 500;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }

  .btn-primary:hover { background: #4F46E5; transform: translateY(-1px); }
  .btn-primary:active { transform: translateY(0); }

  .btn-secondary {
    padding: 10px 18px;
    border-radius: 10px;
    border: 1.5px solid rgba(0,0,0,0.1);
    background: #fff;
    color: #444;
    font-size: 14px;
    font-weight: 500;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .btn-secondary:hover {
    border-color: #6366F1;
    color: #6366F1;
    background: rgba(99,102,241,0.04);
  }

  .btn-secondary:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .topbar-right { margin-left: auto; }

  /* PAGE AREA */
  .page-area {
    flex: 1;
    padding: 40px 32px;
    max-width: 900px;
    width: 100%;
    margin: 0 auto;
  }

  /* QUESTION CARD */
  .question-card {
    background: #fff;
    border-radius: 20px;
    padding: 40px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04);
    margin-bottom: 24px;
    text-align: center;
  }

  .question-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: #6366F1;
    margin-bottom: 16px;
  }

  .question-text {
    font-family: 'DM Serif Display', serif;
    font-size: 28px;
    color: #1A1A2E;
    line-height: 1.4;
    letter-spacing: -0.3px;
  }

  /* RECORD BUTTON */
  .record-btn {
    width: 100%;
    padding: 16px;
    border-radius: 14px;
    border: none;
    font-size: 16px;
    font-weight: 500;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-top: 8px;
  }

  .record-btn.idle {
    background: #6366F1;
    color: #fff;
    box-shadow: 0 4px 14px rgba(99,102,241,0.3);
  }

  .record-btn.idle:hover {
    background: #4F46E5;
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(99,102,241,0.35);
  }

  .record-btn.recording {
    background: #1A1A2E;
    color: #fff;
    animation: pulse-record 2s infinite;
  }

  @keyframes pulse-record {
    0%, 100% { box-shadow: 0 4px 14px rgba(26,26,46,0.3); }
    50% { box-shadow: 0 4px 24px rgba(239,68,68,0.4); }
  }

  .record-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #EF4444;
    animation: blink 1s infinite;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  /* TRANSCRIPT CARD */
  .transcript-card {
    background: #fff;
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 20px;
    border: 1.5px solid rgba(0,0,0,0.06);
  }

  .card-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: #999;
    margin-bottom: 10px;
  }

  .card-text {
    font-size: 15px;
    color: #333;
    line-height: 1.7;
  }

  /* FEEDBACK GRID */
  .feedback-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 20px;
  }

  @media (max-width: 640px) {
    .feedback-grid { grid-template-columns: 1fr; }
  }

  .feedback-card {
    background: #fff;
    border-radius: 16px;
    padding: 24px;
    border: 1.5px solid rgba(0,0,0,0.06);
  }

  .feedback-card.green { border-top: 3px solid #10B981; }
  .feedback-card.blue { border-top: 3px solid #6366F1; }

  .score-row {
    display: flex;
    gap: 16px;
    margin-bottom: 12px;
  }

  .score-chip {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 500;
    background: #F0FDF4;
    color: #166534;
  }

  /* LOADING */
  .loading-state {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 40px;
    color: #999;
    font-size: 15px;
  }

  .spinner {
    width: 20px; height: 20px;
    border: 2px solid #e5e7eb;
    border-top-color: #6366F1;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: #bbb;
  }

  .empty-state-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .empty-state-text {
    font-size: 16px;
    color: #999;
  }

  /* NOTES MODAL */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.4);
    backdrop-filter: blur(4px);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: fadeIn 0.15s ease;
  }

  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  .modal-box {
    background: #fff;
    border-radius: 20px;
    padding: 32px;
    width: 100%;
    max-width: 520px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.15);
    animation: slideUp 0.2s ease;
  }

  @keyframes slideUp {
    from { transform: translateY(16px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .modal-title {
    font-family: 'DM Serif Display', serif;
    font-size: 22px;
    color: #1A1A2E;
    margin-bottom: 6px;
  }

  .modal-subtitle {
    font-size: 13px;
    color: #999;
    margin-bottom: 20px;
  }

  .modal-textarea {
    width: 100%;
    padding: 14px 16px;
    border-radius: 12px;
    border: 1.5px solid rgba(0,0,0,0.1);
    background: #FAFAFA;
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
    color: #333;
    resize: none;
    outline: none;
    min-height: 120px;
    line-height: 1.6;
    transition: border-color 0.15s;
  }

  .modal-textarea:focus {
    border-color: #6366F1;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(99,102,241,0.08);
  }

  .modal-actions {
    display: flex;
    gap: 10px;
    margin-top: 16px;
    justify-content: flex-end;
  }

  .btn-cancel {
    padding: 10px 20px;
    border-radius: 10px;
    border: 1.5px solid rgba(0,0,0,0.1);
    background: transparent;
    color: #666;
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-cancel:hover { background: #f5f5f5; }

  .btn-save {
    padding: 10px 24px;
    border-radius: 10px;
    border: none;
    background: #6366F1;
    color: #fff;
    font-size: 14px;
    font-weight: 500;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-save:hover { background: #4F46E5; }

  /* NOTES LIST */
  .notes-list {
    margin-top: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .note-item {
    background: #FAFAFA;
    border: 1.5px solid rgba(0,0,0,0.06);
    border-radius: 12px;
    padding: 14px 16px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .note-text { font-size: 14px; color: #333; line-height: 1.6; }
  .note-date { font-size: 11px; color: #bbb; margin-top: 4px; }

  .btn-delete-note {
    background: transparent;
    border: none;
    color: #ddd;
    cursor: pointer;
    font-size: 16px;
    padding: 2px;
    transition: color 0.15s;
    flex-shrink: 0;
  }

  .btn-delete-note:hover { color: #EF4444; }

  /* MCQ PAGE */
  .mcq-overlay {
    position: fixed;
    inset: 0;
    background: #F7F6F3;
    z-index: 150;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    animation: fadeIn 0.2s ease;
  }

  .mcq-header {
    background: #fff;
    border-bottom: 1px solid rgba(0,0,0,0.06);
    padding: 16px 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .mcq-title {
    font-family: 'DM Serif Display', serif;
    font-size: 22px;
    color: #1A1A2E;
  }

  .mcq-meta {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .timer-chip {
    padding: 6px 14px;
    border-radius: 20px;
    background: #FEF3C7;
    color: #92400E;
    font-size: 14px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .timer-chip.urgent {
    background: #FEE2E2;
    color: #991B1B;
    animation: pulse-record 1s infinite;
  }

  .mcq-progress-bar {
    height: 3px;
    background: #E5E7EB;
    position: sticky;
    top: 57px;
    z-index: 10;
  }

  .mcq-progress-fill {
    height: 100%;
    background: #6366F1;
    transition: width 0.3s ease;
  }

  .mcq-body {
    max-width: 720px;
    margin: 0 auto;
    padding: 40px 24px;
    width: 100%;
  }

  .mcq-question-num {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: #6366F1;
    margin-bottom: 12px;
  }

  .mcq-question-text {
    font-family: 'DM Serif Display', serif;
    font-size: 24px;
    color: #1A1A2E;
    line-height: 1.45;
    margin-bottom: 28px;
  }

  .mcq-options {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 32px;
  }

  .mcq-option {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px 20px;
    border-radius: 14px;
    border: 2px solid rgba(0,0,0,0.08);
    background: #fff;
    cursor: pointer;
    transition: all 0.15s;
    text-align: left;
    font-size: 15px;
    font-family: 'DM Sans', sans-serif;
    color: #333;
    width: 100%;
  }

  .mcq-option:hover {
    border-color: #6366F1;
    background: rgba(99,102,241,0.03);
  }

  .mcq-option.selected {
    border-color: #6366F1;
    background: rgba(99,102,241,0.06);
    color: #1A1A2E;
    font-weight: 500;
  }

  .mcq-option.correct {
    border-color: #10B981;
    background: #F0FDF4;
    color: #065F46;
  }

  .mcq-option.wrong {
    border-color: #EF4444;
    background: #FEF2F2;
    color: #991B1B;
  }

  .option-circle {
    width: 28px; height: 28px;
    border-radius: 50%;
    border: 2px solid currentColor;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 600;
    flex-shrink: 0;
    opacity: 0.5;
  }

  .mcq-option.selected .option-circle,
  .mcq-option.correct .option-circle,
  .mcq-option.wrong .option-circle { opacity: 1; }

  .mcq-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .btn-nav {
    padding: 11px 24px;
    border-radius: 10px;
    border: 1.5px solid rgba(0,0,0,0.1);
    background: #fff;
    color: #444;
    font-size: 14px;
    font-weight: 500;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-nav:hover:not(:disabled) { border-color: #6366F1; color: #6366F1; }
  .btn-nav:disabled { opacity: 0.3; cursor: not-allowed; }

  .question-dots {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
    justify-content: center;
    max-width: 300px;
  }

  .q-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #E5E7EB;
    transition: background 0.15s;
    cursor: pointer;
  }

  .q-dot.answered { background: #6366F1; }
  .q-dot.current { background: #1A1A2E; transform: scale(1.3); }

  /* MCQ RESULTS */
  .results-container {
    max-width: 720px;
    margin: 0 auto;
    padding: 40px 24px;
  }

  .results-score-card {
    background: #fff;
    border-radius: 20px;
    padding: 40px;
    text-align: center;
    margin-bottom: 24px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }

  .results-score-big {
    font-family: 'DM Serif Display', serif;
    font-size: 72px;
    color: #6366F1;
    line-height: 1;
    margin-bottom: 8px;
  }

  .results-score-label {
    font-size: 16px;
    color: #999;
    margin-bottom: 24px;
  }

  .results-badges {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .badge {
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
  }

  .badge.green { background: #DCFCE7; color: #166534; }
  .badge.red { background: #FEE2E2; color: #991B1B; }
  .badge.blue { background: #EEF2FF; color: #3730A3; }

  .result-item {
    background: #fff;
    border-radius: 14px;
    padding: 20px 24px;
    margin-bottom: 12px;
    border-left: 4px solid #E5E7EB;
  }

  .result-item.correct-ans { border-left-color: #10B981; }
  .result-item.wrong-ans { border-left-color: #EF4444; }

  .result-q { font-size: 15px; color: #1A1A2E; margin-bottom: 10px; font-weight: 500; }

  .result-answers {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .result-answer-row {
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .result-answer-row.correct-a { color: #065F46; }
  .result-answer-row.wrong-a { color: #991B1B; }
`;

export default function PracticePage() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedbackLoadingStatus, setFeedbackLoadingStatus] = useState(false);
  const [feedbackData, setFeedbackData] = useState(null);
  const { isSignedIn, isLoaded } = useAuth();
  const [selectedQuestion, setSelectedQuestion] = useState("🤖 Welcome to Cognify");
  const [domainInput, setDomainInput] = useState('');
  const [previousQuestions, setPreviousQuestions] = useState([]);
  const [sidebarData, setSidebarData] = useState([]);
  const [selectedSidebarEntry, setSelectedSidebarEntry] = useState(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [mcqList, setMcqList] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [showMcqPage, setShowMcqPage] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10 * 60);
  const [mcqSubmitted, setMcqSubmitted] = useState(false);
  const [loadingMcqs, setLoadingMcqs] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const { user } = useUser();

  if (isLoaded && !isSignedIn) return <div style={{padding:'40px',textAlign:'center'}}>Please sign in.</div>;

  const fetchSidebarData = async () => {
    if (!user?.username) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/entries?username=${user.username}`);
      const data = await res.json();
      setSidebarData(data);
    } catch (err) { console.error("Failed to fetch sidebar data:", err); }
  };

  const fetchMCQs = async () => {
    if (!domainInput.trim()) return;
    setLoadingMcqs(true);
    setMcqList([]);
    setCurrentQuestionIndex(0);
    setSelectedOptions({});
    setMcqSubmitted(false);
    setTimeLeft(10 * 60);
    try {
      const res = await fetch(`${BACKEND_URL}/api/groq/mcqs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domainInput })
      });
      const mcqs = await res.json();
      if (Array.isArray(mcqs)) {
        setMcqList(mcqs);
        setShowMcqPage(true);
      } else {
        alert("Error generating MCQs. Please try again.");
      }
    } catch (err) {
      console.error("Failed to load MCQs:", err);
      alert("Error generating MCQs. Please try again.");
    } finally {
      setLoadingMcqs(false);
    }
  };

  useEffect(() => {
    if (!showMcqPage || mcqSubmitted) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); setMcqSubmitted(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [showMcqPage, mcqSubmitted]);

  const score = mcqList.reduce((total, q, idx) =>
    total + (selectedOptions[idx]?.trim().toLowerCase() === q.answer?.trim().toLowerCase() ? 1 : 0), 0);
  const percentage = mcqList.length ? ((score / mcqList.length) * 100).toFixed(0) : 0;

  useEffect(() => { if (user) fetchSidebarData(); }, [user]);

  const handleStartListening = () => {
    if (isListening) return;
    setSelectedSidebarEntry(null);
    setTranscript('');
    setFeedbackData(null);
    setIsListening(true);
    Recognition.start();
  };

  const handleStopListening = async () => {
    setIsListening(false);
    Recognition.stop();
    await getFeedback();
  };

  useEffect(() => {
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) return;
    Recognition.onstart = () => {};
    Recognition.onresult = (e) => setTranscript(e.results[e.resultIndex][0].transcript);
    Recognition.onerror = (err) => console.log('Speech error:', err);
    Recognition.onend = async () => { setIsListening(false); await getFeedback(); };
  }, []);

  const getFeedback = async () => {
    if (!transcript.trim()) return;
    setFeedbackLoadingStatus(true);
    try {
      const feedRes = await fetch(`${BACKEND_URL}/api/groq/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: selectedQuestion, answer: transcript })
      });
      const parsed = await feedRes.json();
      setFeedbackData(parsed);
      try {
        await fetch(`${BACKEND_URL}/api/entries/add`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: selectedQuestion, feedback: parsed.feedback,
            idealAnswer: parsed.correct_answer, userAnswer: transcript,
            name: user.username, notes: parsed.notes
          }),
        });
        fetchSidebarData();
      } catch (err) { console.error("Failed to save:", err); }
    } catch (error) {
      setFeedbackData({ correctness: 0, completeness: 0, feedback: 'Error fetching feedback.', correct_answer: 'N/A' });
    } finally { setFeedbackLoadingStatus(false); }
  };

  const handleClearAll = async () => {
    setTranscript(''); setFeedbackData(null); setSelectedSidebarEntry(null); setSidebarData([]);
    try {
      if (!user?.username) return;
      await fetch(`${BACKEND_URL}/api/entries/clear`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username }),
      });
    } catch (err) { console.error('Error clearing:', err); }
  };

  const fetchQuestionFromDomain = async () => {
    if (!domainInput.trim()) return;
    setSelectedSidebarEntry(null); setTranscript(''); setFeedbackData(null);
    setSelectedQuestion("Generating question...");
    try {
      const res = await fetch(`${BACKEND_URL}/api/groq/question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domainInput, previousQuestions })
      });
      const data = await res.json();
      if (data.question) {
        setSelectedQuestion(data.question.trim());
        setPreviousQuestions(prev => [...prev, data.question.trim()]);
      }
    } catch (err) { setSelectedQuestion('❌ Error generating question. Try again.'); }
  };

  const formatTime = (s) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
  const optionLetters = ['A','B','C','D'];

  const currentQuestion = selectedSidebarEntry ? selectedSidebarEntry.question : selectedQuestion;

  return (
    <div className="cognify-app">
      <style>{styles}</style>

      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src="/cognify.png" alt="Logo" className="sidebar-logo" />
          <span className="sidebar-brand">Cognify</span>
        </div>
        {sidebarData.length > 0 && <div className="sidebar-section-label">Recent Sessions</div>}
        <div className="sidebar-entries">
          {sidebarData.map((entry) => (
            <button key={entry._id}
              className={`sidebar-entry-btn ${selectedSidebarEntry?._id === entry._id ? 'active' : ''}`}
              onClick={() => setSelectedSidebarEntry(entry)}>
              {entry.question.slice(0, 48)}{entry.question.length > 48 ? '…' : ''}
            </button>
          ))}
        </div>
        <div className="sidebar-footer">
          <button className="btn-clear" onClick={handleClearAll}>
            <span>🗑</span> Clear all sessions
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="main-content">
        {/* TOPBAR */}
        <header className="topbar">
          <input className="domain-input" type="text" value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchQuestionFromDomain()}
            placeholder="Enter a domain (e.g., React, Python…)" />
          <button className="btn-primary" onClick={fetchQuestionFromDomain}>
            Generate Question
          </button>
          <button className="btn-secondary" onClick={() => {
            if (!selectedSidebarEntry && !feedbackData) { alert("Generate a question and answer it first, then add notes."); return; }
            setShowNotesModal(true);
          }}>
            📝 Notes
          </button>
          <button className="btn-secondary" onClick={fetchMCQs} disabled={!domainInput.trim() || loadingMcqs}>
            {loadingMcqs ? <><span className="spinner" style={{width:14,height:14,borderWidth:2}}></span> Loading…</> : '📋 MCQ Quiz'}
          </button>
          <div className="topbar-right">
            <UserButton />
          </div>
        </header>

        {/* PAGE CONTENT */}
        <div className="page-area">

          {/* QUESTION CARD */}
          <div className="question-card">
            <div className="question-label">
              {selectedSidebarEntry ? 'Past Session' : 'Interview Question'}
            </div>
            <div className="question-text">{currentQuestion}</div>
          </div>

          {/* SELECTED SIDEBAR ENTRY VIEW */}
          {selectedSidebarEntry ? (
            <>
              <div className="transcript-card">
                <div className="card-label">Your Answer</div>
                <div className="card-text">{selectedSidebarEntry.userAnswer}</div>
              </div>
              <div className="feedback-grid">
                <div className="feedback-card green">
                  <div className="card-label">Feedback</div>
                  <div className="card-text">{selectedSidebarEntry.feedback}</div>
                </div>
                <div className="feedback-card blue">
                  <div className="card-label">Ideal Answer</div>
                  <div className="card-text">{selectedSidebarEntry.idealAnswer}</div>
                </div>
              </div>
              {selectedSidebarEntry?.notes?.length > 0 && (
                <div className="notes-list">
                  <div className="card-label" style={{paddingLeft:4}}>📝 Saved Notes</div>
                  {selectedSidebarEntry.notes.map((n, idx) => (
                    <div className="note-item" key={idx}>
                      <div>
                        <div className="note-text">{n.notes}</div>
                        <div className="note-date">{new Date(n.createdAt).toLocaleString()}</div>
                      </div>
                      <button className="btn-delete-note" onClick={async () => {
                        if (!confirm("Delete this note?")) return;
                        try {
                          const res = await fetch(`${BACKEND_URL}/api/entries/${selectedSidebarEntry._id}/notes/${idx}`, { method: 'DELETE' });
                          if (res.ok) { alert("Deleted!"); fetchSidebarData(); setSelectedSidebarEntry(null); }
                        } catch (err) { alert("Something went wrong."); }
                      }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{marginTop:16}}>
                <button className="btn-secondary" onClick={() => setSelectedSidebarEntry(null)}>
                  ← Back to practice
                </button>
              </div>
            </>
          ) : (
            <>
              {/* TRANSCRIPT */}
              {transcript && (
                <div className="transcript-card">
                  <div className="card-label">Your Answer</div>
                  <div className="card-text">{transcript}</div>
                </div>
              )}

              {/* FEEDBACK */}
              {feedbackLoadingStatus ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  Analyzing your response…
                </div>
              ) : feedbackData ? (
                <div className="feedback-grid">
                  <div className="feedback-card green">
                    <div className="card-label">Feedback</div>
                    <div className="score-row">
                      <span className="score-chip">Correctness {feedbackData.correctness}/5</span>
                      <span className="score-chip">Completeness {feedbackData.completeness}/5</span>
                    </div>
                    <div className="card-text">{feedbackData.feedback}</div>
                  </div>
                  <div className="feedback-card blue">
                    <div className="card-label">Ideal Answer</div>
                    <div className="card-text">{feedbackData.correct_answer}</div>
                  </div>
                </div>
              ) : (
                !transcript && (
                  <div className="empty-state">
                    <div className="empty-state-icon">🎙</div>
                    <div className="empty-state-text">Press record and speak your answer to get AI feedback</div>
                  </div>
                )
              )}

              {/* RECORD BUTTON */}
              <button
                className={`record-btn ${isListening ? 'recording' : 'idle'}`}
                onClick={isListening ? handleStopListening : handleStartListening}>
                {isListening ? (<><div className="record-dot"></div> Stop Recording</>) : '🎙 Start Recording'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* NOTES MODAL */}
      {showNotesModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowNotesModal(false)}>
          <div className="modal-box">
            <div className="modal-title">Add a Note</div>
            <div className="modal-subtitle">
              {selectedSidebarEntry
                ? `For: "${selectedSidebarEntry.question.slice(0,60)}…"`
                : "Select a past session from sidebar to attach notes"}
            </div>
            <textarea className="modal-textarea" placeholder="Write your notes here…"
              value={noteContent} onChange={(e) => setNoteContent(e.target.value)}
              autoFocus rows={5} />
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => { setShowNotesModal(false); setNoteContent(''); }}>
                Cancel
              </button>
              <button className="btn-save" onClick={async () => {
                if (!noteContent.trim() || !selectedSidebarEntry?._id) {
                  alert("Select a past session from sidebar first."); return;
                }
                try {
                  const res = await fetch(`${BACKEND_URL}/api/entries/${selectedSidebarEntry._id}/add-note`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ note: noteContent }),
                  });
                  if (res.ok) {
                    setNoteContent(''); setShowNotesModal(false); fetchSidebarData();
                  } else alert("Failed to save note.");
                } catch (err) { alert("Something went wrong."); }
              }}>Save Note</button>
            </div>
          </div>
        </div>
      )}

      {/* MCQ FULL PAGE */}
      {showMcqPage && (
        <div className="mcq-overlay">
          <div className="mcq-header">
            <div className="mcq-title">MCQ Quiz — {domainInput}</div>
            <div className="mcq-meta">
              {!mcqSubmitted && (
                <div className={`timer-chip ${timeLeft < 60 ? 'urgent' : ''}`}>
                  ⏱ {formatTime(timeLeft)}
                </div>
              )}
              <button className="btn-secondary" onClick={() => { setShowMcqPage(false); setMcqSubmitted(false); }}>
                {mcqSubmitted ? '✕ Close' : '✕ Exit'}
              </button>
            </div>
          </div>

          {!mcqSubmitted && (
            <div className="mcq-progress-bar">
              <div className="mcq-progress-fill"
                style={{ width: `${((currentQuestionIndex + 1) / mcqList.length) * 100}%` }} />
            </div>
          )}

          {!mcqSubmitted ? (
            <div className="mcq-body">
              <div className="mcq-question-num">Question {currentQuestionIndex + 1} of {mcqList.length}</div>
              <div className="mcq-question-text">{mcqList[currentQuestionIndex]?.question}</div>
              <div className="mcq-options">
                {mcqList[currentQuestionIndex]?.options.map((option, i) => (
                  <button key={i}
                    className={`mcq-option ${selectedOptions[currentQuestionIndex] === option ? 'selected' : ''}`}
                    onClick={() => setSelectedOptions(prev => ({ ...prev, [currentQuestionIndex]: option }))}>
                    <span className="option-circle">{optionLetters[i]}</span>
                    {option}
                  </button>
                ))}
              </div>
              <div className="mcq-nav">
                <button className="btn-nav" onClick={() => setCurrentQuestionIndex(i => Math.max(i-1,0))}
                  disabled={currentQuestionIndex === 0}>← Previous</button>
                <div className="question-dots">
                  {mcqList.map((_, i) => (
                    <div key={i} className={`q-dot ${selectedOptions[i] ? 'answered' : ''} ${i === currentQuestionIndex ? 'current' : ''}`}
                      onClick={() => setCurrentQuestionIndex(i)} />
                  ))}
                </div>
                {currentQuestionIndex === mcqList.length - 1
                  ? <button className="btn-primary" onClick={() => setMcqSubmitted(true)}>Submit Quiz</button>
                  : <button className="btn-nav" onClick={() => setCurrentQuestionIndex(i => Math.min(i+1, mcqList.length-1))}>Next →</button>
                }
              </div>
            </div>
          ) : (
            <div className="results-container">
              <div className="results-score-card">
                <div className="results-score-big">{percentage}%</div>
                <div className="results-score-label">You scored {score} out of {mcqList.length} questions</div>
                <div className="results-badges">
                  <span className="badge green">✓ {score} Correct</span>
                  <span className="badge red">✗ {mcqList.length - score} Wrong</span>
                  <span className="badge blue">{domainInput}</span>
                </div>
              </div>
              {mcqList.map((q, idx) => {
                const userAnswer = selectedOptions[idx];
                const isCorrect = userAnswer?.trim().toLowerCase() === q.answer?.trim().toLowerCase();
                return (
                  <div key={idx} className={`result-item ${isCorrect ? 'correct-ans' : 'wrong-ans'}`}>
                    <div className="result-q">Q{idx+1}. {q.question}</div>
                    <div className="result-answers">
                      <div className={`result-answer-row ${isCorrect ? 'correct-a' : 'wrong-a'}`}>
                        <span>{isCorrect ? '✓' : '✗'}</span>
                        <span>Your answer: {userAnswer || 'No answer'}</span>
                      </div>
                      {!isCorrect && (
                        <div className="result-answer-row correct-a">
                          <span>✓</span>
                          <span>Correct: {q.answer}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
