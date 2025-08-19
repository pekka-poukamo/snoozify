import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as Snoozer from '/scripts/snoozer.js'
import Storage from '/scripts/storage.js'

vi.mock('/scripts/testing.js', () => ({ testing: true }))

describe('snoozer', () => {
  beforeEach(() => {
    chrome.tabs.create.mockClear()
    chrome.tabs.remove.mockClear()
    chrome.storage.sync._store = {}
  })

  it('snoozePages rejects empty input', async () => {
    await expect(Snoozer.snoozePages([])).rejects.toBeTruthy()
  })

  it('openPageById opens tab and removes page when found', async () => {
    await Storage.snoozePages([
      { title: 'A', url: 'https://a', uid: 'id1', wakeUpDate: '2023-01-01' },
    ])
    const uid = await Snoozer.openPageById('id1')
    expect(uid).toBe('id1')
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://a' })
  })
})

