import { useNavigate } from 'react-router-dom';

function SignInPage() {
  const navigate = useNavigate();

  const handleSignIn = () => {
    // Here you can later integrate Google/Firebase auth etc.
    navigate('/practice');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-blue-50 text-gray-800 font-sans">
      <img src="/cognify.png" alt="Cognify Logo" className="w-20 h-20 mb-6 rounded-full shadow-lg" />

      <h2 className="text-3xl font-bold mb-6">Sign In to Cognify</h2>

      <button
        onClick={handleSignIn}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-300"
      >
        🔓 Sign In (Dummy)
      </button>

      <p className="mt-8 text-gray-500 text-sm">
        Don't worry, real sign-in coming soon!
      </p>
    </div>
  );
}

export default SignInPage;
