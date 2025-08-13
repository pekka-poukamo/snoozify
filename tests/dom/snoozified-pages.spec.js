import { describe, it, expect, beforeEach, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { screen, within } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import Storage from '/scripts/storage.js'

const htmlPath = path.resolve(process.cwd(), 'pages/snoozified-pages.html')

// Always reset the module registry before each test to allow fresh mocks
vi.mock('/scripts/snoozer.js', () => ({ openPageById: vi.fn() }), { virtual: true })

describe('snoozified pages', () => {
  beforeEach(async () => {
    vi.resetModules()
    chrome._reset()
    document.body.innerHTML = fs.readFileSync(htmlPath, 'utf8')
  })

  it('shows empty state when no pages', async () => {
    await import('/pages/snoozified-pages.js')
    document.dispatchEvent(new Event('DOMContentLoaded'))
    await screen.findByText(/snoozified pages/i)
    const list = document.getElementById('page-links')
    expect(list.textContent).toMatch(/No snoozed pages yet\./)
  })

  it('renders pages grouped by date and wake up button calls openPageById', async () => {
    await Storage.snoozePages([
      { title: 'A', url: 'https://a', uid: 'a', wakeUpDate: '2025-02-01' },
      { title: 'B', url: 'https://b', uid: 'b', wakeUpDate: '2025-02-01' },
    ])

    const snoozer = await import('/scripts/snoozer.js')
    const spy = vi.spyOn(snoozer, 'openPageById').mockResolvedValue()

    await import('/pages/snoozified-pages.js')
    document.dispatchEvent(new Event('DOMContentLoaded'))

    const list = document.getElementById('page-links')
    // Wait for groups to render
    await vi.waitFor(() => {
      expect(list.querySelectorAll('.date-group__pages').length).toBeGreaterThan(0)
    })

    const groups = list.querySelectorAll('.date-group__pages')
    const firstGroup = groups[0]

    const wakeButtons = within(firstGroup).getAllByRole('button', { name: /wake up/i })
    expect(wakeButtons.length).toBeGreaterThan(0)

    await userEvent.click(wakeButtons[0])
    expect(spy).toHaveBeenCalledTimes(1)
    expect(typeof spy.mock.calls[0][0]).toBe('string')
  })
})