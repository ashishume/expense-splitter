import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import type { LogEntry } from "../utils/logger";

interface ExtendedLogEntry extends LogEntry {
  id: string;
}

interface LogsProps {
  currentUser: {
    uid: string;
    displayName: string | null;
  } | null;
}

const Logs = ({ currentUser }: LogsProps) => {
  const [logs, setLogs] = useState<ExtendedLogEntry[]>([]);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    const logsQuery = query(
      collection(db, "logs"),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(logsQuery, (snapshot) => {
      const logsData = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as ExtendedLogEntry[];
      setLogs(logsData);
    });

    return () => unsubscribe();
  }, []);

  const getActionColor = (action: string) => {
    switch (action) {
      case "EXPENSE_CREATE":
        return "bg-green-100 text-green-800";
      case "EXPENSE_UPDATE":
        return "bg-blue-100 text-blue-800";
      case "EXPENSE_DELETE":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "EXPENSE_CREATE":
        return "➕";
      case "EXPENSE_UPDATE":
        return "✏️";
      case "EXPENSE_DELETE":
        return "🗑️";
      default:
        return "📝";
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filter === "all") return true;
    if (filter === "my-actions" && log.userId === currentUser?.uid) return true;
    return log.action === filter;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 flex items-center">
          <span className="mr-2">📋</span>
          Activity Logs
        </h2>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">All Actions</option>
            <option value="my-actions">My Actions</option>
            <option value="EXPENSE_CREATE">Created Expenses</option>
            <option value="EXPENSE_UPDATE">Updated Expenses</option>
            <option value="EXPENSE_DELETE">Deleted Expenses</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredLogs.map((log) => (
          <motion.div
            key={log.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors duration-200"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <span className="text-2xl">{getActionIcon(log.action)}</span>
                <div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getActionColor(
                        log.action
                      )}`}
                    >
                      {log.action.replace("EXPENSE_", "")}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-gray-700">{log.details}</p>
                  {log.userName && (
                    <p className="mt-1 text-sm text-gray-500">
                      By {log.userName}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {filteredLogs.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No logs found for the selected filter.
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Logs;
