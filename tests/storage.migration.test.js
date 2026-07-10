import { describe, it, expect, beforeEach } from 'vitest'
import { createSnoozeStore } from '/scripts/snooze-store.js'
import {
  createMemorySyncAdapter,
  META_KEY,
  CHUNK_PREFIX,
} from '/scripts/sync-projection.js'
import { createMemoryLedgerAdapter } from '/scripts/local-ledger.js'

describe('storage migration v2 → v3', () => {
  let syncStore
  let store

  beforeEach(() => {
    syncStore = {
      snoozify_dates: ['2023-01-01', '2023-01-02'],
      'snoozify_2023-01-01': [
        { page_title: 'A', page_url: 'https://a', page_hash: 'id-a' },
      ],
      'snoozify_2023-01-02': [
        { page_title: 'B', page_url: 'https://b', page_hash: 'id-b' },
      ],
      snoozify_version: 2,
    }
    store = createSnoozeStore({
      syncAdapter: createMemorySyncAdapter(syncStore),
      ledgerAdapter: createMemoryLedgerAdapter({}),
      useChromeListeners: false,
    })
  })

  it('migrates legacy v2 keys to v3 projection', async () => {
    await store.migrate()

    expect(syncStore[META_KEY]).toMatchObject({ v: 3, chunks: [`${CHUNK_PREFIX}0`] })
    expect(syncStore[`${CHUNK_PREFIX}0`]).toEqual([
      { i: 'id-a', t: 'A', u: 'https://a', w: '2023-01-01' },
      { i: 'id-b', t: 'B', u: 'https://b', w: '2023-01-02' },
    ])
    expect(syncStore.snoozify_dates).toBeUndefined()
    expect(syncStore['snoozify_2023-01-01']).toBeUndefined()
    expect(syncStore.snoozify_version).toBeUndefined()
  })

  it('migrate is a no-op when v3 meta already exists', async () => {
    await store.migrate()
    const before = structuredClone(syncStore)

    await store.migrate()

    expect(syncStore).toEqual(before)
  })

  it('scheduled pages are readable after migration', async () => {
    await store.migrate()
    const scheduled = await store.getScheduled()
    expect(scheduled).toEqual([
      { id: 'id-a', title: 'A', url: 'https://a', wakeAt: '2023-01-01' },
      { id: 'id-b', title: 'B', url: 'https://b', wakeAt: '2023-01-02' },
    ])
  })

  it('migrates orphan v2 date keys not listed in snoozify_dates', async () => {
    syncStore = {
      snoozify_dates: [],
      'snoozify_2023-01-01': [
        { page_title: 'Orphan', page_url: 'https://orphan', page_hash: 'id-o' },
      ],
    }
    store = createSnoozeStore({
      syncAdapter: createMemorySyncAdapter(syncStore),
      ledgerAdapter: createMemoryLedgerAdapter({}),
      useChromeListeners: false,
    })

    await store.migrate()

    expect(await store.getScheduled()).toEqual([
      { id: 'id-o', title: 'Orphan', url: 'https://orphan', wakeAt: '2023-01-01' },
    ])
    expect(syncStore['snoozify_2023-01-01']).toBeUndefined()
  })
})
