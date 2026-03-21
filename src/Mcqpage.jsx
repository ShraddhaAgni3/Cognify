import { useEffect, useState } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
const optionLetters = ['A', 'B', 'C', 'D'];

export default function MCQPage({ domainInput, onClose }) {
  const [mcqList, setMcqList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [mcqSubmitted, setMcqSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10 * 60);

  // Fetch MCQs on mount
  useEffect(() => {
    const fetchMCQs = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/groq/mcqs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain: domainInput })
        });
        const mcqs = await res.json();
        if (Array.isArray(mcqs)) setMcqList(mcqs);
        else { alert("Error generating MCQs."); onClose(); }
      } catch (err) {
        alert("Error generating MCQs.");
        onClose();
      } finally {
        setLoading(false);
      }
    };
    fetchMCQs();
  }, []);

  // Timer
  useEffect(() => {
    if (loading || mcqSubmitted) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); setMcqSubmitted(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, mcqSubmitted]);

  const score = mcqList.reduce((total, q, idx) =>
    total + (selectedOptions[idx]?.trim().toLowerCase() === q.answer?.trim().toLowerCase() ? 1 : 0), 0);
  const percentage = mcqList.length ? ((score / mcqList.length) * 100).toFixed(0) : 0;
  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 bg-gray-50 z-40 flex flex-col overflow-hidden">

      {/* HEADER */}
      <div className="sticky top-0 bg-white border-b border-black/6 px-6 py-3 flex items-center justify-between z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-black/10 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-all">
            ← Back
          </button>
          <div className="flex items-center gap-2 pl-2 border-l border-black/8">
            <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center"><span className="text-white text-xs font-bold">A</span></div>
            <span className="text-sm font-semibold text-gray-900">AnswerlyProAI</span>
            <span className="text-gray-300">·</span>
            <span className="text-sm text-gray-400">MCQ Quiz</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">{domainInput}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!mcqSubmitted && !loading && (
            <span className={`px-3 py-1.5 rounded-full text-sm font-semibold tabular-nums ${timeLeft < 60 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
              ⏱ {formatTime(timeLeft)}
            </span>
          )}
          {mcqSubmitted && (
            <span className="px-3 py-1.5 rounded-full text-sm font-semibold bg-emerald-50 text-emerald-700">
              ✓ Quiz Complete
            </span>
          )}
        </div>
      </div>

      {/* PROGRESS BAR */}
      {!mcqSubmitted && !loading && (
        <div className="h-1 bg-gray-200 flex-shrink-0">
          <div className="h-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / mcqList.length) * 100}%` }} />
        </div>
      )}

      {/* BODY */}
      <div className="flex-1 overflow-y-auto">

        {/* LOADING */}
        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
            <span className="w-10 h-10 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin"></span>
            <p className="text-base">Generating MCQs for <strong className="text-gray-600">{domainInput}</strong>…</p>
          </div>
        )}

        {/* QUIZ */}
        {!loading && !mcqSubmitted && mcqList.length > 0 && (
          <div className="max-w-2xl mx-auto w-full px-6 py-10">

            {/* Question number + dots */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-xs font-semibold tracking-widest uppercase text-indigo-500">
                Question {currentQuestionIndex + 1} of {mcqList.length}
              </p>
              <div className="flex gap-1.5 flex-wrap justify-end max-w-xs">
                {mcqList.map((_, i) => (
                  <div key={i} onClick={() => setCurrentQuestionIndex(i)}
                    className={`w-2 h-2 rounded-full cursor-pointer transition-all ${i === currentQuestionIndex ? 'bg-gray-800 scale-125' : selectedOptions[i] ? 'bg-indigo-500' : 'bg-gray-300'}`} />
                ))}
              </div>
            </div>

            {/* Question */}
            <p className="text-2xl font-semibold text-gray-800 leading-snug mb-8">
              {mcqList[currentQuestionIndex]?.question}
            </p>

            {/* Options */}
            <div className="space-y-3 mb-10">
              {mcqList[currentQuestionIndex]?.options.map((option, i) => (
                <button key={i}
                  onClick={() => setSelectedOptions(prev => ({ ...prev, [currentQuestionIndex]: option }))}
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 text-left text-sm transition-all ${selectedOptions[currentQuestionIndex] === option
                    ? 'border-indigo-500 bg-indigo-50 text-gray-800 font-medium'
                    : 'border-black/8 bg-white text-gray-600 hover:border-indigo-300 hover:bg-indigo-50/50'}`}>
                  <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 ${selectedOptions[currentQuestionIndex] === option ? 'border-indigo-500 text-indigo-600' : 'border-gray-300 text-gray-400'}`}>
                    {optionLetters[i]}
                  </span>
                  {option}
                </button>
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button onClick={() => setCurrentQuestionIndex(i => Math.max(i - 1, 0))}
                disabled={currentQuestionIndex === 0}
                className="px-5 py-2.5 rounded-xl border border-black/10 bg-white text-sm text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                ← Previous
              </button>

              {currentQuestionIndex === mcqList.length - 1 ? (
                <button onClick={() => setMcqSubmitted(true)}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-all">
                  Submit Quiz ✓
                </button>
              ) : (
                <button onClick={() => setCurrentQuestionIndex(i => Math.min(i + 1, mcqList.length - 1))}
                  className="px-5 py-2.5 rounded-xl border border-black/10 bg-white text-sm text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-all">
                  Next →
                </button>
              )}
            </div>
          </div>
        )}

        {/* RESULTS */}
        {!loading && mcqSubmitted && (
          <div className="max-w-2xl mx-auto w-full px-6 py-10">

            {/* Score Card */}
            <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-black/5 mb-6">
              <p className="text-7xl font-bold text-indigo-600 leading-none mb-2">{percentage}%</p>
              <p className="text-gray-400 text-base mb-6">
                You scored <strong className="text-gray-700">{score}</strong> out of <strong className="text-gray-700">{mcqList.length}</strong> questions
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                <span className="px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 text-sm font-semibold">✓ {score} Correct</span>
                <span className="px-4 py-2 rounded-full bg-red-50 text-red-700 text-sm font-semibold">✗ {mcqList.length - score} Wrong</span>
                <span className="px-4 py-2 rounded-full bg-indigo-50 text-indigo-700 text-sm font-semibold">{domainInput}</span>
              </div>
              <button onClick={onClose}
                className="mt-6 px-6 py-2.5 rounded-xl border border-black/10 text-sm text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-all">
                ← Back to Practice
              </button>
            </div>

            {/* Answer Review */}
            <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-4 pl-1">Answer Review</p>
            <div className="space-y-3">
              {mcqList.map((q, idx) => {
                const userAnswer = selectedOptions[idx];
                const isCorrect = userAnswer?.trim().toLowerCase() === q.answer?.trim().toLowerCase();
                return (
                  <div key={idx} className={`bg-white rounded-2xl p-6 border-l-4 border border-black/5 ${isCorrect ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
                    <p className="text-sm font-semibold text-gray-800 mb-3">Q{idx + 1}. {q.question}</p>
                    <div className="space-y-1.5">
                      <p className={`text-sm flex items-center gap-2 ${isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
                        <span className="font-bold">{isCorrect ? '✓' : '✗'}</span>
                        <span>Your answer: <strong>{userAnswer || 'No answer'}</strong></span>
                      </p>
                      {!isCorrect && (
                        <p className="text-sm flex items-center gap-2 text-emerald-700">
                          <span className="font-bold">✓</span>
                          <span>Correct: <strong>{q.answer}</strong></span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}