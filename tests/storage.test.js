import { describe, it, expect, beforeEach, vi } from 'vitest'
import Storage from '/scripts/storage.js'
vi.mock('/scripts/testing.js', () => ({ testing: true }))

describe('storage', () => {
  beforeEach(() => {
    chrome.storage.sync._store = {}
    chrome.runtime.lastError = null
  })

  it('snoozePages groups by ISO date with expected key shape', async () => {
    const pages = [
      { title: 'A', url: 'https://a', uid: '1', wakeUpDate: '2023-01-01' },
      { title: 'B', url: 'https://b', uid: '2', wakeUpDate: '2023-01-01' },
      { title: 'C', url: 'https://c', uid: '3', wakeUpDate: '2023-01-02' },
    ]
    await Storage.snoozePages(pages)
    expect(chrome.storage.sync._store).toMatchObject({
      snoozify_dates_testing: ['2023-01-01', '2023-01-02'],
      // key names include the prefix and date
      'snoozify__testing2023-01-01': [
        { page_title: 'A', page_url: 'https://a', page_hash: '1' },
        { page_title: 'B', page_url: 'https://b', page_hash: '2' },
      ],
      'snoozify__testing2023-01-02': [
        { page_title: 'C', page_url: 'https://c', page_hash: '3' },
      ],
    })
  })

  it('getSnoozedPages returns normalized shape', async () => {
    // Preload storage
    chrome.storage.sync._store = {
      snoozify_dates_testing: ['2023-01-01'],
      'snoozify__testing2023-01-01': [
        { page_title: 'A', page_url: 'https://a', page_hash: 'x1' },
        { page_title: 'B', page_url: 'https://b', page_hash: 'x2' },
      ],
    }
    const pages = await Storage.getSnoozedPages()
    expect(pages).toEqual([
      { title: 'A', url: 'https://a', uid: 'x1', wakeUpDate: '2023-01-01' },
      { title: 'B', url: 'https://b', uid: 'x2', wakeUpDate: '2023-01-01' },
    ])
  })

  it('removePagesByUIDs removes and cleans empty date keys', async () => {
    chrome.storage.sync._store = {
      snoozify_dates_testing: ['2023-01-01'],
      'snoozify__testing2023-01-01': [
        { page_title: 'A', page_url: 'https://a', page_hash: 'x1' },
      ],
    }
    await Storage.removePagesByUIDs(['x1'])
    expect(chrome.storage.sync._store['snoozify__testing2023-01-01']).toBeUndefined()
  })
})

