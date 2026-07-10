# ADR-0001: Active snoozes in sync, audit ledger in local storage

**Status:** Accepted  
**Date:** 2026-07-10  
**Context:** [SnoozeStore implementation plan](../plan/snooze-store.md)

## Context

Snoozify persists snoozed tabs in `chrome.storage.sync` using a per-date key layout (schema v2). Three root-cause bugs (RC1–RC3) stem from unsynchronized read-modify-write paths and non-atomic multi-key updates. Waking a tab deletes it from storage with no audit trail.

Chrome storage quotas constrain design:

| Limit | `storage.sync` | `storage.local` |
|-------|----------------|-----------------|
| Total | ~100 KB | ~10 MB |
| Per item | 8 KB | 8 KB |
| Max keys | 512 | Much higher |

Scheduled snoozes must survive device switches when the user signs into Chrome on a new machine. An append-only audit log cannot share the 100 KB sync budget with the active queue.

## Decision

1. **Scheduled snoozes** live in `chrome.storage.sync` as a chunked active projection (schema v3).
2. **Audit history** lives in `chrome.storage.local` as an append-only ledger with ring-buffer retention.
3. All mutations go through a single **SnoozeStore** module with a serialized commit queue.
4. **Wake** appends a `Woken` event to the ledger, then removes pages from the sync projection. Store before opening tabs.
5. **Migration** from v2 reads legacy sync keys, writes v3 projection, removes legacy keys. No retroactive ledger backfill.

Callers use only the SnoozeStore interface. Chunking, dual adapters, and schema version are implementation details behind the seam.

## Consequences

### Positive

- Scheduled tabs sync across device switches automatically.
- RC1 (concurrent write data loss) fixed by serializing all commits.
- RC3 (orphaned sync keys) fixed by projection rebuild with chunk diff on every commit.
- Wake history visible in UI without competing for sync quota.
- ~10 MB local headroom for ledger vs ~250 events if history were forced into sync.

### Negative

- Wake history does not follow to a new device unless the user exports it.
- Two internal adapters (sync projection, local ledger) instead of one.
- Chunking required for both areas (8 KB per-item limit applies to local too).
- Multi-device simultaneous use can race on alarm wake before sync propagates removal (accepted for v1).

### Neutral

- `PRIVACY.md` must state: scheduled tabs use Chrome sync; history is local per device.
- v1 `exportScheduled()` covers scheduled pages only (same as today). Full backup including history is a future `exportBackup()` if needed.

## Alternatives considered

**Local-only storage** — Simpler single adapter, but scheduled tabs would not auto-restore on device switch. Rejected: device-switch sync is a hard requirement.

**Sync-only, no audit ledger** — Keeps one storage area but woken tabs vanish without trace. Rejected: audit history in UI is a requirement.

**Append-only log in sync** — ~250 events fills 100 KB with no room for scheduled pages. Rejected on quota grounds.

**Single-key sync blob** — Exceeds 8 KB per-item limit for any realistic page count. Rejected.
