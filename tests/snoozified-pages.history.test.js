import { describe, it, expect, beforeEach } from 'vitest'
import SnoozeStore from '/scripts/snooze-store.js'

const pageDom = `
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

describe('snoozified-pages history UI', () => {
  beforeEach(() => {
    document.body.innerHTML = pageDom
    chrome.storage.sync._store = {}
    chrome.storage.local._store = {}
    chrome.storage.sync.getBytesInUse = (keys, cb) => cb(90000)
    chrome.storage.local.getBytesInUse = (keys, cb) => cb(0)
  })

  it('renders wake history when history tab is selected', async () => {
    await SnoozeStore.importSnoozes([
      { title: 'Woken page', url: 'https://woken', uid: 'w1', wakeUpDate: '2023-01-01' },
    ])
    const [page] = await SnoozeStore.getScheduled()
    await SnoozeStore.wakeSnoozes([page.id], 'manual')

    await import('/pages/snoozified-pages.js')
    document.dispatchEvent(new Event('DOMContentLoaded'))
    await new Promise(r => setTimeout(r, 0))

    document.querySelector('#tab-history').click()
    await new Promise(r => setTimeout(r, 0))

    expect(document.querySelector('#history-list').textContent).toContain('Woken page')
    expect(document.querySelector('#history-panel').hidden).toBe(false)
  })

  it('shows quota warning when sync storage is near limit', async () => {
    await import('/pages/snoozified-pages.js')
    document.dispatchEvent(new Event('DOMContentLoaded'))
    await new Promise(r => setTimeout(r, 0))

    const warning = document.querySelector('#quota-warning')
    expect(warning.hidden).toBe(false)
    expect(warning.textContent).toMatch(/Sync storage/)
  })
})
