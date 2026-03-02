/**
 * IndexedDB cache for vocabulary data.
 *
 * Stores enriched (normalized) results keyed by source + identifier,
 * so cache hits skip both download AND processing.
 *
 * Uses a simple get/set/delete API. Falls back to an in-memory Map
 * when IndexedDB is not available (SSR, incognito restrictions).
 */

const DB_NAME = 'prez-lite-cache'
const DB_VERSION = 1
const STORE_NAME = 'vocab-data'

interface CacheEntry<T> {
  key: string
  data: T
  sha?: string
  timestamp: number
}

/** Maximum age before entries are considered stale (24 hours) */
const MAX_AGE_MS = 24 * 60 * 60 * 1000

// Fallback in-memory cache for environments without IndexedDB
const memoryFallback = new Map<string, CacheEntry<unknown>>()

function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined'
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/**
 * Build a cache key from source adapter key and resource identifier.
 * Example: "github:main/my-vocab/abc123"
 */
export function cacheKey(adapterKey: string, slug: string, sha?: string): string {
  return sha ? `${adapterKey}/${slug}/${sha}` : `${adapterKey}/${slug}`
}

/**
 * Get a value from the cache.
 * Returns null if not found or expired.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!isIndexedDBAvailable()) {
    const entry = memoryFallback.get(key) as CacheEntry<T> | undefined
    if (!entry) return null
    if (Date.now() - entry.timestamp > MAX_AGE_MS) {
      memoryFallback.delete(key)
      return null
    }
    return entry.data
  }

  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(key)
      req.onsuccess = () => {
        const entry = req.result as CacheEntry<T> | undefined
        if (!entry) return resolve(null)
        if (Date.now() - entry.timestamp > MAX_AGE_MS) {
          // Expired — clean up async
          cacheDel(key)
          return resolve(null)
        }
        resolve(entry.data)
      }
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

/**
 * Store a value in the cache.
 */
export async function cacheSet<T>(key: string, data: T, sha?: string): Promise<void> {
  const entry: CacheEntry<T> = { key, data, sha, timestamp: Date.now() }

  if (!isIndexedDBAvailable()) {
    memoryFallback.set(key, entry as CacheEntry<unknown>)
    return
  }

  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.put(entry)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // Fall back to memory
    memoryFallback.set(key, entry as CacheEntry<unknown>)
  }
}

/**
 * Delete a value from the cache.
 */
export async function cacheDel(key: string): Promise<void> {
  memoryFallback.delete(key)

  if (!isIndexedDBAvailable()) return

  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.delete(key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
  } catch {
    // Silently ignore
  }
}

/**
 * Clear all entries from the cache.
 */
export async function cacheClear(): Promise<void> {
  memoryFallback.clear()

  if (!isIndexedDBAvailable()) return

  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
  } catch {
    // Silently ignore
  }
}
