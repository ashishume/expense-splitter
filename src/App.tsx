import { AuthProvider, useAuth } from "./components/AuthContext";
import { SignIn } from "./components/SignIn";
import ExpenseSplittingApp from "./expense-splitter";

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
    </AuthProvider>
  );
}

export default App;
