import { AuthProvider, useAuth } from "./components/AuthContext";
import { SignIn } from "./components/SignIn";
import ExpenseSplittingApp from "./expense-splitter";
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
