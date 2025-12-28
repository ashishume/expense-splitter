import type { Expense, User, Settlement } from "../types";

/**
 * Expense Calculation Utilities
 *
 * This module contains all the core logic for calculating expense splits and balances.
 * It handles the scenario where a payer may not be included in the split (e.g., User1 pays
 * for User2, User3, User4, but the expense is only split among U2, U3, U4).
 *
 * Key Concepts:
 * - When a user pays, they are credited the full amount
 * - The expense is split only among users in the splitWith array
 * - If the payer is NOT in splitWith, they don't owe any share (they just paid for others)
 * - If the payer IS in splitWith, they owe their share like everyone else
 */

/**
 * Calculates the amount each person owes for a given expense
 *
 * @param expense - The expense to calculate split for
 * @returns The amount each person in splitWith owes
 *
 * @example
 * // User1 pays $100, split among User2, User3, User4
 * // amountPerPerson = 100 / 3 = 33.33
 * const amount = calculateAmountPerPerson({
 *   amount: 100,
 *   splitWith: ['user2', 'user3', 'user4']
 * });
 */
export function calculateAmountPerPerson(expense: {
  amount: number;
  splitWith: string[];
}): number {
  if (expense.splitWith.length === 0) {
    return 0;
  }
  return expense.amount / expense.splitWith.length;
}

/**
 * Applies a regular expense to the balance map
 *
 * Logic:
 * 1. Payer gets credited the full amount (they paid for it)
 * 2. Each user in splitWith owes their share (amount / splitWith.length)
 * 3. If payer is in splitWith, they also owe their share (handled in forEach loop)
 *
 * @param balances - Map of user IDs to their current balances
 * @param expense - The expense to apply
 * @param memberIds - Array of valid member IDs (to ensure we only update group members)
 *
 * @example
 * // Case 1: User1 pays $100, split among User2, User3, User4 (User1 NOT in split)
 * // amountPerPerson = 100 / 3 = 33.33
 * // Result: U1: +100, U2: -33.33, U3: -33.33, U4: -33.33
 *
 * @example
 * // Case 2: User1 pays $100, split among User1, User2, User3 (User1 IS in split)
 * // amountPerPerson = 100 / 3 = 33.33
 * // Result: U1: +100 - 33.33 = +66.67, U2: -33.33, U3: -33.33
 */
export function applyRegularExpense(
  balances: Record<string, number>,
  expense: Expense,
  memberIds: string[]
): void {
  const { paidBy, amount, splitWith } = expense;
  const amountPerPerson = calculateAmountPerPerson(expense);

  // Payer gets credited full amount (they paid for the expense)
  if (memberIds.includes(paidBy) && balances[paidBy] !== undefined) {
    balances[paidBy] += amount;
  }

  // Each user in splitWith owes their share
  // This includes the payer if they are in splitWith (they split with themselves)
  splitWith.forEach((userId) => {
    if (memberIds.includes(userId) && balances[userId] !== undefined) {
      balances[userId] -= amountPerPerson;
    }
  });
}

/**
 * Applies a settlement transaction to the balance map
 *
 * Logic:
 * - The payer (person who received payment) gets credited the amount
 * - The person in splitWith (person who paid) gets debited the amount
 *
 * @param balances - Map of user IDs to their current balances
 * @param expense - The settlement expense to apply
 * @param memberIds - Array of valid member IDs
 */
export function applySettlementExpense(
  balances: Record<string, number>,
  expense: Expense,
  memberIds: string[]
): void {
  // Settlement: payer receives money, person in splitWith pays
  if (
    memberIds.includes(expense.paidBy) &&
    balances[expense.paidBy] !== undefined
  ) {
    balances[expense.paidBy] += expense.amount;
  }

  if (
    expense.splitWith.length === 1 &&
    memberIds.includes(expense.splitWith[0]) &&
    balances[expense.splitWith[0]] !== undefined
  ) {
    balances[expense.splitWith[0]] -= expense.amount;
  }
}

/**
 * Calculates balances for all group members based on expenses
 *
 * This is the main function used for calculating group-wide balances.
 * It processes all expenses and returns a map of user IDs to their balances.
 *
 * @param expenses - Array of all expenses in the group
 * @param memberIds - Array of user IDs who are members of the group
 * @returns Map of user ID to balance (positive = owed money, negative = owes money)
 *
 * @example
 * const balances = calculateGroupBalances(expenses, ['user1', 'user2', 'user3']);
 * // { user1: 50.00, user2: -25.00, user3: -25.00 }
 */
export function calculateGroupBalances(
  expenses: Expense[],
  memberIds: string[]
): Record<string, number> {
  const balances: Record<string, number> = {};

  // Initialize all member balances to 0
  memberIds.forEach((userId) => {
    balances[userId] = 0;
  });

  // Process each expense
  expenses.forEach((expense) => {
    if (expense.isSettlement) {
      applySettlementExpense(balances, expense, memberIds);
    } else {
      applyRegularExpense(balances, expense, memberIds);
    }
  });

  return balances;
}

/**
 * Calculates the balance for a single user based on expenses
 *
 * This is useful when you only need to know one user's balance
 * without calculating balances for all members.
 *
 * @param expenses - Array of all expenses in the group
 * @param userId - The user ID to calculate balance for
 * @returns The user's balance (positive = owed money, negative = owes money)
 *
 * @example
 * const balance = calculateUserBalance(expenses, 'user1');
 * // Returns: 50.00 (user1 is owed $50)
 */
export function calculateUserBalance(
  expenses: Expense[],
  userId: string
): number {
  let balance = 0;

  expenses.forEach((expense) => {
    if (expense.isSettlement) {
      // Settlement: user receives money if they are the payer
      if (expense.paidBy === userId) {
        balance += expense.amount;
      }
      // Settlement: user pays if they are in splitWith
      if (expense.splitWith.length === 1 && expense.splitWith[0] === userId) {
        balance -= expense.amount;
      }
    } else {
      // Regular expense
      const amountPerPerson = calculateAmountPerPerson(expense);

      // User gets credited if they paid
      if (expense.paidBy === userId) {
        balance += expense.amount;
      }

      // User owes their share if they are in splitWith
      if (expense.splitWith.includes(userId)) {
        balance -= amountPerPerson;
      }
    }
  });

  return balance;
}

/**
 * Rounds a number to 2 decimal places
 * Used for currency calculations to avoid floating point precision issues
 *
 * @param num - Number to round
 * @returns Number rounded to 2 decimal places
 */
export function roundTo2Decimals(num: number): number {
  return Math.round(num * 100) / 100;
}

/**
 * Generates settlement suggestions based on group balances
 *
 * This matches debtors with creditors to suggest who should pay whom.
 * Uses a greedy algorithm to match debts with credits.
 *
 * @param balances - Map of user IDs to their balances
 * @param groupMembers - Array of user objects in the group
 * @param groupId - The group ID for the settlements
 * @returns Array of suggested settlements
 */
export function generateSettlements(
  balances: Record<string, number>,
  groupMembers: User[],
  groupId: string
): Settlement[] {
  const settlements: Settlement[] = [];
  const threshold = 0.01; // Ignore balances less than 1 cent

  // Find creditors (positive balance) and debtors (negative balance)
  const creditors = groupMembers.filter(
    (user) => balances[user.id] > threshold
  );
  const debtors = groupMembers.filter((user) => balances[user.id] < -threshold);

  // Create a working copy of balances to track remaining amounts
  const workingBalances = { ...balances };

  // Match debtors with creditors
  debtors.forEach((debtor) => {
    creditors.forEach((creditor) => {
      if (
        workingBalances[creditor.id] > threshold &&
        workingBalances[debtor.id] < -threshold
      ) {
        const amountToSettle = Math.min(
          Math.abs(workingBalances[debtor.id]),
          workingBalances[creditor.id]
        );

        if (amountToSettle > threshold) {
          settlements.push({
            id: `${debtor.id}-${creditor.id}-${groupId}-${Date.now()}`,
            from: debtor.id,
            fromName: debtor.name,
            to: creditor.id,
            toName: creditor.name,
            amount: roundTo2Decimals(amountToSettle),
            groupId: groupId,
            date: new Date().toISOString(),
          });

          // Update working balances to reflect this settlement
          workingBalances[debtor.id] += amountToSettle;
          workingBalances[creditor.id] -= amountToSettle;
        }
      }
    });
  });

  return settlements;
}
