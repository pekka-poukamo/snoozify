import { describe, it, expect, beforeEach } from 'vitest'
import Storage from '/scripts/storage.js'

describe('storage', () => {
  beforeEach(() => {
    chrome._reset()
  })

  it('snoozePages groups by date and getSnoozedPages returns normalized pages', async () => {
    const pages = [
      { title: 'A', url: 'https://a.example', uid: 'u1', wakeUpDate: '2025-01-01' },
      { title: 'B', url: 'https://b.example', uid: 'u2', wakeUpDate: '2025-01-01' },
      { title: 'C', url: 'https://c.example', uid: 'u3', wakeUpDate: '2025-01-02' },
    ]

    await Storage.snoozePages(pages)

    const all = await Storage.getSnoozedPages()
    expect(all).toHaveLength(3)

    const dates = new Set(all.map(p => p.wakeUpDate))
    expect(dates).toEqual(new Set(['2025-01-01', '2025-01-02']))

    const titles = all.map(p => p.title).sort()
    expect(titles).toEqual(['A', 'B', 'C'])
  })
})