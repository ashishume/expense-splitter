/**
 * Database Switcher Component
 * Allows users to switch between Firebase and Supabase databases
 */

import { useState, useEffect } from "react";
import { getDatabaseProvider, setDatabaseProvider, type DatabaseProvider } from "../config/database";
import { Database, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

const DatabaseSwitcher = () => {
  const [currentProvider, setCurrentProvider] = useState<DatabaseProvider>("firebase");
  const [isChanging, setIsChanging] = useState(false);

  useEffect(() => {
    setCurrentProvider(getDatabaseProvider());
  }, []);

  const handleSwitch = async (newProvider: DatabaseProvider) => {
    if (newProvider === currentProvider) {
      return;
    }

    setIsChanging(true);
    try {
      setDatabaseProvider(newProvider);
      toast.success(`Switching to ${newProvider}... Page will reload.`);
      // Page will reload automatically via setDatabaseProvider
    } catch (error) {
      console.error("Error switching database:", error);
      toast.error("Failed to switch database");
      setIsChanging(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200 min-w-[200px]">
        <div className="flex items-center gap-2 mb-3">
          <Database className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-sm text-gray-700">Database</h3>
        </div>
        
        <div className="space-y-2">
          <button
            onClick={() => handleSwitch("firebase")}
            disabled={isChanging}
            className={`w-full px-3 py-2 text-sm rounded-md transition-colors ${
              currentProvider === "firebase"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            } ${isChanging ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {currentProvider === "firebase" && "✓ "}Firebase
          </button>
          
          <button
            onClick={() => handleSwitch("supabase")}
            disabled={isChanging}
            className={`w-full px-3 py-2 text-sm rounded-md transition-colors ${
              currentProvider === "supabase"
                ? "bg-green-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            } ${isChanging ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {currentProvider === "supabase" && "✓ "}Supabase
          </button>
        </div>

        {isChanging && (
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Switching...</span>
          </div>
        )}

        <p className="mt-3 text-xs text-gray-500">
          Current: <span className="font-semibold">{currentProvider}</span>
        </p>
      </div>
    </div>
  );
};

export default DatabaseSwitcher;
