import { packRecords } from './chunk-pack.js'

/**
 * @typedef {import('./storage-adapter.js').StorageAdapter} StorageAdapter
 */

/**
 * @param {StorageAdapter} adapter
 * @param {{
 *   records: unknown[],
 *   chunkPrefix: string,
 *   metaKey: string,
 *   buildMeta: (chunkKeys: string[]) => Record<string, unknown>,
 *   isOwnedKey: (key: string) => boolean,
 *   maxBytes?: number,
 *   onBeforeWrite?: (storageOps: number) => void,
 * }} opts
 * @returns {Promise<number>} Number of storage operations performed (set + optional remove)
 */
export async function writeChunkedProjection(adapter, {
  records,
  chunkPrefix,
  metaKey,
  buildMeta,
  isOwnedKey,
  maxBytes,
  onBeforeWrite,
}) {
  const packed = packRecords(records, maxBytes)
  const newChunkKeys = packed.map((_, index) => `${chunkPrefix}${index}`)

  const writes = {}
  for (let index = 0; index < packed.length; index++) {
    writes[newChunkKeys[index]] = packed[index]
  }
  writes[metaKey] = buildMeta(newChunkKeys)

  const all = await adapter.get(null)
  const orphanKeys = Object.keys(all).filter(key => isOwnedKey(key) && !(key in writes))
  const storageOps = 1 + (orphanKeys.length > 0 ? 1 : 0)

  onBeforeWrite?.(storageOps)

  await adapter.set(writes)
  if (orphanKeys.length > 0) {
    await adapter.remove(orphanKeys)
  }

  return storageOps
}
