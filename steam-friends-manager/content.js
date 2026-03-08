(() => {
  if (!globalThis.SFMStorage) {
    return;
  }
  if (!globalThis.SFMUI) {
    return;
  }
  if (!globalThis.SFMAuth) {
    return;
  }

  const { getState, updateFriend, addGroup, updateGroup, deleteGroup, reorderGroups, addTag, updateTag, deleteTag, saveState } = globalThis.SFMStorage;
  const { createFriendControls, showManageTagsModal, showManageGroupsModal } = globalThis.SFMUI;
  const { syncFriendshipDates, calculateFriendshipDuration, formatFriendshipDate, getAccessToken, removeFriend } = globalThis.SFMAuth;

  const steamIdRegex = /\/profiles\/(\d+)/;
  const STEAM_ID64_BASE = 76561197960265728n;

  const originalOrderByRow = new WeakMap();
  const collapsedGroups = new Set();
  let nextOriginalOrder = 0;
  let applyQueued = false;
  let applyInProgress = false;
  let rerunRequested = false;
  let activeDropZones = [];

  function parseSteamId(href) {
    if (!href) {
      return null;
    }
    const match = href.match(steamIdRegex);
    return match ? match[1] : null;
  }

  function accountIdToSteamId64(accountId) {
    if (!accountId || !/^\d+$/.test(accountId)) {
      return null;
    }

    try {
      return (STEAM_ID64_BASE + BigInt(accountId)).toString();
    } catch {
      return null;
    }
  }

  function extractSteamIdFromRow(row) {
    const profileAnchors = row.querySelectorAll('a[href*="/profiles/"]');
    for (const anchor of profileAnchors) {
      const steamId = parseSteamId(anchor.href || "");
      if (steamId) {
        return steamId;
      }
    }

    const miniProfileNode = row.querySelector("[data-miniprofile]") || row;
    const miniProfileId = miniProfileNode?.getAttribute("data-miniprofile") || "";
    return accountIdToSteamId64(miniProfileId);
  }

  function getCandidateRows() {
    const searchResults = document.querySelector("#search_results");
    if (searchResults) {
      return Array.from(searchResults.querySelectorAll(".friend_block_v2, .friend_block, .friend"));
    }
    return Array.from(document.querySelectorAll(".friend_block_v2, .friend_block, .friend"));
  }

  function findFriendEntries() {
    const rows = new Map();
    const candidateRows = getCandidateRows();

    for (const row of candidateRows) {
      const steamId = extractSteamIdFromRow(row);
      if (!steamId) {
        continue;
      }

      if (!originalOrderByRow.has(row)) {
        originalOrderByRow.set(row, nextOriginalOrder++);
      }

      if (!rows.has(row)) {
        rows.set(row, steamId);
      }
    }

    return Array.from(rows.entries()).map(([row, steamId]) => ({ row, steamId }));
  }

  function extractFriendSince(row) {
    const rawText = row.textContent || "";
    const textMatch = rawText.match(/Friend since[^\n]*/i);
    if (textMatch) {
      return textMatch[0].trim();
    }

    const attrNode = row.querySelector('[title*="Friend since"], [data-tooltip-text*="Friend since"]');
    if (attrNode) {
      const title = attrNode.getAttribute("title") || attrNode.getAttribute("data-tooltip-text") || "";
      const titleMatch = title.match(/Friend since[^\n]*/i);
      if (titleMatch) {
        return titleMatch[0].trim();
      }
    }

    return "";
  }

  function extractYearsOfService(row) {
    const rawText = row.textContent || "";
    const match = rawText.match(/Years of Service: (\d+)/i);
    if (match) {
      return `Years of Service: ${match[1]}`;
    }
    return "";
  }

  function extractSteamLevel(row) {
    const rawText = row.textContent || "";
    const match = rawText.match(/Steam Level: (\d+)/i) || rawText.match(/Level (\d+)/i);
    if (match) {
      return `Steam Level: ${match[1]}`;
    }

    const levelNode = row.querySelector('[class*="level"], [class*="Level"]');
    if (levelNode) {
      const levelText = levelNode.textContent || "";
      const levelMatch = levelText.match(/(\d+)/);
      if (levelMatch) {
        return `Steam Level: ${levelMatch[1]}`;
      }
    }
    return "";
  }

  // Store friend metadata for miniprofile injection (by steamId)
  const friendMetadataCache = new Map();
  let miniprofileEnhanceTimeout = null;
  let currentlyHoveredFriendRow = null;  // Track which friend row is being hovered
  let lastHoveredAccountId = null;


  function updateFriendMetadataCache(row) {
    const steamId = extractSteamIdFromRow(row);
    if (!steamId) return;

    const note = row.getAttribute("data-sfm-note") || "";
    const tagsText = row.getAttribute("data-sfm-tags") || "";
    const friendSince = row.getAttribute("data-sfm-friend-since") || "";

    friendMetadataCache.set(steamId, {
      note: note !== "No note" ? note : "",
      tagsText,
      friendSince
    });
  }

  function extractSteamIdFromMiniprofile(miniprofileElement) {
    // Method 0: Use account id snapshot stored on miniprofile during debounce scheduling
    const targetAccountId = miniprofileElement.getAttribute('data-sfm-target-account-id');
    if (targetAccountId && targetAccountId.trim()) {
      const steamId = accountIdToSteamId64(targetAccountId);
      if (steamId) {
        miniprofileElement.setAttribute('data-sfm-steam-id', steamId);
        return steamId;
      }
    }

    // Method 1: Use the currently hovered friend row (most reliable)
    if (currentlyHoveredFriendRow) {
      const accountId = currentlyHoveredFriendRow.getAttribute('data-miniprofile');
      if (accountId && accountId.trim()) {
        const steamId = accountIdToSteamId64(accountId);
        if (steamId) {
          miniprofileElement.setAttribute('data-sfm-steam-id', steamId);
          return steamId;
        }
      }
    }

    // Method 2: Try to find the closest friend row that's being hovered (as fallback)
    const friendRow = miniprofileElement.closest('[data-miniprofile]');
    if (friendRow) {
      const accountId = friendRow.getAttribute('data-miniprofile');
      if (accountId && accountId.trim()) {
        const steamId = accountIdToSteamId64(accountId);
        if (steamId) {
          miniprofileElement.setAttribute('data-sfm-steam-id', steamId);
          return steamId;
        }
      }
    }

    // Method 3: Try to get the account ID from data-miniprofile attribute inside the miniprofile
    const miniprofileLink = miniprofileElement.querySelector('[data-miniprofile]');
    if (miniprofileLink) {
      const accountId = miniprofileLink.getAttribute('data-miniprofile');
      if (accountId && accountId.trim()) {
        const steamId = accountIdToSteamId64(accountId);
        if (steamId) {
          miniprofileElement.setAttribute('data-sfm-steam-id', steamId);
          return steamId;
        }
      }
    }

    // Method 4: Try to find steamid from profile links in the miniprofile
    const profileLinks = miniprofileElement.querySelectorAll('a[href*="/profiles/"], a[href*="/id/"]');
    
    for (const link of profileLinks) {
      const steamId = parseSteamId(link.href);
      if (steamId) {
        miniprofileElement.setAttribute('data-sfm-steam-id', steamId);
        return steamId;
      }
    }
    
    return null;
  }

  function enhanceMiniprofileDebounced(miniprofileElement) {
    // Clear any pending enhancement
    if (miniprofileEnhanceTimeout) {
      clearTimeout(miniprofileEnhanceTimeout);
    }

    // Snapshot the hover target for this enhancement cycle
    const hoveredAccountId = currentlyHoveredFriendRow?.getAttribute('data-miniprofile') || lastHoveredAccountId;
    if (hoveredAccountId) {
      miniprofileElement.setAttribute('data-sfm-target-account-id', hoveredAccountId);
    } else {
      miniprofileElement.removeAttribute('data-sfm-target-account-id');
    }

    // Immediately clear previous injected content so stale data doesn't flash
    const existingSection = miniprofileElement.querySelector('.sfm-miniprofile-section');
    if (existingSection) {
      existingSection.remove();
    }

    // Slight delay to let Steam finish swapping miniprofile content before injecting ours
    miniprofileEnhanceTimeout = setTimeout(() => {
      enhanceMiniprofile(miniprofileElement);
    }, 120);
  }

  function enhanceMiniprofile(miniprofileElement) {
    // Extract steamid from the miniprofile content
    const steamId = extractSteamIdFromMiniprofile(miniprofileElement);
    if (!steamId) {
      return;
    }

    const metadata = friendMetadataCache.get(steamId);
    if (!metadata) {
      return;
    }

    const { note, tagsText, friendSince } = metadata;

    const existingSection = miniprofileElement.querySelector('.sfm-miniprofile-section');

    // Show if we have ANY content to display
    if (!note && !tagsText && !friendSince) {
      if (existingSection) {
        existingSection.remove();
      }
      // Clear tracking attributes since we have no content
      miniprofileElement.removeAttribute('data-sfm-last-id');
      miniprofileElement.removeAttribute('data-sfm-steam-id');
      return;
    }

    // Remove any existing content first
    if (existingSection) {
      existingSection.remove();
    }

    // Find the details section to inject our content
    const detailsSection = miniprofileElement.querySelector(".miniprofile_detailssection");
    if (!detailsSection) {
      return;
    }

    // Create our custom container with inline styles
    const sfmContainer = document.createElement("div");
    sfmContainer.className = "sfm-miniprofile-section";
    sfmContainer.style.cssText = "border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px; margin-top: 8px; display: block;";

    // Add friendship duration first (if available)
    if (friendSince) {
      const friendSinceDiv = document.createElement("div");
      friendSinceDiv.className = "sfm-miniprofile-item miniprofile_featuredcontainer";
      friendSinceDiv.style.cssText = "display: flex; align-items: center; gap: 8px; padding: 2px 0; margin-bottom: 6px; font-size: 12px; line-height: 1.4; color: #c7d5e0;";
      const friendSinceIcon = document.createElement("span");
      friendSinceIcon.className = "sfm-miniprofile-icon";
      friendSinceIcon.textContent = "🕐";
      friendSinceIcon.style.cssText = "flex-shrink: 0; font-size: 13px;";
      const friendSinceText = document.createElement("span");
      friendSinceText.className = "sfm-miniprofile-text";
      friendSinceText.textContent = friendSince;
      friendSinceText.style.cssText = "flex: 1; overflow-wrap: anywhere;";
      friendSinceDiv.appendChild(friendSinceIcon);
      friendSinceDiv.appendChild(friendSinceText);
      sfmContainer.appendChild(friendSinceDiv);
    }

    // Add note
    if (note) {
      const noteDiv = document.createElement("div");
      noteDiv.className = "sfm-miniprofile-item miniprofile_featuredcontainer";
      noteDiv.style.cssText = "display: flex; align-items: center; gap: 8px; padding: 2px 0; margin-bottom: 6px; font-size: 12px; line-height: 1.4; color: #c7d5e0;";
      const noteIcon = document.createElement("span");
      noteIcon.className = "sfm-miniprofile-icon";
      noteIcon.textContent = "📝";
      noteIcon.style.cssText = "flex-shrink: 0; font-size: 13px;";
      const noteText = document.createElement("span");
      noteText.className = "sfm-miniprofile-text";
      noteText.textContent = note;
      noteText.style.cssText = "flex: 1; overflow-wrap: anywhere;";
      noteDiv.appendChild(noteIcon);
      noteDiv.appendChild(noteText);
      sfmContainer.appendChild(noteDiv);
    }

    // Add tags
    if (tagsText) {
      const tagsDiv = document.createElement("div");
      tagsDiv.className = "sfm-miniprofile-item miniprofile_featuredcontainer";
      tagsDiv.style.cssText = "display: flex; align-items: center; gap: 8px; padding: 2px 0; margin-bottom: 0; font-size: 12px; line-height: 1.4; color: #c7d5e0;";
      const tagsIcon = document.createElement("span");
      tagsIcon.className = "sfm-miniprofile-icon";
      tagsIcon.textContent = "🏷️";
      tagsIcon.style.cssText = "flex-shrink: 0; font-size: 13px;";
      const tagsTextSpan = document.createElement("span");
      tagsTextSpan.className = "sfm-miniprofile-text";
      tagsTextSpan.textContent = tagsText;
      tagsTextSpan.style.cssText = "flex: 1; overflow-wrap: anywhere;";
      tagsDiv.appendChild(tagsIcon);
      tagsDiv.appendChild(tagsTextSpan);
      sfmContainer.appendChild(tagsDiv);
    }

    // Insert at the bottom of details section
    detailsSection.appendChild(sfmContainer);
    
    // Remember which friend we're showing to prevent duplicate enhancements
    miniprofileElement.setAttribute('data-sfm-last-id', steamId);
  }

  function buildCounts(state, entries) {
    const countsByGroupId = {};
    for (const entry of entries) {
      const groupId = state.friendsMeta[entry.steamId]?.groupId;
      if (!groupId) {
        continue;
      }
      countsByGroupId[groupId] = (countsByGroupId[groupId] || 0) + 1;
    }
    return countsByGroupId;
  }

  function createGroupHeader(groupKey, label, count, state) {
    const header = document.createElement("button");
    header.type = "button";
    header.className = "sfm-group-header";
    header.setAttribute("data-sfm-group-key", groupKey);
    header.setAttribute("data-sfm-drop-zone", groupKey);

    const collapsed = collapsedGroups.has(groupKey);
    header.textContent = `${collapsed ? "▸" : "▾"} ${label} (${count})`;

    header.addEventListener("click", () => {
      if (collapsedGroups.has(groupKey)) {
        collapsedGroups.delete(groupKey);
      } else {
        collapsedGroups.add(groupKey);
      }
      queueApply();
    });

    if (groupKey !== "__ungrouped__") {
      const deleteBtn = document.createElement("span");
      deleteBtn.className = "sfm-group-delete";
      deleteBtn.textContent = "×";
      deleteBtn.title = "Delete group";
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteGroupFlow(groupKey);
      });
      header.appendChild(deleteBtn);
    }

    header.addEventListener("dragover", (e) => {
      e.preventDefault();
      header.classList.add("sfm-drag-over");
    });

    header.addEventListener("dragleave", () => {
      header.classList.remove("sfm-drag-over");
    });

    header.addEventListener("drop", async (e) => {
      e.preventDefault();
      header.classList.remove("sfm-drag-over");
      const steamId = e.dataTransfer.getData("text/plain");
      if (steamId) {
        const targetGroupId = groupKey === "__ungrouped__" ? null : groupKey;
        await updateFriend(steamId, { groupId: targetGroupId });
        queueApply();
      }
    });

    return header;
  }

  function sortFriendRows(state, entries) {
    const groupOrder = new Map(state.groups.map((group) => [group.id, group.order]));
    const groupNames = new Map(state.groups.map((group) => [group.id, group.name]));
    const entriesByParent = new Map();

    for (const entry of entries) {
      const parent = entry.row.parentElement;
      if (!parent) {
        continue;
      }
      if (!entriesByParent.has(parent)) {
        entriesByParent.set(parent, []);
      }
      entriesByParent.get(parent).push(entry);
    }

    entriesByParent.forEach((parentEntries, parent) => {
      const oldHeaders = parent.querySelectorAll(".sfm-group-header");
      for (const header of oldHeaders) {
        header.remove();
      }

      parentEntries.sort((a, b) => {
        const groupA = state.friendsMeta[a.steamId]?.groupId || null;
        const groupB = state.friendsMeta[b.steamId]?.groupId || null;

        const orderA = groupA && groupOrder.has(groupA) ? groupOrder.get(groupA) : Number.MAX_SAFE_INTEGER;
        const orderB = groupB && groupOrder.has(groupB) ? groupOrder.get(groupB) : Number.MAX_SAFE_INTEGER;

        if (orderA !== orderB) {
          return orderA - orderB;
        }

        return (originalOrderByRow.get(a.row) || 0) - (originalOrderByRow.get(b.row) || 0);
      });

      const grouped = new Map();
      for (const entry of parentEntries) {
        const groupId = state.friendsMeta[entry.steamId]?.groupId || "__ungrouped__";
        if (!grouped.has(groupId)) {
          grouped.set(groupId, []);
        }
        grouped.get(groupId).push(entry);
      }

      for (const [groupKey, groupEntries] of grouped.entries()) {
        const label = groupKey === "__ungrouped__" ? "No group" : (groupNames.get(groupKey) || "No group");
        const header = createGroupHeader(groupKey, label, groupEntries.length, state);
        header.setAttribute("data-group-key", groupKey);
        parent.appendChild(header);

        const collapsed = collapsedGroups.has(groupKey);
        for (const entry of groupEntries) {
          entry.row.style.display = collapsed ? "none" : "";
          entry.row.setAttribute("draggable", "true");
          entry.row.setAttribute("data-sfm-steamid", entry.steamId);
          entry.row.setAttribute("data-in-group", groupKey);
          
          // Only add drag listeners once
          if (!entry.row.hasAttribute("data-sfm-drag-setup")) {
            entry.row.setAttribute("data-sfm-drag-setup", "true");
            
            entry.row.addEventListener("dragstart", (e) => {
              e.dataTransfer.setData("text/plain", entry.steamId);
              entry.row.classList.add("sfm-dragging");
              
              // Create custom drag image
              const avatar = entry.row.querySelector(".player_avatar img");
              const playerName = entry.row.querySelector(".friend_block_content");
              
              if (avatar && playerName) {
                const dragImage = document.createElement("div");
                dragImage.className = "sfm-drag-image";
                dragImage.style.position = "fixed";
                dragImage.style.top = "-9999px";
                dragImage.style.left = "-9999px";
                dragImage.style.width = "220px";
                dragImage.style.background = "#2a3a47";
                dragImage.style.border = "1px solid #4a9eb5";
                dragImage.style.borderRadius = "4px";
                dragImage.style.padding = "8px";
                dragImage.style.display = "flex";
                dragImage.style.gap = "10px";
                dragImage.style.zIndex = "99999";
                
                const avatarClone = avatar.cloneNode(true);
                avatarClone.style.width = "40px";
                avatarClone.style.height = "40px";
                avatarClone.style.borderRadius = "3px";
                avatarClone.style.flexShrink = "0";
                
                const textContainer = document.createElement("div");
                textContainer.style.display = "flex";
                textContainer.style.flexDirection = "column";
                textContainer.style.justifyContent = "center";
                textContainer.style.color = "#c7d5e0";
                textContainer.style.fontSize = "12px";
                textContainer.style.minWidth = "0";
                
                const nameEl = playerName.querySelector(".friend_block_content") || playerName;
                const nameText = nameEl.textContent.split("\\n")[0].trim();
                
                const name = document.createElement("div");
                name.textContent = nameText;
                name.style.fontWeight = "600";
                name.style.overflow = "hidden";
                name.style.textOverflow = "ellipsis";
                
                const lastOnline = entry.row.querySelector(".friend_last_online_text");
                const status = document.createElement("div");
                status.textContent = lastOnline ? lastOnline.textContent.trim() : "Offline";
                status.style.fontSize = "11px";
                status.style.color = "#a8b4bf";
                status.style.overflow = "hidden";
                status.style.textOverflow = "ellipsis";
                
                textContainer.appendChild(name);
                textContainer.appendChild(status);
                dragImage.appendChild(avatarClone);
                dragImage.appendChild(textContainer);
                
                document.body.appendChild(dragImage);
                e.dataTransfer.setDragImage(dragImage, 50, 20);
                
                // Clean up after drag starts
                setTimeout(() => {
                  if (dragImage.parentElement) {
                    dragImage.parentElement.removeChild(dragImage);
                  }
                }, 0);
              }
              
              showDropZones();
            });
            
            entry.row.addEventListener("dragend", () => {
              entry.row.classList.remove("sfm-dragging");
              hideDropZones();
            });
          }
          
          parent.appendChild(entry.row);
        }
      }
    });
  }

  async function addGroupFlow() {
    const name = window.prompt("New group name:");
    if (!name) {
      return;
    }
    const result = await addGroup(name);
    queueApply();
  }

  async function deleteGroupFlow(groupId) {
    if (!window.confirm("Delete this group?")) {
      return;
    }
    collapsedGroups.delete(groupId);
    await deleteGroup(groupId);
    queueApply();
  }

  function showDropZones() {
    hideDropZones();
    const headers = document.querySelectorAll(".sfm-group-header");
    
    headers.forEach(header => {
      const groupKey = header.getAttribute("data-group-key");
      if (!groupKey) return;
      
      const collapsed = collapsedGroups.has(groupKey);
      if (collapsed) return;
      
      const friendRows = [];
      let nextSibling = header.nextElementSibling;
      while (nextSibling && !nextSibling.classList.contains("sfm-group-header")) {
        if (nextSibling.classList.contains("friend_block_v2")) {
          friendRows.push(nextSibling);
        }
        nextSibling = nextSibling.nextElementSibling;
      }
      
      if (friendRows.length === 0) return;
      
      const firstRow = friendRows[0];
      const lastRow = friendRows[friendRows.length - 1];
      const container = firstRow.parentElement;
      const containerRect = container.getBoundingClientRect();
      const firstRect = firstRow.getBoundingClientRect();
      const lastRect = lastRow.getBoundingClientRect();
      
      const dropZone = document.createElement("div");
      dropZone.className = "sfm-drop-zone";
      dropZone.setAttribute("data-drop-group", groupKey);
      dropZone.innerHTML = '<div class="sfm-drop-zone-icon">+</div>';
      
      dropZone.style.position = "fixed";
      dropZone.style.left = `${containerRect.left}px`;
      dropZone.style.top = `${firstRect.top}px`;
      dropZone.style.width = `${containerRect.width}px`;
      dropZone.style.height = `${lastRect.bottom - firstRect.top}px`;
      
      dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("sfm-drop-zone-active");
      });
      
      dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("sfm-drop-zone-active");
      });
      
      dropZone.addEventListener("drop", async (e) => {
        e.preventDefault();
        dropZone.classList.remove("sfm-drop-zone-active");
        const steamId = e.dataTransfer.getData("text/plain");
        if (steamId) {
          const targetGroupId = groupKey === "__ungrouped__" ? null : groupKey;
          await updateFriend(steamId, { groupId: targetGroupId });
          hideDropZones();
          queueApply();
        }
      });
      
      document.body.appendChild(dropZone);
      activeDropZones.push(dropZone);
      
      // Enable pointer events after a brief moment to allow drag to initiate
      setTimeout(() => {
        dropZone.style.pointerEvents = "auto";
      }, 50);
    });
  }

  function hideDropZones() {
    activeDropZones.forEach(zone => {
      if (zone.parentElement) {
        zone.parentElement.removeChild(zone);
      }
    });
    activeDropZones = [];
    
    // Cleanup any stray drop zones
    const strayZones = document.querySelectorAll(".sfm-drop-zone");
    strayZones.forEach(zone => {
      if (zone.parentElement) {
        zone.parentElement.removeChild(zone);
      }
    });
  }



  function injectSidebarManagementSection() {
    // Check if already injected
    if (document.getElementById("sfm-sidebar-section")) {
      return;
    }

    // Find the Groups section in the sidebar
    const friendsNav = document.querySelector('.friends_nav');
    if (!friendsNav) {
      return;
    }

    // Find the last item in Groups section (Create Group... link)
    const createGroupLink = Array.from(friendsNav.querySelectorAll('a')).find(
      a => a.textContent.trim() === 'Create Group...'
    );
    
    if (!createGroupLink) {
      return;
    }

    // Create Friends Manager section
    const managerSection = document.createElement('div');
    managerSection.id = 'sfm-sidebar-section';

    const sectionHeader = document.createElement('h4');
    sectionHeader.textContent = 'Friends Manager';
    managerSection.appendChild(sectionHeader);

    // Manage Groups link with overlapping profiles icon
    const manageGroupsLink = document.createElement('a');
    manageGroupsLink.className = 'sfm-sidebar-link';
    manageGroupsLink.href = '#';
    manageGroupsLink.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 8px; vertical-align: middle;"><path d="M6 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-5 6s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H1zM11 3.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5zm.5 2.5a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1h-4zm2 3a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1h-2zm0 3a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1h-2z" opacity="0.4"/><path d="M11 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm5 6s1 0 1-1-1-4-6-4-6 3-6 4 1 1 1 1h10z"/></svg><span class="title">Manage Groups</span>';
    manageGroupsLink.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const state = await getState();
      const entries = findFriendEntries();
      const friendCounts = buildCounts(state, entries);
      showManageGroupsModal({
        groups: [...state.groups],
        friendCounts,
        onUpdateGroup: async (groupId, updates) => {
          const result = await updateGroup(groupId, updates);
          if (result) queueApply();
          return result;
        },
        onDeleteGroup: async (groupId) => {
          const result = await deleteGroup(groupId);
          if (result) queueApply();
          return result;
        },
        onReorderGroups: async (orderedIds) => {
          const result = await reorderGroups(orderedIds);
          if (result) queueApply();
          return result;
        },
        onCreateGroup: async (name) => {
          const result = await addGroup(name);
          if (result) queueApply();
          return result;
        },
        onClose: () => queueApply()
      });
    });
    managerSection.appendChild(manageGroupsLink);

    // Manage Tags link with tag icon
    const manageTagsLink = document.createElement('a');
    manageTagsLink.className = 'sfm-sidebar-link';
    manageTagsLink.href = '#';
    manageTagsLink.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 8px; vertical-align: middle;"><path d="M2 2a1 1 0 0 1 1-1h4.586a1 1 0 0 1 .707.293l7 7a1 1 0 0 1 0 1.414l-4.586 4.586a1 1 0 0 1-1.414 0l-7-7A1 1 0 0 1 2 6.586V2zm3.5 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/><path d="M1.293 7.793A1 1 0 0 1 1 7.086V2a1 1 0 0 0-1 1v4.586a1 1 0 0 0 .293.707l7 7a1 1 0 0 0 1.414 0l.043-.043-7.457-7.457z"/></svg><span class="title">Manage Tags</span>';
    manageTagsLink.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const state = await getState();
      showManageTagsModal({
        tags: [...(state.tags || [])],
        onUpdateTag: async (tagId, updates) => {
          const result = await updateTag(tagId, updates);
          if (result) queueApply();
          return result;
        },
        onDeleteTag: async (tagId) => {
          const result = await deleteTag(tagId);
          if (result) queueApply();
          return result;
        },
        onCreateTag: async (name, color) => {
          const result = await addTag(name, color);
          if (result) queueApply();
          return result;
        },
        onClose: () => queueApply()
      });
    });
    managerSection.appendChild(manageTagsLink);

    // Insert after Create Group link
    createGroupLink.insertAdjacentElement('afterend', managerSection);
  }

  async function injectControls(state, entries) {
    for (const entry of entries) {
      const { row, steamId } = entry;
      const currentMeta = state.friendsMeta[steamId] || { note: "", groupId: null };

      if (row.sfmManageModeObserver) {
        row.sfmManageModeObserver.disconnect();
        row.sfmManageModeObserver = null;
      }

      const existingControls = row.querySelector(`.sfm-friend-controls[data-sfm-controls="${steamId}"], .sfm-inline-controls[data-sfm-controls="${steamId}"]`);
      if (row.getAttribute("data-sfm-injected") === "true" && existingControls) {
        existingControls.remove();
      } else {
        const anyControls = row.querySelectorAll(".sfm-friend-controls, .sfm-inline-controls");
        for (const controls of anyControls) {
          controls.remove();
        }
      }

      row.setAttribute("data-sfm-note", currentMeta.note || "No note");
      
      // Show friendship duration if available from API, otherwise show text from DOM
      let friendSinceText = extractFriendSince(row);
      if (currentMeta.friendSince && Number.isFinite(currentMeta.friendSince)) {
        const duration = calculateFriendshipDuration(currentMeta.friendSince);
        const date = formatFriendshipDate(currentMeta.friendSince);
        friendSinceText = duration ? `Friend since ${date} (${duration})` : `Friend since ${date}`;
      }
      row.setAttribute("data-sfm-friend-since", friendSinceText);
      
      row.setAttribute("data-sfm-years-service", extractYearsOfService(row));
      row.setAttribute("data-sfm-steam-level", extractSteamLevel(row));

      const selectedTagIds = Array.isArray(currentMeta.tags) ? currentMeta.tags : [];
      const selectedTags = (state.tags || []).filter((tag) => selectedTagIds.includes(tag.id));
      row.setAttribute(
        "data-sfm-tags",
        selectedTags.length ? selectedTags.map((tag) => tag.name).join(", ") : ""
      );

      const existingTagContainer = row.querySelector(".sfm-row-tags");
      if (existingTagContainer) {
        existingTagContainer.remove();
      }

      // Store tags for later insertion into controls
      row.sfmSelectedTags = selectedTags;

      function darkenColor(hexColor, factor) {
        const r = parseInt(hexColor.substr(1, 2), 16);
        const g = parseInt(hexColor.substr(3, 2), 16);
        const b = parseInt(hexColor.substr(5, 2), 16);
        
        const newR = Math.max(0, Math.floor(r * (1 - factor)));
        const newG = Math.max(0, Math.floor(g * (1 - factor)));
        const newB = Math.max(0, Math.floor(b * (1 - factor)));
        
        return "#" + [newR, newG, newB].map(x => x.toString(16).padStart(2, "0")).join("");
      }

      function lightenColor(hexColor, factor) {
        const r = parseInt(hexColor.substr(1, 2), 16);
        const g = parseInt(hexColor.substr(3, 2), 16);
        const b = parseInt(hexColor.substr(5, 2), 16);

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);

        const newMax = Math.min(255, max);
        const newMin = Math.min(255, Math.round(min + (255 - min) * (factor * 0.35)));

        let newR, newG, newB;
        if (r === max) {
          newR = newMax;
          newG = g === min ? newMin : Math.min(255, Math.round(g + (g - min) * (factor * 0.3)));
          newB = b === min ? newMin : Math.min(255, Math.round(b + (b - min) * (factor * 0.3)));
        } else if (g === max) {
          newG = newMax;
          newR = r === min ? newMin : Math.min(255, Math.round(r + (r - min) * (factor * 0.3)));
          newB = b === min ? newMin : Math.min(255, Math.round(b + (b - min) * (factor * 0.3)));
        } else {
          newB = newMax;
          newR = r === min ? newMin : Math.min(255, Math.round(r + (r - min) * (factor * 0.3)));
          newG = g === min ? newMin : Math.min(255, Math.round(g + (g - min) * (factor * 0.3)));
        }

        return "#" + [newR, newG, newB].map(x => x.toString(16).padStart(2, "0")).join("");
      }

      updateFriendMetadataCache(row);

      // Extract profile URL
      let profileUrl = null;
      const profileAnchors = row.querySelectorAll('a[href*="/profiles/"]');
      for (const anchor of profileAnchors) {
        const href = anchor?.href;
        if (href && href.includes("/profiles/")) {
          profileUrl = href;
          break;
        }
      }

      const controls = createFriendControls({
        steamId,
        currentMeta,
        groups: state.groups,
        tags: state.tags || [],
        onEditNote: async (note) => {
          await updateFriend(steamId, { note });
          row.setAttribute("data-sfm-note", note || "No note");
          const tooltip = document.getElementById("sfm-hover-tooltip");
          if (tooltip && tooltip.classList.contains("sfm-visible")) {
            tooltip.classList.remove("sfm-visible");
          }
        },
        onGroupChange: async (groupId) => {
          await updateFriend(steamId, { groupId });
          queueApply();
        },
        onTagsChange: async (tagIds) => {
          await updateFriend(steamId, { tags: tagIds });
          const tooltip = document.getElementById("sfm-hover-tooltip");
          if (tooltip && tooltip.classList.contains("sfm-visible")) {
            tooltip.classList.remove("sfm-visible");
          }
        },
        onCreateTag: async (tagName, color) => {
          const state = await getState();
          const normalizedName = String(tagName || "").trim().toLowerCase();
          const exists = (state.tags || []).some(
            (tag) => String(tag.name || "").trim().toLowerCase() === normalizedName
          );

          if (!normalizedName || exists) {
            return false;
          }

          const createdTag = await addTag(tagName, color);
          if (createdTag) {
            queueApply();
            return true;
          }

          return false;
        },
        onUnfriend: async () => {
          try {
            // Get access token and unfriend via Steam API
            const accessToken = await getAccessToken();
            if (!accessToken) {
              alert("Could not authenticate with Steam API. Please make sure you're logged into Steam Community.");
              return;
            }

            const success = await removeFriend(steamId, accessToken);

            if (success) {
              // Remove from extension state
              const state = await getState();
              delete state.friendsMeta[steamId];
              await saveState(state);
              // Trigger re-apply to remove from UI
              row.remove();
              queueApply();
            } else {
              alert("Failed to unfriend. Please try again.");
            }
          } catch (error) {
            console.error("Error unfriending:", error);
            alert("Error unfriending. Please try again.");
          }
        },
        profileUrl
      });

      row.classList.add("sfm-row-host");
      row.appendChild(controls);

      const isElementVisible = (element) => {
        if (!element) return false;
        const style = window.getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden") return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };

      const syncControlsVisibility = () => {
        const selectionContainer = row.querySelector(
          ".indicator_select_friend, .friend_block_v2_select, .manage_friend_checkbox"
        );
        const hasBulkSelectionControl = isElementVisible(selectionContainer);
        controls.style.display = hasBulkSelectionControl ? "none" : "flex";
      };

      syncControlsVisibility();

      const manageModeObserver = new MutationObserver(() => {
        syncControlsVisibility();
      });
      manageModeObserver.observe(row, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style"]
      });
      row.sfmManageModeObserver = manageModeObserver;
      
      // Create and insert tags into controls (right side, before button)
      if (selectedTags.length > 0) {
        const tagContainer = document.createElement("div");
        tagContainer.className = "sfm-row-tags";
        tagContainer.title = selectedTags.map(t => t.name).join(", ");

        // Show only first 2 tags
        const visibleTags = selectedTags.slice(0, 2);
        const hiddenCount = Math.max(0, selectedTags.length - 2);

        for (const tag of visibleTags) {
          const chip = document.createElement("span");
          chip.className = "sfm-tag-label sfm-row-tag";
          chip.textContent = tag.name;

          // Generate darker and lighter shades from the base color
          const baseColor = tag.color;
          const darkerShade = darkenColor(baseColor, 0.65);
          const lighterShade = lightenColor(baseColor, 0.65);

          chip.style.backgroundColor = darkerShade;
          chip.style.color = lighterShade;
          chip.style.borderColor = lighterShade;

          tagContainer.appendChild(chip);
        }

        // Add +X indicator if there are more tags
        if (hiddenCount > 0) {
          const moreIndicator = document.createElement("span");
          moreIndicator.className = "sfm-tag-label sfm-row-tag sfm-tag-more";
          moreIndicator.textContent = `+${hiddenCount}`;
          moreIndicator.style.backgroundColor = "#1b2838";
          moreIndicator.style.color = "#c7d5e0";
          moreIndicator.style.borderColor = "#c7d5e0";
          tagContainer.appendChild(moreIndicator);
        }

        // Insert tags into controls, before the button
        controls.insertBefore(tagContainer, controls.firstChild);
      }

      // Add hover listeners to track which friend row is currently being hovered (for miniprofile extraction)
      row.addEventListener('mouseenter', () => {
        currentlyHoveredFriendRow = row;
        lastHoveredAccountId = row.getAttribute('data-miniprofile') || null;
      });
      
      row.addEventListener('mouseleave', () => {
        if (currentlyHoveredFriendRow === row) {
          currentlyHoveredFriendRow = null;
        }
      });
      
      row.setAttribute("data-sfm-injected", "true");
    }
  }

  function renderSidebar(state, entries) {
    const prev = document.getElementById("sfm-sidebar");
    if (prev) {
      prev.remove();
    }

    const sidebar = createSidebar({
      groups: state.groups,
      countsByGroupId: buildCounts(state, entries),
      onAddGroup: addGroupFlow,
      onDeleteGroup: deleteGroupFlow
    });

    document.body.appendChild(sidebar);
  }

  async function applyEnhancements() {
    if (applyInProgress) {
      rerunRequested = true;
      return;
    }

    // Check if extension context is still valid
    try {
      if (!chrome.runtime?.id) {
        console.warn('[SFM] Extension context invalidated. Please reload the page.');
        return;
      }
    } catch (e) {
      console.warn('[SFM] Extension context invalidated. Please reload the page.');
      return;
    }

    applyInProgress = true;
    try {
      observer.disconnect();
      const state = await getState();
      const entries = findFriendEntries();
      await injectControls(state, entries);
      injectSidebarManagementSection();
      sortFriendRows(state, entries);
    } catch (error) {
      console.error("SFM apply error", error);
    } finally {
      applyInProgress = false;
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      if (rerunRequested) {
        rerunRequested = false;
        queueApply();
      }
    }
  }

  function queueApply() {
    if (applyQueued) {
      return;
    }

    applyQueued = true;
    window.setTimeout(async () => {
      applyQueued = false;
      await applyEnhancements();
    }, 100);
  }

  const observer = new MutationObserver((mutations) => {
    let shouldApply = false;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (!node.closest(".sfm-friend-controls, .sfm-inline-controls, .sfm-group-header, #sfm-sidebar-section, .sfm-sidebar-link, .sfm-modal-overlay, .sfm-miniprofile-section")) {
            shouldApply = true;
            break;
          }
        }
      }
      for (const node of mutation.removedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (!node.closest(".sfm-friend-controls, .sfm-inline-controls, .sfm-group-header, #sfm-sidebar-section, .sfm-sidebar-link, .sfm-modal-overlay, .sfm-miniprofile-section")) {
            shouldApply = true;
            break;
          }
        }
      }
      if (shouldApply) break;
    }
    if (shouldApply) {
      queueApply();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Observer for miniprofile popups
  const miniprofileObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      // Handle added nodes
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if this is a miniprofile that just appeared
          if (node.classList && node.classList.contains("miniprofile_hover")) {
            enhanceMiniprofileDebounced(node);
          }
          // Also check children in case the miniprofile was added as part of a larger structure
          const miniprofiles = node.querySelectorAll && node.querySelectorAll(".miniprofile_hover");
          if (miniprofiles && miniprofiles.length > 0) {
            miniprofiles.forEach(mp => enhanceMiniprofileDebounced(mp));
          }
        }
      }
      
      // Handle attribute changes (for style visibility changes)
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        const target = mutation.target;
        if (target.classList && target.classList.contains("miniprofile_hover")) {
          const style = target.getAttribute('style') || '';
          if (style.includes('display: block') || style.includes('opacity: 1')) {
            // Miniprofile became visible - debounce to wait for content load
            enhanceMiniprofileDebounced(target);
          }
        }
      }
      
      // Handle child list changes inside miniprofile (content loading)
      if (mutation.type === 'childList') {
        const target = mutation.target;
        if (target.closest && target.closest('.miniprofile_hover')) {
          const miniprofile = target.closest('.miniprofile_hover');
          // Skip if the mutation was caused by us adding our section
          let causedBySfmInjection = false;
          if (mutation.addedNodes.length > 0) {
            for (const node of mutation.addedNodes) {
              if (node.classList && node.classList.contains('sfm-miniprofile-section')) {
                causedBySfmInjection = true;
                break;
              }
            }
          }
          if (causedBySfmInjection) {
            continue;
          }
          const style = miniprofile.getAttribute('style') || '';
          if (style.includes('display: block')) {
            // Content changed in visible miniprofile
            enhanceMiniprofileDebounced(miniprofile);
          }
        }
      }
    }
  });

  miniprofileObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style']
  });

  // Safety cleanup: hide drop zones on any mouseup
  document.addEventListener("mouseup", () => {
    if (activeDropZones.length > 0) {
      hideDropZones();
    }
  });

  // Sync friendship dates from Steam API on page load (with cache)
  syncFriendshipDates().catch((error) => {
    console.debug("Friendship dates sync failed (non-fatal):", error);
  }).then(() => {
    queueApply();
  });
})();
