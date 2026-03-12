<!-- SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd -->
<!-- SPDX-License-Identifier: GPL-3.0-only -->

# Context Menu Integration Feature

## Overview

The extension provides simple right-click context menu integration that opens the popup interface. The popup automatically detects selected text and displays relevant information to help you clip pages or selections efficiently.

## Features

### Simple Context Menu

Right-click on any page or selected text to see:

- **"Clip to Discourse"** - Opens the extension popup
- **"Clip selection to Discourse"** - Opens the extension popup (when text is selected)

Both menu items open the same popup interface, which automatically:
- Detects if text is currently selected
- Shows a visual indicator with character and word count when selection is detected
- Provides all clipping options (profile, style, destination)

### Selection Detection

When you select text on a webpage and open the popup, you'll see:

```
📝 Selection detected: 245 characters, 42 words
```

This indicator appears at the top of the popup (below the header) to confirm that your selection was captured.

**Automatic Clip Style Selection**: When a selection is detected, the popup automatically selects the "Text Selection" clip style, making it clear that you're clipping the selected text rather than the full page.

### Using Selected Text in Clips

The extension now includes a dedicated "Text Selection" clip style that automatically uses your selected text. When a selection is detected:

1. The popup shows: "📝 Selection detected: X characters, Y words"
2. The "Text Selection" clip style is automatically selected
3. The default template for text selection clips the selected text with the page title and URL

**Default Text Selection Template:**
```
### {{title}}
{{url}}

{{text-selection-markdown}}

{{url}}
```

You can customize this template in the extension settings to change how selected text is clipped.

## How to Use

### Clip a Page

1. Right-click on any page
2. Click "Clip to Discourse"
3. The popup opens with current page info
4. Select profile, clip style, and destination
5. Click "Clip" button

### Clip Selected Text

1. Select text on any webpage
2. Right-click anywhere (can be on the selection or elsewhere)
3. Click "Clip selection to Discourse" (or "Clip to Discourse")
4. The popup opens showing: "📝 Selection detected: X characters, Y words"
5. The "Text Selection" clip style is automatically selected
6. Adjust profile and destination if needed
7. Click "Clip" button - your selection will be clipped using the text selection template

### Customizing Templates for Selections

To customize how selected text is clipped:

1. Open extension settings
2. Edit a profile
3. Find the "Text Selection Template" field
4. Customize it with available tokens:
   - `{{title}}` - Page title
   - `{{url}}` - Page URL
   - `{{text-selection}}` - Plain text selection
   - `{{text-selection-markdown}}` - Markdown formatted selection
   - `{{date}}`, `{{datetime}}` - Timestamp tokens
5. Save the profile

**Example custom template:**
```
### Selected from: {{title}}

> {{text-selection-markdown}}

Source: {{url}}
Clipped: {{datetime}}
```

## Implementation Details

### Files Modified/Created

**Modified Files:**
- `popup/popup.html` - Added selection indicator element
- `popup/popup.css` - Added styling for selection indicator
- `popup/popup.js` - Added selection detection and display logic
- `background.js` - Simplified to provide basic context menu that opens popup

### How It Works

#### Selection Detection (popup.js:287-308)
When the popup opens, it:
1. Calls `getActiveTabInfo()` to extract page data and selection
2. Checks if `selectionText` exists and has content
3. Calculates character count and word count
4. Shows the selection indicator with this info

#### Selection Extraction (popup.js:76-104)
The `getActiveTabInfo()` function uses `chrome.scripting.executeScript` to:
- Get `window.getSelection()` from the active tab
- Extract both plain text (`selection.toString()`)
- Extract HTML (`selection.getRangeAt(0).cloneContents()`)
- Return both as `selectionText` and `selectionHtml`

#### Selection in Templates (shared/markdown.js:49-83)
The `buildTemplateData()` function makes selection available as:
- `text-selection` - Plain text selection
- `text-selection-markdown` - Markdown formatted (or falls back to plain text)

These tokens can be used in any profile template alongside existing tokens like `{{title}}`, `{{url}}`, `{{excerpt}}`, `{{full-text}}`, etc.

#### Context Menu (background.js)
The background service worker:
- Creates simple context menu items on installation
- Handles menu clicks by opening the popup via `chrome.action.openPopup()`
- Keeps the implementation minimal (55 lines vs 455 lines in complex version)

### Permissions Required
- `contextMenus` - Create and manage context menu items
- Existing permissions (storage, activeTab, scripting) are reused

## Testing the Feature

### Before Testing
1. Run `npm run bundle` to build the extension
2. Load the unpacked extension in Chrome (chrome://extensions/)
3. Configure at least one profile with valid Discourse credentials

### Test Cases

**Test 1: Popup Opens from Context Menu**
1. Right-click on any page
2. Click "Clip to Discourse"
3. Verify popup opens with page info

**Test 2: Selection Detection**
1. Select some text on a webpage
2. Open the popup (via icon or context menu)
3. Verify selection indicator appears: "📝 Selection detected: X characters, Y words"
4. Verify the counts are accurate

**Test 3: No Selection**
1. Click somewhere to clear any selection
2. Open the popup
3. Verify no selection indicator is shown

**Test 4: Selection in Context Menu**
1. Select text on a webpage
2. Right-click on the selection
3. Verify "Clip selection to Discourse" menu item appears
4. Click it to open popup
5. Verify selection indicator is shown

**Test 5: Clipping with Selection**
1. Select text on a page
2. Open popup
3. Choose clip style and destination
4. Click "Clip"
5. Verify the clip was created in Discourse
6. Check if selection data is included (depends on template)

**Test 6: Custom Template with Selection**
1. Open extension settings
2. Edit a profile template to include `{{text-selection-markdown}}`
3. Select text on a page
4. Open popup and clip
5. Verify the selection appears in the created post

## Advantages of This Approach

Compared to the previous complex context menu implementation:

1. **Simpler**: 55 lines instead of 455 lines in background.js
2. **Smaller bundle**: background.bundle.js is 775 bytes instead of 144.4kb
3. **More reliable**: No issues with checkbox states or menu persistence
4. **Better UX**: Users see visual confirmation of selection
5. **Consistent UI**: All options available in one familiar popup interface
6. **Easier to maintain**: Less code, fewer edge cases
7. **More flexible**: Users can adjust all settings before clipping

## Known Limitations

1. **Selection Display Only**: The popup shows selection info but doesn't force its use - templates must include `{{text-selection}}` tokens
2. **No Direct "Clip Selection Only"**: To clip only selected text, users must customize their templates
3. **Context Menu Opens Popup**: Doesn't clip directly from context menu (by design for simplicity)

## Future Enhancements

Potential improvements:
- Add a preset "Clip Selection" style that automatically uses selection-focused template
- Add quick toggle to switch between full page and selection-only modes
- Show preview of what will be clipped before submitting
- Add keyboard shortcuts for common clipping actions
- Remember last-used clip settings per domain
