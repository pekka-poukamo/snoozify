import { describe, it, expect } from 'vitest'
import { packRecords, byteLength, MAX_CHUNK_BYTES } from '/scripts/chunk-pack.js'

describe('chunk-pack', () => {
  it('returns a single empty chunk for no records', () => {
    expect(packRecords([])).toEqual([[]])
  })

  it('packs small records into one chunk', () => {
    const records = [
      { i: 'a', t: 'Title A', u: 'https://a', w: '2023-01-01' },
      { i: 'b', t: 'Title B', u: 'https://b', w: '2023-01-02' },
    ]
    expect(packRecords(records)).toEqual([records])
  })

  it('splits records when chunk would exceed max bytes', () => {
    const bigUrl = 'https://example.com/' + 'x'.repeat(6000)
    const records = [
      { i: '1', t: 'One', u: bigUrl, w: '2023-01-01' },
      { i: '2', t: 'Two', u: bigUrl, w: '2023-01-02' },
    ]
    const chunks = packRecords(records, MAX_CHUNK_BYTES)
    expect(chunks).toHaveLength(2)
    expect(chunks[0]).toHaveLength(1)
    expect(chunks[1]).toHaveLength(1)
    expect(byteLength(chunks[0])).toBeLessThanOrEqual(MAX_CHUNK_BYTES)
    expect(byteLength(chunks[1])).toBeLessThanOrEqual(MAX_CHUNK_BYTES)
  })

  it('throws when a single record exceeds max chunk bytes', () => {
    const oversized = { i: '1', t: 'Big', u: 'https://example.com/' + 'x'.repeat(8000), w: '2023-01-01' }
    expect(() => packRecords([oversized], MAX_CHUNK_BYTES)).toThrow(/maximum chunk byte size/)
  })
})
