# Publishing Snoozify to Chrome Web Store

Strategy: FYI open source, tip jar, free extension.

---

## Code changes remaining

### Add tip jar link to `pages/popup.html`
In the `.bottom-nav` div, add alongside "See snoozed pages":
```html
<a href="https://github.com/sponsors/pekka-poukamo" target="_blank">☕ Support</a>
```
(Swap URL if using Ko-fi instead.)

Once the CWS listing is live, update the README install link placeholder.

---

## External steps (require your accounts)

### Tip jar
**Option A — GitHub Sponsors** (recommended, already where the repo lives):
Go to github.com → your profile → Sponsors → "Set up GitHub Sponsors". Approval takes a few days.
URL: `https://github.com/sponsors/pekka-poukamo`

**Option B — Ko-fi** (faster setup, no approval wait):
Create account at ko-fi.com, get your page URL immediately.

### Google Developer Account
One-time $5 fee: https://chromewebstore.google.com/devconsole

### Screenshots for the listing
Load the extension as unpacked in Chrome, then capture:
1. The popup with snooze buttons visible
2. The "snoozified pages" view with a few entries

Required dimensions: **1280×800** or **640×400** PNG. Minimum 1, ideal 2–3.

### Packaging and submitting
Build the zip (output goes to `.context/web-ext-artifacts/`):
```bash
npm run pack
```
Upload the zip on the CWS developer dashboard, fill in the listing, set the privacy policy URL, submit. Review typically takes 1–3 business days.

Privacy policy URL to use:
```
https://github.com/pekka-poukamo/snoozify/blob/master/PRIVACY.md
```

---

## Store listing copy

### Short description (82 chars)
```
Snooze tabs to re-open them on a specific day. Clean, simple, no account required.
```

### Detailed description
```
Snoozify lets you snooze any browser tab to reopen it on a chosen day — tomorrow,
next Monday, or any day of the week.

No account required. No bloat. Your snoozed tabs are stored in Chrome's own sync
storage, so they follow you across your Chrome devices automatically. Nothing is
sent to any external server.

Features:
• Snooze to tomorrow, any day of this week, or further ahead
• See all your snoozed pages grouped by date
• Wake up pages early with one click
• Export and import your snooze list as JSON

Open source: github.com/pekka-poukamo/snoozify
```

### Category
Productivity

---

## CWS analytics (what you'll see after publishing)

The developer dashboard shows:
- **Weekly active users (WAU)** — the main traction signal
- **Total installs**
- **Star ratings and review text**
- **Geographic breakdown**

No individual user data. No behavioral analytics unless you add them (which would require a privacy policy update). WAU is enough to know if there's interest.
