# Chrome Web Store Submission Guide

This document contains everything you need to submit Steam Friends Manager to the Chrome Web Store.

## Step 1: Prepare Your Developer Account

1. Go to https://chrome.google.com/webstore/devconsole
2. Sign in with your Google account (create one if needed)
3. Pay the $5 registration fee (one-time)
4. Verify your developer account

## Step 2: Prepare Assets

### Icon (128x128 PNG)
- **File:** `steam-friends-manager/images/icon.svg` (provided)
- **Convert to PNG:** 
  - Use online tool: https://cloudconvert.com/svg-to-png
  - Set dimensions to 128x128 pixels
  - Save as `icon-128.png`
- **Upload to:** Steam Friends Manager folder as `images/icon-128.png`

### Screenshots (Chrome Web Store requires 2-3)
Create 3 screenshots (1280x800px minimum):

**Screenshot 1 - Overview**
- Show a Steam friends page with the "Create Group" button and friend rows with note/group buttons
- Caption: "Create custom groups and add notes to organize your friends"

**Screenshot 2 - Drag and Drop**
- Show a friend card being dragged with the + overlay
- Caption: "Drag and drop friends between groups for easy organization"

**Screenshot 3 - Groups**
- Show expanded groups with different organized friends
- Caption: "Collapse groups, create multiple groups, and manage easily"

**Tools to create screenshots:**
- Open Chrome DevTools on Steam friends page
- Take screenshots or use https://chrome.google.com/webstore/detail/screenshot-tool/alelhddbbkalnicklklklokjolniendo

## Step 3: Web Store Listing Copy

### Short Name (50 characters max)
```
Steam Friends Manager
```

### Short Description (132 characters max)
```
Add notes to friends, create custom groups, and organize with drag-and-drop on Steam Community.
```

### Full Description (4000 characters max)
```
# Steam Friends Manager

Organize your Steam friends like never before with this lightweight extension.

## Features

✨ **Custom Notes**
- Add personal notes to any friend
- Notes persist across sessions
- Hover to see full note text

📁 **Custom Groups**  
- Create unlimited custom friend groups
- Organize friends however you want
- Groups are stored locally, just for you

🎯 **Drag & Drop Organization**
- Drag friends between groups instantly
- Drop zones appear when dragging
- Smooth, intuitive interface

📋 **Group Management**
- Collapse/expand groups to reduce clutter
- Delete groups with one click
- See friend count per group

💾 **100% Local Storage**
- All data stored on your device
- No servers, no tracking, no analytics
- Complete privacy guaranteed

## How to Use

1. Install the extension
2. Go to your Steam friends page
3. Use the **Create Group** button to add custom groups
4. Click the **note icon** on any friend to add a note
5. Click the **folder icon** to assign friends to groups
6. Drag friends between groups or drag onto group headers

## Privacy

- ✅ No data leaves your device
- ✅ No external servers
- ✅ No analytics or tracking
- ✅ Uses only Chrome's local storage
- ✅ See full privacy policy on GitHub

## Support

Issues or suggestions? Visit the GitHub repository:
github.com/mariobompa/steam-friends-enhanced

## Note

This extension is not affiliated with Valve Corporation or Steam. Steam is a trademark of Valve Corporation.
```

## Step 4: Additional Information

**Developer Contact Email:**
- Use your Google account email

**Website (Optional):**
```
https://github.com/mariobompa/steam-friends-enhanced
```

**Category:**
- Select: **Productivity**

**Language:**
- English

**Restricted Content:**
- None (this is a standard extension)

**Content Rating:**
- Select "Everyone" - this extension has no sensitive content

**Privacy Policy:**
- Paste the content from `PRIVACY_POLICY.md` or link to GitHub raw URL:
```
https://raw.githubusercontent.com/mariobompa/steam-friends-enhanced/master/PRIVACY_POLICY.md
```

## Step 5: Package for Submission

Before uploading, ensure you have:

✅ `manifest.json` with version 1.0.0  
✅ `images/icon-128.png` (128x128 PNG)  
✅ All extension files in the folder  
✅ `.gitignore` to exclude unnecessary files  

## Step 6: Upload to Chrome Web Store

1. Go to https://chrome.google.com/webstore/devconsole
2. Click "New Item"
3. Upload the `steam-friends-manager` folder as a ZIP file
4. Fill in all the information from Step 3
5. Upload your screenshots
6. Set category to "Productivity"
7. Click "Submit for Review"

## Step 7: Wait for Approval

- Google typically reviews extensions within 1-3 days
- You'll get email updates on the status
- Once approved, it will be live on the Chrome Web Store

## After Approval

Your store page will be at:
```
https://chrome.google.com/webstore/detail/[EXTENSION_ID]
```

Users can install with a single click!

## Future Updates

After the initial release, to update:
1. Update `version` in `manifest.json`
2. Zip the folder again
3. Upload to dashboard
4. Click "Submit for Review"

Each update follows the same review process.

---

**Need Help?**
- Chrome Web Store Help: https://support.google.com/chrome_webstore
- Developer Dashboard: https://chrome.google.com/webstore/devconsole
