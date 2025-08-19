import { describe, it, expect, beforeEach, vi } from 'vitest'
vi.mock('/scripts/testing.js', () => ({ testing: true }))
import * as Snoozer from '/scripts/snoozer.js'
import Storage from '/scripts/storage.js'
import * as Utils from '/scripts/utils.js'

describe('snoozer coverage', () => {
  beforeEach(() => {
    chrome.storage.sync._store = {}
    chrome.tabs.create.mockClear()
  })

  it('snoozePages assigns new UIDs and delegates to Storage', async () => {
    const uidSpy = vi.spyOn(Utils, 'getUID')
      .mockReturnValueOnce('u1')
      .mockReturnValueOnce('u2')

    const pages = [
      { title: 'A', url: 'https://a', wakeUpDate: '2023-01-01' },
      { title: 'B', url: 'https://b', wakeUpDate: '2023-01-02' },
    ]

    await Snoozer.snoozePages(pages)

    // Verify stored data contains the assigned UIDs
    expect(Object.keys(chrome.storage.sync._store)).toContain('snoozify_dates_testing')
    const allValues = Object.values(chrome.storage.sync._store).flat()
    const storedUids = JSON.stringify(allValues)
    expect(storedUids).toMatch(/u1|u2/)

    uidSpy.mockRestore()
  })

  it('openPageById rejects with no uid', async () => {
    await expect(Snoozer.openPageById()).rejects.toBeTruthy()
  })

  it('openPageById rejects when page not found', async () => {
    await Storage.snoozePages([
      { title: 'A', url: 'https://a', uid: 'x1', wakeUpDate: '2023-01-01' },
    ])
    await expect(Snoozer.openPageById('missing')).rejects.toBeTruthy()
  })

  it('openPagesDueBy resolves empty and does not open tabs when none due', async () => {
    await Storage.snoozePages([
      { title: 'Future', url: 'https://f', uid: 'f1', wakeUpDate: '2099-01-01' },
    ])
    const result = await Snoozer.openPagesDueBy(Date.parse('2020-01-01'))
    expect(result).toEqual([])
    expect(chrome.tabs.create).not.toHaveBeenCalled()
  })
})

