import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('worker', () => {
  beforeEach(async () => {
    // reset event listeners
    chrome.alarms.onAlarm = {
      ...chrome.alarms.onAlarm,
      _listeners: new Set(),
      addListener(cb){ this._listeners.add(cb) },
      _emit(a){ this._listeners.forEach(cb=>cb(a)) },
    }
    chrome.alarms.get = vi.fn((_name, cb) => cb(null))
    chrome.notifications.create.mockClear()
    chrome.tabs.create.mockClear()
    chrome.storage.sync._store = {}
    chrome.storage.local._store = {}
  })

  it('on alarm opens due pages once and posts notification', async () => {
    chrome.storage.sync._store = {
      snoozify_v3_meta: { v: 3, chunks: ['snoozify_v3_c0'] },
      snoozify_v3_c0: [
        { i: 'due', t: 'Due', u: 'https://due', w: '2023-01-01' },
        { i: 'f', t: 'Future', u: 'https://future', w: '2099-01-01' },
      ],
    }
    chrome.storage.local._store = {}
    vi.resetModules()
    await import('/scripts/worker.js')

    // Emit alarm
    chrome.alarms.onAlarm._emit({ name: 'Snoozify scheduler' })

    // Let microtasks flush
    await new Promise(r => setTimeout(r, 0))

    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://due' })
    expect(chrome.notifications.create).toHaveBeenCalled()
  })
})

