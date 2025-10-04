import { motion } from "framer-motion";
import { FileText, Plus, Edit, Trash2 } from "lucide-react";
import { formatTimestamp } from "../../utils/dateUtils";

interface LogEntry {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  userId?: string;
  userName?: string;
  groupId?: string;
}

interface ActivityLogProps {
  logs: LogEntry[];
}

/**
 * ActivityLog Component
 *
 * Displays group activity logs with action types and timestamps.
 * Shows create, update, and delete actions for expenses.
 */
const ActivityLog = ({ logs }: ActivityLogProps) => {
  /**
   * Returns appropriate color classes for action badge
   */
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

  /**
   * Returns appropriate icon component for action type
   */
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:p-6 bg-white rounded-xl shadow-lg"
    >
      <h3 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
        <FileText className="w-5 h-5 mr-2 text-blue-600" />
        Activity Log
      </h3>

      {logs.length === 0 ? (
        // Empty state
        <div className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-lg font-semibold text-gray-700 mb-2">
            No Activity Yet
          </p>
          <p className="text-gray-500 text-sm">
            Activity in this group will appear here
          </p>
        </div>
      ) : (
        // Activity log entries
        <div className="space-y-2">
          {logs.map((log, index) => {
            const IconComponent = getActionIcon(log.action);

            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-gray-50 border border-gray-200 p-2.5 sm:p-3 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-200"
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  {/* Action icon */}
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm border border-gray-200">
                      <IconComponent className="w-4 h-4 text-gray-600" />
                    </div>
                  </div>

                  {/* Log details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      {/* Action badge */}
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded border ${getActionColor(
                            log.action
                          )}`}
                        >
                          {log.action.replace("EXPENSE_", "").replace("_", " ")}
                        </span>
                      </div>
                      {/* Timestamp */}
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>

                    {/* Log message */}
                    <p className="text-sm text-gray-800 leading-snug mb-1">
                      {log.details}
                    </p>

                    {/* User name */}
                    {log.userName && (
                      <span className="text-xs text-gray-600">
                        by <span className="font-medium">{log.userName}</span>
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default ActivityLog;
