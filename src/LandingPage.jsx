import { useState, useRef } from "react";
import { SignInButton, SignUpButton } from "@clerk/clerk-react";
import MCQPage from "./Mcqpage";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function LandingPage() {
  const [activePage, setActivePage] = useState("home");
  const [mcqDomain, setMcqDomain] = useState("");
  const [mcqStarted, setMcqStarted] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [atsLoading, setAtsLoading] = useState(false);
  const [atsResult, setAtsResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [atsChecksLeft, setAtsChecksLeft] = useState(() => {
    const saved = localStorage.getItem('atsChecksLeft');
    return saved !== null ? parseInt(saved) : 5;
  });
  const signInRef = useRef(null);

  const handleATSCheck = async () => {
    if (!resumeFile) return;
    if (atsChecksLeft <= 0) {
      signInRef.current?.click();
      return;
    }
    setAtsLoading(true);
    setAtsResult(null);
    try {
      const formData = new FormData();
      formData.append("resume", resumeFile);
      const res = await fetch(`${BACKEND_URL}/api/ats/check`, { method: "POST", body: formData });
      const data = await res.json();
      setAtsResult(data);
      const newCount = atsChecksLeft - 1;
      setAtsChecksLeft(newCount);
      localStorage.setItem('atsChecksLeft', newCount);
    } catch {
      setAtsResult({ error: "Failed to analyze resume. Please try again." });
    } finally {
      setAtsLoading(false);
    }
  };

  if (mcqStarted) {
    return <MCQPage domainInput={mcqDomain} onClose={() => { setMcqStarted(false); setActivePage("mcq"); }} />;
  }

  const scoreColor = (s) => s >= 70 ? "text-emerald-600" : s >= 50 ? "text-amber-600" : "text-red-500";
  const scoreBorderColor = (s) => s >= 70 ? "border-emerald-500" : s >= 50 ? "border-amber-500" : "border-red-500";
  const scoreLabel = (s) => s >= 70 ? "ATS Friendly ✓" : s >= 50 ? "Needs Improvement" : "Poor ATS Score";
  const scoreBadgeCls = (s) => s >= 70 ? "bg-emerald-50 text-emerald-700" : s >= 50 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700";
  const scoreBarCls = (s) => s >= 70 ? "bg-emerald-500" : s >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Hidden sign in button for programmatic trigger */}
      <SignInButton mode="modal">
        <button ref={signInRef} className="hidden">signin</button>
      </SignInButton>

      {/* ── NAVBAR ── matches practice page topbar style */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur border-b border-black/5">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">

          {/* Brand — same as sidebar */}
          <button onClick={() => setActivePage("home")} className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <span className="text-sm font-semibold text-gray-900 tracking-tight">AnswerlyProAI</span>
          </button>

          {/* Nav tabs */}
          <div className="flex items-center gap-1">
            {[["home","Home"],["mcq","MCQ Practice"],["ats","ATS Checker"]].map(([id, label]) => (
              <button key={id} onClick={() => setActivePage(id)}
                className={`px-4 py-2 rounded-xl text-sm transition-all ${activePage === id ? 'border border-indigo-500 bg-indigo-50 text-indigo-700 font-medium' : 'border border-transparent text-gray-600 hover:border-black/10 hover:bg-white hover:text-gray-900'}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Auth buttons */}
          <div className="flex items-center gap-2">
            <SignInButton mode="modal">
              <button className="px-4 py-2.5 border border-black/10 bg-white text-sm text-gray-600 rounded-xl hover:border-indigo-400 hover:text-indigo-600 transition-all">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-all hover:-translate-y-px">
                Get started
              </button>
            </SignUpButton>
          </div>
        </div>
      </nav>

      {/* ── HOME ── */}
      {activePage === "home" && (
        <div className="pt-14">
          {/* Hero */}
          <div className="max-w-3xl mx-auto px-6 pt-20 pb-16 text-center">
            <span className="inline-block px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold tracking-wide mb-7 border border-indigo-100">
              ✦ AI-Powered Interview Prep
            </span>
            <h1 className="text-5xl font-bold tracking-tight text-gray-900 leading-tight mb-5">
              Ace every interview<br />
              <span className="text-indigo-600">with confidence</span>
            </h1>
            <p className="text-base text-gray-500 max-w-lg mx-auto mb-9 leading-relaxed">
              Practice MCQs, get AI feedback on your spoken answers, and check if your resume passes ATS — all in one place.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <SignUpButton mode="modal">
                <button className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-all hover:-translate-y-px shadow-lg shadow-indigo-200">
                  Start for free →
                </button>
              </SignUpButton>
              <button onClick={() => setActivePage("mcq")}
                className="px-5 py-2.5 border border-black/10 bg-white text-sm text-gray-600 rounded-xl hover:border-indigo-400 hover:text-indigo-600 transition-all">
                Try MCQ demo
              </button>
            </div>
          </div>

          {/* Feature Cards — same card style as practice page */}
          <div className="max-w-5xl mx-auto px-6 pb-20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  icon: "🎙",
                  title: "Voice Answer Feedback",
                  desc: "Speak your answer and get instant AI feedback on correctness, completeness, and ideal answer.",
                  badge: "Sign in to access",
                  badgeCls: "bg-indigo-50 text-indigo-600 border border-indigo-100",
                  action: "signin",
                },
                {
                  icon: "📋",
                  title: "MCQ Practice",
                  desc: "Generate 20 domain-specific questions instantly. Track score and review all answers.",
                  badge: "Free · No login",
                  badgeCls: "bg-emerald-50 text-emerald-700 border border-emerald-100",
                  action: () => setActivePage("mcq"),
                },
                {
                  icon: "📄",
                  title: "ATS Resume Checker",
                  desc: "Upload your resume and get an ATS compatibility score with improvement suggestions.",
                  badge: "Free · No login",
                  badgeCls: "bg-emerald-50 text-emerald-700 border border-emerald-100",
                  action: () => setActivePage("ats"),
                },
              ].map((f, i) => (
                <div key={i} onClick={() => { if (f.action === "signin") signInRef.current?.click(); else if (f.action) f.action(); }}
                  className={`bg-white rounded-2xl p-6 border border-black/5 shadow-sm transition-all ${f.action ? "cursor-pointer hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5" : ""}`}>
                  <div className="text-2xl mb-4">{f.icon}</div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed mb-4">{f.desc}</p>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${f.badgeCls}`}>{f.badge}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA — dark card like practice page's dark editor panel */}
          <div className="max-w-5xl mx-auto px-6 pb-16">
            <div className="bg-gray-900 rounded-2xl px-8 py-14 text-center">
              <h2 className="text-2xl font-bold text-white mb-3">Ready to level up?</h2>
              <p className="text-white/50 text-sm mb-8">Join thousands preparing smarter with AnswerlyProAI.</p>
              <SignUpButton mode="modal">
                <button className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-all hover:-translate-y-px">
                  Create free account →
                </button>
              </SignUpButton>
            </div>
          </div>

          <footer className="text-center text-xs text-gray-400 pb-10 border-t border-black/5 pt-6">
            © 2025 AnswerlyProAI · Interview Smarter
          </footer>
        </div>
      )}

      {/* ── MCQ PAGE ── */}
      {activePage === "mcq" && (
        <div className="pt-14 min-h-screen">
          <div className="max-w-md mx-auto px-6 pt-14 pb-16">
            <div className="text-center mb-8">
              <span className="inline-block px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold border border-indigo-100 mb-5">
                📋 No login required
              </span>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">MCQ Practice</h2>
              <p className="text-sm text-gray-500">Enter a domain and get 20 questions instantly.</p>
            </div>

            {/* Card — same style as question card in practice page */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
              <p className="text-xs font-semibold tracking-widest uppercase text-indigo-500 mb-3">Domain</p>
              <input type="text" value={mcqDomain}
                onChange={(e) => setMcqDomain(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && mcqDomain.trim() && setMcqStarted(true)}
                placeholder="e.g. React, Python, DSA, System Design…"
                className="w-full px-4 py-2.5 rounded-xl border border-black/10 bg-white text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all mb-4 placeholder-gray-400" />
              <button onClick={() => mcqDomain.trim() && setMcqStarted(true)} disabled={!mcqDomain.trim()}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-all hover:-translate-y-px disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0">
                Start Quiz →
              </button>
              <p className="text-xs text-gray-400 text-center mt-4">
                Want voice feedback?{" "}
                <SignInButton mode="modal">
                  <span className="text-indigo-600 cursor-pointer hover:underline font-medium">Sign in free</span>
                </SignInButton>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── ATS CHECKER ── */}
      {activePage === "ats" && (
        <div className="pt-14 min-h-screen">
          <div className="max-w-xl mx-auto px-6 pt-14 pb-16">
            <div className="text-center mb-8">
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-semibold border border-emerald-100 mb-5">
                📄 No login required
              </span>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">ATS Resume Checker</h2>
              <p className="text-sm text-gray-500">Upload your resume and get an ATS compatibility score instantly.</p>
            </div>

            {/* Upload Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5 mb-4">
              <p className="text-xs font-semibold tracking-widest uppercase text-indigo-500 mb-3">Upload Resume</p>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; const allowed = ["application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","text/plain"]; if (f && allowed.includes(f.type)) { setResumeFile(f); setAtsResult(null); } else alert("Please upload a PDF, DOCX, DOC, or TXT file."); }}
                onClick={() => document.getElementById("resume-input").click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all mb-5 ${dragOver ? "border-indigo-400 bg-indigo-50/50" : resumeFile ? "border-emerald-400 bg-emerald-50/30" : "border-black/10 hover:border-indigo-300 hover:bg-gray-50/50"}`}>
                <input id="resume-input" type="file" accept=".pdf,.doc,.docx,.txt" className="hidden"
                  onChange={(e) => { const f = e.target.files[0]; if (f) { setResumeFile(f); setAtsResult(null); } }} />
                {resumeFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 text-base">✓</div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-gray-800">{resumeFile.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Click to change file</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-3xl mb-3 opacity-30">📄</div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Drop your resume here</p>
                    <p className="text-xs text-gray-400">PDF, DOCX, DOC, TXT · Max 5MB</p>
                  </>
                )}
              </div>

              {/* Free checks counter */}
              <div className={`flex items-center justify-between px-3 py-2 rounded-xl mb-3 text-xs font-medium ${atsChecksLeft > 0 ? 'bg-indigo-50 text-indigo-700' : 'bg-red-50 text-red-600'}`}>
                <span>{atsChecksLeft > 0 ? `${atsChecksLeft} free check${atsChecksLeft === 1 ? '' : 's'} remaining` : 'No free checks left'}</span>
                {atsChecksLeft <= 2 && atsChecksLeft > 0 && (
                  <SignInButton mode="modal">
                    <span className="text-indigo-600 cursor-pointer hover:underline font-semibold">Sign in for unlimited</span>
                  </SignInButton>
                )}
                {atsChecksLeft === 0 && (
                  <SignInButton mode="modal">
                    <span className="cursor-pointer hover:underline font-semibold">Sign in to continue</span>
                  </SignInButton>
                )}
              </div>

              <button
                onClick={atsChecksLeft <= 0 ? () => signInRef.current?.click() : handleATSCheck}
                disabled={!resumeFile || atsLoading}
                className={`w-full py-2.5 text-white text-sm font-medium rounded-xl transition-all hover:-translate-y-px disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2 ${atsChecksLeft <= 0 ? 'bg-gray-800 hover:bg-gray-900' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                {atsLoading
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>Analyzing…</>
                  : atsChecksLeft <= 0 ? 'Sign in to continue →' : 'Check ATS Score →'}
              </button>

              <p className="text-xs text-gray-400 text-center mt-4">
                Want full interview practice?{" "}
                <SignInButton mode="modal">
                  <span className="text-indigo-600 cursor-pointer hover:underline font-medium">Sign in free</span>
                </SignInButton>
              </p>
            </div>

            {/* ATS Result */}
            {atsResult && !atsResult.error && (
              <div className="space-y-3">
                {/* Score Card — same style as feedback cards in practice page */}
                <div className={`bg-white rounded-2xl p-6 border-t-4 ${scoreBorderColor(atsResult.score)} border border-black/5 shadow-sm`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-1">ATS Score</p>
                      <p className={`text-5xl font-bold ${scoreColor(atsResult.score)}`}>
                        {atsResult.score}<span className="text-xl text-gray-400 font-normal">/100</span>
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${scoreBadgeCls(atsResult.score)}`}>
                      {scoreLabel(atsResult.score)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${scoreBarCls(atsResult.score)}`}
                      style={{ width: `${atsResult.score}%` }} />
                  </div>
                </div>

                {/* Feedback — same card style */}
                {atsResult.feedback && (
                  <div className="bg-white rounded-2xl p-6 border-t-4 border-emerald-500 border border-black/5 shadow-sm">
                    <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-3">Feedback</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{atsResult.feedback}</p>
                  </div>
                )}

                {/* Suggestions — same card style */}
                {atsResult.suggestions?.length > 0 && (
                  <div className="bg-white rounded-2xl p-6 border-t-4 border-indigo-500 border border-black/5 shadow-sm">
                    <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-4">Suggestions</p>
                    <div className="space-y-3">
                      {atsResult.suggestions.map((s, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 flex-shrink-0 mt-0.5">{i + 1}</span>
                          <p className="text-sm text-gray-700 leading-relaxed">{s}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button onClick={() => { setResumeFile(null); setAtsResult(null); }}
                  className="w-full py-2.5 border border-black/10 bg-white text-sm text-gray-600 rounded-xl hover:border-indigo-400 hover:text-indigo-600 transition-all">
                  Check another resume
                </button>
              </div>
            )}

            {atsResult?.error && (
              <div className="bg-white rounded-2xl p-5 border-t-4 border-red-500 border border-black/5 shadow-sm">
                <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-2">Error</p>
                <p className="text-sm text-red-600">{atsResult.error}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}