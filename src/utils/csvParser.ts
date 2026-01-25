/**
 * CSV Parser Utility for Expense Import
 * 
 * Supports CSV files with columns: amount, description, category, date
 * Date formats supported: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, DD-MM-YYYY
 */

import type { ExpenseCategory, PersonalExpense } from "../types/personalExpense";
import { EXPENSE_CATEGORIES } from "../types/personalExpense";

export interface CSVExpenseRow {
  amount: number;
  description: string;
  category: ExpenseCategory;
  date: string; // ISO string format
  rowNumber: number;
}

export interface CSVParseResult {
  expenses: CSVExpenseRow[];
  errors: Array<{
    row: number;
    message: string;
  }>;
}

/**
 * Parse a CSV file string into expense rows
 */
export function parseCSV(csvText: string): CSVParseResult {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim());
  
  if (lines.length === 0) {
    return { expenses: [], errors: [{ row: 0, message: "CSV file is empty" }] };
  }

  // Parse header row
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine).map((h) => h.trim().toLowerCase());
  
  // Find column indices
  const amountIndex = findColumnIndex(headers, ["amount", "cost", "price", "value"]);
  const descriptionIndex = findColumnIndex(headers, ["description", "desc", "note", "memo", "details", "item"]);
  const categoryIndex = findColumnIndex(headers, ["category", "cat", "type"]);
  const dateIndex = findColumnIndex(headers, ["date", "transaction date", "expense date"]);

  // Validate required columns
  const errors: Array<{ row: number; message: string }> = [];
  
  if (amountIndex === -1) {
    errors.push({ row: 0, message: "Missing required column: 'amount' (or 'cost', 'price', 'value')" });
  }
  if (descriptionIndex === -1) {
    errors.push({ row: 0, message: "Missing required column: 'description' (or 'desc', 'note', 'memo', 'details', 'item')" });
  }
  if (categoryIndex === -1) {
    errors.push({ row: 0, message: "Missing required column: 'category' (or 'cat', 'type')" });
  }
  if (dateIndex === -1) {
    errors.push({ row: 0, message: "Missing required column: 'date' (or 'transaction date', 'expense date')" });
  }

  if (errors.length > 0) {
    return { expenses: [], errors };
  }

  // Parse data rows
  const expenses: CSVExpenseRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue; // Skip empty lines

    const rowNumber = i + 1; // 1-indexed for user-friendly error messages
    const values = parseCSVLine(line);

    try {
      // Extract values
      const amountStr = values[amountIndex]?.trim();
      const description = values[descriptionIndex]?.trim() || "";
      const categoryStr = values[categoryIndex]?.trim().toLowerCase();
      const dateStr = values[dateIndex]?.trim();

      // Validate and parse amount
      if (!amountStr) {
        errors.push({ row: rowNumber, message: "Amount is required" });
        continue;
      }

      const amount = parseFloat(amountStr.replace(/[^\d.-]/g, ""));
      if (isNaN(amount) || amount <= 0) {
        errors.push({ row: rowNumber, message: `Invalid amount: ${amountStr}` });
        continue;
      }

      // Validate description
      if (!description) {
        errors.push({ row: rowNumber, message: "Description is required" });
        continue;
      }

      // Validate and normalize category
      if (!categoryStr) {
        errors.push({ row: rowNumber, message: "Category is required" });
        continue;
      }

      const category = normalizeCategory(categoryStr);
      if (!category) {
        const validCategories = EXPENSE_CATEGORIES.map((c) => c.id).join(", ");
        errors.push({
          row: rowNumber,
          message: `Invalid category: ${categoryStr}. Valid categories: ${validCategories}`,
        });
        continue;
      }

      // Validate and parse date
      if (!dateStr) {
        errors.push({ row: rowNumber, message: "Date is required" });
        continue;
      }

      const date = parseDate(dateStr);
      if (!date) {
        errors.push({
          row: rowNumber,
          message: `Invalid date format: ${dateStr}. Supported formats: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, DD-MM-YYYY`,
        });
        continue;
      }

      expenses.push({
        amount,
        description,
        category,
        date,
        rowNumber,
      });
    } catch (error) {
      errors.push({
        row: rowNumber,
        message: `Error parsing row: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  }

  return { expenses, errors };
}

/**
 * Parse a CSV line, handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      // End of field
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current);

  return result;
}

/**
 * Find column index by trying multiple possible names
 */
function findColumnIndex(headers: string[], possibleNames: string[]): number {
  for (const name of possibleNames) {
    const index = headers.indexOf(name);
    if (index !== -1) {
      return index;
    }
  }
  return -1;
}

/**
 * Normalize category string to valid ExpenseCategory
 */
function normalizeCategory(categoryStr: string): ExpenseCategory | null {
  const normalized = categoryStr.toLowerCase().trim();
  
  // Direct match
  const directMatch = EXPENSE_CATEGORIES.find(
    (c) => c.id === normalized || c.label.toLowerCase() === normalized
  );
  if (directMatch) {
    return directMatch.id;
  }

  // Fuzzy matching for common variations
  const categoryMap: Record<string, ExpenseCategory> = {
    food: "food",
    dining: "food",
    restaurant: "food",
    meal: "food",
    transport: "transport",
    transportation: "transport",
    travel: "travel",
    shopping: "shopping",
    entertainment: "entertainment",
    utilities: "utilities",
    utility: "utilities",
    health: "health",
    healthcare: "health",
    subscriptions: "subscriptions",
    subscription: "subscriptions",
    groceries: "groceries",
    grocery: "groceries",
    fuel: "fuel",
    gas: "fuel",
    petrol: "fuel",
    electronics: "electronics",
    electronic: "electronics",
    other: "other",
    misc: "other",
    miscellaneous: "other",
  };

  return categoryMap[normalized] || null;
}

/**
 * Parse date string in various formats to ISO string
 */
function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;

  // Try ISO format first (YYYY-MM-DD)
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (isValidDate(date)) {
      return date.toISOString();
    }
  }

  // Try MM/DD/YYYY or DD/MM/YYYY
  const slashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const [, part1, part2, year] = slashMatch;
    // Try MM/DD/YYYY first
    let date = new Date(parseInt(year), parseInt(part1) - 1, parseInt(part2));
    if (isValidDate(date) && date.getMonth() === parseInt(part1) - 1) {
      return date.toISOString();
    }
    // Try DD/MM/YYYY
    date = new Date(parseInt(year), parseInt(part2) - 1, parseInt(part1));
    if (isValidDate(date) && date.getMonth() === parseInt(part2) - 1) {
      return date.toISOString();
    }
  }

  // Try DD-MM-YYYY
  const dashMatch = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (dashMatch) {
    const [, day, month, year] = dashMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (isValidDate(date)) {
      return date.toISOString();
    }
  }

  // Try native Date parsing as fallback
  const date = new Date(dateStr);
  if (isValidDate(date)) {
    return date.toISOString();
  }

  return null;
}

/**
 * Check if a date is valid
 */
function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Convert CSV expenses to PersonalExpense format (without id, createdAt, updatedAt)
 */
export function csvExpensesToPersonalExpenses(
  csvExpenses: CSVExpenseRow[]
): Omit<PersonalExpense, "id" | "createdAt" | "updatedAt">[] {
  return csvExpenses.map((exp) => ({
    amount: exp.amount,
    description: exp.description,
    category: exp.category,
    date: exp.date,
  }));
}
