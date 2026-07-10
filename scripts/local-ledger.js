import { MAX_CHUNK_BYTES } from './chunk-pack.js'
import { writeChunkedProjection } from './chunked-write.js'
import {
  createChromeStorageAdapter,
  createMemoryStorageAdapter,
} from './storage-adapter.js'

export const LEDGER_META_KEY = 'snoozify_ledger_meta'
export const LEDGER_CHUNK_PREFIX = 'snoozify_ledger_'
export const MAX_RETAINED_EVENTS = 500

/** @typedef {'scheduled' | 'manual'} WakeReason */
/** @typedef {{ seq: number, at: string, type: 'Woken', reason: WakeReason, pages: Array<{ id: string, title: string, url: string }> }} LedgerEvent */
/** @typedef {import('./storage-adapter.js').StorageAdapter} StorageAdapter */

const chunkKey = index => `${LEDGER_CHUNK_PREFIX}${index}`

const isLedgerChunkKey = key =>
  key.startsWith(LEDGER_CHUNK_PREFIX) && key !== LEDGER_META_KEY

const isLedgerKey = key =>
  key === LEDGER_META_KEY || isLedgerChunkKey(key)

/**
 * @param {StorageAdapter} adapter
 * @returns {Promise<{ events: LedgerEvent[], meta: { head: string, count: number, nextSeq: number } | null }>}
 */
async function readLedgerState(adapter) {
  const all = await adapter.get(null)
  const meta = /** @type {{ head?: string, count?: number, nextSeq?: number } | undefined} */ (
    all[LEDGER_META_KEY]
  )

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

  return {
    events,
    meta: {
      head: meta.head,
      count: meta.count,
      nextSeq: meta.nextSeq ?? Math.max(0, ...events.map(event => event.seq ?? 0)),
    },
  }
}

/**
 * @param {StorageAdapter} adapter
 * @returns {Promise<number>}
 */
export async function getNextSeq(adapter) {
  const { events, meta } = await readLedgerState(adapter)
  if (meta?.nextSeq != null) {
    return meta.nextSeq + 1
  }
  if (events.length === 0) {
    return 1
  }
  return Math.max(...events.map(event => event.seq ?? 0)) + 1
}

/**
 * @param {StorageAdapter} adapter
 * @param {LedgerEvent} event
 */
export async function appendEvent(adapter, event) {
  const { events, meta } = await readLedgerState(adapter)
  const nextEvents = [...events, event]
  const retained = nextEvents.length > MAX_RETAINED_EVENTS
    ? nextEvents.slice(nextEvents.length - MAX_RETAINED_EVENTS)
    : nextEvents

  const nextSeq = (meta?.nextSeq ?? events.length) + 1

  await writeChunkedProjection(adapter, {
    records: retained,
    chunkPrefix: LEDGER_CHUNK_PREFIX,
    metaKey: LEDGER_META_KEY,
    maxBytes: MAX_CHUNK_BYTES,
    buildMeta: newChunkKeys => ({
      head: newChunkKeys[newChunkKeys.length - 1] ?? chunkKey(0),
      count: retained.length,
      nextSeq,
    }),
    isOwnedKey: isLedgerKey,
  })
}

/**
 * @param {StorageAdapter} adapter
 * @param {{ limit?: number }} [options]
 * @returns {Promise<LedgerEvent[]>}
 */
export async function readHistory(adapter, { limit } = {}) {
  const { events } = await readLedgerState(adapter)
  const newestFirst = [...events].reverse()
  return typeof limit === 'number' ? newestFirst.slice(0, limit) : newestFirst
}

export function createChromeLedgerAdapter() {
  return createChromeStorageAdapter('local')
}

export function createMemoryLedgerAdapter(store = {}) {
  return createMemoryStorageAdapter(store)
}
