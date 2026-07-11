# Snoozify — domain context

Vocabulary for architecture reviews and implementation. Use these terms in code comments, ADRs, and docs.

## Core concepts

**Snooze** — A tab deferred to a future wake time. Has an `id`, `title`, `url`, and `wakeAt` (calendar day).

**Scheduled snooze** — A snooze still waiting to wake. Shown in the list UI and popup counts.

**Wake** — Transition from scheduled to woken: tab opens, record leaves the active projection, event appended to the ledger.

**Active projection** — Materialized set of scheduled snoozes, persisted in `chrome.storage.sync`, rebuilt on every store commit.

**Ledger** — Append-only event log in `chrome.storage.local`. v1 stores `Woken` events only. Source of truth for wake history on this device.

**Chunk** — A storage item holding a bounded array of records (≤ ~7 KB serialized), used to respect per-item quota limits.

## Storage areas

| Area | Holds | Syncs across devices |
|------|--------|----------------------|
| `chrome.storage.sync` | Active projection (scheduled snoozes only) | Yes |
| `chrome.storage.local` | Ledger (audit history) | No |

## Entry points

| Surface | Role |
|---------|------|
| Popup | Snooze highlighted tabs |
| Snoozified pages | List scheduled, wake early, export/import, history |
| Service worker | Alarm-driven wake for due pages |

## Module seam

**SnoozeStore** — Facade in `scripts/snooze-store.js` replacing `scripts/storage.js`. All storage reads and writes go through this seam. Callers know snooze lifecycle operations, not chunks, ledger keys, or sync vs local layout.

Internal modules (not imported by callers): `chunk-pack.js`, `sync-projection.js`, `local-ledger.js`.
