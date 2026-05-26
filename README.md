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

Snoozify stores data in `chrome.storage.sync` using a versioned schema. **Backwards compatibility is a hard requirement** — users' snoozed pages must survive extension updates without data loss.

### Current schema (v2)

| Key | Value |
|-----|-------|
| `snoozify_version` | Schema version integer (currently `2`) |
| `snoozify_dates` | `string[]` — ISO dates (`YYYY-MM-DD`) that have snoozed pages |
| `snoozify_YYYY-MM-DD` | `{page_title, page_url, page_hash}[]` — pages for that date |

### Making schema changes

1. Bump `CURRENT_SCHEMA_VERSION` in `scripts/storage.js`
2. Add a migration case in `runMigrations()` in the same file (create it if it doesn't exist yet)
3. Call `Storage.runMigrations()` from `worker.js` via `chrome.runtime.onInstalled`
4. Add tests for the migration in `tests/storage.migration.test.js`
5. Update this section

## This is FYI open source

This is FYI open source. I'm sharing it for interested parties, but without any stewardship commitment. Assume that my default response to issues and pull requests will be to ignore or close them without comment. If you do something interesting with this, though, please let me know.

