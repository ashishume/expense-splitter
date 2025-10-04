import { useEffect, useRef } from "react";
import logo from "../assets/logo.jpg";
import { CheckIcon } from "./icons/index";
import { googleAuthService } from "../services/googleAuth";

export const SignIn = () => {
  const googleButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Render Google Sign-In button when component mounts
    const renderGoogleButton = async () => {
      if (googleButtonRef.current) {
        try {
          await googleAuthService.renderButton(googleButtonRef.current);
        } catch (error) {
          console.error("Error rendering Google button:", error);
        }
      }
    };

    renderGoogleButton();
  }, []);

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

        {/* Google Sign-In Button Container */}
        <div className="relative flex justify-center items-center text-center">
          <div className="relative p-1  transition-all duration-300 ">
            <div ref={googleButtonRef} className="w-full"></div>
          </div>
        </div>

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
