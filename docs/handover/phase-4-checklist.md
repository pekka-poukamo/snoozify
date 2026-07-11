# Phase 4 — History UI

**Branch:** `cursor/snooze-store-phase4-1018`  
**Status:** Done

## Implementation checklist

- [x] Rename `initializeHistory` → `renderScheduledQueue`
- [x] History tab on `snoozified-pages` via `getHistory()`
- [x] `onChanged` subscription for live updates
- [x] Quota warning for **sync and local**

## Handover notes

- History tab shows newest `Woken` events (limit 100).
- Quota warning at 80% of sync (~100 KB) or local (~10 MB) limits.
- `onChanged` unsubscribes on `pagehide`.
