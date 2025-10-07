import { BrowserRouter as Router } from "react-router-dom";
import { AuthProvider } from "./components/AuthContext";
import { useAuth } from "./components/useAuth";
import { SignIn } from "./components/SignIn";
import ExpenseSplittingApp from "./Index";
import Toast from "./components/ui/Toast";
import { trackPageView } from "./config/googleAnalytics";

function AppContent() {
  const { user } = useAuth();

  if (!user) {
    // Track sign-in page view
    trackPageView("/signin", "Sign In");
    return <SignIn />;
  }

  // Track main app page view
  trackPageView("/", "Expense Splitting App");
  return <ExpenseSplittingApp />;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
        <Toast />
      </AuthProvider>
    </Router>
  );
}

export default App;
