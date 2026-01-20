import { type ExpenseCategory } from "../types/personalExpense";

export interface ParsedExpense {
  amount: number | null;
  category: ExpenseCategory | null;
  date: string | null; // YYYY-MM-DD format
  description: string;
}

/**
 * Maps category keywords to category IDs
 */
const CATEGORY_KEYWORDS: Record<ExpenseCategory, string[]> = {
  food: ["food", "dining", "restaurant", "lunch", "dinner", "breakfast", "meal", "eat", "cafe"],
  transport: ["transport", "travel", "taxi", "uber", "ola", "bus", "train", "metro", "fuel", "petrol", "diesel", "cab"],
  shopping: ["shopping", "shop", "buy", "purchase", "mall", "store"],
  entertainment: ["entertainment", "movie", "cinema", "theater", "game", "games", "fun"],
  utilities: ["utilities", "electricity", "water", "gas", "internet", "wifi", "phone", "bill", "bills"],
  health: ["health", "medical", "medicine", "doctor", "hospital", "pharmacy", "clinic"],
  travel: ["travel", "trip", "vacation", "hotel", "flight", "airplane"],
  subscriptions: ["subscription", "subscriptions", "netflix", "spotify", "prime", "youtube", "premium"],
  groceries: ["groceries", "grocery", "vegetables", "fruits", "supermarket", "mart"],
  other: ["other", "misc", "miscellaneous"],
};

/**
 * Extract amount from text
 * Supports: "200rs", "200 rupees", "200 inr", "₹200", "200", "two hundred", etc.
 */
function extractAmount(text: string): number | null {
  // First try to find numbers with currency indicators
  const currencyPatterns = [
    /(\d+(?:\.\d+)?)\s*(?:rs|rupees|inr|rupee|₹)/i,
    /₹\s*(\d+(?:\.\d+)?)/i,
    /(\d+(?:\.\d+)?)\s*(?:for|on|in|spent|paid|bought)/i,
  ];

  for (const pattern of currencyPatterns) {
    const match = text.match(pattern);
    if (match) {
      const amount = parseFloat(match[1]);
      if (!isNaN(amount) && amount > 0) {
        return amount;
      }
    }
  }

  // Fallback: find any number in the text
  const numberMatch = text.match(/(\d+(?:\.\d+)?)/);
  if (numberMatch) {
    const amount = parseFloat(numberMatch[1]);
    if (!isNaN(amount) && amount > 0 && amount < 1000000) { // Reasonable upper limit
      return amount;
    }
  }

  return null;
}

/**
 * Extract category from text
 */
function extractCategory(text: string): ExpenseCategory | null {
  const lowerText = text.toLowerCase();

  // Check each category's keywords (longer matches first for better accuracy)
  const categoryMatches: Array<{ category: ExpenseCategory; priority: number }> = [];

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      // Use word boundaries for better matching
      const regex = new RegExp(`\\b${keyword}\\b`, "i");
      if (regex.test(lowerText)) {
        // Prioritize longer keywords and exact matches
        const priority = keyword.length + (lowerText.includes(` ${keyword} `) ? 10 : 0);
        categoryMatches.push({ category: category as ExpenseCategory, priority });
      }
    }
  }

  // Return the category with highest priority
  if (categoryMatches.length > 0) {
    categoryMatches.sort((a, b) => b.priority - a.priority);
    return categoryMatches[0].category;
  }

  return null;
}

/**
 * Extract date from text
 * Supports: "yesterday", "today", "tomorrow", "2 days ago", etc.
 */
function extractDate(text: string): string | null {
  const lowerText = text.toLowerCase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Yesterday
  if (lowerText.includes("yesterday")) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split("T")[0];
  }

  // Today
  if (lowerText.includes("today")) {
    return today.toISOString().split("T")[0];
  }

  // Tomorrow
  if (lowerText.includes("tomorrow")) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  }

  // "X days ago" pattern
  const daysAgoMatch = lowerText.match(/(\d+)\s*days?\s*ago/);
  if (daysAgoMatch) {
    const days = parseInt(daysAgoMatch[1], 10);
    const date = new Date(today);
    date.setDate(date.getDate() - days);
    return date.toISOString().split("T")[0];
  }

  // "X days back" pattern
  const daysBackMatch = lowerText.match(/(\d+)\s*days?\s*back/);
  if (daysBackMatch) {
    const days = parseInt(daysBackMatch[1], 10);
    const date = new Date(today);
    date.setDate(date.getDate() - days);
    return date.toISOString().split("T")[0];
  }

  // Try to parse specific dates (e.g., "january 5", "5th january", "15th of dec", "15th of december")
  const monthNames = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december"
  ];

  const monthAbbreviations = [
    "jan", "feb", "mar", "apr", "may", "jun",
    "jul", "aug", "sep", "oct", "nov", "dec"
  ];

  // Try full month names first
  for (let i = 0; i < monthNames.length; i++) {
    const monthName = monthNames[i];

    // Pattern 1: "15th of december" or "15 of december"
    const ofPattern = lowerText.match(new RegExp(`(\\d+)(?:st|nd|rd|th)?\\s+of\\s+${monthName}`, "i"));
    if (ofPattern) {
      const day = parseInt(ofPattern[1], 10);
      if (day >= 1 && day <= 31) {
        const date = new Date(today.getFullYear(), i, day + 1);
        // If date is in the future, use previous year
        if (date > today) {
          date.setFullYear(date.getFullYear() - 1);
        }
        return date.toISOString().split("T")[0];
      }
    }

    // Pattern 2: "15th december" or "december 15th"
    const dayMatch = lowerText.match(new RegExp(`(\\d+)(?:st|nd|rd|th)?\\s*${monthName}|${monthName}\\s*(\\d+)(?:st|nd|rd|th)?`, "i"));
    if (dayMatch) {
      const day = parseInt(dayMatch[1] || dayMatch[2], 10);
      if (day >= 1 && day <= 31) {
        const date = new Date(today.getFullYear(), i, day);
        // If date is in the future, use previous year
        if (date > today) {
          date.setFullYear(date.getFullYear() - 1);
        }
        return date.toISOString().split("T")[0];
      }
    }
  }

  // Try abbreviated month names
  for (let i = 0; i < monthAbbreviations.length; i++) {
    const monthAbbr = monthAbbreviations[i];

    // Pattern 1: "15th of dec" or "15 of dec"
    const ofPattern = lowerText.match(new RegExp(`(\\d+)(?:st|nd|rd|th)?\\s+of\\s+${monthAbbr}\\b`, "i"));
    if (ofPattern) {
      const day = parseInt(ofPattern[1], 10);
      if (day >= 1 && day <= 31) {
        const date = new Date(today.getFullYear(), i, day);
        // If date is in the future, use previous year
        if (date > today) {
          date.setFullYear(date.getFullYear() - 1);
        }
        return date.toISOString().split("T")[0];
      }
    }

    // Pattern 2: "15th dec" or "dec 15th"
    const dayMatch = lowerText.match(new RegExp(`(\\d+)(?:st|nd|rd|th)?\\s*${monthAbbr}\\b|\\b${monthAbbr}\\s*(\\d+)(?:st|nd|rd|th)?`, "i"));
    if (dayMatch) {
      const day = parseInt(dayMatch[1] || dayMatch[2], 10);
      if (day >= 1 && day <= 31) {
        const date = new Date(today.getFullYear(), i, day);
        // If date is in the future, use previous year
        if (date > today) {
          date.setFullYear(date.getFullYear() - 1);
        }
        return date.toISOString().split("T")[0];
      }
    }
  }

  return null;
}

/**
 * Extract description from text
 * Returns the full original text as description (user's requirement)
 */
function extractDescription(text: string): string {
  // Return the full original transcript as description
  return text.trim();
}

/**
 * Parse natural language text into expense data
 */
export function parseExpenseSpeech(text: string): ParsedExpense {
  const amount = extractAmount(text);
  const category = extractCategory(text);
  const date = extractDate(text);
  const description = extractDescription(text);

  return {
    amount,
    category,
    date,
    description,
  };
}

/**
 * Get example phrases for speech input
 */
export function getExamplePhrases(): string[] {
  return [
    "Yesterday I spent 200 rupees in groceries",
    "500 rupees for food today",
    "Spent 300 on transport yesterday",
    "Groceries 250 rupees",
    "I bought food for 150 yesterday",
    "2000 for shopping 2 days ago",
    "Spent 100 rupees on entertainment today",
    "I paid 450 rupees for groceries yesterday",
    "Transport 200 rupees today",
    "Shopping 1500 rupees 3 days ago",
    "I spent 500 rupees on groceries on 15th of dec",
    "200 rupees for food on 5th january",
    "Spent 300 on transport on 20th of nov",
  ];
}
