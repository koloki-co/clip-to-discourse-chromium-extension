<!-- SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd -->
<!-- SPDX-License-Identifier: GPL-3.0-only -->

# Extending Clip Styles

A clip style is a user-selectable way to turn the page snapshot into Markdown. The existing styles are `title_url`, `excerpt`, `full_text`, and `text_selection`. Add a style only when its extraction input, template contract, and user-visible purpose are distinct.

## Style Contract

Every style needs all of the following:

| Concern | Contract |
| --- | --- |
| Identifier | A stable value in `CLIP_STYLES` in `shared/constants.js`. |
| Profile default | A valid selectable value in `DEFAULT_PROFILE.defaultClipStyle`. |
| Popup control | A labelled radio button in `popup/popup.html`. |
| Options control | A matching default option in `options/options.html`. |
| Data | Only the extraction work needed for that style. |
| Markdown | A template and token data that produces predictable `raw` post content. |
| Tests | Unit coverage for transformation and a Playwright post through the loopback Discourse mock. |

## Change Checklist

1. Add the stable identifier to `CLIP_STYLES` in `shared/constants.js`. Do not rename an existing persisted value.
2. Define a default body template in `DEFAULT_CLIP_TEMPLATES` in `shared/markdown.js` if the style needs one. Add template fields to `DEFAULT_PROFILE` and `normalizeProfile()` in `shared/settings.js` when users can customize it.
3. Add a clearly labelled radio button to `popup/popup.html` and a matching option to the Default Clip Style select in `options/options.html`.
4. Add the needed options-page template field only when a per-profile template is useful. Wire it through `fields`, `fillProfileForm()`, and `saveProfile()` in `options/options.js`.
5. Extend `buildTemplateData()` and `buildMarkdown()` in `shared/markdown.js` with only the tokens and dispatch branch the style needs. Unknown tokens intentionally expand to an empty string.
6. Add the selected-style branch in `popup/popup.js`. Keep extraction lazy: `title_url` must not trigger Readability or HTML conversion, and a new lightweight style should not do so either.
7. Keep `shared/payload.js` unchanged unless the destination payload itself changes. Clip styles control `raw`; destinations control the shape of the Discourse request.
8. Add unit tests to the closest focused suite: `shared/__tests__/markdown.test.js`, `shared/__tests__/extract.test.js`, or `popup/__tests__/popup-submit.test.js`.
9. Add the new style to the all-styles loopback scenario in `tests/e2e/popup.e2e.js`. Assert a distinguishing template marker and meaningful extracted content in the captured `/posts.json` request.
10. Update user-facing documentation, run `npm run build`, run `npm run test:coverage`, run `npm run test:e2e`, and regenerate bundles with `npm run bundle` when needed.

## Selecting The Right Extraction Input

Use the page snapshot fields already captured by `fetchActiveTabInfo()` before expanding the injected script:

- `title` and `url` suit metadata-only styles.
- `pageText` and `pageHtml` suit lightweight whole-page excerpts.
- `fullText` and `fullHtml` suit article-oriented full-page extraction.
- `selectionText` and `selectionHtml` suit selection-oriented styles.

If a new style needs a new snapshot field, add it to the injected function and test it on an ordinary web page, a page with no selection, and a privileged page where injection is denied. The popup must continue to show a useful error rather than fail silently.

## Template And Safety Rules

Page content is untrusted input. Preserve the existing Markdown safety helpers in `shared/extract.js`, including link-destination validation, code-fence sizing, and link-text escaping. Do not build markup with `innerHTML` from server or page input. The success link in the popup is intentionally constructed with DOM APIs.

Templates are profile data. Maintain sensible built-in defaults so an empty custom template preserves the established behavior. If a style introduces a new placeholder, document whether it contains Markdown, plain text, or a code-fenced value.

## Worked Mapping

`text_selection` demonstrates the full path: the popup detects selection, normalizes both selected text and selected HTML, `buildMarkdown()` chooses `textSelectionTemplate`, and the E2E test asserts that Markdown from `<strong>` survives in the submitted post. New styles should be similarly traceable from UI control to mock API request.
