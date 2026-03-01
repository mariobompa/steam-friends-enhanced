# Steam Friends Manager

A lightweight Chrome extension that enhances your Steam friends experience with local notes, custom groups, and drag-and-drop organization.

![Steam Friends Manager](steam-friends-manager/images/icon-128.png)

## ✨ Features

- 📝 **Add Notes** - Write personal notes on any friend
- 📁 **Custom Groups** - Create and organize friends into custom groups  
- 🎯 **Drag & Drop** - Move friends between groups effortlessly
- 💾 **Local Storage** - All data stored on your device, no servers
- ⚡ **Lightweight** - Works seamlessly on Steam Community
- 🔒 **100% Private** - No tracking, no analytics, no external servers

## 🚀 Quick Start

### From Chrome Web Store (Coming Soon)
Check back for the official Chrome Web Store release!

### Manual Installation (For Testing)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/mariobompa/steam-friends-enhanced.git
   cd steam-friends-enhanced
   ```

2. **Open Chrome extensions:**
   - Go to `chrome://extensions`
   - Enable **Developer mode** (toggle on top right)

3. **Load the extension:**
   - Click **Load unpacked**
   - Select the `steam-friends-manager` folder

4. **Start using it:**
   - Go to your [Steam friends page](https://steamcommunity.com/id/your-id/friends)
   - Click **Create Group** to add custom groups
   - Use note and folder icons to organize

## 📖 How to Use

1. **Create Groups:** Click the **Create Group** button to add custom friend groups
2. **Add Notes:** Click the **note icon** on any friend to write a personal note
3. **Assign to Groups:** Click the **folder icon** to assign friends to groups
4. **Organize:** Drag friends between groups or drag onto group headers
5. **Manage:** Click the **×** on groups to delete them

## 🏗️ Project Structure

```
steam-friends-enhanced/
├── README.md                          # This file
├── PRIVACY_POLICY.md                  # Privacy details
├── CHROME_WEBSTORE_SUBMISSION.md      # Submission guide
├── MVP - plan.md                      # Original MVP plan
├── .gitignore
└── steam-friends-manager/             # Extension folder
    ├── manifest.json                  # Extension config
    ├── background.js                  # Service worker
    ├── storage.js                     # Data persistence
    ├── content.js                     # Main logic
    ├── ui/
    │   ├── components.js              # UI components
    │   └── styles.css                 # Styling
    └── images/
        ├── icon-16.png
        ├── icon-128.png
        └── icon-512.png
```

## 🔧 Technical Stack

- **Framework:** Vanilla JavaScript (zero dependencies)
- **API:** Chrome Manifest V3
- **Storage:** Chrome's `storage.sync` (syncs across devices)
- **Permissions:** Minimal - only `storage` and `steamcommunity.com`
- **Browser Support:** Chrome, Edge, and Chromium-based browsers

## 🔐 Privacy & Security

✅ **100% Local** - All data stays on your device  
✅ **No Tracking** - No analytics or telemetry  
✅ **No Backend** - No external servers  
✅ **No APIs** - Doesn't use Steam API  
✅ **Open Source** - Code is fully transparent  

Full privacy details: [PRIVACY_POLICY.md](PRIVACY_POLICY.md)

## 📤 Publishing to Chrome Web Store

Want to release this publicly? See [CHROME_WEBSTORE_SUBMISSION.md](CHROME_WEBSTORE_SUBMISSION.md) for complete step-by-step instructions.

## 🐛 Found a Bug?

Open an issue on [GitHub Issues](https://github.com/mariobompa/steam-friends-enhanced/issues) with:
- What happened
- What you expected
- Steps to reproduce

## 💡 Feature Requests

Have an idea? Create a [GitHub Discussion](https://github.com/mariobompa/steam-friends-enhanced/discussions) to share your thoughts!

## 📄 License

[Add your license here - MIT, GPL, etc.]

## ⚖️ Disclaimer

This extension is **not affiliated with Valve Corporation or Steam**. Steam is a trademark of Valve Corporation. This is an independent, community-created tool.

---

**Made with ❤️ for Steam enthusiasts**
