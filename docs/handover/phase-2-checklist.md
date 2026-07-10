# Phase 2 — SnoozeStore core

**Branch:** `cursor/snooze-store-phase2-1018`  
**Plan ref:** [snooze-store.md § Phase 2](../plan/snooze-store.md#phase-2--snoozestore-core)

## Implementation checklist

- [x] `scripts/chunk-pack.js` — shared greedy ~7 KB packing
- [x] `scripts/sync-projection.js` — v3 sync read/write/diff/orphan removal
- [x] `scripts/local-ledger.js` — append, rotate, ring buffer (`Woken` only)
- [x] `scripts/snooze-store.js` — facade + commit queue + public API
- [x] In-memory adapters (injected at `SnoozeStore` construction)
- [x] `vitest.setup.js` — `chrome.storage.local` mock
- [x] `tests/chunk-pack.test.js`
- [x] `tests/snooze-store.test.js`

## Verification

- [x] `npm run test:run` — 19 new tests pass; RC bug tests still fail (expected until Phase 3)
- [x] Subagent review complete; findings addressed

## Review findings (addressed)

| Finding | Resolution |
|---------|------------|
| `meta.count` cumulative vs retained | Fixed: `count: retained.length` |
| `getHistory` off commit queue | Fixed: routed through `enqueueCommit` |
| ADR wake ordering (ledger before sync) | Fixed: append ledger before `writeScheduled` |
| Write failure leaves stale memory | Fixed: `loaded = false` on persistence errors |
| Oversized single chunk record | Fixed: post-check throws in `packRecords` |
| Monotonic `seq` | Fixed: `maxSeq + 1` from prior events |
| Missing tests (limit, wake onChanged, rehydration, ring buffer) | Added |

## Handover notes

- New modules are **not wired** to callers yet — `storage.js` remains in use.
- `migrate()` throws until Phase 3.
- RC1–RC3 regression tests in `tests/rc-bugs.test.js` still target `Storage`; flip in Phase 3.
- Default export `createSnoozeStore()` instance exists but is unused by production code until Phase 3.
