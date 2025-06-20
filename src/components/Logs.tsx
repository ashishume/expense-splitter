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
        return "bg-green-100 text-green-800 border-green-200";
      case "EXPENSE_UPDATE":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "EXPENSE_DELETE":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
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

  const formatTimestamp = (timestamp: any) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""} ago`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 flex items-center">
          <span className="mr-3 text-2xl">📋</span>
          Activity Logs
        </h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-sm font-medium"
          >
            <option value="all">All Actions</option>
            <option value="my-actions">My Actions</option>
            <option value="EXPENSE_CREATE">Created Expenses</option>
            <option value="EXPENSE_UPDATE">Updated Expenses</option>
            <option value="EXPENSE_DELETE">Deleted Expenses</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {filteredLogs.map((log, index) => (
          <motion.div
            key={log.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-gray-50 border border-gray-100 p-5 rounded-xl hover:bg-gray-100 hover:border-gray-200 transition-all duration-200"
          >
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-200">
                  <span className="text-xl">{getActionIcon(log.action)}</span>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-full border ${getActionColor(
                        log.action
                      )}`}
                    >
                      {log.action.replace("EXPENSE_", "").replace("_", " ")}
                    </span>
                    {log.userName && (
                      <span className="text-sm font-medium text-gray-700">
                        by {log.userName}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500 font-medium">
                    {formatTimestamp(log.timestamp)}
                  </span>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-100">
                  <p className="text-gray-800 leading-relaxed font-medium">
                    {log.details}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {filteredLogs.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 text-gray-500"
          >
            <div className="text-4xl mb-3">📭</div>
            <p className="text-lg font-medium">No logs found</p>
            <p className="text-sm">Try adjusting your filter settings</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default Logs;
