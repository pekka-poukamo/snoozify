// Provide a minimal global.chrome mock for tests that don't stub explicitly
import { vi } from 'vitest'

if (!globalThis.chrome) {
  globalThis.chrome = {}
}

const createEvent = () => {
  const listeners = new Set()
  return {
    addListener: (cb) => listeners.add(cb),
    removeListener: (cb) => listeners.delete(cb),
    _emit: (...args) => listeners.forEach((cb) => cb(...args)),
  }
}

const createStorageArea = () => {
  const area = {
    _store: {},
    get: vi.fn((keys, cb) => {
      if (typeof keys === 'function') { cb = keys; keys = null }
      if (!keys) return cb({ ...area._store })
      if (Array.isArray(keys)) {
        const result = {}
        for (const key of keys) result[key] = area._store[key]
        return cb(result)
      }
      if (typeof keys === 'string') return cb({ [keys]: area._store[keys] })
      if (typeof keys === 'object') {
        const result = {}
        for (const key of Object.keys(keys)) result[key] = area._store[key]
        return cb(result)
      }
      return cb({})
    }),
    set: vi.fn((obj, cb) => {
      Object.assign(area._store, obj)
      cb && cb()
    }),
    remove: vi.fn((keys, cb) => {
      const arr = Array.isArray(keys) ? keys : [keys]
      for (const key of arr) delete area._store[key]
      cb && cb()
    }),
    getBytesInUse: vi.fn((_, cb) => cb(0)),
  }
  return area
}

globalThis.chrome.storage = globalThis.chrome.storage || {}
globalThis.chrome.storage.sync = globalThis.chrome.storage.sync?._store
  ? globalThis.chrome.storage.sync
  : createStorageArea()
globalThis.chrome.storage.local = globalThis.chrome.storage.local?._store
  ? globalThis.chrome.storage.local
  : createStorageArea()
globalThis.chrome.storage.onChanged = globalThis.chrome.storage.onChanged || createEvent()

globalThis.chrome.runtime = globalThis.chrome.runtime || { lastError: null }

globalThis.chrome.tabs = globalThis.chrome.tabs || {
  query: vi.fn(async () => []),
  create: vi.fn((opts) => opts),
  remove: vi.fn(() => {}),
}

globalThis.chrome.notifications = globalThis.chrome.notifications || {
  create: vi.fn(() => {}),
}

globalThis.chrome.alarms = globalThis.chrome.alarms || {
  create: vi.fn(() => {}),
  onAlarm: createEvent(),
}
