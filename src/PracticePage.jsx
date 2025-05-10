import { useEffect, useState } from 'react';
import { SignedIn, UserButton, useAuth } from '@clerk/clerk-react';
import './App.css';
import { useUser } from '@clerk/clerk-react';
import Messagebox from "./Messagebox";

const Recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
Recognition.continuous = true;
Recognition.interimResults = true;

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

function PracticePage() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedbackLoadingStatus, setFeedbackLoadingStatus] = useState(false);
  const [feedbackData, setFeedbackData] = useState(null);
  const { isSignedIn, isLoaded } = useAuth();
  const [selectedQuestion, setSelectedQuestion] = useState("🤖Cognify");
  const [domainInput, setDomainInput] = useState('');
  const [previousQuestions, setPreviousQuestions] = useState([]);
  const [sidebarData, setSidebarData] = useState([]);
  const [selectedSidebarEntry, setSelectedSidebarEntry] = useState(null);
  const [showNotes, setShowNotes] = useState(false);

  const { user } = useUser();      
  if (isLoaded && !isSignedIn) return <div className="p-10 text-center">Please sign in to access this page.</div>;

  const fetchSidebarData = async () => {
    if (!user || !user.username) return;
    try {
      const res = await fetch(`http://localhost:5000/api/entries?username=${user.username}`);
      const data = await res.json();
      setSidebarData(data);
    } catch (err) {
      console.error("Failed to fetch sidebar data:", err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSidebarData();
    }
  }, [user]);

  const handleStartListening = () => {
    if (isListening) return;
     setSelectedSidebarEntry(null);
     
    setTranscript('');
    setFeedbackData(null);
    setIsListening(true);
    setShowNotes(false); 
    Recognition.start();
  };

  const handleStopListening = async () => {
    setIsListening(false);
    Recognition.stop();
    await getFeedback();
  };

  useEffect(() => {
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      console.error('Speech Recognition API is not supported in this browser.');
      return;
    }

    Recognition.onstart = () => {
      console.log('Speech recognition started...');
    };

    Recognition.onresult = (e) => {
      const current = e.resultIndex;
      const spokenText = e.results[current][0].transcript;
      setTranscript(spokenText);
    };

    Recognition.onerror = (err) => {
      console.log('Speech recognition error:', err);
    };

    Recognition.onend = async () => {
      setIsListening(false);
      await getFeedback();
    };
  }, []);

  const getFeedback = async () => {
    if (!transcript.trim()) return;
    setFeedbackLoadingStatus(true);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              role: "user",
              parts: [{
                text: `You are an interview coach. Rate this answer (scale of 0 to 5) on correctness and completeness. Also give feedback and a perfect answer in this JSON format:\n{
                  "correctness": number,
                  "completeness": number,
                  "feedback": string,
                  "correct_answer": string
                }\nQuestion: ${selectedQuestion}\nAnswer: ${transcript}`
              }]
            }]
          })
        }
      );

      const data = await response.json();
      const modelResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      try {
        const jsonStart = modelResponse.indexOf('{');
        const jsonEnd = modelResponse.lastIndexOf('}');
        const jsonString = modelResponse.slice(jsonStart, jsonEnd + 1);
        const parsed = JSON.parse(jsonString);
        setFeedbackData(parsed);
        try {
          await fetch("http://localhost:5000/api/entries/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              question: selectedQuestion,
              feedback: parsed.feedback,
              idealAnswer: parsed.correct_answer,
              name: user.username,
              notes: parsed.notes
            }),
          });
        } catch (err) {
          console.error("Failed to save feedback to backend:", err);
        }

      } catch (err) {
        setFeedbackData({
          correctness: 0,
          completeness: 0,
          feedback: '⚠️ Could not parse structured feedback. Raw response:\n' + modelResponse,
          correct_answer: 'N/A'
        });
      }
    } catch (error) {
      setFeedbackData({
        correctness: 0,
        completeness: 0,
        feedback: 'Error fetching feedback.',
        correct_answer: 'N/A'
      });
    } finally {
      setFeedbackLoadingStatus(false);
    }
  };
    const handleClearAll = async () => {
  setTranscript('');  // Clear transcript
  setFeedbackData(null);  // Clear feedback data
  setSelectedSidebarEntry(null);  // Clear the selected sidebar entry
  setShowNotes(false);  // Hide the notes section
  setSidebarData([]);  // Clear the sidebar data

  // Send DELETE request to clear entries from the backend
  try {
    if (!user || !user.username) return;

    const response = await fetch('http://localhost:5000/api/entries/clear', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: user.username, // Send username to identify the entries to clear
      }),
    });

    const data = await response.json();
    if (response.ok) {
      console.log('Entries cleared successfully!');
    } else {
      console.error('Failed to clear entries:', data.message);
    }
  } catch (err) {
    console.error('Error clearing entries:', err);
  }
};

  const fetchQuestionFromDomain = async () => {
    if (!domainInput.trim()) return;
    setSelectedSidebarEntry(null); 
    setTranscript('');
    setFeedbackData(null);
    setShowNotes(false); 
    setSelectedQuestion("Generating question...");

    let attempts = 0;
    let newQuestion = '';
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      try {
        const randomNoise = Math.random().toString(36).substring(2, 8);
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                role: "user",
                parts: [{
                  text: `Give me a completely different and random technical interview question in the domain of ${domainInput}. Do NOT repeat any previous questions. Only return the question text. Random ID: ${randomNoise}`
                }]
              }]
            })
          }
        );

        const data = await response.json();
        const question = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (question && !previousQuestions.includes(question)) {
          newQuestion = question;
          break;
        }
      } catch (err) {
        break;
      }

      attempts++;
    }

    if (newQuestion) {
      setSelectedQuestion(newQuestion);
      setPreviousQuestions(prev => [...prev, newQuestion]);
    } else {
      setSelectedQuestion('❌ Could not generate a new unique question');
    }
  };

  return (
    <SignedIn>
      <div className="flex h-screen">
        <aside className="fixed top-0 left-0 h-screen w-64 bg-gray-900 text-white flex flex-col p-4 overflow-y-auto z-20">
          <div className="mb-6 flex items-center space-x-3">
            <img src="/cognify.png" alt="Logo" className="w-20 h-20 rounded-full" />
          </div>
          <div className="flex-grow space-y-2">
            {sidebarData.map((entry) => (
              <button
                key={entry._id}
                className="bg-gray-800 text-left p-1 rounded hover:bg-gray-700 w-full line-clamp-1"
                onClick={() => setSelectedSidebarEntry(entry)}
              >
                {entry.question.slice(0, 50)}...
              </button>
            ))}
          </div>
          <div className="mt-auto space-y-4">
            <button
              onClick={handleClearAll}
              className="w-full text-white py-2 px-4 rounded-md text-sm"
            >
              🗑️ Clear All
            </button>
            <p className="text-xs text-gray-500 text-center">© 2025 Cognify</p>
          </div>
        </aside>

        <div className="ml-64 flex flex-col h-screen overflow-hidden w-full">
          <header className="fixed top-0 left-64 right-0 z-10 border-b p-4 bg-white shadow-sm flex flex-col md:flex-row items-center justify-between gap-2">
            <div className="flex flex-col md:flex-row items-center gap-2 w-full">
              <input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder="Enter domain (e.g., React)"
                className="border border-gray-300 p-2 rounded-md w-full md:w-64"
              />
              <button
                onClick={fetchQuestionFromDomain}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Generate Question
              </button>
              <button
  onClick={() => setShowNotes(prev => !prev)}
  className=" hover:bg-neutral-100 text-black px-4 py-2 rounded-md"
>
  📝 Save Notes
</button>

              <button onClick={() => alert(`Start MCQs for ${domainInput}`)}>📋 Attempt MCQs</button>
            </div>
            <UserButton />
          </header>

          <main className="flex-1 overflow-y-auto pt-28 p-6 space-y-6 bg-gray-100 text-center">
            {showNotes && (
  <div className="bg-white p-4 rounded-xl shadow border max-w-3xl mx-auto mt-4">
    <h2 className="text-purple-700 font-medium mb-2">📝 Your Notes:</h2>
    <textarea
      placeholder="Write your notes here..."
      className="w-full p-2 border rounded-md min-h-[100px]"
    />
    <button
      className="mt-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
      onClick={() => {
        // Save logic goes here
        alert('Note saved!');
        setShowNotes(false); // Hide after saving
      }}
    >
      💾 Save Note
    </button>
  </div>
)}

            <h1 className="font-bold text-4xl font-mono mt-10">{selectedSidebarEntry ? selectedSidebarEntry.question : selectedQuestion}</h1>
            
            {transcript && (
              <div className="bg-white p-4 rounded-xl shadow border max-w-3xl mx-auto">
                <h2 className="text-gray-600 font-medium mb-2">🧑‍💼 You:</h2>
                <p>{transcript}</p>
              </div>
            )}
            
            {selectedSidebarEntry ? (
              <>
                <div className="bg-white p-4 rounded-xl shadow border max-w-3xl mx-auto">
                  <h2 className="text-gray-600 font-medium mb-2">🧑‍💼 You:</h2>
                  <p>{selectedSidebarEntry.userAnswer}</p>
                </div>
                <div className="flex flex-col lg:flex-row justify-center gap-4">
                  <div className="bg-white p-4 rounded-xl shadow border max-w-xl mx-auto max-h-96 overflow-auto">
                    <h2 className="text-green-700 font-medium mb-2">✍️ Feedback:</h2>
                    <p>{selectedSidebarEntry.feedback}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow border max-w-xl mx-auto max-h-96 overflow-auto">
                    <h2 className="text-blue-700 font-medium mb-2">📘 Ideal Answer:</h2>
                    <p>{selectedSidebarEntry.idealAnswer}</p>
                  </div>
                </div>
              </>
            ) :feedbackLoadingStatus ? (
              <div className="text-center text-gray-500">⏳ Analyzing your response...</div>
            ) : feedbackData ? (
              <div className='flex flex-col lg:flex-row justify-center gap-4'>
                <div className="bg-white p-4 rounded-xl shadow border max-w-xl mx-auto max-h-96 overflow-auto">
                  <h2 className="text-green-700 font-medium mb-2">✍️ Feedback:</h2>
                  <p><strong>Correctness:</strong> {feedbackData.correctness} / 5</p>
                  <p><strong>Completeness:</strong> {feedbackData.completeness} / 5</p>
                  <p className="mt-2 whitespace-pre-line">{feedbackData.feedback}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow border max-w-xl mx-auto max-h-96 overflow-auto">
                  <h2 className="text-blue-700 font-medium mb-2">📘 Ideal Answer:</h2>
                  <p className="whitespace-pre-line">{feedbackData.correct_answer}</p>
                  
                </div>
              </div>
            ) : (
              <div className="text-center mt-9 text-gray-400">🎯 Record your answer to get feedback.</div>
            )}

            <div className="max-w-3xl mx-auto mt-10">
              <button
                onClick={isListening ? handleStopListening : handleStartListening}
                className={`w-full py-3 rounded-xl text-white font-semibold text-lg transition-all duration-300 ${
                  isListening ? 'bg-gray-800 hover:bg-gray-900' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isListening ? 'Submit Answer' : 'Start Recording'}
              </button>
            </div>
          </main>
        </div>
      </div>
    </SignedIn>
  );
}

export default PracticePage;
