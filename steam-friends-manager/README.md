# Steam Friends Manager (MVP)

Chrome Extension (Manifest V3) that enhances the Steam friends page locally.

## Features

- Runs on `https://steamcommunity.com/*friends*`
- Detects friends from `/profiles/<steamId64>` links in DOM
- Adds per-friend note (`📝` inline button + textarea save on blur)
- Assigns friend to custom groups via inline dropdown
- Persists data to `chrome.storage.sync` under key `steamFriendsManager`
- Renders a right floating sidebar for group management
- Sorts friend rows by group order, then original page order
- Re-applies safely on Steam dynamic DOM updates via `MutationObserver`

## File Structure

- `manifest.json`
- `background.js`
- `storage.js`
- `content.js`
- `ui/components.js`
- `ui/styles.css`

## Permissions

- `permissions`: `storage`
- `host_permissions`: `https://steamcommunity.com/*`

No cookies, no webRequest, no all_urls, no backend, no Steam API usage.

## Load Unpacked

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `steam-friends-manager` folder

## Manual MVP Test Checklist

1. Open Steam friends page (`https://steamcommunity.com/id/<your-id>/friends/` or equivalent)
2. Confirm inline controls appear on friend rows
3. Click `📝`, write note, blur textarea
4. Reload page and verify note persists
5. Add two groups from sidebar
6. Assign friends to groups from dropdowns
7. Verify friend rows reorder by group order
8. Delete a group and verify affected friends become ungrouped
9. Check extension has only minimal permissions in manifest
