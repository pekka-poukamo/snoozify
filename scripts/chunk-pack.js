/** Greedy byte-size packing for chrome.storage per-item limits (~8 KB). */
export const MAX_CHUNK_BYTES = 7000

const byteLength = value => new TextEncoder().encode(JSON.stringify(value)).length

/**
 * Pack records into chunks where each chunk's JSON serialization is ≤ maxBytes.
 * @template T
 * @param {T[]} records
 * @param {number} [maxBytes]
 * @returns {T[][]}
 */
export function packRecords(records, maxBytes = MAX_CHUNK_BYTES) {
  if (records.length === 0) {
    return [[]]
  }

  const chunks = []
  let current = []

  for (const record of records) {
    const candidate = [...current, record]
    if (current.length > 0 && byteLength(candidate) > maxBytes) {
      chunks.push(current)
      current = [record]
    } else {
      current = candidate
    }
  }

  if (current.length > 0) {
    chunks.push(current)
  }

  for (const chunk of chunks) {
    if (byteLength(chunk) > maxBytes) {
      throw new Error('Record exceeds maximum chunk byte size')
    }
  }

  return chunks
}

export { byteLength }
