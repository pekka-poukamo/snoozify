import { describe, it, expect, beforeEach } from 'vitest'
import * as Snoozer from '/scripts/snoozer.js'
import Storage from '/scripts/storage.js'

describe('snoozer', () => {
  beforeEach(() => {
    chrome._reset()
  })

  it('snoozePages rejects on empty input', async () => {
    await expect(Snoozer.snoozePages([])).rejects.toBeDefined()
  })

  it('snoozePages persists pages with generated uids', async () => {
    const pages = [
      { title: 'A', url: 'https://a.example', wakeUpDate: '2025-05-01' },
      { title: 'B', url: 'https://b.example', wakeUpDate: '2025-05-02' },
    ]
    await Snoozer.snoozePages(pages)
    const stored = await Storage.getSnoozedPages()
    expect(stored).toHaveLength(2)
    stored.forEach(p => expect(typeof p.uid).toBe('string'))
  })

  it('openPageById opens the tab and removes it from storage', async () => {
    const uid = 'uid-xyz'
    await Storage.snoozePages([
      { title: 'X', url: 'https://x.example', uid, wakeUpDate: '2025-06-01' },
    ])

    const result = await Snoozer.openPageById(uid)
    expect(result).toBe(uid)
    expect(chrome.tabs._created).toEqual(['https://x.example'])

    const remaining = await Storage.getSnoozedPages()
    expect(remaining.find(p => p.uid === uid)).toBeUndefined()
  })

  it('openPagesDueBy opens only due pages and removes them', async () => {
    const due1 = { title: 'D1', url: 'https://d1', uid: 'd1', wakeUpDate: '2025-01-01' }
    const due2 = { title: 'D2', url: 'https://d2', uid: 'd2', wakeUpDate: '2025-01-02' }
    const future = { title: 'F', url: 'https://f', uid: 'f', wakeUpDate: '2029-01-01' }
    await Storage.snoozePages([due1, due2, future])

    const opened = await Snoozer.openPagesDueBy(new Date('2025-01-02T23:59:59Z'))
    const openedUrls = opened.map(p => p.url).sort()
    expect(openedUrls).toEqual(['https://d1', 'https://d2'])
    expect(chrome.tabs._created.sort()).toEqual(['https://d1', 'https://d2'])

    const remaining = await Storage.getSnoozedPages()
    expect(remaining.map(p => p.uid)).toEqual(['f'])
  })
})