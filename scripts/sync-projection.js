import { packRecords } from './chunk-pack.js'

export const META_KEY = 'snoozify_v3_meta'
export const CHUNK_PREFIX = 'snoozify_v3_c'
const SCHEMA_VERSION = 3

/** @typedef {{ id: string, title: string, url: string, wakeAt: string }} ScheduledPage */

const toWakeDay = wakeAt => new Date(wakeAt).toISOString().split('T')[0]

const toCompact = page => ({
  i: page.id,
  t: page.title,
  u: page.url,
  w: toWakeDay(page.wakeAt),
})

const fromCompact = record => ({
  id: record.i,
  title: record.t,
  url: record.u,
  wakeAt: record.w,
})

const chunkKey = index => `${CHUNK_PREFIX}${index}`

const isV3Key = key =>
  key === META_KEY || key.startsWith(CHUNK_PREFIX)

/**
 * @param {{ get: (keys?: string[] | null) => Promise<Record<string, unknown>>, set: (obj: Record<string, unknown>) => Promise<void>, remove: (keys: string[]) => Promise<void> }} adapter
 * @returns {Promise<ScheduledPage[]>}
 */
export async function readScheduled(adapter) {
  const all = await adapter.get(null)
  const meta = /** @type {{ v?: number, chunks?: string[] } | undefined} */ (all[META_KEY])

  if (!meta || meta.v !== SCHEMA_VERSION || !Array.isArray(meta.chunks)) {
    return []
  }

  const chunkData = await adapter.get(meta.chunks)
  const pages = []

  for (const key of meta.chunks) {
    const records = /** @type {Array<{ i: string, t: string, u: string, w: string }>} */ (
      chunkData[key] ?? []
    )
    for (const record of records) {
      pages.push(fromCompact(record))
    }
  }

  return pages
}

/**
 * @param {{ get: (keys?: string[] | null) => Promise<Record<string, unknown>>, set: (obj: Record<string, unknown>) => Promise<void>, remove: (keys: string[]) => Promise<void> }} adapter
 * @param {ScheduledPage[]} scheduled
 */
export async function writeScheduled(adapter, scheduled) {
  const compactRecords = scheduled.map(toCompact)
  const packed = packRecords(compactRecords)
  const newChunkKeys = packed.map((_, index) => chunkKey(index))

  const writes = {}
  for (let index = 0; index < packed.length; index++) {
    writes[newChunkKeys[index]] = packed[index]
  }
  writes[META_KEY] = { v: SCHEMA_VERSION, chunks: newChunkKeys }

  const all = await adapter.get(null)
  const orphanKeys = Object.keys(all).filter(key => isV3Key(key) && !(key in writes))

  await adapter.set(writes)
  if (orphanKeys.length > 0) {
    await adapter.remove(orphanKeys)
  }
}

export function createChromeSyncAdapter() {
  return {
    get(keys) {
      return new Promise((resolve, reject) => {
        chrome.storage.sync.get(keys, result => {
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
        chrome.storage.sync.set(obj, () => {
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
        chrome.storage.sync.remove(keys, () => {
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

export function createMemorySyncAdapter(store = {}) {
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
