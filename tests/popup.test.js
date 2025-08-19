import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('/scripts/testing.js', () => ({ testing: true }))

const snoozeMock = vi.fn(() => Promise.resolve())
vi.mock('/scripts/snoozer.js', () => ({ snoozePages: (...args) => snoozeMock(...args) }))

const getCountMock = vi.fn(async () => 0)
vi.mock('/scripts/storage.js', () => ({ default: { getSnoozedPageCount: (...a)=>getCountMock(...a) } }))

describe('popup UI', () => {
  beforeEach(async () => {
    vi.resetModules()
    snoozeMock.mockClear()
    getCountMock.mockClear()
    chrome.tabs.query.mockResolvedValue([
      { id: 1, title: 'T1', url: 'https://t1' },
      { id: 2, title: 'T2', url: 'https://t2' },
    ])
    chrome.tabs.remove.mockClear()

    document.body.innerHTML = `
      <template id="datebutton">
        <button>
          <span class="datebutton__weekday"></span>
          <span class="datebutton__date"></span>
          <span class="datebutton__count"></span>
        </button>
      </template>
      <div id="buttons"></div>
      <div id="special-buttons">
        <button class="datebutton" id="tomorrow-button">Tomorrow</button>
      </div>
    `

    await import('/pages/popup.js')
    document.dispatchEvent(new Event('DOMContentLoaded'))
    await new Promise(r => setTimeout(r, 0))
  })

  it('renders weekday, month, and tomorrow buttons', () => {
    const weekdayButtons = document.querySelectorAll('#buttons button')
    expect(weekdayButtons.length).toBe(7)
    const monthButton = document.querySelector('#special-buttons #month-button')
    expect(monthButton).not.toBeNull()
    const tomorrow = document.querySelector('#tomorrow-button')
    expect(tomorrow).not.toBeNull()
  })

  it('clicking a weekday snooze button calls snoozePages and closes tabs', async () => {
    const first = document.querySelector('#buttons button')
    first.click()
    await new Promise(r => setTimeout(r, 0))
    expect(snoozeMock).toHaveBeenCalledTimes(1)
    expect(chrome.tabs.remove).toHaveBeenCalledWith([1,2])
  })
})

