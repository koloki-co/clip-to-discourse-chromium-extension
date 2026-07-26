<!-- SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd -->
<!-- SPDX-License-Identifier: GPL-3.0-only -->

# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## Unreleased

- Harden profile, credential, HTTP transport, popup, extraction, device-authorization, category-loading, and favicon behavior following the July 2026 code review (roadmap R54-R66).

## [0.20.0](https://github.com/koloki-co/clip-to-discourse-chromium-extension/compare/v0.19.5...v0.20.0) (2026-07-24)


### Features

* harden User API auth flow and tighten content extraction ([#20](https://github.com/koloki-co/clip-to-discourse-chromium-extension/issues/20)) ([bff7f98](https://github.com/koloki-co/clip-to-discourse-chromium-extension/commit/bff7f9860d7111aebaa572f69cf33de592cfdb1c))
* improve Discourse setup and clipping workflows ([98baf37](https://github.com/koloki-co/clip-to-discourse-chromium-extension/commit/98baf371aff1cee55694ce795e4ece5782fff81e))


### Bug Fixes

* preserve Discourse connection error context ([db3296f](https://github.com/koloki-co/clip-to-discourse-chromium-extension/commit/db3296fb51d6af0759ebd2dd3e1c96c5b83a7c16))

### [0.19.5](https://github.com/koloki-co/clip-to-discourse-chromium-extension/compare/v0.19.4...v0.19.5) (2026-03-12)

### Bug Fixes

* remove unused import in popup-ui test ([6a07b0e](https://github.com/koloki-co/clip-to-discourse-chromium-extension/commit/6a07b0e9c26b4062aa08188cd49ff4e9ad7151ce))

### [0.19.4](https://github.com/koloki-co/clip-to-discourse-chromium-extension/compare/v0.19.3...v0.19.4) (2026-03-12)


### Features

* add text selection detection and dedicated clip style ([9aad2d1](https://github.com/koloki-co/clip-to-discourse-chromium-extension/commit/9aad2d1890fee464d9c806383bd36eae39e53210))
* Implement User API authentication and enhance payload handling ([93c710b](https://github.com/koloki-co/clip-to-discourse-chromium-extension/commit/93c710b59bce1e231935154191fb6506d26448b5))

### [0.19.3](https://github.com/koloki-co/clip-to-discourse-chromium-extension/compare/v0.19.2...v0.19.3) (2026-03-11)


### Features

* preserve syntax-highlighted code comments and update class/id attributes ([2d18723](https://github.com/koloki-co/clip-to-discourse-chromium-extension/commit/2d187232fd5e2a8ef671f5ba954886fe364ce26c))

### [0.19.2](https://github.com/koloki-co/clip-to-discourse-chromium-extension/compare/v0.19.1...v0.19.2) (2026-02-17)


### Bug Fixes

* remove generated artefacts from eslint ([d94bbbc](https://github.com/koloki-co/clip-to-discourse-chromium-extension/commit/d94bbbcf774f91e1c6e7fcf6bc45c973aa95deaa))

### 0.19.1 (2026-02-17)


### Features

* add Firefox porting tasks to roadmap ([f8b67ba](https://github.com/koloki-co/clip-to-discourse-chromium-extension/commit/f8b67ba5977aa192e7ddbb59cbd904a1b46306d2))
* add profiles and favicon toolbar icon ([8f18488](https://github.com/koloki-co/clip-to-discourse-chromium-extension/commit/8f18488daf5afedaddea9ba699ff7d706ad7e43e))
* enable excerpt and full text clips ([4a4f463](https://github.com/koloki-co/clip-to-discourse-chromium-extension/commit/4a4f4638d6ffdd6653aaa870efb7e1400b92fa0d))
* enhance clipping templates and add HTML to Markdown conversion ([c31ee73](https://github.com/koloki-co/clip-to-discourse-chromium-extension/commit/c31ee7349636e9a49179957fcdd7100cc5552f76))
* truncate Discourse post body at 50,000 characters ([ff2fad0](https://github.com/koloki-co/clip-to-discourse-chromium-extension/commit/ff2fad0e2e8eb3080d6fb5c5c1ea410701108e0d))
