# Security Policy

## Reporting a vulnerability

If you believe you have found a security issue, please report it privately
rather than opening a public issue. Use GitHub's
[private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
on this repository, or contact the maintainer through the address listed on the
repository profile.

Please include:

- a description of the issue and its impact,
- steps to reproduce,
- the browser and version you tested with.

You can expect an acknowledgement within a few days.

## Supported versions

Only the latest release receives security updates.

| Version | Supported |
|---------|-----------|
| 3.x     | ✅        |
| < 3.0   | ❌        |

## Threat model and design notes

Conqueror OS is a **client-side, single-file application**. It has no server,
no backend and no network access after load.

- **No outbound connections.** A `Content-Security-Policy` meta tag sets
  `connect-src 'none'` and `default-src 'none'`, so the page cannot make network
  requests, load remote scripts, or exfiltrate data even if a bug were
  introduced. `object-src`, `base-uri` and `form-action` are all locked down.
- **Data stays local.** All user data is stored in the browser's `localStorage`
  (and IndexedDB for attachments) on the user's own device. There is no
  transmission of user content anywhere.
- **Injection.** All user-supplied and content strings are HTML-escaped before
  being inserted into the DOM. The Markdown renderer escapes input before
  formatting.
- **Optional app lock.** The PIN feature derives a key with PBKDF2 (SHA-256,
  150,000 iterations) via the Web Crypto API and stores only a salted hash. It
  is a convenience lock for the local device, not a defence against an attacker
  with access to the browser's storage.
- **Encrypted backups.** Backups can be encrypted with AES-GCM using a key
  derived from a user passphrase (PBKDF2). Losing the passphrase makes the
  backup unrecoverable by design.

## Out of scope

- An attacker who already has local access to the user's browser profile
  (they can read `localStorage` regardless of the app).
- Data loss caused by clearing browser storage — users are encouraged to export
  backups regularly.
