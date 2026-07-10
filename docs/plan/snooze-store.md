# SnoozeStore implementation plan

**Status:** In progress (documentation phase)  
**ADR:** [0001 — Active snoozes in sync, audit ledger in local](../adr/0001-active-snoozes-in-sync-audit-ledger-in-local.md)  
**Domain terms:** [CONTEXT.md](../../CONTEXT.md)

Single PR, implemented in ordered phases. Each phase should leave the extension in a working state.

---

## Problem

| ID | Bug | Root cause |
|----|-----|------------|
| RC1 | Page lost when snooze races with wake | Unsynchronized read-modify-write in `snoozePages`, `removePagesByUIDs`, `importSnoozifiedPages` |
| RC2 | Alarm timer resets on service worker restart | Unconditional `chrome.alarms.create` at module load |
| RC3 | Orphan `snoozify_YYYY-MM-DD` keys after partial write | `set` then `remove` — not atomic; `set` does not delete absent keys |
| — | Woken tabs disappear with no trace | Wake deletes from storage; no audit log |

Failing regression tests: `tests/rc-bugs.test.js`.

---

## Goals

1. Scheduled snoozes sync across device switches (`chrome.storage.sync`).
2. Wake history persisted and visible in UI (`chrome.storage.local` ledger).
3. All storage mutations serialized through one module (fixes RC1, RC3).
4. Callers see a small interface — no chunk or storage-layout knowledge.
5. Backwards-compatible migration from schema v2 to v3.

## Non-goals (v1)

- Retroactive ledger entries for pre-migration snoozes.
- `meta.counts` index for popup — scan scheduled list instead.
- Cross-device deduplication of alarm wake (accepted race for v1).
- Syncing audit history across devices.

---

## Architecture

```
Callers (popup, snoozified-pages, snoozer, worker)
        │
        ▼
┌───────────────────────────────────────┐
│  SnoozeStore                          │
│  ┌─────────────┐   commit queue       │
│  │ Local       │◄──────────────────┐  │
│  │ ledger      │  append events    │  │
│  │ adapter     │───────────────────┼──┤
│  └─────────────┘  rebuild on wake  │  │
│                    ┌───────────────▼┐  │
│                    │ Projection     │  │
│                    │ builder        │  │
│                    └───────┬────────┘  │
│                            ▼           │
│                    ┌───────────────┐   │
│                    │ Sync          │   │
│                    │ projection    │   │
│                    │ adapter       │   │
│                    └───────────────┘   │
└───────────────────────────────────────┘
        │                    │
        ▼                    ▼
  storage.local        storage.sync
  (ledger)             (scheduled only)
```

### SnoozeStore interface

```javascript
scheduleSnoozes(pages, wakeAt)   → Promise<ScheduledPage[]>
wakeSnoozes(ids, reason)         → Promise<WokenPage[]>   // 'scheduled' | 'manual'
getScheduled()                   → Promise<ScheduledPage[]>
getHistory({ limit? })           → Promise<HistoryEntry[]>
importSnoozes(pages)             → Promise<void>
exportScheduled()                → Promise<ScheduledPage[]>
clearAll()                       → Promise<void>
onChanged(callback)              → () => void
migrate()                        → Promise<void>          // worker onInstalled only
```

`ScheduledPage`: `{ id, title, url, wakeAt }`  
Export format unchanged: `{ title, url, uid, wakeUpDate }` mapped at the seam.

---

## Schema v3 (internal — not exposed to callers)

### Sync projection

```
snoozify_v3_meta  →  { v: 3, rev: N, chunks: ["snoozify_v3_c0", ...] }
snoozify_v3_cN    →  [{ i, t, u, w }, ...]   // compact records, ≤ ~7 KB each
```

Chunking: greedy byte-size packing (~7 KB safety margin under 8 KB item limit). Not grouped by calendar day — grouped by serialized size.

On commit: rebuild projection from scheduled list, diff chunk keys, remove orphans, set new chunks and meta.

### Local ledger

```
snoozify_ledger_meta  →  { head: "snoozify_ledger_N", count: M }
snoozify_ledger_N     →  [ events ... ]
```

Append to current chunk; rotate when next event would exceed ~7 KB. Ring buffer: drop oldest chunks when total events > ~500.

### Event types (v1)

```json
{ "seq": 1, "at": "ISO-8601", "type": "Snoozed", "id": "...", "title": "...", "url": "...", "wakeAt": "YYYY-MM-DD" }
{ "seq": 2, "at": "ISO-8601", "type": "Woken", "reason": "scheduled|manual", "pages": [{ "id", "title", "url" }] }
{ "seq": 3, "at": "ISO-8601", "type": "Cleared", "count": 12 }
```

`Woken` snapshots title/url because pages leave sync after wake.

---

## Wake orchestration

**Store before tabs.** `snoozer.js` orchestrates; `SnoozeStore` owns storage.

```
openPagesDueBy(date):
  1. due = filter getScheduled() where wakeAt <= date
  2. if empty → return []
  3. wakeSnoozes(due.ids, 'scheduled')   // ledger + sync projection
  4. due.forEach(p => tabs.create({ url: p.url }))
  5. return due

openPageById(uid):
  1. page = find in getScheduled()
  2. wakeSnoozes([uid], 'manual')
  3. tabs.create({ url: page.url })
```

If service worker dies after step 3: page marked woken, no duplicate alarm wake. User can reopen from history.

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

### Phase 2 — SnoozeStore core

- [ ] `scripts/snooze-store.js` with commit queue
- [ ] In-memory adapters for tests
- [ ] Sync projection adapter (chunk pack/unpack)
- [ ] Local ledger adapter (append + ring buffer)
- [ ] Unit tests at SnoozeStore interface

### Phase 3 — Migration and wiring

- [ ] `migrate()` v2 → v3
- [ ] `worker.js`: `onInstalled` + `ensureSchedulerAlarm()` (RC2)
- [ ] Replace `Storage` usage in `snoozer.js`, `popup.js`, `snoozified-pages.js`
- [ ] Flip `tests/rc-bugs.test.js` expectations green
- [ ] `tests/storage.migration.test.js`

### Phase 4 — History UI

- [ ] Rename `initializeHistory` → `renderScheduledQueue`
- [ ] History tab on `snoozified-pages` via `getHistory()`
- [ ] `onChanged` subscription for live updates
- [ ] Quota warning (replace console-only `calculateStorageSize`)

### Phase 5 — Cleanup

- [ ] Remove `scripts/storage.js` (or thin re-export during transition)
- [ ] Update README storage section for v3
- [ ] Update `PRIVACY.md`
- [ ] Delete redundant tests superseded by SnoozeStore interface tests

---

## Capacity reference

| Store | Role | Practical limit |
|-------|------|-----------------|
| sync | Scheduled pages | ~250–290 pages total (100 KB); ~15–25 per chunk (8 KB/item) |
| local | Ledger events | ~500 retained (~200 KB); ~25,000 events theoretical at 10 MB |

---

## Files touched (expected)

| File | Change |
|------|--------|
| `scripts/snooze-store.js` | New deep module |
| `scripts/storage.js` | Removed after migration |
| `scripts/snoozer.js` | Delegate to SnoozeStore; store-before-tabs |
| `scripts/worker.js` | onInstalled migrate; alarm guard |
| `pages/snoozified-pages.js` | Scheduled + history UI |
| `pages/snoozified-pages.html` | History tab markup |
| `tests/snooze-store.test.js` | New |
| `tests/storage.migration.test.js` | New |
| `tests/rc-bugs.test.js` | Expectations flip to passing |
| `PRIVACY.md` | Local ledger disclosure |
| `README.md` | v3 schema summary |
