import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as Snoozer from '/scripts/snoozer.js'
import SnoozeStore from '/scripts/snooze-store.js'
import * as Utils from '/scripts/utils.js'

describe('snoozer coverage', () => {
  beforeEach(() => {
    chrome.storage.sync._store = {}
    chrome.storage.local._store = {}
    chrome.tabs.create.mockClear()
  })

  it('snoozePages assigns new ids and persists via SnoozeStore', async () => {
    const uidSpy = vi.spyOn(Utils, 'getUID')
      .mockReturnValueOnce('u1')
      .mockReturnValueOnce('u2')

    const pages = [
      { title: 'A', url: 'https://a', wakeUpDate: '2023-01-01' },
      { title: 'B', url: 'https://b', wakeUpDate: '2023-01-02' },
    ]

    await Snoozer.snoozePages(pages)

    const scheduled = await SnoozeStore.exportScheduled()
    expect(scheduled.map(page => page.uid).sort()).toEqual(['u1', 'u2'])

    uidSpy.mockRestore()
  })

  it('openPageById rejects with no uid', async () => {
    await expect(Snoozer.openPageById()).rejects.toBeTruthy()
  })

  it('openPageById rejects when page not found', async () => {
    await SnoozeStore.importSnoozes([
      { title: 'A', url: 'https://a', uid: 'x1', wakeUpDate: '2023-01-01' },
    ])
    await expect(Snoozer.openPageById('missing')).rejects.toBeTruthy()
  })

  it('openPagesDueBy resolves empty and does not open tabs when none due', async () => {
    await SnoozeStore.importSnoozes([
      { title: 'Future', url: 'https://f', uid: 'f1', wakeUpDate: '2099-01-01' },
    ])
    const result = await Snoozer.openPagesDueBy(Date.parse('2020-01-01'))
    expect(result).toEqual([])
    expect(chrome.tabs.create).not.toHaveBeenCalled()
  })
})
