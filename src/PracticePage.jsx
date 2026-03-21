import { useEffect, useState, useRef } from 'react';
import MCQPage from './Mcqpage.jsx';
import ATSPage from './Atspage.jsx';
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
  const [selectedQuestion, setSelectedQuestion] = useState("🤖 Welcome to AnswerlyProAI");
  const [domainInput, setDomainInput] = useState('');
  const [previousQuestions, setPreviousQuestions] = useState([]);
  const [sidebarData, setSidebarData] = useState([]);
  const [selectedSidebarEntry, setSelectedSidebarEntry] = useState(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showMcqPage, setShowMcqPage] = useState(false);
  const [showAtsPage, setShowAtsPage] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [code, setCode] = useState(LANGUAGES[0].defaultCode);
  const [output, setOutput] = useState('');
  const [outputStatus, setOutputStatus] = useState('idle');
  const [isRunning, setIsRunning] = useState(false);
  const [codeReview, setCodeReview] = useState(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const codeRef = useRef(null);
  const { user } = useUser();

  if (isLoaded && !isSignedIn) return <div className="p-10 text-center text-gray-500">Please sign in.</div>;

  const currentQuestion = selectedSidebarEntry ? selectedSidebarEntry.question : selectedQuestion;
  const questionIsCode = isCodeQuestion(currentQuestion);

  useEffect(() => { if (questionIsCode) setShowEditor(true); }, [currentQuestion]);

  const fetchSidebarData = async () => {
    if (!user?.username) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/entries?username=${user.username}`);
      const data = await res.json();
      setSidebarData(data);
    } catch (err) { console.error("Sidebar fetch failed:", err); }
  };

  const fetchMCQs = () => { if (!domainInput.trim()) return; setShowMcqPage(true); };

  useEffect(() => { if (user) fetchSidebarData(); }, [user]);

  const handleStartListening = () => {
    if (isListening) return;
    setSelectedSidebarEntry(null); setTranscript(''); setFeedbackData(null); setIsListening(true);
    Recognition.start();
  };

  const handleStopListening = async () => {
    setIsListening(false); Recognition.stop(); await getFeedback();
  };

  useEffect(() => {
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) return;
    Recognition.onresult = (e) => setTranscript(e.results[e.resultIndex][0].transcript);
    Recognition.onerror = (err) => console.log('Speech error:', err);
    Recognition.onend = async () => { setIsListening(false); await getFeedback(); };
  }, []);

  const getFeedback = async () => {
    if (!transcript.trim()) return;
    setFeedbackLoadingStatus(true);
    try {
      const feedRes = await fetch(`${BACKEND_URL}/api/groq/feedback`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: selectedQuestion, answer: transcript })
      });
      const parsed = await feedRes.json();
      setFeedbackData(parsed);
      try {
        await fetch(`${BACKEND_URL}/api/entries/add`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: selectedQuestion, feedback: parsed.feedback, idealAnswer: parsed.correct_answer, userAnswer: transcript, name: user.username }),
        });
        fetchSidebarData();
      } catch (err) { console.error("Save failed:", err); }
    } catch (error) {
      setFeedbackData({ correctness: 0, completeness: 0, feedback: 'Error fetching feedback.', correct_answer: 'N/A' });
    } finally { setFeedbackLoadingStatus(false); }
  };

  const handleClearAll = async () => {
    setTranscript(''); setFeedbackData(null); setSelectedSidebarEntry(null); setSidebarData([]);
    try {
      if (!user?.username) return;
      await fetch(`${BACKEND_URL}/api/entries/clear`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user.username }) });
    } catch (err) { console.error('Clear error:', err); }
  };

  const fetchQuestionFromDomain = async () => {
    if (!domainInput.trim()) return;
    setSelectedSidebarEntry(null); setTranscript(''); setFeedbackData(null); setCodeReview(null);
    setSelectedQuestion("Generating question...");
    try {
      const res = await fetch(`${BACKEND_URL}/api/groq/question`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domainInput, previousQuestions })
      });
      const data = await res.json();
      if (data.question) { setSelectedQuestion(data.question.trim()); setPreviousQuestions(prev => [...prev, data.question.trim()]); }
    } catch (err) { setSelectedQuestion('❌ Error generating question.'); }
  };

  const handleLangChange = (langId) => {
    const lang = LANGUAGES.find(l => l.id === langId);
    setSelectedLang(lang); setCode(lang.defaultCode); setOutput(''); setOutputStatus('idle'); setCodeReview(null);
  };

  const handleTabKey = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const newCode = code.substring(0, start) + '  ' + code.substring(e.target.selectionEnd);
      setCode(newCode);
      setTimeout(() => { e.target.selectionStart = e.target.selectionEnd = start + 2; }, 0);
    }
  };

  const runCode = async () => {
    if (!selectedLang.supported) {
      setOutput(`⚠️ ${selectedLang.name} execution is not supported.\n\nSupported: JavaScript ✓, Python ✓`);
      setOutputStatus('error'); return;
    }
    setIsRunning(true); setOutputStatus('running'); setOutput('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/run`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: selectedLang.id, code })
      });
      const data = await res.json();
      if (data.stderr && !data.stdout) { setOutput(data.stderr); setOutputStatus('error'); }
      else { setOutput((data.stdout || '(No output)').trim()); setOutputStatus('success'); }
    } catch (err) { setOutput('Network error: Could not connect to backend.'); setOutputStatus('error'); }
    finally { setIsRunning(false); }
  };

  const reviewCode = async () => {
    if (!code.trim() || code === selectedLang.defaultCode) { alert("Please write some code first."); return; }
    setIsReviewing(true); setCodeReview(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/groq/feedback`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: `Review this ${selectedLang.name} code for the problem: "${currentQuestion}"`,
          answer: `\`\`\`${selectedLang.id}\n${code}\n\`\`\``
        })
      });
      const data = await res.json();
      setCodeReview(data);
    } catch (err) {
      setCodeReview({ correctness: 0, completeness: 0, feedback: 'Error reviewing code.', correct_answer: '' });
    } finally { setIsReviewing(false); }
  };

  const FeedbackCards = ({ data }) => (
    <div className="space-y-4 mb-4">
      <div className="bg-white rounded-2xl p-6 border-t-4 border-emerald-500 border border-black/5">
        <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-3">Feedback</p>
        <div className="flex gap-2 mb-3 flex-wrap">
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">Correctness {data.correctness}/5</span>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">Completeness {data.completeness}/5</span>
        </div>
        <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">{data.feedback}</p>
      </div>
      <div className="bg-white rounded-2xl p-6 border-t-4 border-indigo-500 border border-black/5">
        <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-3">Ideal Answer</p>
        <pre className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap font-mono bg-gray-50 rounded-xl p-4 overflow-x-auto">{data.correct_answer}</pre>
      </div>
    </div>
  );

  const CodeReviewCards = ({ data }) => (
    <div className="space-y-4 mb-4">
      <div className="bg-white rounded-2xl p-6 border-t-4 border-violet-500 border border-black/5">
        <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-3">🤖 AI Code Review</p>
        <div className="flex gap-2 mb-3 flex-wrap">
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-violet-50 text-violet-700">Correctness {data.correctness}/5</span>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-violet-50 text-violet-700">Completeness {data.completeness}/5</span>
        </div>
        <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">{data.feedback}</p>
      </div>
      {data.correct_answer?.trim() && (
        <div className="bg-white rounded-2xl p-6 border-t-4 border-indigo-500 border border-black/5">
          <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-3">Suggested Code</p>
          <pre className="text-gray-200 leading-relaxed text-sm whitespace-pre-wrap bg-gray-900 rounded-xl p-4 overflow-x-auto"
            style={{ fontFamily: "'JetBrains Mono','Fira Code','Courier New',monospace" }}>
            {data.correct_answer}
          </pre>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* SIDEBAR */}
      <aside className="w-64 bg-gray-900 flex flex-col flex-shrink-0 h-screen">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/5">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">A</span>
          </div>
          <span className="text-white text-sm font-semibold tracking-tight">AnswerlyProAI</span>
        </div>
        {sidebarData.length > 0 && <p className="text-xs font-semibold tracking-widest uppercase text-white/30 px-5 pt-5 pb-2">Recent Sessions</p>}
        <div className="flex-1 overflow-y-auto px-3 space-y-0.5">
          {sidebarData.map((entry) => (
            <button key={entry._id} onClick={() => setSelectedSidebarEntry(entry)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm truncate transition-all ${selectedSidebarEntry?._id === entry._id ? 'bg-indigo-500/20 text-indigo-300' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}>
              {entry.question.slice(0, 48)}{entry.question.length > 48 ? '…' : ''}
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-white/5">
          <button onClick={handleClearAll}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-white/10 text-white/40 text-xs hover:border-red-400/40 hover:text-red-300 hover:bg-red-500/5 transition-all">
            🗑 Clear all sessions
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* TOPBAR */}
        <header className="flex items-center gap-2 px-6 py-3 bg-white/90 backdrop-blur border-b border-black/5 flex-shrink-0 flex-wrap z-10">
          <input type="text" value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchQuestionFromDomain()}
            placeholder="Enter a domain (e.g., React, Python…)"
            className="flex-1 min-w-[180px] max-w-[260px] px-4 py-2.5 rounded-xl border border-black/10 bg-white text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder-gray-400" />
          <button onClick={fetchQuestionFromDomain}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-all hover:-translate-y-px">
            Generate Question
          </button>
          <button onClick={() => setShowNotesModal(true)}
            className="px-4 py-2.5 border border-black/10 bg-white text-sm text-gray-600 rounded-xl hover:border-indigo-400 hover:text-indigo-600 transition-all">
            📝 Notes
          </button>
          <button onClick={fetchMCQs} disabled={!domainInput.trim()}
            className="px-4 py-2.5 border border-black/10 bg-white text-sm text-gray-600 rounded-xl hover:border-indigo-400 hover:text-indigo-600 transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
            📋 MCQ Quiz
          </button>
          {/* ATS Checker Button */}
          <button onClick={() => setShowAtsPage(true)}
            className="px-4 py-2.5 border border-black/10 bg-white text-sm text-gray-600 rounded-xl hover:border-emerald-400 hover:text-emerald-600 transition-all flex items-center gap-1.5">
            📄 ATS Checker
          </button>
          <button onClick={() => setShowEditor(v => !v)}
            className={`px-4 py-2.5 border text-sm font-medium rounded-xl transition-all flex items-center gap-1.5 ${showEditor ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-black/10 bg-white text-gray-600 hover:border-indigo-400 hover:text-indigo-600'}`}>
            💻 {showEditor ? 'Hide Editor' : 'Show Editor'}
            {questionIsCode && !showEditor && <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>}
          </button>
          <div className="ml-auto"><UserButton /></div>
        </header>

        <div className="flex flex-1 overflow-hidden">

          {/* LEFT PANEL */}
          <div className={`overflow-y-auto p-8 min-w-0 ${showEditor ? 'flex-1' : 'w-full'}`}>
            <div className={showEditor ? '' : 'max-w-3xl mx-auto'}>

              <div className="bg-white rounded-2xl p-8 shadow-sm border border-black/5 mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-xs font-semibold tracking-widest uppercase text-indigo-500">
                    {selectedSidebarEntry ? 'Past Session' : 'Interview Question'}
                  </p>
                  {questionIsCode && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">💻 Code Question</span>}
                </div>
                <p className="text-2xl font-semibold text-gray-800 leading-relaxed">{currentQuestion}</p>
              </div>

              {selectedSidebarEntry ? (
                <>
                  <div className="bg-white rounded-2xl p-6 border border-black/5 mb-4">
                    <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-2">Your Answer</p>
                    <p className="text-gray-700 leading-relaxed">{selectedSidebarEntry.userAnswer}</p>
                  </div>
                  <div className="space-y-4 mb-4">
                    <div className="bg-white rounded-2xl p-6 border-t-4 border-emerald-500 border border-black/5">
                      <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-2">Feedback</p>
                      <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">{selectedSidebarEntry.feedback}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-6 border-t-4 border-indigo-500 border border-black/5">
                      <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-2">Ideal Answer</p>
                      <pre className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap font-mono bg-gray-50 rounded-xl p-4 overflow-x-auto">{selectedSidebarEntry.idealAnswer}</pre>
                    </div>
                  </div>
                  {selectedSidebarEntry?.notes?.length > 0 && (
                    <div className="space-y-2 mb-4">
                      <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 pl-1">📝 Notes</p>
                      {selectedSidebarEntry.notes.map((n, idx) => (
                        <div key={idx} className="flex items-start justify-between gap-3 bg-gray-50 border border-black/5 rounded-xl p-4">
                          <div>
                            <p className="text-sm text-gray-700 leading-relaxed">{n.notes}</p>
                            <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                          </div>
                          <button onClick={async () => {
                            if (!confirm("Delete this note?")) return;
                            const res = await fetch(`${BACKEND_URL}/api/entries/${selectedSidebarEntry._id}/notes/${idx}`, { method: 'DELETE' });
                            if (res.ok) { fetchSidebarData(); setSelectedSidebarEntry(null); }
                          }} className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button onClick={() => setSelectedSidebarEntry(null)}
                    className="px-4 py-2 border border-black/10 bg-white text-sm text-gray-600 rounded-xl hover:border-indigo-400 hover:text-indigo-600 transition-all">
                    ← Back to practice
                  </button>
                </>
              ) : (
                <>
                  {transcript && (
                    <div className="bg-white rounded-2xl p-6 border border-black/5 mb-4">
                      <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-2">Your Answer</p>
                      <p className="text-gray-700 leading-relaxed">{transcript}</p>
                    </div>
                  )}
                  {feedbackLoadingStatus ? (
                    <div className="flex items-center justify-center gap-3 py-10 text-gray-400">
                      <span className="w-5 h-5 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin"></span>
                      Analyzing your response…
                    </div>
                  ) : feedbackData ? (
                    <FeedbackCards data={feedbackData} />
                  ) : !transcript && (
                    <div className="text-center py-16">
                      <div className="text-5xl mb-4 opacity-30">{questionIsCode ? '💻' : '🎙'}</div>
                      <p className="text-gray-400 text-base">
                        {questionIsCode ? 'Write your code in the editor, then record your explanation' : 'Press record and speak your answer to get AI feedback'}
                      </p>
                    </div>
                  )}
                  {codeReview && <CodeReviewCards data={codeReview} />}
                  <button onClick={isListening ? handleStopListening : handleStartListening}
                    className={`w-full py-4 rounded-2xl text-white font-medium text-base flex items-center justify-center gap-2.5 transition-all ${isListening ? 'bg-gray-800 hover:bg-gray-900 shadow-lg' : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 hover:-translate-y-0.5'}`}>
                    {isListening ? <><span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></span> Stop Recording</> : '🎙 Record Explanation'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* CODE EDITOR */}
          {showEditor && (
            <div className="w-5/12 flex flex-col border-l border-black/8 bg-gray-900 flex-shrink-0">
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-950 border-b border-white/5 flex-shrink-0 flex-wrap">
                <span className="text-white/40 text-xs font-medium">Language</span>
                <select value={selectedLang.id} onChange={(e) => handleLangChange(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-white/8 border border-white/10 text-white text-xs outline-none cursor-pointer">
                  {LANGUAGES.map(l => <option key={l.id} value={l.id} className="bg-gray-900">{l.name}</option>)}
                </select>
                <div className="ml-auto flex gap-2">
                  <button onClick={() => { setCode(selectedLang.defaultCode); setOutput(''); setOutputStatus('idle'); setCodeReview(null); }}
                    className="px-3 py-1.5 rounded-lg border border-white/10 text-white/50 text-xs hover:text-white hover:border-white/30 transition-all">Reset</button>
                  <button onClick={reviewCode} disabled={isReviewing}
                    className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed">
                    {isReviewing ? <><span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></span> Reviewing…</> : '🤖 Check Code'}
                  </button>
                  <button onClick={runCode} disabled={isRunning}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed">
                    {isRunning ? <><span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></span> Running…</> : '▶ Run'}
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <textarea ref={codeRef} value={code} onChange={(e) => setCode(e.target.value)}
                  onKeyDown={handleTabKey} spellCheck={false} autoComplete="off" autoCorrect="off" autoCapitalize="off"
                  className="w-full h-full p-4 bg-gray-900 text-gray-200 resize-none outline-none border-none text-sm leading-relaxed"
                  style={{ fontFamily: "'JetBrains Mono','Fira Code','Courier New',monospace", tabSize: 2 }} />
              </div>
              <div className="h-44 border-t border-white/5 flex flex-col flex-shrink-0">
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-950 border-b border-white/5 flex-shrink-0">
                  <span className="text-xs font-semibold tracking-widest uppercase text-white/30">Output</span>
                  {outputStatus === 'success' && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">✓ Success</span>}
                  {outputStatus === 'error' && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">✗ Error</span>}
                  {outputStatus === 'running' && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400">Running…</span>}
                  {output && <button onClick={() => { setOutput(''); setOutputStatus('idle'); }} className="ml-auto text-white/20 hover:text-white/50 text-xs transition-all">Clear</button>}
                </div>
                <div className={`flex-1 overflow-y-auto p-4 text-sm leading-relaxed whitespace-pre-wrap ${outputStatus === 'error' ? 'text-red-400' : 'text-gray-300'}`}
                  style={{ fontFamily: "'JetBrains Mono','Fira Code','Courier New',monospace" }}>
                  {output || <span className="text-white/20 italic text-xs">Click ▶ Run to execute your code</span>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* NOTES MODAL */}
      {showNotesModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-5"
          onClick={(e) => e.target === e.currentTarget && setShowNotesModal(false)}>
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl">
            <h2 className="text-xl font-semibold text-gray-800 mb-1">Add a Note</h2>
            <p className="text-sm text-gray-400 mb-5">
              {selectedSidebarEntry ? `For: "${selectedSidebarEntry.question.slice(0,55)}…"` : "Select a past session from sidebar to attach notes"}
            </p>
            <textarea autoFocus rows={5} value={noteContent} onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Write your notes here…"
              className="w-full px-4 py-3 rounded-xl border border-black/10 bg-gray-50 text-sm text-gray-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 resize-none leading-relaxed transition-all" />
            <div className="flex gap-2.5 justify-end mt-4">
              <button onClick={() => { setShowNotesModal(false); setNoteContent(''); }}
                className="px-5 py-2.5 rounded-xl border border-black/10 text-sm text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
              <button onClick={async () => {
                if (!noteContent.trim() || !selectedSidebarEntry?._id) { alert("Select a past session first."); return; }
                const res = await fetch(`${BACKEND_URL}/api/entries/${selectedSidebarEntry._id}/add-note`, {
                  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note: noteContent })
                });
                if (res.ok) { setNoteContent(''); setShowNotesModal(false); fetchSidebarData(); }
                else alert("Failed to save note.");
              }} className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-all">
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MCQ PAGE */}
      {showMcqPage && <MCQPage domainInput={domainInput} onClose={() => setShowMcqPage(false)} />}

      {/* ATS PAGE */}
      {showAtsPage && <ATSPage onClose={() => setShowAtsPage(false)} />}
    </div>
  );
}