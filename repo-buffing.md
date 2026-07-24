<!-- SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd -->
<!-- SPDX-License-Identifier: GPL-3.0-only -->

# Repository Buffing Notes

These are reusable recommendations learned while improving Clip to Discourse. They complement `~/code/house-style` and should be considered for other browser-extension repositories.

## Browser Extension Lessons

1. Treat the browser-store listing as a deployment surface with its own release checklist, screenshot requirements, privacy disclosures, and fresh-profile QA.
2. Document the extension's trust boundary explicitly: where credentials are stored, which hosts receive data, which permissions are optional, and whether any intermediary service exists.
3. Keep generated bundles committed when the store package needs them, but identify them as generated, forbid hand-editing in agent guidance, and rebuild them during validation.
4. Test extension-specific behaviour, not only pure functions: mock `chrome.storage`, exercise settings migrations, test permission flows, and verify popup state transitions.
5. Keep `manifest.json` and package metadata in sync with an automated version check because browser extensions commonly duplicate release versions.
6. Separate user installation from contributor setup in the README; store installation, unpacked loading, bundling, reloading, packaging, and publishing are distinct workflows.
7. Prefer scoped user API keys and optional host permissions, with docs that explain the minimum permissions needed for each feature.

## README Buffing Checklist

When buffing an open source project's README, prepare an ordered plan covering this checklist before editing the README.

1. **Elevator pitch and badges** - craft a one-liner and surface only informative build, coverage, release, and licence badges.
2. **Visual hero** - specify a real screenshot or short GIF near the top that demonstrates the primary workflow.
3. **Feature highlights** - outline three to five concrete benefits with links to deeper documentation where available.
4. **Quick start** - give prerequisites, installation, and a minimal usage example, then link advanced guides.
5. **Configuration matrix** - summarize environment variables, flags, permissions, and defaults in a compact table when the project has them.
6. **Deployment guidance** - name supported targets and provide copy-pasteable deployment or packaging commands.
7. **Contribution primer** - link contribution guidance, issue templates, agent instructions, and style standards.
8. **Roadmap or changelog** - spotlight upcoming work or recent changes and link the canonical roadmap and changelog.
9. **Community touchpoints** - list only channels that actually exist; avoid decorative star, fork, or "PRs welcome" badges.
10. **Licence footer** - state the SPDX identifier, attribution, and link to the full licence.
