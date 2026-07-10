import { getUID } from './utils.js'
import {
  createChromeSyncAdapter,
  createMemorySyncAdapter,
  readScheduled,
  writeScheduled,
  readLegacyV2Scheduled,
  removeLegacyV2Keys,
  META_KEY,
} from './sync-projection.js'
import {
  appendEvent,
  createChromeLedgerAdapter,
  createMemoryLedgerAdapter,
  readHistory,
} from './local-ledger.js'

/** @typedef {{ id: string, title: string, url: string, wakeAt: string }} ScheduledPage */
/** @typedef {{ id: string, title: string, url: string }} WokenPage */
/** @typedef {'scheduled' | 'manual'} WakeReason */
/** @typedef {import('./local-ledger.js').LedgerEvent} HistoryEntry */

const toWakeDay = wakeAt => new Date(wakeAt).toISOString().split('T')[0]

const toLegacyPage = page => ({
  title: page.title,
  url: page.url,
  uid: page.id,
  wakeUpDate: page.wakeAt,
})

const fromLegacyPage = page => ({
  id: page.id ?? page.uid,
  title: page.title,
  url: page.url,
  wakeAt: toWakeDay(page.wakeAt ?? page.wakeUpDate),
})

const ON_CHANGED_DEBOUNCE_MS = 50

/**
 * @param {{ syncAdapter?: ReturnType<typeof createMemorySyncAdapter>, ledgerAdapter?: ReturnType<typeof createMemoryLedgerAdapter>, useChromeListeners?: boolean }} [options]
 */
export function createSnoozeStore({
  syncAdapter,
  ledgerAdapter,
  useChromeListeners = true,
} = {}) {
  const sync = syncAdapter ?? createChromeSyncAdapter()
  const ledger = ledgerAdapter ?? createChromeLedgerAdapter()

  /** @type {ScheduledPage[]} */
  let scheduled = []
  let loaded = false
  let commitChain = Promise.resolve()
  /** @type {Set<() => void>} */
  const changeListeners = new Set()
  let onChangedSetup = false
  let debounceTimer = null

  async function ensureLoaded() {
    if (!loaded) {
      scheduled = await readScheduled(sync)
      loaded = true
    }
  }

  function notifyChanged() {
    for (const listener of changeListeners) {
      try {
        listener()
      } catch (error) {
        console.error('SnoozeStore onChanged listener error:', error)
      }
    }
  }

  function scheduleNotifyChanged() {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      notifyChanged()
    }, ON_CHANGED_DEBOUNCE_MS)
  }

  function setupOnChangedListeners() {
    if (!useChromeListeners || onChangedSetup || typeof chrome === 'undefined') {
      return
    }
    onChangedSetup = true

    const handleStorageChange = (changes, areaName) => {
      if (areaName !== 'sync' && areaName !== 'local') {
        return
      }
      const relevant = Object.keys(changes).some(key =>
        key.startsWith('snoozify_v3_') || key.startsWith('snoozify_ledger_')
      )
      if (relevant) {
        loaded = false
        scheduleNotifyChanged()
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)
  }

  /**
   * @template T
   * @param {() => Promise<T>} fn
   * @returns {Promise<T>}
   */
  function enqueueCommit(fn) {
    const result = commitChain.then(fn)
    commitChain = result.catch(() => {})
    return result
  }

  async function commitScheduled() {
    try {
      await writeScheduled(sync, scheduled)
    } catch (error) {
      loaded = false
      throw error
    }
    notifyChanged()
  }

  setupOnChangedListeners()

  return {
    /**
     * @param {Array<{ title: string, url: string }>} pages
     * @param {string} wakeAt
     * @returns {Promise<ScheduledPage[]>}
     */
    scheduleSnoozes(pages, wakeAt) {
      const wakeDay = toWakeDay(wakeAt)
      return enqueueCommit(async () => {
        await ensureLoaded()
        const created = pages.map(page => ({
          id: getUID(),
          title: page.title,
          url: page.url,
          wakeAt: wakeDay,
        }))
        scheduled = [...scheduled, ...created]
        await commitScheduled()
        return created
      })
    },

    /**
     * @param {string[]} ids
     * @param {WakeReason} reason
     * @returns {Promise<WokenPage[]>}
     */
    wakeSnoozes(ids, reason) {
      return enqueueCommit(async () => {
        await ensureLoaded()
        const idSet = new Set(ids)
        const woken = scheduled.filter(page => idSet.has(page.id))
        if (woken.length === 0) {
          return []
        }

        const nextScheduled = scheduled.filter(page => !idSet.has(page.id))
        const priorEvents = await readHistory(ledger)
        const maxSeq = priorEvents.reduce((max, event) => Math.max(max, event.seq ?? 0), 0)

        try {
          await appendEvent(ledger, {
            seq: maxSeq + 1,
            at: new Date().toISOString(),
            type: 'Woken',
            reason,
            pages: woken.map(({ id, title, url }) => ({ id, title, url })),
          })
        } catch (error) {
          loaded = false
          throw error
        }

        scheduled = nextScheduled
        await commitScheduled()

        return woken.map(({ id, title, url }) => ({ id, title, url }))
      })
    },

    /** @returns {Promise<ScheduledPage[]>} */
    getScheduled() {
      return enqueueCommit(async () => {
        await ensureLoaded()
        return [...scheduled]
      })
    },

    /** @param {string} wakeDay */
    getScheduledCountForWakeDay(wakeDay) {
      const normalized = toWakeDay(wakeDay)
      return enqueueCommit(async () => {
        await ensureLoaded()
        return scheduled.filter(page => page.wakeAt === normalized).length
      })
    },

    /** @param {{ limit?: number }} [options] */
    getHistory(options) {
      return enqueueCommit(() => readHistory(ledger, options))
    },

    /**
     * @param {Array<{ title: string, url: string, id?: string, uid?: string, wakeAt?: string, wakeUpDate?: string }>} pages
     */
    importSnoozes(pages) {
      return enqueueCommit(async () => {
        await ensureLoaded()
        const existingIds = new Set(scheduled.map(page => page.id))

        const imported = pages.map(page => {
          const normalized = fromLegacyPage(page)
          while (existingIds.has(normalized.id)) {
            normalized.id = getUID()
          }
          existingIds.add(normalized.id)
          return normalized
        })

        scheduled = [...scheduled, ...imported]
        await commitScheduled()
      })
    },

    /** @returns {Promise<Array<{ title: string, url: string, uid: string, wakeUpDate: string }>>} */
    exportScheduled() {
      return enqueueCommit(async () => {
        await ensureLoaded()
        return scheduled.map(toLegacyPage)
      })
    },

    clearAll() {
      return enqueueCommit(async () => {
        await ensureLoaded()
        scheduled = []
        await commitScheduled()
      })
    },

    onChanged(callback) {
      changeListeners.add(callback)
      return () => {
        changeListeners.delete(callback)
      }
    },

    /** @returns {Promise<void>} */
    migrate() {
      return enqueueCommit(async () => {
        const all = await sync.get(null)
        const meta = /** @type {{ v?: number } | undefined} */ (all[META_KEY])
        if (meta?.v === 3) {
          await removeLegacyV2Keys(sync)
          return
        }

        const legacyPages = await readLegacyV2Scheduled(sync)
        if (legacyPages === null) {
          await removeLegacyV2Keys(sync)
          return
        }

        scheduled = legacyPages
        loaded = true
        await writeScheduled(sync, scheduled)
        await removeLegacyV2Keys(sync)
      })
    },
  }
}

const defaultStore = createSnoozeStore()

export default defaultStore
