import { describe, it, expect, beforeEach, vi } from 'vitest'
vi.mock('/scripts/testing.js', () => ({ testing: true }))
import Storage from '/scripts/storage.js'
import * as Utils from '/scripts/utils.js'

describe('storage extra', () => {
  beforeEach(() => {
    chrome.storage.sync._store = {}
    chrome.runtime.lastError = null
  })

  it('getSnoozedPageCount counts by calendar day (ignores time)', async () => {
    chrome.storage.sync._store = {
      snoozify_dates_testing: ['2023-01-01', '2023-01-02'],
      'snoozify__testing2023-01-01': [
        { page_title: 'A', page_url: 'https://a', page_hash: '1' },
      ],
      'snoozify__testing2023-01-02': [
        { page_title: 'B', page_url: 'https://b', page_hash: '2' },
        { page_title: 'C', page_url: 'https://c', page_hash: '3' },
      ],
    }
    await expect(Storage.getSnoozedPageCount('2023-01-02T15:45:00Z')).resolves.toBe(2)
  })

  it('importSnoozifiedPages merges and stores pages grouped by date; resolves when done', async () => {
    const spyUID = vi.spyOn(Utils, 'getUID').mockReturnValue('new-uid')
    chrome.storage.sync._store = {
      snoozify_dates_testing: ['2023-01-01'],
      'snoozify__testing2023-01-01': [
        { page_title: 'A', page_url: 'https://a', page_hash: 'dupe' },
      ],
    }
    const payload = [
      { title: 'B', url: 'https://b', uid: 'dupe', wakeUpDate: '2023-01-01' },
      { title: 'C', url: 'https://c', uid: 'x3', wakeUpDate: '2023-01-02' },
    ]
    await expect(Storage.importSnoozifiedPages(payload)).resolves.toBeUndefined()
    expect(chrome.storage.sync._store['snoozify__testing2023-01-01'].length).toBe(2)
    expect(chrome.storage.sync._store['snoozify__testing2023-01-02'].length).toBe(1)
    spyUID.mockRestore()
  })

  it('clearSnoozedPages removes all related keys', async () => {
    chrome.storage.sync._store = {
      snoozify_dates_testing: ['2023-01-01'],
      'snoozify__testing2023-01-01': [
        { page_title: 'A', page_url: 'https://a', page_hash: '1' },
      ],
      unrelated: 'keep',
    }
    await Storage.clearSnoozedPages()
    expect(Object.keys(chrome.storage.sync._store)).toEqual(['unrelated'])
  })

  it('calculateStorageSize and logSyncStorage call chrome APIs without throwing', () => {
    Storage.calculateStorageSize()
    Storage.logSyncStorage()
  })
})

