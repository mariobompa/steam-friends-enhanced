# Steam Friends Manager - Extension Files

This folder contains the Chrome extension code.

## Files

- **manifest.json** - Extension configuration (permissions, metadata)
- **background.js** - Service worker (minimal for MV3)
- **storage.js** - Data persistence layer using Chrome's storage.sync
- **content.js** - Main extension logic and DOM manipulation
- **ui/components.js** - UI element generation
- **ui/styles.css** - Extension styling with Steam theme
- **images/** - Extension icons (16x16, 128x128, 512x512)

## Loading the Extension

1. Open `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select this folder
5. Go to your Steam friends page to see it in action

## Development

The extension runs on `https://steamcommunity.com/*friends*` pages and:
- Detects friend entries automatically
- Adds note and group buttons to each friend
- Manages custom groups with drag-and-drop
- Persists data locally via Chrome's storage API

See the root [README.md](../README.md) for full documentation.
This extension is not affiliated with Valve Corporation or Steam. Steam is a trademark of Valve Corporation.
