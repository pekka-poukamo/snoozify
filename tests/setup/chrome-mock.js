let store = {}
const callbacks = { alarms: [] }

function computeBytesInUse(obj) {
  try {
    return new TextEncoder().encode(JSON.stringify(obj)).length
  } catch {
    return 0
  }
}

globalThis.chrome = {
  runtime: { lastError: null },
  storage: {
    sync: {
      get: (keysOrCb, cb) => {
        const cbFn = typeof keysOrCb === 'function' ? keysOrCb : cb
        const keys = typeof keysOrCb === 'string' || Array.isArray(keysOrCb) || keysOrCb === null ? keysOrCb : undefined
        const out = {}
        if (!keys || keys === null) {
          Object.assign(out, store)
        } else if (typeof keys === 'string') {
          out[keys] = store[keys]
        } else if (Array.isArray(keys)) {
          keys.forEach(k => (out[k] = store[k]))
        } else if (typeof keys === 'object') {
          Object.keys(keys).forEach(k => (out[k] = store[k]))
        }
        cbFn(out)
      },
      set: (obj, cb) => {
        Object.assign(store, obj)
        cb && cb()
      },
      remove: (keys, cb) => {
        ;(Array.isArray(keys) ? keys : [keys]).forEach(k => delete store[k])
        cb && cb()
      },
      getBytesInUse: (_keys, cb) => cb(computeBytesInUse(store)),
    },
  },
  tabs: {
    _created: [],
    _removed: [],
    query: async (_query) => [{ id: 1, title: 'Example', url: 'https://example.com', highlighted: true }],
    create: ({ url }) => {
      globalThis.chrome.tabs._created.push(url)
    },
    remove: (ids) => {
      const toRemove = Array.isArray(ids) ? ids : [ids]
      globalThis.chrome.tabs._removed.push(...toRemove)
    },
  },
  alarms: {
    create: (_name, _opts) => {},
    onAlarm: { addListener: fn => callbacks.alarms.push(fn) },
    _trigger: (name) => callbacks.alarms.forEach(fn => fn({ name })),
  },
  notifications: {
    _created: [],
    create: (opts) => { globalThis.chrome.notifications._created.push(opts) },
  },
  _reset: () => {
    store = {}
    callbacks.alarms = []
    globalThis.chrome.runtime.lastError = null
    globalThis.chrome.tabs._created = []
    globalThis.chrome.tabs._removed = []
    globalThis.chrome.notifications._created = []
  },
}