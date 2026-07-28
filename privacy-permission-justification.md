<!-- SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd -->
<!-- SPDX-License-Identifier: GPL-3.0-only -->

# Privacy Permission Justification

Copy the relevant text below into the Chrome Web Store Developer Dashboard's Privacy practices form. These statements describe Clip To Discourse v0.21.0.

## storage

Clip To Discourse uses extension storage to retain the user's settings, including their selected Discourse server, clipping preferences, and API credentials. This data remains in the browser's extension storage and is sent only to the Discourse server selected by the user when they create a clip.

## activeTab

Clip To Discourse uses access to the active tab only after the user invokes the extension. It reads the current page's URL, title, and user-selected or extracted content so the user can save that page as a topic or post in their Discourse instance.

## scripting

Clip To Discourse injects its own content-extraction script into the active page after the user invokes the extension. The script identifies the requested page content, such as the article text, selection, title, and canonical URL, to prepare the user's clip. It does not inject third-party code.

## identity

Clip To Discourse uses Chrome Identity only when the user chooses the optional Discourse User API authorization flow. This obtains a user-authorized Discourse API key without requiring the user to manually copy it. It is not used to sign in to an external Clip To Discourse service.

## contextMenus

Clip To Discourse adds context-menu actions so the user can create a clip directly from a page, selected text, or link. The actions run only when chosen by the user.

## Optional Site Access

The extension requests access to the user's configured Discourse server only after the user enters or authorizes that server. HTTPS access is used for normal operation. HTTP access is available only through an explicit advanced opt-in for self-hosted Discourse installations that do not support HTTPS. Site access is used solely to send the clip and authenticated request to that user-selected server.
