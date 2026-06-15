import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Storage from '/scripts/storage.js'

// ─────────────────────────────────────────────────────────────────────────────
// RC1: read-modify-write race condition
//
// snoozePages and removePagesByUIDs both do: read-all → modify-in-memory → write-all.
// The popup and service worker run in separate contexts and can interleave these
// operations. If removePagesByUIDs writes after snoozePages has already written,
// it overwrites the newly snoozed page with a stale snapshot.
// ─────────────────────────────────────────────────────────────────────────────
describe('RC1: concurrent snoozePages + removePagesByUIDs can silently lose a page', () => {
  beforeEach(() => {
    chrome.storage.sync._store = {}
    chrome.runtime.lastError = null
  })

  it('removePagesByUIDs writing a stale snapshot overwrites a concurrently snoozed page', async () => {
    await Storage.snoozePages([
      { title: 'Due', url: 'https://due', uid: 'due1', wakeUpDate: '2023-01-01' },
    ])

    // Pause removePagesByUIDs at its `set` so snoozePages can write first.
    // This simulates: removePagesByUIDs reads [due1], snoozePages runs and writes
    // [due1, new1], then removePagesByUIDs writes its stale snapshot [nothing].
    let capturedSet = null
    const setSpy = vi.spyOn(chrome.storage.sync, 'set')
      .mockImplementationOnce((obj, cb) => { capturedSet = { obj, cb } })

    const removeDone = Storage.removePagesByUIDs(['due1'])
    await new Promise(r => setTimeout(r, 0)) // flush microtasks until removePagesByUIDs reaches set

    // snoozePages runs after removePagesByUIDs has read but before it writes
    await Storage.snoozePages([
      { title: 'New', url: 'https://new', uid: 'new1', wakeUpDate: '2023-02-01' },
    ])

    // Release the stale removePagesByUIDs write — overwrites new1
    Object.assign(chrome.storage.sync._store, capturedSet.obj)
    capturedSet.cb()
    await removeDone
    setSpy.mockRestore()

    const pages = await Storage.getSnoozedPages()
    expect(pages.find(p => p.uid === 'new1')).toBeTruthy() // FAILS: new1 was lost
    expect(pages.find(p => p.uid === 'due1')).toBeUndefined()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// RC2: alarm recreated unconditionally on every service worker start
//
// worker.js calls chrome.alarms.create at the top level, which runs every time
// the service worker starts. chrome.alarms.create with an existing name replaces
// the alarm, resetting its countdown. If the service worker is restarted for any
// reason other than the alarm (extension update, browser startup), the alarm
// timer is reset and page delivery can be delayed.
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
  })

  afterEach(() => {
    delete chrome.alarms.get
  })

  it('worker.js checks alarm existence with get before calling create', async () => {
    await import('/scripts/worker.js')

    // BUG: create is called unconditionally, resetting the alarm timer even when
    // the alarm already exists. The fix should call get first and skip create.
    expect(chrome.alarms.get).toHaveBeenCalledWith('Snoozify scheduler', expect.any(Function)) // FAILS
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// RC3: non-atomic two-phase write leaves orphaned date keys
//
// removePagesByUIDs does two separate storage operations:
//   1. set(queryObject)  — updates snoozify_dates and remaining date keys
//   2. remove(keysToDelete) — deletes now-empty date keys
// If the service worker is terminated between these two steps, the set completes
// but the remove never runs, leaving orphaned date keys that waste sync storage
// quota. Quota exhaustion silently causes future snoozePages writes to fail.
// ─────────────────────────────────────────────────────────────────────────────
describe('RC3: removePagesByUIDs two-phase write leaves orphaned key on partial failure', () => {
  beforeEach(() => {
    chrome.storage.sync._store = {}
    chrome.runtime.lastError = null
  })

  it('orphaned date key persists when remove step is skipped (simulates SW termination)', async () => {
    await Storage.snoozePages([
      { title: 'Due', url: 'https://due', uid: 'due1', wakeUpDate: '2023-01-01' },
    ])

    // Simulate the service worker dying between set and remove: set runs normally,
    // but the remove callback never fires (the SW is gone).
    const removeSpy = vi.spyOn(chrome.storage.sync, 'remove')
      .mockImplementationOnce((_keys, cb) => { cb && cb() })

    await Storage.removePagesByUIDs(['due1'])
    removeSpy.mockRestore()

    // set ran correctly — snoozify_dates is now empty
    expect(chrome.storage.sync._store['snoozify_dates']).toEqual([])

    // BUG: the date key was never cleaned up and is now an orphan
    expect(chrome.storage.sync._store['snoozify_2023-01-01']).toBeUndefined() // FAILS
  })
})
