<!-- SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd -->
<!-- SPDX-License-Identifier: GPL-3.0-only -->

# s/

Tiny bash wrappers for repeated processes. Run from anywhere in the repo; each one `cd`s to the repo root itself.

- `s/lint` - run ESLint.
- `s/test` - run the unit and packaged-extension e2e test suites once.
- `s/build` - lint, test, bundle, and verify versions (`npm run build`).
- `s/refresh-cws-token` - regenerate the Chrome Web Store API refresh token via Google's OAuth consent flow, writing it to the local `chrome-web-store.env` and the `chrome-web-store` GitHub Actions environment secret. Requires a browser step to approve the consent screen; see `scripts/refresh-cws-token.js` for details and the note on avoiding the 7-day Testing-mode expiry.
