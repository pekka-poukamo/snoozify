# Phase 3 — Migration and wiring

**Branch:** `cursor/snooze-store-phase3-1018`  
**Status:** Done

## Implementation checklist

- [x] `migrate()` v2 → v3 in `snooze-store.js`
- [x] `worker.js`: `onInstalled` + `ensureSchedulerAlarm()` (RC2)
- [x] Replace **all** `Storage` imports with `SnoozeStore` in production code
- [x] Store-before-tabs in `snoozer.js` (RC4)
- [x] Flip `tests/rc-bugs.test.js` green; add RC4 test
- [x] `tests/storage.migration.test.js`

## Review findings (addressed)

| Finding | Resolution |
|---------|------------|
| Orphan v2 date keys not migrated | Union date keys from index + `snoozify_YYYY-MM-DD` keys |
| Legacy cleanup on v3 no-op migrate | `removeLegacyV2Keys` runs even when v3 exists |
| Alarm before migrate completes | `migrateReady` awaited in alarm handler |
| Unused `getUID` in snoozer | Removed |

## Handover notes

- `scripts/storage.js` still exists for legacy unit tests — delete in Phase 5.
- RC1–RC4 tests pass against SnoozeStore.
- Default `SnoozeStore` singleton used by all production callers.
