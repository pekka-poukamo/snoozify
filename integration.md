# Snoozify

## Purpose
A Chrome extension that snoozes browser tabs to reopen them on a chosen day. Works entirely locally — no account, no external servers, no tracking.

## Where it runs
- **Environment**: Chrome browser extension
- **Dev**: Load unpacked from repo root in Chrome (`chrome://extensions` → Load unpacked)
- **Production**: Published on the Chrome Web Store (v1.0.0)

## Deployment
Chrome Web Store publishing — package the extension and upload via the Chrome Developer Dashboard. Dev workflow uses `web-ext` for auto-reload (see `dev-setup.sh`).

## Dependencies & integrations
- Chrome Extension APIs: `alarms`, `storage`, `tabs`
- No external services or databases

## Gotchas
- Manifest V3 extension — uses service workers, not background pages
- Hold Shift (and Alt) to see snooze options for the following week
- Export/import JSON is the only backup mechanism for snooze data
