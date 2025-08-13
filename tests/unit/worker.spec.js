import { describe, it, expect, beforeEach, vi } from 'vitest'

const ALARM = 'Snoozify scheduler'

describe('worker', () => {
  beforeEach(() => {
    vi.resetModules()
    chrome._reset()
  })

  it.skip('creates a notification when pages are opened', async () => {
    vi.mock('/scripts/snoozer.js', () => ({
      openPagesDueBy: vi.fn().mockResolvedValue([
        { title: 'A', url: 'https://a', uid: '1', wakeUpDate: '2025-01-01' },
      ]),
    }))

    await import('/scripts/worker.js')
    chrome.alarms._trigger(ALARM)

    await vi.waitFor(() => expect(chrome.notifications._created.length).toBe(1))
    expect(chrome.notifications._created[0].title).toMatch(/snoozify woke up/i)
  })

  it('does not notify when no pages are opened', async () => {
    vi.mock('/scripts/snoozer.js', () => ({
      openPagesDueBy: vi.fn().mockResolvedValue([]),
    }))

    await import('/scripts/worker.js')
    chrome.alarms._trigger(ALARM)

    await new Promise(r => setTimeout(r, 10))
    expect(chrome.notifications._created.length).toBe(0)
  })
})