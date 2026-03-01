🧠 AGENT BUILD SPECIFICATION
Project: Steam Friends Manager (MVP)
1️⃣ OBJECTIVE

Build a Chrome Extension (Manifest V3) that enhances the Steam Community Friends page.

The extension must:

Run only on https://steamcommunity.com/*friends*

Read friend entries from the DOM

Extract each friend's SteamID64

Allow:

Add a note per friend

Assign friend to a custom group

Persist data locally using chrome.storage.sync

Visually reorder friends by group

Not use any Steam APIs

Not read cookies

Not send data to any backend

Not require authentication

This is a local-only MVP.

2️⃣ HARD CONSTRAINTS (DO NOT VIOLATE)

The extension MUST NOT:

Request "cookies" permission

Request "webRequest" or "declarativeNetRequest"

Request "all_urls"

Call Steam APIs

Intercept HTTP traffic

Inject remote scripts

Use eval

Access Steam session tokens

Send any data to external servers

Permissions allowed:

"storage"

"host_permissions": ["https://steamcommunity.com/*"]

Nothing else.

3️⃣ PROJECT STRUCTURE

Create this structure:

steam-friends-manager/
│
├── manifest.json
├── background.js
├── content.js
├── storage.js
└── ui/
    ├── styles.css
    └── components.js
4️⃣ MANIFEST (MV3)

Create a minimal manifest:

manifest_version: 3

name: Steam Friends Manager

version: 0.1

permissions: ["storage"]

host_permissions: ["https://steamcommunity.com/*
"]

background.service_worker: background.js

content_scripts:

matches: ["https://steamcommunity.com/
friends"]

js: ["content.js"]

css: ["ui/styles.css"]

Do not add optional permissions.

5️⃣ DATA MODEL

Use this exact storage shape:

{
  groups: [
    {
      id: string,
      name: string,
      order: number
    }
  ],
  friendsMeta: {
    [steamId: string]: {
      note: string,
      groupId: string | null
    }
  }
}

Storage key: "steamFriendsManager"

If storage empty, initialize with:

{
  groups: [],
  friendsMeta: {}
}
6️⃣ STORAGE LAYER

Implement in storage.js:

getState()

saveState(newState)

updateFriend(steamId, partialData)

addGroup(name)

deleteGroup(groupId)

All functions must use chrome.storage.sync.

No background communication required for MVP.

7️⃣ FRIEND DETECTION LOGIC

In content.js:

Detect all friend rows on the page.

Extract SteamID64 from profile links using regex:

/profiles\/(\d+)/

Store steamId as primary key.

If Steam changes layout, rely only on:

anchor tags linking to /profiles/

Do not depend on internal Steam JS variables.

8️⃣ UI INJECTION REQUIREMENTS

For each friend row:

Inject a small inline control container containing:

"📝" button (edit note)

Group dropdown selector

UI rules:

Must not break Steam layout

Must not override Steam CSS globally

Must use prefixed class names: sfm-*

When clicking note button:

Show small inline textarea

Save note on blur

When changing group dropdown:

Save groupId immediately

9️⃣ GROUP MANAGEMENT UI

Inject a floating sidebar on the right side of the page:

Fixed position panel:

Contains:

List of groups

Friend count per group

"Add Group" button

Delete group button

When adding group:

Prompt for group name

Create group with incremented order

🔟 SORTING BEHAVIOR

After loading state:

Build mapping steamId → groupId

Sort friend DOM elements by:

group.order ascending

then original order

Re-append sorted nodes into parent container.

Do not:

Remove Steam event handlers

Clone nodes

Replace nodes

Modify Steam scripts

Only reorder DOM nodes.

1️⃣1️⃣ HANDLE DYNAMIC PAGE UPDATES

Steam dynamically modifies DOM.

Implement:

MutationObserver

Observe:

document.body

childList: true

subtree: true

On mutation:

Re-run injection logic

Ensure no duplicate UI injection

Use marker attribute like:

data-sfm-injected="true"
1️⃣2️⃣ VISUAL DESIGN RULES

Keep UI minimal:

Small 12px buttons

Neutral gray background

Rounded corners

Avoid flashy colors

CSS must be fully namespaced with:

.sfm-*
1️⃣3️⃣ MVP SUCCESS CRITERIA

Extension is complete when:

Loads unpacked without errors

Detects friends

Adds note per friend

Saves notes

Reload persists notes

Can create groups

Can assign groups

Friends reorder visually

No console errors

No additional permissions required

1️⃣4️⃣ TESTING CHECKLIST

After implementation:

Load unpacked extension

Open Steam friends page

Confirm UI injected

Add note to friend

Reload page

Confirm note persists

Create 2 groups

Assign friends

Confirm sorting works

Inspect manifest permissions — must be minimal

1️⃣5️⃣ DO NOT ADD

The following features are explicitly forbidden in MVP:

Backend server

OAuth

Steam API calls

Payment integration

Sync beyond chrome.storage.sync

Analytics

Tracking scripts

1️⃣6️⃣ FUTURE-PROOFING NOTE

Code should be modular so that:

Storage layer can later be replaced with backend API

Group logic separated from DOM logic

But DO NOT implement backend now.

1️⃣7️⃣ OUTPUT FORMAT

The agent must:

Generate complete files

Not pseudo-code

Not partial snippets

Provide full project ready to zip and load unpacked

END OF SPECIFICATION