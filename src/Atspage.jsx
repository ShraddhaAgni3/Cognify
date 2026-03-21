import { useState } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function ATSPage({ onClose }) {
  const [resumeFile, setResumeFile] = useState(null);
  const [atsLoading, setAtsLoading] = useState(false);
  const [atsResult, setAtsResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const handleATSCheck = async () => {
    if (!resumeFile) return;
    setAtsLoading(true);
    setAtsResult(null);
    try {
      const formData = new FormData();
      formData.append("resume", resumeFile);
      const res = await fetch(`${BACKEND_URL}/api/ats/check`, { method: "POST", body: formData });
      const data = await res.json();
      setAtsResult(data);
    } catch {
      setAtsResult({ error: "Failed to analyze resume. Please try again." });
    } finally {
      setAtsLoading(false);
    }
  };

  const scoreColor = (s) => s >= 70 ? "text-emerald-600" : s >= 50 ? "text-amber-600" : "text-red-500";
  const scoreBorderColor = (s) => s >= 70 ? "border-emerald-500" : s >= 50 ? "border-amber-500" : "border-red-500";
  const scoreLabel = (s) => s >= 70 ? "ATS Friendly ✓" : s >= 50 ? "Needs Improvement" : "Poor ATS Score";
  const scoreBadgeCls = (s) => s >= 70 ? "bg-emerald-50 text-emerald-700" : s >= 50 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700";
  const scoreBarCls = (s) => s >= 70 ? "bg-emerald-500" : s >= 50 ? "bg-amber-500" : "bg-red-500";

  const handleFile = (f) => {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain"
    ];
    if (f && allowed.includes(f.type)) { setResumeFile(f); setAtsResult(null); }
    else alert("Please upload a PDF, DOCX, DOC, or TXT file.");
  };

  return (
    <div className="fixed inset-0 bg-gray-50 z-40 flex flex-col overflow-hidden">

      {/* HEADER — same style as MCQPage */}
      <div className="sticky top-0 bg-white border-b border-black/6 px-6 py-3 flex items-center justify-between z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-black/10 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-all">
            ← Back
          </button>
          <div className="flex items-center gap-2 pl-2 border-l border-black/8">
            <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">AnswerlyProAI</span>
            <span className="text-gray-300">·</span>
            <span className="text-sm text-gray-400">ATS Resume Checker</span>
          </div>
        </div>
        {/* No limit badge for logged in users */}
        <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
          ✓ Unlimited checks
        </span>
      </div>

      {/* BODY */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-xl mx-auto px-6 py-10">

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">ATS Resume Checker</h2>
            <p className="text-sm text-gray-500">Upload your resume and get an ATS compatibility score instantly.</p>
          </div>

          {/* Upload Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5 mb-4">
            <p className="text-xs font-semibold tracking-widest uppercase text-indigo-500 mb-3">Upload Resume</p>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
              onClick={() => document.getElementById("ats-resume-input").click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all mb-5 ${dragOver ? "border-indigo-400 bg-indigo-50/50" : resumeFile ? "border-emerald-400 bg-emerald-50/30" : "border-black/10 hover:border-indigo-300 hover:bg-gray-50/50"}`}>
              <input id="ats-resume-input" type="file" accept=".pdf,.doc,.docx,.txt" className="hidden"
                onChange={(e) => handleFile(e.target.files[0])} />
              {resumeFile ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">✓</div>
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

            <button onClick={handleATSCheck} disabled={!resumeFile || atsLoading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-all hover:-translate-y-px disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2">
              {atsLoading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>Analyzing…</>
                : "Check ATS Score →"}
            </button>
          </div>

          {/* Result */}
          {atsResult && !atsResult.error && (
            <div className="space-y-3">
              {/* Score Card */}
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

              {atsResult.feedback && (
                <div className="bg-white rounded-2xl p-6 border-t-4 border-emerald-500 border border-black/5 shadow-sm">
                  <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-3">Feedback</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{atsResult.feedback}</p>
                </div>
              )}

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
    </div>
  );
}