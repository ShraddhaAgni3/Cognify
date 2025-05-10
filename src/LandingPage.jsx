import { SignInButton } from "@clerk/clerk-react";

function LandingPage() {

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-blue-300 text-gray-800 font-sans relative overflow-hidden">


      <div className="relative z-10 flex flex-col items-center">
        

        <img src="/cognify.png" alt="Cognify Logo" className="w-28 h-28 mb-6 rounded-full shadow-xl" />

        {/* Title */}
        <h1 className="text-5xl sm:text-6xl font-bold mb-4 font-serif italic text-center">
          Welcome to Cognify
        </h1>

        {/* Subtitle */}
        <p className="text-center text-lg sm:text-xl max-w-2xl mb-8">
          Elevate your interview skills with real-time AI feedback. Speak better. Grow faster.
        </p>

        {/* Buttons */}
        <div className="flex space-x-6">
          <SignInButton>Sign in</SignInButton>

          
        </div>

        {/* Footer */}
        <footer className="mt-16 text-gray-600 text-sm">
          © 2025 Cognify | Interview Smarter
        </footer>
      </div>

    </div>
  );
}

export default LandingPage;
