import { describe, it, expect, beforeEach, vi } from 'vitest'
import Storage from '/scripts/storage.js'
import * as Utils from '/scripts/utils.js'

describe('storage extra', () => {
  beforeEach(() => {
    chrome.storage.sync._store = {}
    chrome.runtime.lastError = null
  })

  it('getSnoozedPageCount counts by calendar day (ignores time)', async () => {
    chrome.storage.sync._store = {
      snoozify_dates: ['2023-01-01', '2023-01-02'],
      'snoozify_2023-01-01': [
        { page_title: 'A', page_url: 'https://a', page_hash: '1' },
      ],
      'snoozify_2023-01-02': [
        { page_title: 'B', page_url: 'https://b', page_hash: '2' },
        { page_title: 'C', page_url: 'https://c', page_hash: '3' },
      ],
    }
    await expect(Storage.getSnoozedPageCount('2023-01-02T15:45:00Z')).resolves.toBe(2)
  })

  it('importSnoozifiedPages merges and stores pages grouped by date; resolves when done', async () => {
    const spyUID = vi.spyOn(Utils, 'getUID').mockReturnValue('new-uid')
    chrome.storage.sync._store = {
      snoozify_dates: ['2023-01-01'],
      'snoozify_2023-01-01': [
        { page_title: 'A', page_url: 'https://a', page_hash: 'dupe' },
      ],
    }
    const payload = [
      { title: 'B', url: 'https://b', uid: 'dupe', wakeUpDate: '2023-01-01' },
      { title: 'C', url: 'https://c', uid: 'x3', wakeUpDate: '2023-01-02' },
    ]
    await expect(Storage.importSnoozifiedPages(payload)).resolves.toBeUndefined()
    expect(chrome.storage.sync._store['snoozify_2023-01-01'].length).toBe(2)
    expect(chrome.storage.sync._store['snoozify_2023-01-02'].length).toBe(1)
    spyUID.mockRestore()
  })

  it('clearSnoozedPages removes all related keys', async () => {
    chrome.storage.sync._store = {
      snoozify_dates: ['2023-01-01'],
      'snoozify_2023-01-01': [
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

  it('getSnoozedPages rejects when first get errors', async () => {
    const spy = vi.spyOn(chrome.storage.sync, 'get').mockImplementationOnce((keys, cb) => {
      chrome.runtime.lastError = { message: 'dates fetch error' }
      cb({})
      chrome.runtime.lastError = null
    })
    await expect(Storage.getSnoozedPages()).rejects.toMatchObject({ message: 'dates fetch error' })
    spy.mockRestore()
  })

  it('getSnoozedPages rejects when second get errors', async () => {
    chrome.storage.sync._store = { snoozify_dates: ['2023-01-01'] }
    const spy = vi.spyOn(chrome.storage.sync, 'get')
      .mockImplementationOnce((keys, cb) => cb({ snoozify_dates: ['2023-01-01'] }))
      .mockImplementationOnce((keys, cb) => {
        chrome.runtime.lastError = { message: 'pages fetch error' }
        cb({})
        chrome.runtime.lastError = null
      })
    await expect(Storage.getSnoozedPages()).rejects.toMatchObject({ message: 'pages fetch error' })
    spy.mockRestore()
  })

  it('clearSnoozedPages rejects when remove errors', async () => {
    chrome.storage.sync._store = {
      snoozify_dates: ['2023-01-01'],
      'snoozify_2023-01-01': [],
    }
    const spy = vi.spyOn(chrome.storage.sync, 'remove').mockImplementationOnce((keys, cb) => {
      chrome.runtime.lastError = { message: 'remove error' }
      cb()
      chrome.runtime.lastError = null
    })
    await expect(Storage.clearSnoozedPages()).rejects.toMatchObject({ message: 'remove error' })
    spy.mockRestore()
  })

  it('snoozePages rejects when set errors', async () => {
    const spy = vi.spyOn(chrome.storage.sync, 'set').mockImplementationOnce((obj, cb) => {
      chrome.runtime.lastError = { message: 'set error' }
      cb()
      chrome.runtime.lastError = null
    })
    const pages = [{ title: 'A', url: 'https://a', uid: '1', wakeUpDate: '2023-01-01' }]
    await expect(Storage.snoozePages(pages)).rejects.toMatchObject({ message: 'set error' })
    spy.mockRestore()
  })
})

