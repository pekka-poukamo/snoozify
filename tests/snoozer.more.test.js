import { describe, it, expect, beforeEach, vi } from 'vitest'
vi.mock('/scripts/testing.js', () => ({ testing: true }))
import * as Snoozer from '/scripts/snoozer.js'
import Storage from '/scripts/storage.js'

describe('snoozer more', () => {
  beforeEach(() => {
    chrome.storage.sync._store = {}
    chrome.tabs.create.mockClear()
  })

  it('openPagesDueBy opens only due pages (not future)', async () => {
    await Storage.snoozePages([
      { title: 'Due', url: 'https://due', uid: '1', wakeUpDate: '2023-01-01' },
      { title: 'Future', url: 'https://future', uid: '2', wakeUpDate: '2099-01-01' },
    ])

    const opened = await Snoozer.openPagesDueBy(Date.parse('2090-01-01'))
    expect(opened.map(p => p.url)).toEqual(['https://due'])
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://due' })
  })
})

