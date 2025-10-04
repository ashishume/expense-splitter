import { BrowserRouter as Router } from "react-router-dom";
import { AuthProvider } from "./components/AuthContext";
import { useAuth } from "./components/useAuth";
import { SignIn } from "./components/SignIn";
import ExpenseSplittingApp from "./Index";
import Toast from "./components/ui/Toast";

function AppContent() {
  const { user } = useAuth();

  if (!user) {
    return <SignIn />;
  }

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
