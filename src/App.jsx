import { SignedIn,SignedOut,UserButton } from '@clerk/clerk-react';
import LandingPage from './LandingPage';
import PracticePage from './PracticePage';
function App() {
  return (
    <>
    <header>
    <SignedIn></SignedIn>
    <SignedOut></SignedOut>
    </header>
    <SignedIn><PracticePage></PracticePage></SignedIn>
    <SignedOut><LandingPage></LandingPage></SignedOut>
    </>
  );
}

export default App;
