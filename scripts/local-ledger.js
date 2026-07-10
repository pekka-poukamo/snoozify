import { packRecords, MAX_CHUNK_BYTES } from './chunk-pack.js'

export const LEDGER_META_KEY = 'snoozify_ledger_meta'
export const LEDGER_CHUNK_PREFIX = 'snoozify_ledger_'
export const MAX_RETAINED_EVENTS = 500

/** @typedef {'scheduled' | 'manual'} WakeReason */
/** @typedef {{ seq: number, at: string, type: 'Woken', reason: WakeReason, pages: Array<{ id: string, title: string, url: string }> }} LedgerEvent */

const chunkKey = index => `${LEDGER_CHUNK_PREFIX}${index}`

const isLedgerChunkKey = key =>
  key.startsWith(LEDGER_CHUNK_PREFIX) && key !== LEDGER_META_KEY

const isLedgerKey = key =>
  key === LEDGER_META_KEY || isLedgerChunkKey(key)

/**
 * @param {{ get: (keys?: string[] | null) => Promise<Record<string, unknown>>, set: (obj: Record<string, unknown>) => Promise<void>, remove: (keys: string[]) => Promise<void> }} adapter
 * @returns {Promise<{ events: LedgerEvent[], meta: { head: string, count: number } | null }>}
 */
async function readLedgerState(adapter) {
  const all = await adapter.get(null)
  const meta = /** @type {{ head?: string, count?: number } | undefined} */ (all[LEDGER_META_KEY])

  if (!meta || typeof meta.head !== 'string' || typeof meta.count !== 'number') {
    return { events: [], meta: null }
  }

  const ledgerKeys = Object.keys(all)
    .filter(isLedgerChunkKey)
    .sort((a, b) => {
      const ai = Number(a.slice(LEDGER_CHUNK_PREFIX.length))
      const bi = Number(b.slice(LEDGER_CHUNK_PREFIX.length))
      return ai - bi
    })

  const chunkData = await adapter.get(ledgerKeys)
  const events = []

  for (const key of ledgerKeys) {
    const chunkEvents = /** @type {LedgerEvent[]} */ (chunkData[key] ?? [])
    events.push(...chunkEvents)
  }

  return { events, meta: { head: meta.head, count: meta.count } }
}

/**
 * @param {{ get: (keys?: string[] | null) => Promise<Record<string, unknown>>, set: (obj: Record<string, unknown>) => Promise<void>, remove: (keys: string[]) => Promise<void> }} adapter
 * @param {LedgerEvent} event
 */
export async function appendEvent(adapter, event) {
  const { events, meta } = await readLedgerState(adapter)
  const nextEvents = [...events, event]
  const retained = nextEvents.length > MAX_RETAINED_EVENTS
    ? nextEvents.slice(nextEvents.length - MAX_RETAINED_EVENTS)
    : nextEvents

  const packed = packRecords(retained, MAX_CHUNK_BYTES)
  const newChunkKeys = packed.map((_, index) => chunkKey(index))
  const writes = {}

  for (let index = 0; index < packed.length; index++) {
    writes[newChunkKeys[index]] = packed[index]
  }

  const head = newChunkKeys[newChunkKeys.length - 1] ?? chunkKey(0)
  writes[LEDGER_META_KEY] = {
    head,
    count: retained.length,
    nextSeq: event.seq + 1,
  }

  const all = await adapter.get(null)
  const orphanKeys = Object.keys(all).filter(key => isLedgerKey(key) && !(key in writes))

  await adapter.set(writes)
  if (orphanKeys.length > 0) {
    await adapter.remove(orphanKeys)
  }
}

/**
 * @param {{ get: (keys?: string[] | null) => Promise<Record<string, unknown>>, set: (obj: Record<string, unknown>) => Promise<void>, remove: (keys: string[]) => Promise<void> }} adapter
 * @param {{ limit?: number }} [options]
 * @returns {Promise<LedgerEvent[]>}
 */
export async function readHistory(adapter, { limit } = {}) {
  const { events } = await readLedgerState(adapter)
  const newestFirst = [...events].reverse()
  return typeof limit === 'number' ? newestFirst.slice(0, limit) : newestFirst
}

/**
 * @param {{ get: (keys?: string[] | null) => Promise<Record<string, unknown>>, set: (obj: Record<string, unknown>) => Promise<void>, remove: (keys: string[]) => Promise<void> }} adapter
 * @returns {Promise<number>}
 */
export async function getNextSeq(adapter) {
  const all = await adapter.get([LEDGER_META_KEY])
  const meta = /** @type {{ nextSeq?: number } | undefined} */ (all[LEDGER_META_KEY])
  if (meta && typeof meta.nextSeq === 'number') {
    return meta.nextSeq
  }
  const { events } = await readLedgerState(adapter)
  const maxSeq = events.reduce((max, event) => Math.max(max, event.seq ?? 0), 0)
  return maxSeq + 1
}

export function createChromeLedgerAdapter() {
  return {
    get(keys) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.get(keys, result => {
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
        chrome.storage.local.set(obj, () => {
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
        chrome.storage.local.remove(keys, () => {
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

export function createMemoryLedgerAdapter(store = {}) {
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
