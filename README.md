# Snoozify

[![CI](https://github.com/pekka-poukamo/snoozify/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/pekka-poukamo/snoozify/actions/workflows/ci.yml)

Snooze browser tabs to re-open them on a chosen day. Developed for personal use, out of frustration with bloated or defunct tab snooze extensions.

- Snooze to tomorrow, any day of the week, or further ahead
- See all snoozed pages grouped by date
- Wake up pages early with one click
- Export/import your snooze list as JSON
- No account required, no external servers, no tracking

Hold shift (and alt) to see snooze options for the following week.

## Installing

Load unpacked by cloning this repo and following the [Chrome developer documentation](https://developer.chrome.com/docs/extensions/mv3/getstarted/development-basics/#load-unpacked).

## Storage and backwards compatibility

Snoozify stores data using a versioned schema in Chrome extension storage. **Backwards compatibility is a hard requirement** — users' snoozed pages must survive extension updates without data loss.

Architecture docs: [SnoozeStore plan](docs/plan/snooze-store.md) · [ADR-0001](docs/adr/0001-active-snoozes-in-sync-audit-ledger-in-local.md) · [Domain context](CONTEXT.md).

### Schema v3 (current)

| Area | Keys | Holds |
|------|------|-------|
| `chrome.storage.sync` | `snoozify_v3_meta`, `snoozify_v3_cN` | Scheduled snoozes (chunked, syncs across devices) |
| `chrome.storage.local` | `snoozify_ledger_meta`, `snoozify_ledger_N` | Wake history (`Woken` events, local per device) |

Scheduled pages use compact records `{ i, t, u, w }` (id, title, url, wake day). Wake history is append-only with ring-buffer retention (~500 events).

All storage access goes through `scripts/snooze-store.js`. Migration from v2 runs automatically on extension install/update.

### Making schema changes

1. Update `SnoozeStore` and internal projection/ledger modules
2. Add migration logic in `SnoozeStore.migrate()` (called from `worker.js` on install)
3. Add tests in `tests/storage.migration.test.js` and `tests/snooze-store.test.js`
4. Update this section and `PRIVACY.md`

## This is FYI open source

This is FYI open source. I'm sharing it for interested parties, but without any stewardship commitment. Assume that my default response to issues and pull requests will be to ignore or close them without comment. If you do something interesting with this, though, please let me know.

