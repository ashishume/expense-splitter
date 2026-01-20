import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Plus, Edit, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import type { PersonalExpenseActivity } from "../../services/personalExpenseActivityLog";
import { subscribeToActivities } from "../../services/personalExpenseActivityLog";
import { EXPENSE_CATEGORIES } from "../../types/personalExpense";

interface ActivityFeedProps {
  userId: string;
}

const ActivityFeed = ({ userId }: ActivityFeedProps) => {
  const [activities, setActivities] = useState<PersonalExpenseActivity[]>([]);
  const [isExpanded, setIsExpanded] = useState(true); // Default to expanded in tab view

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToActivities(userId, (activities) => {
      setActivities(activities);
    }, 50); // Show last 50 activities in tab view

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userId]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "CREATE":
        return <Plus className="w-4 h-4" />;
      case "UPDATE":
        return <Edit className="w-4 h-4" />;
      case "DELETE":
        return <Trash2 className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "CREATE":
        return "bg-green-100 text-green-700 border-green-300";
      case "UPDATE":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "DELETE":
        return "bg-red-100 text-red-700 border-red-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getCategoryEmoji = (category: string) => {
    const cat = EXPENSE_CATEGORIES.find((c) => c.id === category);
    return cat?.emoji || "📦";
  };

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Activity Yet</h3>
        <p className="text-gray-500">
          Your expense activities will appear here once you start adding, editing, or deleting expenses.
        </p>
      </div>
    );
  }

  const displayActivities = isExpanded ? activities : activities.slice(0, 10);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-800">Activity Feed</h3>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {activities.length}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {/* Activities List */}
      <AnimatePresence>
        <div className="divide-y divide-gray-100">
          {displayActivities.map((activity) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${getActionColor(
                    activity.action
                  )}`}
                >
                  {getActionIcon(activity.action)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm text-gray-800 leading-snug">
                      {activity.details}
                    </p>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {formatTimestamp(activity.timestamp)}
                    </span>
                  </div>

                  {/* Show expense details for CREATE and DELETE */}
                  {(activity.action === "CREATE" || activity.action === "DELETE") &&
                    activity.expense && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                        <span>{getCategoryEmoji(activity.expense.category)}</span>
                        <span className="font-medium">
                          {new Date(activity.expense.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    )}

                  {/* Show changes for UPDATE */}
                  {activity.action === "UPDATE" &&
                    activity.oldExpense &&
                    activity.newExpense && (
                      <div className="mt-2 space-y-1">
                        {activity.oldExpense.amount !== activity.newExpense.amount && (
                          <div className="text-xs text-gray-600">
                            <span className="line-through text-red-500">
                              ₹{activity.oldExpense.amount}
                            </span>
                            {" → "}
                            <span className="text-green-600 font-medium">
                              ₹{activity.newExpense.amount}
                            </span>
                          </div>
                        )}
                        {activity.oldExpense.description !==
                          activity.newExpense.description && (
                          <div className="text-xs text-gray-600">
                            <span className="line-through text-red-500">
                              "{activity.oldExpense.description}"
                            </span>
                            {" → "}
                            <span className="text-green-600 font-medium">
                              "{activity.newExpense.description}"
                            </span>
                          </div>
                        )}
                        {activity.oldExpense.category !== activity.newExpense.category && (
                          <div className="text-xs text-gray-600">
                            <span className="line-through text-red-500">
                              {activity.oldExpense.category}
                            </span>
                            {" → "}
                            <span className="text-green-600 font-medium">
                              {activity.newExpense.category}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>

      {/* Show more indicator */}
      {!isExpanded && activities.length > 10 && (
        <div className="px-4 py-2 text-center text-xs text-gray-500 bg-gray-50">
          {activities.length - 10} more activities
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
