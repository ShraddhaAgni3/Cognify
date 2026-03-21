import { useEffect, useState } from 'react';
import { SignedIn, UserButton, useAuth } from '@clerk/clerk-react';
import './App.css';
import { useUser } from '@clerk/clerk-react';

const Recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
Recognition.continuous = true;
Recognition.interimResults = true;

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
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
