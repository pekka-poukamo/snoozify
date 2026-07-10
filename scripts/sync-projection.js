import { writeChunkedProjection } from './chunked-write.js'
import {
  createChromeStorageAdapter,
  createMemoryStorageAdapter,
} from './storage-adapter.js'
import { toWakeDay } from './utils.js'

export const META_KEY = 'snoozify_v3_meta'
export const CHUNK_PREFIX = 'snoozify_v3_c'
const SCHEMA_VERSION = 3

const SNOOZIFY_DATES_KEY = 'snoozify_dates'
const SNOOZIFY_DATE_PREFIX = 'snoozify_'
const LEGACY_VERSION_KEY = 'snoozify_version'

/** @typedef {{ id: string, title: string, url: string, wakeAt: string }} ScheduledPage */
/** @typedef {import('./storage-adapter.js').StorageAdapter} StorageAdapter */

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
 * @param {StorageAdapter} adapter
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
 * @param {StorageAdapter} adapter
 * @param {ScheduledPage[]} scheduled
 */
export async function writeScheduled(adapter, scheduled) {
  const compactRecords = scheduled.map(toCompact)

  await writeChunkedProjection(adapter, {
    records: compactRecords,
    chunkPrefix: CHUNK_PREFIX,
    metaKey: META_KEY,
    buildMeta: newChunkKeys => ({ v: SCHEMA_VERSION, chunks: newChunkKeys }),
    isOwnedKey: isV3Key,
  })
}

const isLegacyV2Key = key => {
  if (key === META_KEY || key.startsWith(CHUNK_PREFIX)) {
    return false
  }
  if (key === LEGACY_VERSION_KEY || key === SNOOZIFY_DATES_KEY) {
    return true
  }
  if (!key.startsWith(SNOOZIFY_DATE_PREFIX)) {
    return false
  }
  return !key.startsWith('snoozify_v3_')
}

/**
 * @param {StorageAdapter} adapter
 * @returns {Promise<ScheduledPage[] | null>} null when v3 meta already exists
 */
export async function readLegacyV2Scheduled(adapter) {
  const all = await adapter.get(null)
  const meta = /** @type {{ v?: number } | undefined} */ (all[META_KEY])
  if (meta?.v === SCHEMA_VERSION) {
    return null
  }

  const indexedDates = /** @type {string[]} */ (all[SNOOZIFY_DATES_KEY] ?? [])
  const keyDates = Object.keys(all)
    .filter(key => /^snoozify_\d{4}-\d{2}-\d{2}$/.test(key))
    .map(key => key.slice(SNOOZIFY_DATE_PREFIX.length))

  const dates = [...new Set([...indexedDates, ...keyDates])]
  const pages = []

  for (const date of dates) {
    const key = SNOOZIFY_DATE_PREFIX + date
    const records = /** @type {Array<{ page_title: string, page_url: string, page_hash: string }>} */ (
      all[key] ?? []
    )
    for (const record of records) {
      pages.push({
        id: record.page_hash,
        title: record.page_title,
        url: record.page_url,
        wakeAt: date,
      })
    }
  }

  return pages
}

/**
 * @param {StorageAdapter} adapter
 */
export async function removeLegacyV2Keys(adapter) {
  const all = await adapter.get(null)
  const legacyKeys = Object.keys(all).filter(isLegacyV2Key)
  if (legacyKeys.length > 0) {
    await adapter.remove(legacyKeys)
  }
}

export function createChromeSyncAdapter() {
  return createChromeStorageAdapter('sync')
}

export function createMemorySyncAdapter(store = {}) {
  return createMemoryStorageAdapter(store)
}
