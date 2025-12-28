import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users } from "lucide-react";
import type { User } from "../../types";

interface MembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: User[];
  title?: string;
}

/**
 * MembersModal Component
 *
 * A modal dialog that displays all members using React portals for proper z-index handling.
 * Works well on both mobile and desktop.
 */
const MembersModal = ({
  isOpen,
  onClose,
  members,
  title = "All Members",
}: MembersModalProps) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (typeof window === "undefined") return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]"
          />

          {/* Modal - Bottom sheet on mobile, centered on desktop */}
          <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: "100%", scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: "100%", scale: 0.95 }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 300,
              }}
              className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md sm:w-full max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mobile drag handle indicator */}
              <div className="sm:hidden pt-3 pb-2 flex justify-center">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
              </div>

              {/* Header */}
              <div className="border-b border-gray-200 p-4 sm:p-6 relative flex-shrink-0">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
                <div className="flex items-center gap-3 pr-10">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-md">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                      {title}
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {members.length}{" "}
                      {members.length === 1 ? "member" : "members"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="space-y-2">
                  {members.map((member, index) => (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-bold">
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                      </div>

                      {/* Member Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm sm:text-base font-medium text-gray-800 truncate">
                          {member.name}
                        </p>
                        {member.email && (
                          <p className="text-xs sm:text-sm text-gray-500 truncate">
                            {member.email}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default MembersModal;
