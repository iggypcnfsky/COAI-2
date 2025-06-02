/**
 * Cache Service
 * 
 * This service provides a caching mechanism for API requests to improve
 * performance and reduce duplicate requests. It supports:
 * 
 * - Time-based cache expiration
 * - Request deduplication
 * - Cache invalidation by key or pattern
 * - Cache persistence options
 */

type CacheItem<T> = {
  data: T;
  expiresAt: number;
};

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  forceRefresh?: boolean; // Force a refresh regardless of cache status
}

class CacheService {
  private cache: Map<string, CacheItem<any>>;
  private inflight: Map<string, Promise<any>>;
  private defaultTTL: number;
  
  constructor(defaultTTL = 60000) { // Default TTL: 1 minute
    this.cache = new Map();
    this.inflight = new Map();
    this.defaultTTL = defaultTTL;
  }
  
  /**
   * Wrap an async function with caching
   * 
   * @param key The cache key
   * @param fn The async function to cache
   * @param options Caching options
   * @returns The result of the async function
   */
  async wrap<T>(
    key: string, 
    fn: () => Promise<T>, 
    options: CacheOptions = {}
  ): Promise<T> {
    const ttl = options.ttl ?? this.defaultTTL;
    
    // Force refresh - skip cache
    if (options.forceRefresh) {
      return this.executeAndCache(key, fn, ttl);
    }
    
    // Check if we have a cached value
    const cached = this.get<T>(key);
    if (cached) {
      return cached;
    }
    
    // Check if there's an in-flight request
    const inflight = this.inflight.get(key);
    if (inflight) {
      return inflight as Promise<T>;
    }
    
    // Execute the function and cache the result
    return this.executeAndCache(key, fn, ttl);
  }
  
  /**
   * Execute an async function and cache its result
   * 
   * @param key The cache key
   * @param fn The async function to execute
   * @param ttl Time to live in milliseconds
   * @returns The result of the async function
   */
  private async executeAndCache<T>(
    key: string, 
    fn: () => Promise<T>, 
    ttl: number
  ): Promise<T> {
    // Create a promise for this request
    const promise = fn().then(result => {
      // Store the result in cache
      this.set(key, result, ttl);
      // Remove from in-flight requests
      this.inflight.delete(key);
      return result;
    }).catch(error => {
      // Remove from in-flight requests on error
      this.inflight.delete(key);
      throw error;
    });
    
    // Store the promise in the in-flight map
    this.inflight.set(key, promise);
    
    return promise;
  }
  
  /**
   * Get a cached value
   * 
   * @param key The cache key
   * @returns The cached value or undefined if not found
   */
  get<T>(key: string): T | undefined {
    const cached = this.cache.get(key);
    
    // Cache miss
    if (!cached) {
      return undefined;
    }
    
    // Check if the cache entry has expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    
    return cached.data as T;
  }
  
  /**
   * Set a value in the cache
   * 
   * @param key The cache key
   * @param data The data to cache
   * @param ttl Time to live in milliseconds
   */
  set<T>(key: string, data: T, ttl = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl
    });
  }
  
  /**
   * Check if a key exists in the cache
   * 
   * @param key The cache key
   * @returns True if the key exists and is not expired
   */
  has(key: string): boolean {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return false;
    }
    
    // Check if the cache entry has expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
  
  /**
   * Delete a key from the cache
   * 
   * @param key The cache key
   */
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Invalidate cache entries by prefix
   * 
   * @param prefix The key prefix to invalidate
   */
  invalidateByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * Invalidate cache entries matching a pattern
   * 
   * @param pattern The RegExp pattern to match keys against
   */
  invalidateByPattern(pattern: RegExp): void {
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * Set multiple cache entries at once
   * 
   * @param entries An array of [key, value] tuples
   * @param ttl Time to live in milliseconds
   */
  setMany<T>(entries: [string, T][], ttl = this.defaultTTL): void {
    const expiresAt = Date.now() + ttl;
    
    for (const [key, data] of entries) {
      this.cache.set(key, { data, expiresAt });
    }
  }
  
  /**
   * Get all keys in the cache
   * 
   * @returns An array of cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
  
  /**
   * Get the number of cache entries
   * 
   * @returns The cache size
   */
  size(): number {
    return this.cache.size;
  }
}

// Export a singleton instance
export const cacheService = new CacheService();
export default cacheService; 