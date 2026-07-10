import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createSnoozeStore } from '/scripts/snooze-store.js'
import { createMemorySyncAdapter } from '/scripts/sync-projection.js'
import { createMemoryLedgerAdapter } from '/scripts/local-ledger.js'

// ─────────────────────────────────────────────────────────────────────────────
// RC1: read-modify-write race condition
//
// Concurrent scheduleSnoozes + wakeSnoozes must serialize through the commit
// queue so a stale wake cannot overwrite a newer schedule.
// ─────────────────────────────────────────────────────────────────────────────
describe('RC1: concurrent scheduleSnoozes + wakeSnoozes can silently lose a page', () => {
  let store
  let syncStore

  beforeEach(() => {
    syncStore = {}
    store = createSnoozeStore({
      syncAdapter: createMemorySyncAdapter(syncStore),
      ledgerAdapter: createMemoryLedgerAdapter({}),
      useChromeListeners: false,
    })
  })

  it('wakeSnoozes writing a stale snapshot does not overwrite a concurrently scheduled page', async () => {
    const [due] = await store.scheduleSnoozes(
      [{ title: 'Due', url: 'https://due' }],
      '2023-01-01'
    )

    const sync = createMemorySyncAdapter(syncStore)
    const originalSet = sync.set.bind(sync)
    sync.set = vi.fn(async (obj) => {
      if (obj.snoozify_v3_c0) {
        await new Promise(r => setTimeout(r, 0))
      }
      return originalSet(obj)
    })

    const racingStore = createSnoozeStore({
      syncAdapter: sync,
      ledgerAdapter: createMemoryLedgerAdapter({}),
      useChromeListeners: false,
    })
    await racingStore.scheduleSnoozes([{ title: 'Due', url: 'https://due' }], '2023-01-01')

    const removeDone = racingStore.wakeSnoozes([due.id], 'scheduled')
    await new Promise(r => setTimeout(r, 0))

    const scheduleDone = racingStore.scheduleSnoozes(
      [{ title: 'New', url: 'https://new' }],
      '2023-02-01'
    )

    await Promise.all([removeDone, scheduleDone])

    const pages = await racingStore.exportScheduled()
    expect(pages.find(p => p.title === 'New')).toBeTruthy()
    expect(pages.find(p => p.uid === due.id)).toBeUndefined()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// RC2: alarm recreated unconditionally on every service worker start
// ─────────────────────────────────────────────────────────────────────────────
describe('RC2: alarm recreated unconditionally on every service worker start', () => {
  beforeEach(() => {
    vi.resetModules()
    chrome.alarms.create.mockClear()
    chrome.alarms.get = vi.fn((_name, cb) => cb({ name: 'Snoozify scheduler', scheduledTime: Date.now() + 30_000 }))
    chrome.alarms.onAlarm = {
      _listeners: new Set(),
      addListener(cb) { this._listeners.add(cb) },
      _emit(a) { this._listeners.forEach(cb => cb(a)) },
    }
    chrome.runtime.onInstalled = {
      _listeners: new Set(),
      addListener(cb) { this._listeners.add(cb) },
    }
  })

  afterEach(() => {
    delete chrome.alarms.get
    delete chrome.runtime.onInstalled
  })

  it('worker.js checks alarm existence with get before calling create', async () => {
    await import('/scripts/worker.js')

    expect(chrome.alarms.get).toHaveBeenCalledWith('Snoozify scheduler', expect.any(Function))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// RC3: non-atomic two-phase write leaves orphaned date keys
// ─────────────────────────────────────────────────────────────────────────────
describe('RC3: projection rebuild removes orphaned chunk keys atomically', () => {
  let store
  let syncStore

  beforeEach(() => {
    syncStore = {}
    store = createSnoozeStore({
      syncAdapter: createMemorySyncAdapter(syncStore),
      ledgerAdapter: createMemoryLedgerAdapter({}),
      useChromeListeners: false,
    })
  })

  it('orphaned chunk key is removed when last page is woken', async () => {
    const [page] = await store.scheduleSnoozes(
      [{ title: 'Due', url: 'https://due' }],
      '2023-01-01'
    )
    syncStore.snoozify_v3_c1 = [{ i: 'orphan', t: 'Orphan', u: 'https://o', w: '2023-01-01' }]

    await store.wakeSnoozes([page.id], 'scheduled')

    expect(syncStore.snoozify_v3_c1).toBeUndefined()
    expect(syncStore.snoozify_v3_meta.chunks).toEqual(['snoozify_v3_c0'])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// RC4: due pages can wake twice after SW crash
// ─────────────────────────────────────────────────────────────────────────────
describe('RC4: store-before-tabs prevents duplicate alarm wake after crash', () => {
  beforeEach(() => {
    chrome.storage.sync._store = {}
    chrome.storage.local._store = {}
    chrome.tabs.create.mockClear()
    chrome.runtime.lastError = null
  })

  it('openPagesDueBy removes pages from storage before opening tabs', async () => {
    const Snoozer = await import('/scripts/snoozer.js')
    const SnoozeStore = (await import('/scripts/snooze-store.js')).default

    await SnoozeStore.importSnoozes([
      { title: 'Due', url: 'https://due', uid: 'due1', wakeUpDate: '2023-01-01' },
    ])

    let storageEmptyBeforeTabs = false
    chrome.tabs.create.mockImplementationOnce(async () => {
      const scheduled = await SnoozeStore.exportScheduled()
      storageEmptyBeforeTabs = scheduled.length === 0
    })

    await Snoozer.openPagesDueBy(Date.parse('2090-01-01'))

    expect(storageEmptyBeforeTabs).toBe(true)
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://due' })
  })
})
