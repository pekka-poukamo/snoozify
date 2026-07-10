import { describe, it, expect, beforeEach } from 'vitest'

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
      <nav class="tabs">
        <button id="tab-scheduled" class="tab tab--active"></button>
        <button id="tab-history" class="tab"></button>
      </nav>
      <p id="quota-warning" hidden></p>
      <section id="scheduled-panel"><div id="page-links"></div></section>
      <section id="history-panel" hidden><div id="history-list"></div></section>
      <button id="clear-button"></button>
      <button id="export-button"></button>
      <button id="import-button"></button>
      <input id="import-file-input" type="file" />
    `
    chrome.storage.sync._store = {
      snoozify_v3_meta: { v: 3, chunks: ['snoozify_v3_c0'] },
      snoozify_v3_c0: [
        { i: 'x1', t: 'A', u: 'https://a', w: '2023-01-01' },
        { i: 'x2', t: 'B', u: 'https://b', w: '2023-01-01' },
      ],
    }
    chrome.storage.local._store = {}
    chrome.runtime.lastError = null
  })

  it('renders grouped pages with counts and wires wakeup buttons', async () => {
    await import('/pages/snoozified-pages.js')

    document.dispatchEvent(new Event('DOMContentLoaded'))
    await new Promise(r => setTimeout(r, 0))

    const groups = document.querySelectorAll('.date-group__pages')
    expect(groups.length).toBe(1)
    expect(groups[0].children.length).toBe(2)

    groups[0].querySelector('.page-link__wakeup-button').click()
  })
})
