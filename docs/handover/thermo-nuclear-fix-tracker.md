# Thermo-nuclear fix tracker

**PR:** [#10 — SnoozeStore](https://github.com/pekka-poukamo/snoozify/pull/10)  
**Branch:** `cursor/thermo-nuclear-fixes-9c5c`  
**Review date:** 2026-07-10  
**Verdict:** ~~Request changes~~ → **Ready for re-review** (all blocking items addressed)

## Progress summary

| Area | Status | Agent | Commit |
|------|--------|-------|--------|
| Infrastructure dedup (adapters, chunked write, toWakeDay) | ✅ done | infra-dedup | `64e00d0` |
| Store core (queue, onChanged, atomic wake, nextSeq) | ✅ done | store-core | `12b2493` |
| Callers + UI + tests | ✅ done | callers-ui | `6941404` |

**Tests:** 50/50 pass (`npm run test:run`)

---

## Structural regressions

### S1 — Wake is two-store, non-atomic

- [x] Sync removal before ledger append (`commitScheduled` then `appendEvent`)
- [x] `loaded = false` on failure forces re-read from sync
- [x] Test: sync fails → ledger not appended, scheduled unchanged (`snooze-store.test.js`)

**Files:** `scripts/snooze-store.js`, `scripts/local-ledger.js`, `tests/snooze-store.test.js`  
**Agent:** store-core

### S2 — `onChanged` fires twice on local commit

- [x] `suppressStorageNotify` counter skips self-triggered storage events
- [x] Synchronous `notifyChanged()` after `commitScheduled` for same-tab UI

**Files:** `scripts/snooze-store.js`  
**Agent:** store-core

---

## Code-judo / simplification

### J1 — Four adapter factories → one module

- [x] Created `scripts/storage-adapter.js` with `createChromeStorageAdapter(area)` + `createMemoryStorageAdapter(store)`
- [x] Trimmed `sync-projection.js` and `local-ledger.js` to thin re-exports

**Agent:** infra-dedup

### J2 — `writeScheduled` and `appendEvent` share algorithm

- [x] Extracted `writeChunkedProjection(adapter, opts)` in `scripts/chunked-write.js`
- [x] Refactored `writeScheduled` and `appendEvent` to use it

**Agent:** infra-dedup

### J3 — `toWakeDay` defined three times

- [x] Added `toWakeDay` to `scripts/utils.js`
- [x] Removed duplicates from `snooze-store.js`, `sync-projection.js`, `snoozer.js`

**Agent:** infra-dedup + store-core + callers-ui

### J4 — Commit queue serializes reads unnecessarily

- [x] Split `enqueueMutation` (schedule, wake, import, clear, migrate) from direct reads
- [x] Reads call `ensureLoaded()` directly; `getHistory` calls `readHistory` directly

**Agent:** store-core

### J5 — Full history scan for `maxSeq` on every wake

- [x] Added `nextSeq` to ledger meta in `appendEvent`
- [x] `getNextSeq(adapter)` used in `wakeSnoozes` instead of full history scan

**Agent:** store-core + infra-dedup

### J6 — `snoozePages` fans out to N commits

- [x] Single wake day → one `scheduleSnoozes` call
- [x] Multi wake day → sequential `reduce` (not parallel `Promise.all`)
- [ ] `scheduleSnoozesBatch` API — **deferred** (low frequency; queue already serializes)

**Agent:** callers-ui

### J7 — `openPageById` / `openPagesDueBy` double round-trip

- [x] `openPageById` uses `wakeSnoozes` return value only
- [x] `openPagesDueBy` filters once, wakes, opens tabs from return value

**Agent:** callers-ui

---

## Spaghetti / layering

### SP1 — UI renders via `exportScheduled()` (legacy shape)

- [x] `snoozified-pages.js` scheduled tab uses `getScheduled()` + `toDisplayPage` mapping

**Agent:** callers-ui

### SP2 — `snoozified-pages.js` mixes four concerns

- [ ] Deferred — not blocking merge; revisit if file grows further

---

## Boundaries / types

### B1 — Cast-heavy JSDoc

- [x] `StorageAdapter` typedef in `storage-adapter.js`
- [~] Meta parse casts remain at storage boundaries (acceptable for chrome.storage untyped API)

**Agent:** infra-dedup

### B2 — Legacy conversion at seam

- [x] Already correct in `snooze-store.js` — no action

---

## Tests

- [x] Deduplicate RC1/RC3 tests (keep `rc-bugs.test.js`, trimmed `snooze-store.test.js`)
- [x] Add torn-write test (sync fails → ledger not appended, scheduled unchanged)
- [x] `npm run test:run` green (50 tests)

**Agent:** callers-ui + store-core

---

## Verification

- [x] All blocking checkboxes complete
- [x] `npm run test:run` passes (50/50)
- [x] Tracker updated with final status

**Open / non-blocking:** J6 batch API, SP2 file split

---

## Changelog

| Time (UTC) | Event |
|------------|-------|
| 2026-07-10 09:21 | Tracker created; subagents launching |
| 2026-07-10 09:25 | infra-dedup: `storage-adapter.js`, `chunked-write.js`, `toWakeDay`, adapter dedup (`64e00d0`) |
| 2026-07-10 09:25 | store-core: atomic wake, mutation-only queue, onChanged dedup, nextSeq (`12b2493`) |
| 2026-07-10 09:26 | callers-ui: snoozer J6/J7, snoozified-pages SP1, test dedup + S1 torn-write (`6941404`) |
| 2026-07-10 09:27 | All agents complete; 50/50 tests green; ready for re-review |
