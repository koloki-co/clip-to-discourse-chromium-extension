<!-- SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd -->
<!-- SPDX-License-Identifier: GPL-3.0-only -->

# Releasing

Cutting a version is one command locally and one approval in GitHub. Everything
else is automatic.

## Cut the release

```bash
npm run release:dry   # confirm the version bump and changelog
npm run release       # bump, changelog, commit, tag
git push --follow-tags origin main
```

`standard-version` bumps `package.json`, `package-lock.json`, and
`manifest.json` together, so `npm run version:check` keeps passing.

Note that the version is below `1.0.0`, so `standard-version` sets `preMajor`
and a `feat` commit bumps the patch digit rather than the minor one. Pass
`--release-as minor` explicitly if a release deserves a minor bump.

## What the tag push does

Pushing a `vX.Y.Z` tag runs `.github/workflows/release.yml`:

1. **`build-and-release`** verifies the tag matches `manifest.json`, runs lint,
   unit tests, coverage thresholds, and the Playwright E2E suite, packages the
   archive, and publishes the GitHub release with it attached.
2. **`publish-chrome-web-store`** waits for approval, downloads the archive
   *from the release* rather than rebuilding it, re-checks the manifest version
   inside the archive against the tag, and uploads it to the store with
   `--auto-publish`.

Downloading the release asset instead of rebuilding is deliberate: it means the
bytes that reach the store are the bytes that were tested and published (R71).

## Required one-time setup

The store job is gated on a GitHub environment named `chrome-web-store`.

> **The gate does nothing until you configure it.** If the environment does not
> exist, GitHub creates it on first use with no protection rules and the job
> proceeds unattended. Go to **Settings -> Environments -> `chrome-web-store`**
> and add yourself under **Required reviewers**.

The gate matters because Chrome Web Store version numbers can never be reused
or rolled back. A mistaken tag that reaches the store can only be corrected by
publishing another version.

These repository secrets must be present: `CHROME_EXTENSION_ID`,
`CHROME_CLIENT_ID`, `CHROME_CLIENT_SECRET`, `CHROME_REFRESH_TOKEN`.

## Re-publishing an existing tag

If the store upload fails on its own (an expired `CHROME_REFRESH_TOKEN` is the
usual cause) the GitHub release is already published and does not need
rebuilding. Run the **Release** workflow manually with `release_tag` set to the
existing tag. It skips the build entirely and re-uploads the released archive.

Manual dispatch is also the way to publish to trusted testers rather than
publicly: a tag push always targets `public`.

## After publishing

`--auto-publish` submits the version for review; it does not make it live.
Chrome Web Store review takes anywhere from hours to days and can reject the
submission, so a green pipeline means "submitted", not "shipped".
