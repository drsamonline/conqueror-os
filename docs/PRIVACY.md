# Privacy

**Conqueror OS collects nothing. It sends nothing. It has no server.**

This document describes exactly what the application does with your data.

## No network

After the page loads, the application makes **no network requests of any kind**. This is not just a policy — it is enforced by the shipped `Content-Security-Policy`:

```
default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';
img-src data: blob:; media-src data: blob:; connect-src 'none';
object-src 'none'; base-uri 'none'; form-action 'none'
```

`connect-src 'none'` makes outbound requests impossible, and `default-src 'none'` blocks loading anything remote. There is no analytics, no telemetry, no fonts or scripts loaded from third parties, and no accounts.

## Where your data lives

All data is stored **locally on your device**, in the browser profile you use to open the file:

- **`localStorage`** — your settings, progress, notes, highlights, journal, trackers, worksheets, challenges and review state.
- **IndexedDB** — image attachments you add to journal entries.

Nothing is written anywhere else. If you open the file in a different browser or on a different device, it starts empty unless you import a backup.

## What leaves your device

Only what you explicitly export:

- **Backup (JSON)** — a plain file you choose to save or share.
- **Encrypted backup** — the same data, encrypted with AES-GCM using a passphrase you supply (PBKDF2-derived key). Without the passphrase it cannot be recovered.
- **Markdown / Word / CSV exports** — human-readable files you choose to create.

These files are created in your browser and downloaded to your device. The application does not upload them anywhere.

## Browser features used

Some optional features use browser APIs that are entirely local:

- **Read aloud** (Web Speech API) — speech synthesis runs locally. (Speech *recognition*, used only when you click "Dictate", is implemented by the browser and may use the browser vendor's own service; check your browser's documentation if this matters to you.)
- **Reminders** (Notifications API) — only fire while the tab is open; no server is involved.
- **App lock** — a PIN hashed with PBKDF2 and stored locally. It protects against casual access to the device, not against someone who can read your browser's storage.

## Clearing your data

- **Settings → Erase everything** wipes all local data (an export is offered first).
- Clearing your browser's site data for the file will also remove everything.
- Because data is local, **please export backups regularly**.

## Third parties

None. The application does not include or contact any third-party service, SDK or tracker.
