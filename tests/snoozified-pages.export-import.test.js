import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const importMock = vi.fn(() => Promise.resolve())
vi.mock('/scripts/storage.js', () => ({
  default: {
    getSnoozedPages: vi.fn().mockResolvedValue([]),
    calculateStorageSize: vi.fn(),
    clearSnoozedPages: vi.fn().mockResolvedValue(undefined),
    importSnoozifiedPages: (...a) => importMock(...a),
  }
}))

describe('snoozified-pages export/import', () => {
  beforeEach(async () => {
    vi.resetModules()
    importMock.mockClear()
    chrome.storage.sync._store = {}
    chrome.runtime.lastError = null

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

    await import('/pages/snoozified-pages.js')
    document.dispatchEvent(new Event('DOMContentLoaded'))
    await new Promise(r => setTimeout(r, 0))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('export button creates a download anchor with JSON href and correct filename', async () => {
    let capturedAnchor = null
    vi.spyOn(document.body, 'appendChild').mockImplementationOnce(el => { capturedAnchor = el })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementationOnce(() => {})

    document.querySelector('#export-button').click()
    await new Promise(r => setTimeout(r, 0))

    expect(capturedAnchor).not.toBeNull()
    expect(capturedAnchor.getAttribute('href')).toMatch(/^data:text\/json/)
    expect(capturedAnchor.getAttribute('download')).toBe('snoozified_pages_export.json')
  })

  it('import button triggers file input click', () => {
    const fileInput = document.querySelector('#import-file-input')
    const clickSpy = vi.spyOn(fileInput, 'click').mockImplementation(() => {})
    document.querySelector('#import-button').click()
    expect(clickSpy).toHaveBeenCalled()
  })

  const triggerFileLoad = (result) => {
    let readerInstance
    class MockFileReader {
      constructor() { this.readAsText = vi.fn(); readerInstance = this }
    }
    vi.stubGlobal('FileReader', MockFileReader)

    const fileInput = document.querySelector('#import-file-input')
    Object.defineProperty(fileInput, 'files', {
      value: [new File([''], 'test.json')],
      configurable: true,
    })
    fileInput.dispatchEvent(new Event('change'))
    readerInstance.onload({ target: { result } })
    return readerInstance
  }

  it('file input change with valid JSON calls importSnoozifiedPages', async () => {
    const validPages = [{ title: 'A', url: 'https://a', uid: '1', wakeUpDate: '2023-01-01' }]
    triggerFileLoad(JSON.stringify(validPages))
    await new Promise(r => setTimeout(r, 0))
    expect(importMock).toHaveBeenCalledWith(validPages)
  })

  it('file input change with invalid JSON logs error and does not import', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    triggerFileLoad('not valid json{{{')
    expect(importMock).not.toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('file input change with invalid data structure does not import', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    triggerFileLoad(JSON.stringify({ notAnArray: true }))
    expect(importMock).not.toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalledWith('Invalid data structure')
    consoleSpy.mockRestore()
  })
})
