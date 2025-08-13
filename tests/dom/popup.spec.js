import { describe, it, expect, beforeEach, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { screen, within } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'

// Mock snoozer to observe calls
vi.mock('/scripts/snoozer.js', () => ({
  snoozePages: vi.fn().mockResolvedValue(),
}))

const htmlPath = path.resolve(process.cwd(), 'pages/popup.html')

describe('popup', () => {
  beforeEach(() => {
    chrome._reset()
    document.body.innerHTML = fs.readFileSync(htmlPath, 'utf8')
  })

  it('clicking a weekday button snoozes highlighted tabs and removes them', async () => {
    const { snoozePages } = await import('/scripts/snoozer.js')

    // Import the popup module (attaches DOMContentLoaded listener)
    await import('/pages/popup.js')

    // Fire DOM ready to render buttons
    document.dispatchEvent(new Event('DOMContentLoaded'))

    // Find a weekday date button in the main buttons container
    const container = document.getElementById('buttons')
    const buttons = await within(container).findAllByRole('button')
    const firstDateButton = buttons[0]

    await userEvent.click(firstDateButton)

    // Wait for async handler to call snoozePages
    await vi.waitFor(() => expect(snoozePages).toHaveBeenCalledTimes(1))

    const arg = snoozePages.mock.calls[0][0]
    expect(Array.isArray(arg)).toBe(true)
    expect(arg).toHaveLength(1)
    expect(arg[0]).toMatchObject({ title: 'Example', url: 'https://example.com' })

    // tabs.remove should be invoked with the tab id (allow async turn)
    await vi.waitFor(() => expect(chrome.tabs._removed).toEqual([1]))
  })
})