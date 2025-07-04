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
    <AuthProvider>
      <AppContent />
      <Toast />
    </AuthProvider>
  );
}

export default App;
