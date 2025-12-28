import React from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  UserPlus,
  UserMinus,
  ArrowRight,
} from "lucide-react";
import { formatTimestamp } from "../../utils/dateUtils";
import type { User } from "../../types";
import type { LogEntry } from "../../utils/logger";

interface ExtendedLogEntry extends LogEntry {
  id: string;
}

interface ActivityLogProps {
  logs: ExtendedLogEntry[];
  users: User[];
}

/**
 * ActivityLog Component
 *
 * Displays group activity logs with action types and timestamps.
 * Shows create, update, and delete actions for expenses.
 * Displays detailed changes for updates including old vs new values.
 */
const ActivityLog = ({ logs, users }: ActivityLogProps) => {
  /**
   * Get user name from user ID
   */
  const getUserName = (userId: string): string => {
    const user = users.find((u) => u.id === userId);
    return user?.name || "Unknown";
  };

  /**
   * Format expense changes for display
   */
  const formatExpenseChanges = (log: ExtendedLogEntry) => {
    if (!log.changes) return null;

    const changes = log.changes;
    const changeItems: React.ReactElement[] = [];

    // Amount change
    if (
      changes.oldAmount !== undefined &&
      changes.newAmount !== undefined &&
      changes.oldAmount !== changes.newAmount
    ) {
      changeItems.push(
        <div key="amount" className="flex items-center gap-2 text-xs">
          <span className="text-gray-600">Amount:</span>
          <span className="line-through text-red-600">
            ₹{changes.oldAmount}
          </span>
          <ArrowRight className="w-3 h-3 text-gray-400" />
          <span className="font-semibold text-green-600">
            ₹{changes.newAmount}
          </span>
        </div>
      );
    }

    // Description change
    if (
      changes.oldDescription &&
      changes.newDescription &&
      changes.oldDescription !== changes.newDescription
    ) {
      changeItems.push(
        <div key="description" className="flex items-center gap-2 text-xs">
          <span className="text-gray-600">Description:</span>
          <span className="line-through text-red-600 truncate max-w-[100px]">
            {changes.oldDescription}
          </span>
          <ArrowRight className="w-3 h-3 text-gray-400" />
          <span className="font-semibold text-green-600 truncate max-w-[100px]">
            {changes.newDescription}
          </span>
        </div>
      );
    }

    // Paid by change
    if (
      changes.oldPaidBy &&
      changes.newPaidBy &&
      changes.oldPaidBy !== changes.newPaidBy
    ) {
      changeItems.push(
        <div key="paidBy" className="flex items-center gap-2 text-xs">
          <span className="text-gray-600">Paid by:</span>
          <span className="line-through text-red-600">
            {changes.oldPaidByName || getUserName(changes.oldPaidBy)}
          </span>
          <ArrowRight className="w-3 h-3 text-gray-400" />
          <span className="font-semibold text-green-600">
            {changes.newPaidByName || getUserName(changes.newPaidBy)}
          </span>
        </div>
      );
    }

    // Split with change
    if (changes.oldSplitWith && changes.newSplitWith) {
      const oldNames = changes.oldSplitWith
        .map((id: string) => getUserName(id))
        .join(", ");
      const newNames = changes.newSplitWith
        .map((id: string) => getUserName(id))
        .join(", ");

      if (oldNames !== newNames) {
        changeItems.push(
          <div key="splitWith" className="text-xs">
            <span className="text-gray-600">Split with:</span>
            <div className="ml-2 mt-0.5">
              <div className="line-through text-red-600">
                {oldNames || "None"}
              </div>
              <ArrowRight className="w-3 h-3 text-gray-400 my-0.5" />
              <div className="font-semibold text-green-600">
                {newNames || "None"}
              </div>
            </div>
          </div>
        );
      }
    }

    return changeItems.length > 0 ? (
      <div className="mt-2 pt-2 border-t border-gray-200 space-y-1.5">
        {changeItems}
      </div>
    ) : null;
  };

  /**
   * Format member changes for display
   */
  const formatMemberChanges = (log: ExtendedLogEntry) => {
    if (!log.changes) return null;

    const changes = log.changes;
    const changeItems: React.ReactElement[] = [];

    // Member count change
    if (
      changes.oldMemberCount !== undefined &&
      changes.newMemberCount !== undefined
    ) {
      changeItems.push(
        <div key="count" className="flex items-center gap-2 text-xs">
          <span className="text-gray-600">Members:</span>
          <span className="line-through text-red-600">
            {changes.oldMemberCount}{" "}
            {changes.oldMemberCount === 1 ? "member" : "members"}
          </span>
          <ArrowRight className="w-3 h-3 text-gray-400" />
          <span className="font-semibold text-green-600">
            {changes.newMemberCount}{" "}
            {changes.newMemberCount === 1 ? "member" : "members"}
          </span>
        </div>
      );
    }

    // Added members
    if (changes.addedMembers && changes.addedMembers.length > 0) {
      changeItems.push(
        <div key="added" className="text-xs">
          <span className="text-emerald-700 font-medium">Added:</span>
          <span className="ml-2 text-emerald-600">
            {changes.addedMembers.join(", ")}
          </span>
        </div>
      );
    }

    // Removed members
    if (changes.removedMembers && changes.removedMembers.length > 0) {
      changeItems.push(
        <div key="removed" className="text-xs">
          <span className="text-orange-700 font-medium">Removed:</span>
          <span className="ml-2 text-orange-600">
            {changes.removedMembers.join(", ")}
          </span>
        </div>
      );
    }

    return changeItems.length > 0 ? (
      <div className="mt-2 pt-2 border-t border-gray-200 space-y-1.5">
        {changeItems}
      </div>
    ) : null;
  };
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
      case "MEMBER_ADD":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "MEMBER_REMOVE":
        return "bg-orange-100 text-orange-800 border-orange-200";
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
      case "MEMBER_ADD":
        return UserPlus;
      case "MEMBER_REMOVE":
        return UserMinus;
      default:
        return FileText;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:p-6 lg:p-8 bg-white rounded-xl shadow-lg"
    >
      <h3 className="text-xl lg:text-2xl font-semibold mb-4 lg:mb-6 text-gray-800 flex items-center">
        <FileText className="w-5 h-5 lg:w-6 lg:h-6 mr-2 lg:mr-3 text-blue-600" />
        Activity Log
      </h3>

      {logs.length === 0 ? (
        // Empty state
        <div className="text-center py-12 lg:py-16">
          <FileText className="w-16 h-16 lg:w-20 lg:h-20 mx-auto text-gray-300 mb-4 lg:mb-6" />
          <p className="text-lg lg:text-xl font-semibold text-gray-700 mb-2">
            No Activity Yet
          </p>
          <p className="text-gray-500 text-sm lg:text-base">
            Activity in this group will appear here
          </p>
        </div>
      ) : (
        // Activity log entries
        <div className="space-y-2 lg:space-y-3">
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
                          {log.action
                            .replace("EXPENSE_", "")
                            .replace("MEMBER_", "")
                            .replace("_", " ")}
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

                    {/* Detailed changes for expense updates */}
                    {log.action === "EXPENSE_UPDATE" &&
                      formatExpenseChanges(log)}

                    {/* Detailed changes for member actions */}
                    {(log.action === "MEMBER_ADD" ||
                      log.action === "MEMBER_REMOVE") &&
                      formatMemberChanges(log)}

                    {/* User name */}
                    {log.userName && (
                      <span className="text-xs text-gray-600 mt-1.5 block">
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
