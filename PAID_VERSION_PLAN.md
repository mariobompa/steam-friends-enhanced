# Plan: Enhanced Version (Browser-Only, Free)

## Overview

This enhanced version adds a multi-tagging system, bulk friend management operations, friendship date analytics, and a consolidated dropdown menu for friend actions. Everything runs client-side in the browser using `chrome.storage.sync` (no backend required). All features are free.

### Key Architecture Decisions

- **No Backend**: All data stored in `chrome.storage.sync` (like existing groups/notes)
- **Groups + Tags**: Both coexist—groups for broad organization, tags for flexible multi-labeling
- **Bulk Unfriend**: Client-side operation (extension unfriends directly on Steam via API calls)
- **Single Menu**: Dropdown consolidates note, group, tags, profile, and unfriend actions
- **Friend Dates**: Call Steam API directly from extension, cache results locally
- **Payment**: Free for now; payment integration deferred to future phase when needed

---

## Implementation Steps

### 1. Tags Feature Implementation

**File**: [storage.js](steam-friends-manager/storage.js) and [ui/components.js](steam-friends-manager/ui/components.js)

**Data Model**:
- Add `state.tags = [{ id, name, color }, ...]`
- Update `friendsMeta[steamId].tags = ['tag-id-1', 'tag-id-2']` (array of tag IDs)
- Persist in `chrome.storage.sync` alongside existing groups and notes

**Tag Management UI**:
- New section in settings/panel: "Manage Tags" button
- Form: tag name input + color picker
- List: existing tags with "Edit" and "Delete" buttons
- On delete: show confirmation, remove from all friends, update chrome.storage
- On create: assign unique UUID (or timestamp-based ID)

**Tag Display on Friend Cards**:
- Render tag badges in [ui/components.js](steam-friends-manager/ui/components.js)
- Style: colored pills (5px padding, 15px border-radius, user-defined color)
- Position: below friend name or inline with other metadata
- Interaction: optional tag badges click to filter friends list

**Tag Assignment**:
- Add "Add Tags" option in friend dropdown menu
- Multi-select checkboxes showing all tags
- Display currently assigned tags as checked
- On change: update local state immediately, persist to `chrome.storage.sync`

**Tag Filtering** (Optional):
- Click tag badge to filter (show only friends with that tag)
- Or dedicated filter UI for advanced multi-tag filtering

---

### 2. Bulk Selection & Delete

**File**: [content.js](steam-friends-manager/content.js)

**Selection UI**:
- Add checkbox to each friend row (hidden by default)
- Add "Select Mode" button near "Create Group" button
- When active, show toolbar:
  - "Select All" button
  - "Deselect All" button
  - Friend count display (e.g., "3 selected")
  - "Unfriend Selected" button (red, prominent)
  - "Cancel" button to exit select mode

**Selection State**:
- `selectedFriends = new Set()` to track selected steam IDs
- Checkbox change event adds/removes from set
- "Select All" checks all visible friends
- "Deselect All" clears set

**Bulk Unfriend Operation**:
1. Show confirmation modal: "Unfriend {count} friends? This will remove them from your Steam friends list."
2. On confirm:
   - Unfriend client-side: iterate selected friends, call Steam unfriend endpoint directly (via DOM POST requests or API)
   - Show progress indicator (e.g., "2/5 unfriended...")
   - Track success/failure per friend
3. After completion:
   - Show summary: "{X} unfriended, {Y} failed"
   - Remove successful ones from the list
   - Display failures with reasons (e.g., "API error", "already removed")
4. Update `chrome.storage.sync` to remove unfriended friends
5. Exit select mode

**Error Handling**:
- Partial failures should still succeed for others
- Retry option for failed unfriends
- Don't block UI (use background operations)
- Show clear error messages

---

### 3. Friendship Duration Display

**File**: [storage.js](steam-friends-manager/storage.js), [ui/components.js](steam-friends-manager/ui/components.js)

**Data Flow**:
1. On extension load, attempt to call Steam API `ISteamUser/GetFriendList` to fetch all friendships with timestamps
2. Store in `friendsMeta[steamId].friendSince` (Unix timestamp)
3. Cache result in `chrome.storage.sync` with a timestamp
4. Refresh cache weekly or on manual refresh button click

**Display Logic**:
- Calculate duration: `new Date() - friendSince`
- Format: "Friends for 3 years, 2 months" or "1 week"
- Show in:
  - Tooltip on hover (alongside other metadata)
  - Optional: friend card subtitle or small badge
  - Optional: column in table view (if added later)

**Sorting** (Optional):
- Add sort option in settings: "Sort by friendship duration"
- Options: "Oldest first" or "Newest first"
- Apply sort alongside group sorting logic

**Refresh**:
- Manual refresh button: "Sync friendships" (calls Steam API from extension, updates all dates)
- Auto-refresh: weekly or on app startup
- Cache stored in `chrome.storage.sync` with expiry timestamp

**Error Handling**:
- If API call fails, show user message "Could not fetch friendship dates"
- Continue using cached dates if available
- Provide retry button

---

### 4. User Card Menu Consolidation

**File**: [ui/components.js](steam-friends-manager/ui/components.js)

**Current State**:
- Friend cards have inline "note" and "group" buttons

**Updated State**:
- Replace with single ⋮ (vertical ellipsis) menu button
- Dropdown menu appears on click with options:
  - "Edit Note" (opens textarea, existing behavior)
  - "Assign Group" (opens dropdown, existing behavior)
  - "Add Tags" (opens multi-select, new feature)
  - "View Profile" (opens Steam profile in new tab)
  - "Divider"
  - "Unfriend" (unfriends on Steam immediately, requires confirmation)
  - "Remove from Extension" (removes metadata but keeps Steam friendship, no confirmation needed)

**Menu Implementation**:
- Dropdown positioned relative to button (top: button height, right: 0)
- Close on click outside
- Close on selection
- Keyboard support: arrow keys to navigate, Enter to select, Escape to close
- Maintains all existing functionality through menu

**Unfriend Action**:
- Confirmation modal: "Unfriend [username]? This cannot be undone."
- On confirm: send unfriend request to Steam (direct API call from extension)
- On success: remove friend from list immediately and update `chrome.storage.sync`
- On failure: show error message with retry option

**Remove from Extension Action**:
- No confirmation needed
- Delete metadata from `friendsMeta` immediately
- Update `chrome.storage.sync`
- Friend stays on Steam's friends list

**Design**:
- Match Steam's aesthetic (dark theme, light text)
- Icons next to menu items for clarity
- Hover states for accessibility

---

### 5. UI/UX Enhancements

**File**: [ui/styles.css](steam-friends-manager/ui/styles.css), [ui/components.js](steam-friends-manager/ui/components.js)

**New Components**:
- **Tag badges**: Colored pills (5px padding, 15px border-radius, user-defined color)
- **Selection checkboxes**: Steam-styled (dark background, light checkmark)
- **Menu dropdown**: Similar to existing group dropdown (fixed positioning, shadow, padding)
- **Progress indicators**: Spinner animation for bulk operations
- **Toast notifications**: Small messages for operation results and errors
- **Settings panel**: Dedicated panel for managing tags and settings
  - Sub-sections: Manage Tags, Friend Sorting Options
  - Show last friendship sync time

**Loading States**:
- Show spinner during bulk unfriend operations
- Show progress bar (e.g., "2/10 unfriending...")
- Disable buttons during operations
- Show last sync time for friend dates

**Error Messaging**:
- Toast for operation failures: "Failed to unfriend. Retrying..."
- Modal for critical errors: "Error: [error message]"
- Inline error for failed unfriends: red text next to friend name

**Color Scheme**:
- Use existing Steam palette: `#2a475e`, `#4a9eb5`, `#c7d5e0`
- Tag backgrounds: user-defined colors with auto-adjusted text contrast
- Error: red (`#d32f2f` or similar)
- Success: green (`#43a047`)

**Accessibility**:
- Maintain high contrast ratios
- Keyboard navigation for all menus
- ARIA labels for new components
- Focus indicators for interactive elements



---

## Verification Checklist

### Steam API Integration
- [ ] Friend list fetched with timestamps (from extension, client-side)
- [ ] Friendship dates parse correctly
- [ ] Error handling for API failures
- [ ] Cache expiry logic works (7-day TTL)
- [ ] Manual refresh button updates all friendship dates
- [ ] Expired cache correctly refetches data

### Tags
- [ ] Create tag with name and color
- [ ] Assign multiple tags to friend
- [ ] Tag badges render on friend cards
- [ ] Tag colors match user selection
- [ ] Delete tag removes from all friends
- [ ] Backend persists tags correctly
- [ ] Tag filtering works (optional)

### Bulk Delete
- [ ] Select mode toggle works
- [ ] Checkboxes appear/disappear correctly
- [ ] "Select All" and "Deselect All" work
- [ ] Selected count displays
- [ ] Bulk unfriend confirmation shows count
- [ ] Unfriend operation completes successfully
- [ ] Partial failures show which friends failed and why
- [ ] Unfriended friends removed from list
- [ ] Extension storage updated after unfriending

### Friendship Dates
- [ ] Friend since dates populate on load
- [ ] Dates display correctly in tooltip
- [ ] Duration calculated correctly (e.g., "3 years, 2 months")
- [ ] Manual refresh button updates dates
- [ ] Sorting by friendship duration works
- [ ] Backend caches dates correctly

### Menu UI
- [ ] Menu button (⋮) renders on each friend card
- [ ] Menu opens on click, closes on click outside
- [ ] All menu items accessible (note, group, tags, profile, unfriend, remove)
- [ ] Existing functionality (note, group) works through menu
- [ ] Keyboard navigation works (arrows, Enter, Escape)
- [ ] Styling matches Steam aesthetic
- [ ] Unfriend action shows confirmation modal
- [ ] Remove from extension action removes metadata immediately
- [ ] Unfriended friends correct removed from list

### UI/UX
- [ ] Settings panel accessible and functional
- [ ] Last sync time displays and updates
- [ ] Toast notifications appear for errors and success
- [ ] Progress indicators show during long operations
- [ ] Tag badges render with correct colors
- [ ] Selection checkboxes visible in select mode
- [ ] Menu dropdown accessible and properly styled
- [ ] All new components follow Steam design language

---

## Technical Debt & Future Considerations

- Implement proper error logging (Sentry or similar)
- Add analytics to track feature usage (without compromising privacy)
- Consider virtual scrolling for users with 400+ friends
- Implement data export/import for backup
- Add keyboard shortcuts for power users
- Consider dark mode toggle
- Performance testing for large datasets
- Security audit for token handling

---

## Timeline Estimate

- **Tags feature**: 2-3 days
- **Bulk selection & delete**: 2-3 days
- **Friendship dates caching**: 1-2 days
- **Menu consolidation**: 2-3 days
- **Individual unfriend action in menu**: 1 day
- **Remove from extension action**: 1 day
- **UI/UX polish**: 2-3 days
- **Testing & bug fixes**: 2-3 days

**Total**: 2-3 weeks of development

---

## Success Criteria

✅ All features implemented client-side with no backend required  
✅ Tags system is intuitive and performant  
✅ Bulk unfriend works smoothly without blocking UI  
✅ Individual unfriend works with clear confirmation  
✅ Friendship dates display correctly (calculated from Steam API data)  
✅ Dropdown menu consolidates all friend actions cleanly  
✅ No regressions in existing features (groups, notes, drag-drop)  
✅ All features free and available to all users
