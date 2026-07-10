import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createSnoozeStore } from '/scripts/snooze-store.js'
import {
  createMemorySyncAdapter,
  META_KEY,
  CHUNK_PREFIX,
} from '/scripts/sync-projection.js'
import {
  createMemoryLedgerAdapter,
  LEDGER_META_KEY,
} from '/scripts/local-ledger.js'

describe('SnoozeStore', () => {
  /** @type {ReturnType<typeof createSnoozeStore>} */
  let store
  let syncStore
  let ledgerStore

  beforeEach(() => {
    syncStore = {}
    ledgerStore = {}
    store = createSnoozeStore({
      syncAdapter: createMemorySyncAdapter(syncStore),
      ledgerAdapter: createMemoryLedgerAdapter(ledgerStore),
      useChromeListeners: false,
    })
  })

  it('scheduleSnoozes persists v3 chunked projection', async () => {
    await store.scheduleSnoozes(
      [{ title: 'A', url: 'https://a' }],
      '2023-01-01'
    )

    expect(syncStore[META_KEY]).toMatchObject({ v: 3, chunks: [`${CHUNK_PREFIX}0`] })
    expect(syncStore[`${CHUNK_PREFIX}0`]).toEqual([
      { i: expect.any(String), t: 'A', u: 'https://a', w: '2023-01-01' },
    ])
  })

  it('getScheduled returns scheduled pages', async () => {
    const created = await store.scheduleSnoozes(
      [{ title: 'A', url: 'https://a' }],
      '2023-01-01'
    )
    const scheduled = await store.getScheduled()
    expect(scheduled).toEqual(created)
  })

  it('getScheduledCountForWakeDay counts by calendar day', async () => {
    await store.scheduleSnoozes([{ title: 'A', url: 'https://a' }], '2023-01-01T12:00:00Z')
    await store.scheduleSnoozes([{ title: 'B', url: 'https://b' }], '2023-01-01T23:00:00Z')
    await store.scheduleSnoozes([{ title: 'C', url: 'https://c' }], '2023-01-02')

    expect(await store.getScheduledCountForWakeDay('2023-01-01')).toBe(2)
    expect(await store.getScheduledCountForWakeDay('2023-01-02')).toBe(1)
  })

  it('wakeSnoozes removes from projection and appends ledger event', async () => {
    const [page] = await store.scheduleSnoozes(
      [{ title: 'A', url: 'https://a' }],
      '2023-01-01'
    )

    const woken = await store.wakeSnoozes([page.id], 'manual')
    expect(woken).toEqual([{ id: page.id, title: 'A', url: 'https://a' }])
    expect(await store.getScheduled()).toEqual([])
    expect(ledgerStore[LEDGER_META_KEY]).toMatchObject({ count: 1 })
    expect(Object.values(ledgerStore).find(v => Array.isArray(v))?.[0]).toMatchObject({
      type: 'Woken',
      reason: 'manual',
      pages: [{ id: page.id, title: 'A', url: 'https://a' }],
    })
  })

  it('importSnoozes merges and regenerates id on collision', async () => {
    await store.scheduleSnoozes([{ title: 'Existing', url: 'https://e' }], '2023-01-01')
    const existing = await store.getScheduled()

    await store.importSnoozes([
      { title: 'Imported', url: 'https://i', uid: existing[0].id, wakeUpDate: '2023-01-02' },
    ])

    const scheduled = await store.getScheduled()
    expect(scheduled).toHaveLength(2)
    const imported = scheduled.find(page => page.title === 'Imported')
    expect(imported.id).not.toBe(existing[0].id)
    expect(imported.wakeAt).toBe('2023-01-02')
  })

  it('exportScheduled returns legacy shape', async () => {
    const [page] = await store.scheduleSnoozes(
      [{ title: 'A', url: 'https://a' }],
      '2023-01-01'
    )
    const exported = await store.exportScheduled()
    expect(exported).toEqual([
      { title: 'A', url: 'https://a', uid: page.id, wakeUpDate: '2023-01-01' },
    ])
  })

  it('clearAll empties scheduled projection', async () => {
    await store.scheduleSnoozes([{ title: 'A', url: 'https://a' }], '2023-01-01')
    await store.clearAll()
    expect(await store.getScheduled()).toEqual([])
    expect(syncStore[META_KEY].chunks).toEqual([`${CHUNK_PREFIX}0`])
    expect(syncStore[`${CHUNK_PREFIX}0`]).toEqual([])
  })

  it('getHistory returns newest events first', async () => {
    const [a] = await store.scheduleSnoozes([{ title: 'A', url: 'https://a' }], '2023-01-01')
    const [b] = await store.scheduleSnoozes([{ title: 'B', url: 'https://b' }], '2023-01-02')
    await store.wakeSnoozes([a.id], 'manual')
    await store.wakeSnoozes([b.id], 'scheduled')

    const history = await store.getHistory()
    expect(history).toHaveLength(2)
    expect(history[0].pages[0].title).toBe('B')
    expect(history[1].pages[0].title).toBe('A')
  })

  it('serializes concurrent commits (RC1)', async () => {
    const [due] = await store.scheduleSnoozes(
      [{ title: 'Due', url: 'https://due' }],
      '2023-01-01'
    )

    let capturedScheduled = null
    const sync = createMemorySyncAdapter(syncStore)
    const originalSet = sync.set.bind(sync)
    sync.set = vi.fn(async (obj) => {
      if (obj[`${CHUNK_PREFIX}0`]) {
        capturedScheduled = { obj, resume: () => originalSet(obj) }
        return
      }
      return originalSet(obj)
    })

    const racingStore = createSnoozeStore({
      syncAdapter: sync,
      ledgerAdapter: createMemoryLedgerAdapter(ledgerStore),
      useChromeListeners: false,
    })
    await racingStore.scheduleSnoozes([{ title: 'Due', url: 'https://due' }], '2023-01-01')

    const removeDone = racingStore.wakeSnoozes([due.id], 'scheduled')
    await new Promise(r => setTimeout(r, 0))

    const scheduleDone = racingStore.scheduleSnoozes(
      [{ title: 'New', url: 'https://new' }],
      '2023-02-01'
    )
    await new Promise(r => setTimeout(r, 0))

    await capturedScheduled.resume()
    await removeDone
    await scheduleDone

    const pages = await racingStore.getScheduled()
    expect(pages.find(p => p.title === 'New')).toBeTruthy()
    expect(pages.find(p => p.id === due.id)).toBeUndefined()
  })

  it('removes orphan chunk keys on write (RC3)', async () => {
    await store.scheduleSnoozes([{ title: 'A', url: 'https://a' }], '2023-01-01')
    syncStore[`${CHUNK_PREFIX}1`] = [{ i: 'orphan', t: 'Orphan', u: 'https://o', w: '2023-01-01' }]

    const [page] = await store.getScheduled()
    await store.wakeSnoozes([page.id], 'scheduled')

    expect(syncStore[`${CHUNK_PREFIX}1`]).toBeUndefined()
    expect(syncStore[META_KEY].chunks).toEqual([`${CHUNK_PREFIX}0`])
  })

  it('getHistory respects limit', async () => {
    const pages = await Promise.all([
      store.scheduleSnoozes([{ title: 'A', url: 'https://a' }], '2023-01-01'),
      store.scheduleSnoozes([{ title: 'B', url: 'https://b' }], '2023-01-02'),
      store.scheduleSnoozes([{ title: 'C', url: 'https://c' }], '2023-01-03'),
    ])
    for (const batch of pages) {
      await store.wakeSnoozes([batch[0].id], 'manual')
    }

    const limited = await store.getHistory({ limit: 2 })
    expect(limited).toHaveLength(2)
    expect(limited[0].pages[0].title).toBe('C')
    expect(limited[1].pages[0].title).toBe('B')
  })

  it('onChanged fires after wake', async () => {
    const listener = vi.fn()
    store.onChanged(listener)
    const [page] = await store.scheduleSnoozes([{ title: 'A', url: 'https://a' }], '2023-01-01')
    listener.mockClear()
    await store.wakeSnoozes([page.id], 'scheduled')
    expect(listener).toHaveBeenCalled()
  })

  it('rehydrates from persisted sync and ledger stores', async () => {
    await store.scheduleSnoozes([{ title: 'A', url: 'https://a' }], '2023-01-01')
    const [page] = await store.getScheduled()
    await store.wakeSnoozes([page.id], 'manual')

    const reloaded = createSnoozeStore({
      syncAdapter: createMemorySyncAdapter(syncStore),
      ledgerAdapter: createMemoryLedgerAdapter(ledgerStore),
      useChromeListeners: false,
    })

    expect(await reloaded.getScheduled()).toEqual([])
    expect(await reloaded.getHistory()).toHaveLength(1)
  })

  it('onChanged fires after successful commit', async () => {
    const listener = vi.fn()
    store.onChanged(listener)
    await store.scheduleSnoozes([{ title: 'A', url: 'https://a' }], '2023-01-01')
    expect(listener).toHaveBeenCalled()
  })

  it('meta.count reflects retained events after ring buffer truncation', async () => {
    const { MAX_RETAINED_EVENTS } = await import('/scripts/local-ledger.js')
    for (let i = 0; i < MAX_RETAINED_EVENTS + 1; i++) {
      const [page] = await store.scheduleSnoozes(
        [{ title: `Page ${i}`, url: `https://example.com/${i}` }],
        '2023-01-01'
      )
      await store.wakeSnoozes([page.id], 'scheduled')
    }

    expect(ledgerStore[LEDGER_META_KEY].count).toBe(MAX_RETAINED_EVENTS)
    expect(await store.getHistory()).toHaveLength(MAX_RETAINED_EVENTS)
  })
})
