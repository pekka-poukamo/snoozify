import { describe, it, expect, beforeEach, vi } from 'vitest'
vi.mock('/scripts/testing.js', () => ({ testing: true }))

describe('snoozified-pages empty & import/export', () => {
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

  it('shows empty state when no snoozed pages', async () => {
    await import('/pages/snoozified-pages.js')
    document.dispatchEvent(new Event('DOMContentLoaded'))
    await new Promise(r => setTimeout(r, 0))
    expect(document.querySelector('#page-links').textContent).toContain('No snoozed pages')
  })
})

