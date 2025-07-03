import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import type { LogEntry } from "../utils/logger";
import {
  Plus,
  Edit,
  Trash2,
  FileText,
  ClipboardList,
  Inbox,
} from "lucide-react";
import type { User } from "firebase/auth";

interface ExtendedLogEntry extends LogEntry {
  id: string;
}

interface Group {
  id: string;
  name: string;
  members: string[];
}

interface LogsProps {
  currentUser: User | null;
  groups: Group[];
}

const Logs = ({ currentUser, groups }: LogsProps) => {
  const [logs, setLogs] = useState<ExtendedLogEntry[]>([]);
  const [filter, setFilter] = useState<string>("all");

  // Get groups that the current user is a member of
  const userGroups = groups.filter((group) =>
    group.members.includes(currentUser?.uid || "")
  );

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
        return Plus;
      case "EXPENSE_UPDATE":
        return Edit;
      case "EXPENSE_DELETE":
        return Trash2;
      default:
        return FileText;
    }
  };

  const formatTimestamp = (timestamp: string) => {
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

  // Filter logs to only show those from groups the user is a member of
  const userLogs = logs.filter((log) => {
    // If the log has a groupId, check if the user is a member of that group
    if (log.groupId) {
      return userGroups.some((group) => group.id === log.groupId);
    }
    // If no groupId, show the log (for backward compatibility with existing logs)
    return true;
  });

  const filteredLogs = userLogs.filter((log) => {
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
        <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-800 flex items-center">
          <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 text-blue-600" />
          <span className="hidden sm:inline">Activity Logs</span>
          <span className="sm:hidden">Activity</span>
        </h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-xs sm:text-sm font-medium w-full sm:w-auto"
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
            className="bg-gray-50 border border-gray-100 p-3 sm:p-5 rounded-xl hover:bg-gray-100 hover:border-gray-200 transition-all duration-200"
          >
            <div className="flex items-start space-x-3 sm:space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-200">
                  {(() => {
                    const IconComponent = getActionIcon(log.action);
                    return (
                      <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
                    );
                  })()}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span
                      className={`px-2 sm:px-3 py-1 text-xs font-semibold rounded-full border flex-shrink-0 ${getActionColor(
                        log.action
                      )}`}
                    >
                      {log.action.replace("EXPENSE_", "").replace("_", " ")}
                    </span>
                    {log.userName && (
                      <span className="text-xs sm:text-sm font-medium text-gray-700 truncate">
                        by {log.userName}
                      </span>
                    )}
                    {log.groupId && (
                      <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full flex-shrink-0">
                        {userGroups.find((g) => g.id === log.groupId)?.name ||
                          "Unknown Group"}
                      </span>
                    )}
                  </div>
                  <span className="text-xs sm:text-sm text-gray-500 font-medium flex-shrink-0">
                    {formatTimestamp(log.timestamp)}
                  </span>
                </div>

                <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-100">
                  <p className="text-sm sm:text-base text-gray-800 leading-relaxed font-medium">
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
            <Inbox className="w-16 h-16 mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium">No logs found</p>
            <p className="text-sm">
              {userGroups.length === 0
                ? "Join a group to see activity logs."
                : "Try adjusting your filter settings"}
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default Logs;
