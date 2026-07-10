# SnoozeStore implementation plan

**Status:** In progress (documentation phase)  
**ADR:** [0001 — Active snoozes in sync, audit ledger in local](../adr/0001-active-snoozes-in-sync-audit-ledger-in-local.md)  
**Domain terms:** [CONTEXT.md](../../CONTEXT.md)

Single PR, implemented in ordered phases with **one logical commit per phase** for reviewability. Each phase should leave the extension in a working state.

---

## Problem

| ID | Bug | Root cause |
|----|-----|------------|
| RC1 | Page lost when snooze races with wake | Unsynchronized read-modify-write in `snoozePages`, `removePagesByUIDs`, `importSnoozifiedPages` |
| RC2 | Alarm timer resets on service worker restart | Unconditional `chrome.alarms.create` at module load |
| RC3 | Orphan `snoozify_YYYY-MM-DD` keys after partial write | `set` then `remove` — not atomic; `set` does not delete absent keys |
| RC4 | Due pages can wake twice after SW crash | `openPagesDueBy` opens tabs **before** `removePagesByUIDs`; crash leaves pages scheduled |
| — | Woken tabs disappear with no trace | Wake deletes from storage; no audit log |

Failing regression tests: `tests/rc-bugs.test.js` (RC1–RC3). Add RC4 test when wiring `snoozer.js`.

**Invariant (non-negotiable):** storage commit completes before `chrome.tabs.create` on every wake path.

---

## Goals

1. Scheduled snoozes sync across device switches (`chrome.storage.sync`).
2. Wake history persisted and visible in UI (`chrome.storage.local` ledger).
3. All storage mutations serialized through one module (fixes RC1, RC3).
4. Callers see a small interface — no chunk or storage-layout knowledge.
5. Backwards-compatible migration from schema v2 to v3.

## Non-goals (v1)

- Retroactive ledger entries for pre-migration snoozes.
- Cross-device deduplication of alarm wake (accepted race for v1).
- Syncing audit history across devices.
- `Snoozed` / `Cleared` ledger events (deferred until a UI needs them).
- Full backup export including history (v1 export is scheduled-only; see Export).

---

## Module decomposition

Do not implement as a single 1k+ line file. Split by seam:

| Module | Owns |
|--------|------|
| `scripts/snooze-store.js` | Facade, commit queue, in-memory scheduled state, public API, `onChanged` wiring |
| `scripts/sync-projection.js` | v3 sync read / write / diff / orphan removal |
| `scripts/local-ledger.js` | Append, rotate, ring buffer (`Woken` events only in v1) |
| `scripts/chunk-pack.js` | Shared greedy ~7 KB packing — **one implementation**, used by sync projection and local ledger |

**Data flow:** commit queue owns authoritative in-memory scheduled list → projection materializes sync chunks. Ledger is a **parallel append** on wake (and future event types), not an input to projection rebuild.

```
Callers
   │
   ▼
┌─────────────────────────────────────────────────────────┐
│  snooze-store.js                                        │
│  ┌──────────────────┐                                   │
│  │ Commit queue     │──► in-memory scheduled[]          │
│  └────────┬─────────┘         │                         │
│           │                   ▼                         │
│           │            sync-projection.js               │
│           │            (chunk-pack.js)                  │
│           │                   │                         │
│           │    parallel on wake only                    │
│           ▼                   ▼                         │
│     local-ledger.js     chrome.storage.sync             │
│     (chunk-pack.js)                                     │
│           │                                             │
│           ▼                                             │
│     chrome.storage.local                                │
└─────────────────────────────────────────────────────────┘
```

Production adapters live inside `sync-projection.js` and `local-ledger.js`. In-memory adapters implement the same internal interface, **injected at `SnoozeStore` construction** — no `if (test)` branches in the facade.

---

## SnoozeStore interface

```javascript
scheduleSnoozes(pages, wakeAt)        → Promise<ScheduledPage[]>
wakeSnoozes(ids, reason)              → Promise<WokenPage[]>   // 'scheduled' | 'manual'
getScheduled()                        → Promise<ScheduledPage[]>
getScheduledCountForWakeDay(wakeDay)  → Promise<number>        // YYYY-MM-DD; O(n) hidden here
getHistory({ limit? })                → Promise<HistoryEntry[]> // newest first
importSnoozes(pages)                  → Promise<void>
exportScheduled()                     → Promise<ScheduledPage[]> // scheduled only (v1)
clearAll()                              → Promise<void>
onChanged(callback)                     → () => void             // unsubscribe fn
migrate()                               → Promise<void>          // worker onInstalled only
```

`ScheduledPage`: `{ id, title, url, wakeAt }` where `wakeAt` is `YYYY-MM-DD`.  
`exportScheduled()` maps to legacy `{ title, url, uid, wakeUpDate }` at the seam.

### `wakeAt` invariant

Wake day is **date-only** (calendar day string). Comparisons for due pages use the same rule as v2 `toStorageDate`: `new Date(wakeAt).toISOString().split('T')[0]` (UTC day boundary). Popup button dates and stored `wakeAt` must use this consistently.

### `importSnoozes` policy

Preserve v2 behavior: merge with existing scheduled pages; **regenerate `id` on collision** with any existing id (same `while` loop as `importSnoozifiedPages`). No URL deduplication.

### `onChanged` contract

| Rule | Value |
|------|--------|
| Fires on | Any successful commit that changes scheduled state **or** appends a ledger event |
| Source | `chrome.storage.onChanged` on **both** `sync` and `local`, debounced/coalesced inside `SnoozeStore` |
| Callback args | `()` — no delta; callers re-fetch via `getScheduled()` / `getHistory()` |
| Lifecycle | Pages call `onChanged` on load, unsubscribe on unload; service worker does not subscribe |

### Export scope (v1)

- `exportScheduled()` — scheduled pages only (same JSON shape as today).
- History is local and not included in v1 export. Full `{ scheduled, history }` backup is a future `exportBackup()` if needed.

### Drop `openedDate`

Remove the `page.openedDate === undefined` filter from `openPagesDueBy`. v2 never persisted this field; scheduled list is the sole source of truth.

---

## Schema v3 (internal — not exposed to callers)

### Sync projection

```
snoozify_v3_meta  →  { v: 3, chunks: ["snoozify_v3_c0", ...] }
snoozify_v3_cN    →  [{ i, t, u, w }, ...]   // compact records, ≤ ~7 KB each
```

No `rev` field in v1 — optimistic concurrency is not implemented; multi-device races are accepted.

Chunking via `chunk-pack.js`: greedy byte-size packing (~7 KB margin). On commit: rebuild from in-memory scheduled list, diff chunk keys, remove orphans, set new chunks + meta.

### Local ledger (v1: `Woken` only)

```
snoozify_ledger_meta  →  { head: "snoozify_ledger_N", count: M }
snoozify_ledger_N     →  [ events ... ]
```

```json
{ "seq": 1, "at": "ISO-8601", "type": "Woken", "reason": "scheduled|manual", "pages": [{ "id", "title", "url" }] }
```

Append via `chunk-pack.js` rotation when chunk would exceed ~7 KB. Ring buffer: drop oldest chunks when `count` > ~500. `getHistory({ limit })` returns newest first; `meta.count` is total retained events (not including truncated).

`clearAll()` does not write a ledger event — scheduled list empty is observable via `getScheduled()`.

---

## Wake orchestration

**Store before tabs.** `snoozer.js` orchestrates; `SnoozeStore` owns storage.

```
openPagesDueBy(date):
  1. due = filter getScheduled() where wakeAt <= date (no openedDate check)
  2. if empty → return []
  3. wakeSnoozes(due.ids, 'scheduled')   // ledger append + sync projection
  4. due.forEach(p => tabs.create({ url: p.url }))
  5. return due

openPageById(uid):
  1. page = find in getScheduled()
  2. wakeSnoozes([uid], 'manual')
  3. tabs.create({ url: page.url })
```

Crash after step 3: no duplicate alarm wake (RC4 fixed). Crash during step 4: partial tab opens acceptable.

---

## Migration v2 → v3

Triggered from `worker.js` via `chrome.runtime.onInstalled` → `SnoozeStore.migrate()`.

1. If `snoozify_v3_meta` exists → no-op.
2. Read `snoozify_dates` and all `snoozify_YYYY-MM-DD` keys.
3. Normalize to `[{ id, title, url, wakeAt }]`.
4. Write v3 chunked projection + meta.
5. Remove all legacy `snoozify_*` keys (except v3 keys).
6. No ledger backfill.

Tests: `tests/storage.migration.test.js`.

---

## Implementation phases (one PR)

### Phase 1 — Documentation

- [x] This plan
- [x] ADR-0001
- [x] CONTEXT.md
- [x] Plan amendments from architecture review

### Phase 2 — SnoozeStore core

- [ ] `scripts/chunk-pack.js`
- [ ] `scripts/sync-projection.js`
- [ ] `scripts/local-ledger.js`
- [ ] `scripts/snooze-store.js` (facade + commit queue)
- [ ] In-memory adapters (injected at construction)
- [ ] Unit tests at SnoozeStore interface + `chunk-pack` tests

### Phase 3 — Migration and wiring

- [ ] `migrate()` v2 → v3
- [ ] `worker.js`: `onInstalled` + `ensureSchedulerAlarm()` (RC2)
- [ ] Replace **all** `Storage` imports with `SnoozeStore` (hard cut — no re-export)
- [ ] Store-before-tabs in `snoozer.js` (RC4)
- [ ] Flip `tests/rc-bugs.test.js` green; add RC4 test
- [ ] `tests/storage.migration.test.js`

### Phase 4 — History UI

- [ ] Rename `initializeHistory` → `renderScheduledQueue`
- [ ] History tab on `snoozified-pages` via `getHistory()`
- [ ] `onChanged` subscription for live updates
- [ ] Quota warning for **sync and local** (replace console-only `calculateStorageSize`)

### Phase 5 — Cleanup

- [ ] **Delete** `scripts/storage.js` (no thin re-export)
- [ ] Update README storage section for v3
- [ ] Update `PRIVACY.md`
- [ ] Delete redundant tests superseded by SnoozeStore interface tests

---

## Capacity reference

| Store | Role | Practical limit |
|-------|------|-----------------|
| sync | Scheduled pages | ~250–290 pages total (100 KB); ~15–25 per chunk (8 KB/item) |
| local | Woken events | ~500 retained (~200 KB); ~25,000 events theoretical at 10 MB |

---

## Files touched (expected)

| File | Change |
|------|--------|
| `scripts/chunk-pack.js` | New — shared packing |
| `scripts/sync-projection.js` | New |
| `scripts/local-ledger.js` | New |
| `scripts/snooze-store.js` | New — facade |
| `scripts/storage.js` | **Deleted** in Phase 5 (no re-export) |
| `scripts/snoozer.js` | Delegate to SnoozeStore; store-before-tabs; drop `openedDate` |
| `scripts/worker.js` | onInstalled migrate; alarm guard |
| `pages/snoozified-pages.js` | Scheduled + history UI |
| `pages/snoozified-pages.html` | History tab markup |
| `tests/snooze-store.test.js` | New |
| `tests/chunk-pack.test.js` | New |
| `tests/storage.migration.test.js` | New |
| `tests/rc-bugs.test.js` | Expectations flip to passing |
| `PRIVACY.md` | Local ledger disclosure |
| `README.md` | v3 schema summary |
