/** @typedef {{ get: (keys?: string[] | string | null) => Promise<Record<string, unknown>>, set: (obj: Record<string, unknown>) => Promise<void>, remove: (keys: string[]) => Promise<void> }} StorageAdapter */

/**
 * @param {'sync' | 'local'} area
 * @returns {StorageAdapter}
 */
export function createChromeStorageAdapter(area) {
  return {
    get(keys) {
      return new Promise((resolve, reject) => {
        chrome.storage[area].get(keys, result => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError)
            return
          }
          resolve(result)
        })
      })
    },
    set(obj) {
      return new Promise((resolve, reject) => {
        chrome.storage[area].set(obj, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError)
            return
          }
          resolve()
        })
      })
    },
    remove(keys) {
      return new Promise((resolve, reject) => {
        chrome.storage[area].remove(keys, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError)
            return
          }
          resolve()
        })
      })
    },
  }
}

/**
 * @param {Record<string, unknown>} [store]
 * @returns {StorageAdapter}
 */
export function createMemoryStorageAdapter(store = {}) {
  const data = store
  return {
    async get(keys) {
      if (keys === null || keys === undefined) {
        return { ...data }
      }
      if (Array.isArray(keys)) {
        const result = {}
        for (const key of keys) {
          if (key in data) {
            result[key] = data[key]
          }
        }
        return result
      }
      if (typeof keys === 'string') {
        return keys in data ? { [keys]: data[keys] } : {}
      }
      return {}
    },
    async set(obj) {
      Object.assign(data, obj)
    },
    async remove(keys) {
      for (const key of keys) {
        delete data[key]
      }
    },
  }
}
