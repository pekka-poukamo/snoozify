# Thermo-nuclear fix tracker

**PR:** [#10 — SnoozeStore](https://github.com/pekka-poukamo/snoozify/pull/10)  
**Branch:** `cursor/thermo-nuclear-fixes-9c5c`  
**Review date:** 2026-07-10  
**Verdict:** Request changes → fix before merge

## Progress summary

| Area | Status | Agent |
|------|--------|-------|
| Infrastructure dedup (adapters, chunked write, toWakeDay) | ⬜ pending | infra-dedup |
| Store core (queue, onChanged, atomic wake, nextSeq) | ⬜ pending | store-core |
| Callers + UI + tests | ⬜ pending | callers-ui |

---

## Structural regressions

### S1 — Wake is two-store, non-atomic

- [ ] Sync removal before ledger append (or unified `commitWake`)
- [ ] `loaded = false` / recovery path on partial failure
- [ ] Test: ledger succeeds, sync fails → no duplicate wake

**Files:** `scripts/snooze-store.js`, `scripts/local-ledger.js`, `tests/snooze-store.test.js`  
**Agent:** store-core

### S2 — `onChanged` fires twice on local commit

- [ ] Pick single authoritative notify path (local notify + skip self-triggered storage events via generation token)
- [ ] Verify snoozified-pages does not double-render on wake

**Files:** `scripts/snooze-store.js`  
**Agent:** store-core

---

## Code-judo / simplification

### J1 — Four adapter factories → one module

- [ ] Create `scripts/storage-adapter.js` with `createChromeStorageAdapter(area)` + `createMemoryStorageAdapter(store)`
- [ ] Trim `sync-projection.js` and `local-ledger.js` to thin re-exports

**Agent:** infra-dedup

### J2 — `writeScheduled` and `appendEvent` share algorithm

- [ ] Extract `writeChunkedProjection(adapter, opts)` helper
- [ ] Refactor `writeScheduled` and `appendEvent` to use it

**Agent:** infra-dedup

### J3 — `toWakeDay` defined three times

- [ ] Add `toWakeDay` to `scripts/utils.js`
- [ ] Remove duplicates from `snooze-store.js`, `sync-projection.js`, `snoozer.js`

**Agent:** infra-dedup

### J4 — Commit queue serializes reads unnecessarily

- [ ] Split `enqueueMutation` (schedule, wake, import, clear, migrate) from direct reads
- [ ] Reads return from in-memory `scheduled` when loaded; `readHistory` direct

**Agent:** store-core

### J5 — Full history scan for `maxSeq` on every wake

- [ ] Add `nextSeq` to ledger meta
- [ ] Increment on append; remove `readHistory` + reduce in `wakeSnoozes`

**Agent:** store-core

### J6 — `snoozePages` fans out to N commits

- [ ] Batch schedule: one enqueue, one `writeScheduled` per user gesture
- [ ] Extend `scheduleSnoozes` or add batch API

**Agent:** callers-ui

### J7 — `openPageById` / `openPagesDueBy` double round-trip

- [ ] Use `wakeSnoozes` return value for tab URLs
- [ ] Remove preceding `getScheduled` where possible

**Agent:** callers-ui

---

## Spaghetti / layering

### SP1 — UI renders via `exportScheduled()` (legacy shape)

- [ ] `snoozified-pages.js` scheduled tab uses `getScheduled()` + display mapping

**Agent:** callers-ui

### SP2 — `snoozified-pages.js` mixes four concerns

- [ ] Deferred — not blocking merge; revisit if file grows further

---

## Boundaries / types

### B1 — Cast-heavy JSDoc

- [ ] Define `StorageAdapter` typedef in `storage-adapter.js`
- [ ] Reduce inline `/** @type */` casts at call sites

**Agent:** infra-dedup

### B2 — Legacy conversion at seam

- [x] Already correct in `snooze-store.js` — no action

---

## Tests

- [ ] Deduplicate RC1/RC3 tests (keep `rc-bugs.test.js`, trim `snooze-store.test.js` copies)
- [ ] Add torn-write test (ledger ok, sync fail)
- [ ] `npm run test:run` green

**Agent:** callers-ui (+ store-core for torn-write)

---

## Verification

- [ ] All checkboxes above complete
- [ ] `npm run test:run` passes
- [ ] Tracker updated with final status

---

## Changelog

| Time (UTC) | Event |
|------------|-------|
| 2026-07-10 09:21 | Tracker created; subagents launching |
