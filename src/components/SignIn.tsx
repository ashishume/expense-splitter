import { useState } from "react";
import { useAuth } from "./useAuth";
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      <div className="bg-white p-6 sm:p-8 lg:p-10 rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-gray-100">
        {/* Logo and Branding */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex justify-center mb-4">
            <img
              src={logo}
              alt="AXPO Logo"
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-full shadow-lg"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Welcome to AXPO
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600">
            Smart Expense Management
          </p>
        </div>

        {/* Features Preview */}
        <div className="mb-6 sm:mb-8 space-y-2 sm:space-y-3">
          <div className="flex items-center text-xs sm:text-sm text-gray-600">
            <CheckIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-2 sm:mr-3 text-green-500 flex-shrink-0" />
            <span className="truncate">
              Split expenses with friends and family
            </span>
          </div>
          <div className="flex items-center text-xs sm:text-sm text-gray-600">
            <CheckIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-2 sm:mr-3 text-green-500 flex-shrink-0" />
            <span className="truncate">Track group expenses easily</span>
          </div>
          <div className="flex items-center text-xs sm:text-sm text-gray-600">
            <CheckIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-2 sm:mr-3 text-green-500 flex-shrink-0" />
            <span className="truncate">Settle debts automatically</span>
          </div>
        </div>

        {/* Sign In Button */}
        <button
          onClick={handleSignIn}
          disabled={isSigningIn}
          className="btn btn-secondary w-full flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base lg:text-lg safari-form-fix"
        >
          {isSigningIn ? (
            <LoadingSpinner className="w-5 h-5 sm:w-6 sm:h-6" />
          ) : (
            <img
              src="https://www.google.com/favicon.ico"
              alt="Google"
              className="w-5 h-5 sm:w-6 sm:h-6"
            />
          )}
          <span className="hidden sm:inline">
            {isSigningIn ? "Signing in..." : "Continue with Google"}
          </span>
          <span className="sm:hidden">
            {isSigningIn ? "Signing in..." : "Google Sign In"}
          </span>
        </button>

        {/* Footer */}
        <div className="mt-6 sm:mt-8 text-center">
          <p className="text-xs text-gray-500">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};
