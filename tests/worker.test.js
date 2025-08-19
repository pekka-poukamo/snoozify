import { describe, it, expect, beforeEach, vi } from 'vitest'
vi.mock('/scripts/testing.js', () => ({ testing: true }))

describe('worker', () => {
  beforeEach(async () => {
    // reset event listeners
    chrome.alarms.onAlarm = {
      ...chrome.alarms.onAlarm,
      _listeners: new Set(),
      addListener(cb){ this._listeners.add(cb) },
      _emit(a){ this._listeners.forEach(cb=>cb(a)) },
    }
    chrome.notifications.create.mockClear()
    chrome.tabs.create.mockClear()
    chrome.storage.sync._store = {}
  })

  it('on alarm opens due pages once and posts notification', async () => {
    await import('/scripts/worker.js')
    // Seed storage with one due page and one future
    chrome.storage.sync._store = {
      snoozify_dates_testing: ['2023-01-01', '2099-01-01'],
      'snoozify__testing2023-01-01': [
        { page_title: 'Due', page_url: 'https://due', page_hash: 'due' },
      ],
      'snoozify__testing2099-01-01': [
        { page_title: 'Future', page_url: 'https://future', page_hash: 'f' },
      ],
    }

    // Emit alarm
    chrome.alarms.onAlarm._emit({ name: 'Snoozify scheduler' })

    // Let microtasks flush
    await new Promise(r => setTimeout(r, 0))

    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://due' })
    expect(chrome.notifications.create).toHaveBeenCalled()
  })
})

