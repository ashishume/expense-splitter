/**
 * GroupDetails Component (Re-export from modular structure)
 *
 * This file exports the GroupDetails component from the modularized folder structure.
 * The component has been split into smaller, reusable components for better maintainability:
 *
 * Structure:
 * - GroupDetails/index.tsx - Main component with business logic and state management
 * - GroupDetails/ExpenseForm.tsx - Form for adding/editing expenses
 * - GroupDetails/ExpenseItem.tsx - Individual expense card display
 * - GroupDetails/ExpensesList.tsx - List container for all expenses
 * - GroupDetails/SpendingSummary.tsx - Group spending statistics and member balances
 * - GroupDetails/SettlementsList.tsx - Pending and completed settlements display
 * - GroupDetails/ActivityLog.tsx - Group activity feed with action logs
 */

export { default } from "./GroupDetails/index";
