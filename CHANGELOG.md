<!-- SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd -->
<!-- SPDX-License-Identifier: GPL-3.0-only -->

# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.21.1](https://github.com/koloki-co/clip-to-discourse-chromium-extension/compare/v0.21.0...v0.21.1) (2026-07-30)


### Features

* **assets:** automated screenshots, store listing copy, and live QA (R04, R05, R44) ([507ac85](https://github.com/koloki-co/clip-to-discourse-chromium-extension/commit/507ac852ab907451cffcf1d97b231e829593505f))


### Bug Fixes

* **manifest:** declare minimum_chrome_version 127 (R69) ([cb4478b](https://github.com/koloki-co/clip-to-discourse-chromium-extension/commit/cb4478b77a40704a81f32368fa6548ea21475513))
* **manifest:** remove unused notifications permission (R68) ([5b4e39c](https://github.com/koloki-co/clip-to-discourse-chromium-extension/commit/5b4e39c3acd1bcd168cd8d535a4ba6be0e19543b))
* **options:** hide the HTTP plaintext warning until Allow HTTP is enabled ([3a066aa](https://github.com/koloki-co/clip-to-discourse-chromium-extension/commit/3a066aad89de92eddc4a2b37a950d466ba490bc6))
* **options:** only show HTTP warning when user enables Allow HTTP ([4f8c2f0](https://github.com/koloki-co/clip-to-discourse-chromium-extension/commit/4f8c2f01feedc49ad66bd17cc401ecc54c48c704))
* **package:** include licence and third-party notices in release archive (R70) ([c597704](https://github.com/koloki-co/clip-to-discourse-chromium-extension/commit/c5977041b9c628a4528e4f0deb62ea9bb824acd5))
* **popup:** keep the clip form usable when a favicon cannot be decoded ([4eecbe6](https://github.com/koloki-co/clip-to-discourse-chromium-extension/commit/4eecbe633921d78ab91ff2486a66f4e7c19bab6a))

## [0.21.0](https://github.com/koloki-co/clip-to-discourse-chromium-extension/compare/v0.20.0...v0.21.0) (2026-07-27)


### Features

* **security:** disable HTTP by default with advanced opt-in (R63) ([6bad5e2](https://github.com/koloki-co/clip-to-discourse-chromium-extension/commit/6bad5e240dfd29783aa3bf84db13c6f685e416c3))
* **theme:** add system, light, and dark modes (R15-R17) ([cafab95](https://github.com/koloki-co/clip-to-discourse-chromium-extension/commit/cafab9592395a4bb72ae4caa9736b14a9bc99d46))


### Bug Fixes

* **discourse:** treat 2xx responses without JSON bodies as success (R54) ([30c4e4b](https://github.com/koloki-co/clip-to-discourse-chromium-extension/commit/30c4e4b8ac5767bff6c5f737e6c8cf0b14916938))
* **extract:** stop page content breaking out of generated markdown (R58) ([918fa84](https://github.com/koloki-co/clip-to-discourse-chromium-extension/commit/918fa84c22ea2cc749763abc93cae957c6610d37))
* **favicon:** use worker-safe APIs for icon rendering in the service worker (R62) ([000e520](https://github.com/koloki-co/clip-to-discourse-chromium-extension/commit/000e5203628b9661f31e96d048d68320fc935916))
* **options:** make device-authorization polling resilient to transient errors (R64) ([b85e055](https://github.com/koloki-co/clip-to-discourse-chromium-extension/commit/b85e055667172e4fffc72e66d47fa73d9a358cd0))
* **options:** pin long-running flows to the profile they started on (R56) ([8807e49](https://github.com/koloki-co/clip-to-discourse-chromium-extension/commit/8807e493c8ae8a512772703d5be6ec7d128a5158))
* **options:** prevent double category fetch and non-gesture permission prompts (R66) ([e3825cb](https://github.com/koloki-co/clip-to-discourse-chromium-extension/commit/e3825cb5cfb9cec7a508a5a5cb6e22618e6161b0))
* **package:** exclude source files from release archive ([4907be4](https://github.com/koloki-co/clip-to-discourse-chromium-extension/commit/4907be4cafbef896e36dd5ff26138b91f5aa6b96))
* **payload:** preserve Unicode at truncation limits (R03) ([3385aa7](https://github.com/koloki-co/clip-to-discourse-chromium-extension/commit/3385aa7ae20889fca680c496486eaa96bacc324d))
* **popup:** build the success link with DOM APIs instead of innerHTML (R59) ([3e541ce](https://github.com/koloki-co/clip-to-discourse-chromium-extension/commit/3e541ce5b959dffc6b3ea070c451f4d944d96ad2))
* **popup:** discard stale category loads after a profile switch (R57) ([d1b5b5e](https://github.com/koloki-co/clip-to-discourse-chromium-extension/commit/d1b5b5ef29474f531b06cba9ff41faf6f52e9f03))
* **popup:** handle undefined injection results with a clear error (R65) ([a8be6ed](https://github.com/koloki-co/clip-to-discourse-chromium-extension/commit/a8be6ed137fa29c535de702d9d472db8b1bbca77))
* **popup:** run only the extraction pipeline the clip style needs (R60) ([9483446](https://github.com/koloki-co/clip-to-discourse-chromium-extension/commit/94834468134d86cf2f30990e313eda70f0862797))
* **settings:** move profiles and credentials to chrome.storage.local (R61) ([30b5bf1](https://github.com/koloki-co/clip-to-discourse-chromium-extension/commit/30b5bf1cf8ea387b67ef70b00a4a1eaf8ce6cc61))
* **settings:** serialize profile storage writes across contexts (R55) ([a5c6e64](https://github.com/koloki-co/clip-to-discourse-chromium-extension/commit/a5c6e64957edcc0b07288f22a915aac826d4f780))

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
