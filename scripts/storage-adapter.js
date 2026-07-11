/** @typedef {{ get: (keys?: string[] | string | null) => Promise<Record<string, unknown>>, set: (obj: Record<string, unknown>) => Promise<void>, remove: (keys: string[]) => Promise<void> }} StorageAdapter */

/**
 * @param {'sync' | 'local'} area
 * @param {Record<string, { oldValue?: unknown, newValue?: unknown }>} changes
 */
function notifyStorageChange(area, changes) {
  const onChanged = globalThis.chrome?.storage?.onChanged
  if (onChanged && typeof onChanged._emit === 'function') {
    onChanged._emit(changes, area)
  }
}

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
 * @param {{ area?: 'sync' | 'local' }} [options]
 * @returns {StorageAdapter}
 */
export function createMemoryStorageAdapter(store = {}, { area } = {}) {
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
      const changes = {}
      for (const [key, value] of Object.entries(obj)) {
        changes[key] = {
          oldValue: key in data ? data[key] : undefined,
          newValue: value,
        }
      }
      Object.assign(data, obj)
      if (area) {
        notifyStorageChange(area, changes)
      }
    },
    async remove(keys) {
      const changes = {}
      for (const key of keys) {
        if (key in data) {
          changes[key] = { oldValue: data[key], newValue: undefined }
          delete data[key]
        }
      }
      if (area && Object.keys(changes).length > 0) {
        notifyStorageChange(area, changes)
      }
    },
  }
}
