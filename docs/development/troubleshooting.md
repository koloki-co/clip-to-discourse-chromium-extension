<!-- SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd -->
<!-- SPDX-License-Identifier: GPL-3.0-only -->

# Troubleshooting

Never include an API key, User API key, authorization payload, device code, or private profile details in an issue, screenshot, or log.

## Extension Reload Shows Bundle Source

`popup/popup.bundle.js`, `options/options.bundle.js`, and `background.bundle.js` are generated JavaScript. Chrome DevTools shows their concatenated source when opening an extension worker or an error location. Seeing the source pane alone is not an error.

If an extension error is shown, record the error message, source location, browser version, and the exact action that triggered it. Rebuild first with `npm run bundle`, then use `chrome://extensions` to reload the unpacked extension. Do not edit a bundle directly.

## Changes Do Not Appear After Reload

Run `npm run bundle` or keep `npm run dev` running, then click Reload on the extension card in `chrome://extensions`. A browser refresh of the options page or web page alone does not reload the service worker or generated bundles.

Run `npm run version:check` if Chrome refuses a package or a release build: `manifest.json` and `package.json` must have the same version.

## Popup Cannot Read The Current Page

The popup can only inject into an ordinary active web tab after the user opens it. Chrome blocks injection into privileged pages such as `chrome://`, the Chrome Web Store, PDFs in some configurations, and browser extension pages. Open a normal HTTP or HTTPS page and try again.

The error can also occur if the active tab changed while the popup opened. Reopen the popup from the page you intend to clip.

## Browser Access Or Categories Are Not Available

The extension requests optional host access for the exact Discourse origin when a profile is saved, tested, or authorized. Accept Chrome's site-access prompt. If it was dismissed, save or test the profile again from Settings.

Categories load when the Default Category control receives a pointer interaction. Check that the profile has a valid base URL and credential, then reopen that control. The extension only lists categories visible to the configured account.

## HTTP Profile Is Rejected

HTTPS is required by default. For local development or a trusted intranet only, enter the HTTP base URL and enable **Allow HTTP connections (advanced)**. HTTP sends credentials in plaintext, so do not enable it for a public site.

## Theme Does Not Match Expectations

Choose **System** in Global Settings to follow the browser or operating system color preference while the options page or popup is open. Choose **Light** or **Dark** to override that preference. The selection is synchronised as a non-sensitive global preference; profile credentials remain local to the device.

## Connection Test Fails

Check the full status message first. The extension turns common HTTP responses into guidance:

- `401`: the stored credential may be revoked or expired; authorize again or replace the API key.
- `403`: the account lacks the requested scope, category permission, or site permission.
- `404`: verify the base URL and that the site is a supported Discourse installation.
- `429`: wait before retrying.
- `5xx`: retry later or ask the site administrator to inspect the server.

For Admin API keys, verify both the username and key. Prefer a user-scoped granular key instead of a global administrator key.

## User API Authorization Does Not Complete

Start with **Check site support**. Current Discourse sites should offer device authorization. Complete the approval in the opened Discourse page and enter the displayed device code if requested. Keep the settings page open while it polls.

If a site uses the redirect fallback, ask its administrator to allow the redirect URL shown under Authorization details. A nonce mismatch, missing payload, or decryption error means the authorization response was not valid for this request; start a new authorization rather than reusing a previous response.

## Browser Extension Tests

Install Chromium once with `npx playwright install chromium`, then run `npm run test:e2e`. The tests create a temporary persistent Chromium profile, copy the unpacked extension, use dummy credentials, and block non-loopback traffic.

Headless Chromium cannot accept extension host-permission prompts. The test fixture grants only its loopback mock API host in a temporary manifest copy and checks that the production manifest retains optional host access. Do not add broad permanent host permissions to make a test pass.

## Useful Validation Commands

```sh
npm run lint
npm test
npm run test:coverage
npm run test:e2e
npm run build
```

Use `npm run build` before committing. It lint-checks, runs unit tests, regenerates bundles, and confirms the version match.
