import { describe, it, expect, beforeEach, vi } from 'vitest'
vi.mock('/scripts/testing.js', () => ({ testing: true }))
import Storage from '/scripts/storage.js'

describe('snoozified-pages UI', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <template id="page-link-template">
        <div>
          <a class="page-link__url"></a>
          <span class="page-link__wakeupdate"></span>
          <button class="page-link__wakeup-button"></button>
        </div>
      </template>
      <template id="date-group-template">
        <div>
          <h2><span class="date-group__date-text"></span> <span class="date-group__count"></span></h2>
          <div class="date-group__pages"></div>
        </div>
      </template>
      <div id="page-links"></div>
      <button id="clear-button"></button>
      <button id="export-button"></button>
      <button id="import-button"></button>
      <input id="import-file-input" type="file" />
    `
    chrome.storage.sync._store = {}
    chrome.runtime.lastError = null
  })

  it('renders grouped pages with counts and wires wakeup buttons', async () => {
    chrome.storage.sync._store = {
      snoozify_dates_testing: ['2023-01-01'],
      'snoozify__testing2023-01-01': [
        { page_title: 'A', page_url: 'https://a', page_hash: 'x1' },
        { page_title: 'B', page_url: 'https://b', page_hash: 'x2' },
      ],
    }

    await import('/pages/snoozified-pages.js')

    // Trigger DOMContentLoaded
    document.dispatchEvent(new Event('DOMContentLoaded'))
    await new Promise(r => setTimeout(r, 0))

    const groups = document.querySelectorAll('.date-group__pages')
    expect(groups.length).toBe(1)
    expect(groups[0].children.length).toBe(2)

    // Click first wakeup button
    groups[0].querySelector('.page-link__wakeup-button').click()
  })
})

