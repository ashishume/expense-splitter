import { useState } from "react";
import { useAuth } from "./AuthContext";
import logo from "../assets/logo.jpg";
import { CheckIcon, LoadingSpinner } from "./icons/index";

export const SignIn = () => {
  const { signInWithGoogle } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="bg-white p-10 rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-gray-100">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img
              src={logo}
              alt="AXPO Logo"
              className="w-16 h-16 rounded-full shadow-lg"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to AXPO
          </h1>
          <p className="text-gray-600 text-lg">Smart Expense Management</p>
        </div>

        {/* Features Preview */}
        <div className="mb-8 space-y-3">
          <div className="flex items-center text-sm text-gray-600">
            <CheckIcon className="w-4 h-4 mr-3 text-green-500" />
            Split expenses with friends and family
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <CheckIcon className="w-4 h-4 mr-3 text-green-500" />
            Track group expenses easily
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <CheckIcon className="w-4 h-4 mr-3 text-green-500" />
            Settle debts automatically
          </div>
        </div>

        {/* Sign In Button */}
        <button
          onClick={handleSignIn}
          disabled={isSigningIn}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 rounded-xl px-6 py-4 text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 font-medium text-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSigningIn ? (
            <LoadingSpinner className="w-6 h-6" />
          ) : (
            <img
              src="https://www.google.com/favicon.ico"
              alt="Google"
              className="w-6 h-6"
            />
          )}
          {isSigningIn ? "Signing in..." : "Continue with Google"}
        </button>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};
