# Contributing to Conqueror OS

Thanks for your interest in improving Conqueror OS. This project is deliberately small and dependency-free — please keep contributions in that spirit.

## Ground rules

- **No runtime dependencies.** The shipped app must remain a single self-contained HTML file with zero external requests. Do not add CDNs, fonts, or libraries to `src/index.html`.
- **Offline-first.** Any feature must work with no network access.
- **Privacy-preserving.** No analytics, telemetry, or outbound requests.
- **Accessible.** New UI should be keyboard-operable and screen-reader friendly.
- Be respectful. See [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).

## Getting started

```bash
git clone https://github.com/drsamonline/conqueror-os.git
cd conqueror-os
npm install        # dev toolchain only (minifier + headless DOM)
npm test           # run the smoke suite
npm run build      # regenerate dist/conqueror-os.html
npm run serve      # optional: http://localhost:8080
```

## How the source is organised

- `src/index.html` — **the source of truth**. The entire application (HTML, CSS, JavaScript and content) lives in this one file.
- `dist/conqueror-os.html` — generated. **Do not edit it by hand**; run `npm run build`.

When you change `src/index.html`, always rebuild `dist/` and commit both.

## Making a change

1. Fork the repository and create a branch: `git checkout -b feat/my-feature`.
2. Make your change in `src/index.html`.
3. Run `npm test` — all checks must pass.
4. Run `npm run build` and commit the regenerated `dist/conqueror-os.html`.
5. Open a pull request using the provided template.

## Commit messages

This project uses [Conventional Commits](https://www.conventionalcommits.org):

```
feat: add weekly review export
fix: correct streak calculation across DST
docs: expand architecture notes
chore: bump happy-dom
```

## Reporting bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.yml). Please include your browser and version, and whether you opened the file from `file://` or a server.

## Testing expectations

- The smoke suite lives in `tests/smoke.test.js`. Add a check for any new route or interaction.
- If you fix a bug, add a regression check where practical.

## What is out of scope

- Server-side features, accounts, or cloud sync.
- Third-party dependencies in the runtime.
- Telemetry or analytics of any kind.

Thank you for contributing.
