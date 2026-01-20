import { type ExpenseCategory } from "../types/personalExpense";

export interface ParsedExpense {
  amount: number | null;
  category: ExpenseCategory | null;
  date: string | null; // YYYY-MM-DD format
  description: string;
}

/**
 * Maps category keywords to category IDs
 * Expanded with many common terms and variations for better speech recognition
 */
const CATEGORY_KEYWORDS: Record<ExpenseCategory, string[]> = {
  food: [
    "food", "dining", "restaurant", "lunch", "dinner", "breakfast", "meal", "meals", "eat", "eating", "cafe", "café",
    "snack", "snacks", "pizza", "burger", "burgers", "coffee", "tea", "drink", "drinks", "beverage", "beverages",
    "fast food", "takeout", "take away", "delivery", "zomato", "swiggy", "uber eats", "food delivery", "foodpanda",
    "tiffin", "tiffin service", "mess", "mess food", "canteen", "stall", "street food", "chaat", "sweets", "dessert",
    "ice cream", "juice", "smoothie", "shake", "biryani", "curry", "thali", "combo", "buffet", "brunch", "supper",
    "appetizer", "starter", "main course", "side dish", "beverage", "soft drink", "cold drink", "hot drink"
  ],
  transport: [
    "transport", "transportation", "travel", "taxi", "uber", "ola", "rapido", "bus", "train", "metro", "subway",
    "fuel", "petrol", "diesel", "gas", "gasoline", "cab", "auto", "rickshaw", "auto rickshaw", "bike", "bicycle",
    "parking", "toll", "fare", "commute", "commuting", "ride", "vehicle", "car", "scooter", "motorcycle", "bike ride",
    "two wheeler", "four wheeler", "rickshaw", "e-rickshaw", "shared", "pool", "car pool", "carpool", "shared ride",
    "metro card", "bus pass", "train ticket", "flight ticket", "airport", "railway", "station", "depot", "garage",
    "service", "repair", "maintenance", "insurance", "registration", "rc", "puc", "pollution", "emission"
  ],
  shopping: [
    "shopping", "shop", "shopped", "buy", "bought", "purchase", "purchased", "mall", "store", "stores", "market",
    "clothes", "clothing", "apparel", "garments", "dress", "shirt", "pants", "jeans", "shoes", "footwear", "sneakers",
    "electronics", "electronic", "gadget", "gadgets", "phone", "mobile", "smartphone", "laptop", "computer", "tablet",
    "accessories", "fashion", "retail", "amazon", "flipkart", "myntra", "nykaa", "online shopping", "e-commerce",
    "watch", "watches", "jewelry", "jewellery", "bag", "bags", "wallet", "perfume", "cosmetics", "makeup", "skincare",
    "books", "stationery", "gift", "gifts", "present", "presents", "toys", "games", "board games", "video games"
  ],
  entertainment: [
    "entertainment", "movie", "movies", "cinema", "theater", "theatre", "game", "games", "fun", "recreation",
    "streaming", "music", "concert", "show", "shows", "party", "parties", "celebration", "celebrations", "outing",
    "outings", "hangout", "hangouts", "pub", "bar", "alcohol", "drinks", "beer", "wine", "cocktail", "sports",
    "cricket", "football", "soccer", "basketball", "tennis", "badminton", "gym", "fitness", "yoga", "dance",
    "karaoke", "bowling", "arcade", "amusement", "park", "zoo", "museum", "exhibition", "fair", "festival",
    "event", "events", "ticket", "tickets", "booking", "reservation", "netflix", "prime video", "disney", "hotstar"
  ],
  utilities: [
    "utilities", "utility", "electricity", "electric", "power", "water", "gas", "lpg", "cng", "internet", "wifi",
    "wi-fi", "phone", "mobile", "telephone", "bill", "bills", "mobile bill", "phone bill", "electric bill",
    "water bill", "gas bill", "internet bill", "broadband", "cable", "tv", "television", "dth", "dish tv", "tata sky",
    "recharge", "prepaid", "postpaid", "data", "calling", "sms", "plan", "tariff", "rent", "maintenance",
    "society", "society charges", "maintenance charges", "security", "guard", "cleaning", "housekeeping", "maid",
    "domestic help", "cook", "driver", "salary", "wages", "service charge", "service tax", "gst"
  ],
  health: [
    "health", "medical", "medicine", "medicines", "medication", "drugs", "doctor", "doctors", "hospital", "hospitals",
    "pharmacy", "pharmacies", "clinic", "clinics", "fitness", "gym", "yoga", "pilates", "workout", "exercise",
    "medication", "prescription", "tablets", "pills", "vitamins", "supplements", "checkup", "check-up", "test",
    "tests", "lab", "laboratory", "diagnostic", "diagnosis", "therapy", "treatment", "surgery", "operation",
    "dental", "dentist", "eye", "optometrist", "glasses", "spectacles", "lens", "contact lens", "physiotherapy",
    "massage", "spa", "salon", "haircut", "hair", "beauty", "parlor", "parlour", "skincare", "facial", "manicure",
    "pedicure", "insurance", "health insurance", "medical insurance"
  ],
  travel: [
    "travel", "travelling", "trip", "trips", "vacation", "holiday", "holidays", "hotel", "hotels", "flight", "flights",
    "airplane", "airline", "airport", "tourism", "sightseeing", "booking", "bookings", "reservation", "reservations",
    "luggage", "baggage", "visa", "passport", "tour", "tours", "journey", "journeys", "commute", "commuting",
    "train", "railway", "rail", "bus", "coach", "car rental", "rental car", "taxi", "cab", "uber", "ola", "accommodation",
    "stay", "staying", "lodging", "resort", "resorts", "hostel", "hostels", "backpacking", "sightseeing", "tourist",
    "guide", "tickets", "travel tickets", "package", "tour package", "travel package", "cruise", "cruises"
  ],
  subscriptions: [
    "subscription", "subscriptions", "netflix", "spotify", "prime", "amazon prime", "youtube", "youtube premium",
    "premium", "disney", "disney plus", "hotstar", "disney hotstar", "zee5", "sony liv", "voot", "alt balaji",
    "music", "apple music", "gaana", "wynk", "jio saavn", "hungama", "podcast", "podcasts", "audible", "kindle",
    "newspaper", "newspapers", "magazine", "magazines", "newsletter", "newsletters", "software", "saas", "cloud",
    "storage", "dropbox", "google drive", "icloud", "onedrive", "adobe", "creative cloud", "microsoft", "office",
    "office 365", "gaming", "xbox", "playstation", "nintendo", "steam", "epic games", "gaming subscription"
  ],
  groceries: [
    "groceries", "grocery", "vegetables", "veggies", "fruits", "supermarket", "mart", "store", "shopping", "provisions",
    "daily", "daily needs", "household", "household items", "essentials", "staples", "rice", "wheat", "flour", "atta",
    "dal", "pulses", "lentils", "spices", "masala", "oil", "cooking oil", "ghee", "butter", "milk", "dairy", "curd",
    "yogurt", "cheese", "eggs", "chicken", "meat", "fish", "seafood", "bread", "biscuits", "cookies", "snacks",
    "chips", "namkeen", "pickle", "sauce", "ketchup", "mayonnaise", "jam", "honey", "sugar", "salt", "tea", "coffee",
    "detergent", "soap", "shampoo", "toothpaste", "toilet paper", "tissue", "napkins", "sanitary", "pads", "diapers",
    "baby", "baby products", "kitchen", "kitchen items", "utensils", "cookware", "bigbasket", "grofers", "zepto",
    "blinkit", "dunzo", "instamart", "swiggy instamart", "fresh", "fresh produce", "organic", "local market"
  ],
  other: [
    "other", "misc", "miscellaneous", "misc expenses", "various", "different", "unexpected", "one-time", "one time",
    "special", "occasion", "emergency", "emergencies", "donation", "donations", "charity", "tip", "tips", "gratuity",
    "service charge", "fine", "fines", "penalty", "penalties", "tax", "taxes", "gst", "service tax", "fee", "fees",
    "charges", "bank charges", "atm", "withdrawal", "transfer", "loan", "emi", "installment", "interest", "investment",
    "savings", "deposit", "withdrawal", "cash", "payment", "payments", "transaction", "transactions", "expense",
    "expenses", "spending", "spend", "spent", "cost", "costs", "price", "prices", "amount", "money", "rupees", "rs"
  ],
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
 * Format date to YYYY-MM-DD in local timezone (not UTC)
 * This prevents timezone issues that cause dates to shift by one day
 */
function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
    return formatDateLocal(yesterday);
  }

  // Today
  if (lowerText.includes("today")) {
    return formatDateLocal(today);
  }

  // Tomorrow
  if (lowerText.includes("tomorrow")) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDateLocal(tomorrow);
  }

  // "X days ago" pattern
  const daysAgoMatch = lowerText.match(/(\d+)\s*days?\s*ago/);
  if (daysAgoMatch) {
    const days = parseInt(daysAgoMatch[1], 10);
    const date = new Date(today);
    date.setDate(date.getDate() - days);
    return formatDateLocal(date);
  }

  // "X days back" pattern
  const daysBackMatch = lowerText.match(/(\d+)\s*days?\s*back/);
  if (daysBackMatch) {
    const days = parseInt(daysBackMatch[1], 10);
    const date = new Date(today);
    date.setDate(date.getDate() - days);
    return formatDateLocal(date);
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
        const date = new Date(today.getFullYear(), i, day);
        date.setHours(0, 0, 0, 0);
        // If date is in the future, use previous year
        if (date > today) {
          date.setFullYear(date.getFullYear() - 1);
        }
        return formatDateLocal(date);
      }
    }

    // Pattern 2: "15th december" or "december 15th"
    const dayMatch = lowerText.match(new RegExp(`(\\d+)(?:st|nd|rd|th)?\\s*${monthName}|${monthName}\\s*(\\d+)(?:st|nd|rd|th)?`, "i"));
    if (dayMatch) {
      const day = parseInt(dayMatch[1] || dayMatch[2], 10);
      if (day >= 1 && day <= 31) {
        const date = new Date(today.getFullYear(), i, day);
        date.setHours(0, 0, 0, 0);
        // If date is in the future, use previous year
        if (date > today) {
          date.setFullYear(date.getFullYear() - 1);
        }
        return formatDateLocal(date);
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
        date.setHours(0, 0, 0, 0);
        // If date is in the future, use previous year
        if (date > today) {
          date.setFullYear(date.getFullYear() - 1);
        }
        return formatDateLocal(date);
      }
    }

    // Pattern 2: "15th dec" or "dec 15th"
    const dayMatch = lowerText.match(new RegExp(`(\\d+)(?:st|nd|rd|th)?\\s*${monthAbbr}\\b|\\b${monthAbbr}\\s*(\\d+)(?:st|nd|rd|th)?`, "i"));
    if (dayMatch) {
      const day = parseInt(dayMatch[1] || dayMatch[2], 10);
      if (day >= 1 && day <= 31) {
        const date = new Date(today.getFullYear(), i, day);
        date.setHours(0, 0, 0, 0);
        // If date is in the future, use previous year
        if (date > today) {
          date.setFullYear(date.getFullYear() - 1);
        }
        return formatDateLocal(date);
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
