/**
 * Centralized Data Cache Manager
 * 
 * Manages caching of expense data, stats, and related data
 * Provides cache invalidation when data is added/updated/deleted
 */

export type CacheKey = 
  | `expenses-${string}` // expenses-YYYY-MM
  | `stats-${string}` // stats-YYYY-MM
  | `fixed-costs-${string}` // fixed-costs-YYYY-MM
  | `investments-${string}` // investments-YYYY-MM
  | `salary-${string}` // salary-YYYY-MM
  | `one-time-investments-${string}`; // one-time-investments-YYYY-MM

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class DataCache {
  private cache = new Map<CacheKey, CacheEntry<unknown>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached data
   */
  get<T>(key: CacheKey, ttl?: number): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    const cacheTTL = ttl || this.DEFAULT_TTL;

    if (age >= cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cached data
   */
  set<T>(key: CacheKey, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Invalidate cache for a specific key
   */
  invalidate(key: CacheKey): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all cache entries for a specific month
   */
  invalidateMonth(month: string): void {
    const keysToDelete: CacheKey[] = [];
    
    this.cache.forEach((_, key) => {
      if (key.includes(month)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Invalidate all cache entries related to expenses (affects stats too)
   */
  invalidateExpenses(month: string): void {
    this.invalidate(`expenses-${month}` as CacheKey);
    this.invalidate(`stats-${month}` as CacheKey);
    // Also invalidate previous month stats if we're viewing current month
    // (since savings calculation might change)
    const [year, monthNum] = month.split("-").map(Number);
    const prevDate = new Date(year, monthNum - 2, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
    this.invalidate(`stats-${prevMonth}` as CacheKey);
  }

  /**
   * Invalidate all cache entries related to fixed costs (affects stats)
   */
  invalidateFixedCosts(month: string): void {
    this.invalidate(`fixed-costs-${month}` as CacheKey);
    this.invalidate(`stats-${month}` as CacheKey);
  }

  /**
   * Invalidate all cache entries related to investments (affects stats)
   */
  invalidateInvestments(month: string): void {
    this.invalidate(`investments-${month}` as CacheKey);
    this.invalidate(`stats-${month}` as CacheKey);
  }

  /**
   * Invalidate all cache entries related to salary (affects stats)
   */
  invalidateSalary(month: string): void {
    this.invalidate(`salary-${month}` as CacheKey);
    this.invalidate(`stats-${month}` as CacheKey);
  }

  /**
   * Invalidate all cache entries related to one-time investments (affects stats)
   */
  invalidateOneTimeInvestments(month: string): void {
    this.invalidate(`one-time-investments-${month}` as CacheKey);
    this.invalidate(`stats-${month}` as CacheKey);
  }

  /**
   * Invalidate all cache (use sparingly)
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size (for debugging)
   */
  size(): number {
    return this.cache.size;
  }
}

// Singleton instance
export const dataCache = new DataCache();

/**
 * Helper to extract month from date string
 */
export const extractMonth = (date: string): string => {
  return date.substring(0, 7); // YYYY-MM
};
