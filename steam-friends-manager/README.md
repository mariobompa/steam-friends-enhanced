# Steam Friends Manager

Chrome Extension (Manifest V3) that enhances the Steam friends page locally.

## Features

- 📝 **Add Notes** - Write personal notes on any friend
- 📁 **Custom Groups** - Create and organize friends into custom groups
- 🎯 **Drag & Drop** - Move friends between groups effortlessly
- 💾 **Local Storage** - All data stored on your device, no servers
- ⚡ **Lightweight** - Works seamlessly on Steam Community

## How to Install

### From Chrome Web Store (Recommended)
Coming soon! Check back for the official Chrome Web Store release.

### From Source (For Developers)

1. Clone the repository:
   ```
   git clone https://github.com/mariobompa/steam-friends-enhanced.git
   ```

2. Open Chrome and go to `chrome://extensions`

3. Enable **Developer mode** (toggle on top right)

4. Click **Load unpacked**

5. Select the `steam-friends-manager` folder

6. Visit your Steam friends page to start using it!

## How to Use

1. Go to your [Steam friends page](https://steamcommunity.com/id/your-id/friends)
2. Click **Create Group** to add a custom group
3. For each friend:
   - Click the **note icon** to add/edit a note
   - Click the **folder icon** to assign to a group
4. Drag friends to reorganize or drag onto group headers
5. Click the **×** on groups to delete them

## File Structure

```
steam-friends-manager/
├── manifest.json          # Extension configuration
├── background.js          # Service worker
├── storage.js             # Data persistence layer
├── content.js             # Main extension logic
├── ui/
│   ├── components.js      # UI component generation
│   └── styles.css         # Extension styling
├── images/
│   └── icon.svg           # Extension icon
└── README.md
```

## Technical Details

- **Framework:** Vanilla JavaScript (no dependencies)
- **Storage:** Chrome's `storage.sync` (syncs across devices)
- **Permissions:** Minimal - only `storage` and `steamcommunity.com`
- **Architecture:** MV3 compliant
- **Compatibility:** Chrome/Edge and Chromium-based browsers

## Privacy

✅ **100% Local** - All data stays on your device
✅ **No Tracking** - No analytics or telemetry
✅ **No Backend** - No servers involved
✅ **No APIs** - Doesn't use Steam API

See [PRIVACY_POLICY.md](../PRIVACY_POLICY.md) for details.

## Chrome Web Store Submission

Want to release this on the Chrome Web Store? See [CHROME_WEBSTORE_SUBMISSION.md](../CHROME_WEBSTORE_SUBMISSION.md) for complete instructions.

## Development

The project uses a modular architecture:

- `storage.js` - Handles all data persistence
- `components.js` - Generates UI elements
- `content.js` - Main logic, friend detection, DOM manipulation
- `styles.css` - All styling

## Support & Feedback

Found a bug or have an idea? Open an issue on [GitHub](https://github.com/mariobompa/steam-friends-enhanced).

## License

[Add your license information here]

## Disclaimer

This extension is not affiliated with Valve Corporation or Steam. Steam is a trademark of Valve Corporation.
