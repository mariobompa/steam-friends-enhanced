(() => {
  if (!globalThis.SFMStorage) {
    return;
  }
  if (!globalThis.SFMUI) {
    return;
  }

  const { getState, updateFriend, addGroup, deleteGroup } = globalThis.SFMStorage;
  const { createFriendControls } = globalThis.SFMUI;

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

  function ensureTooltip() {
    let tooltip = document.getElementById("sfm-hover-tooltip");
    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.id = "sfm-hover-tooltip";
      tooltip.className = "sfm-hover-tooltip";
      document.body.appendChild(tooltip);
    }
    return tooltip;
  }

  function bindRowTooltip(row) {
    if (row.getAttribute("data-sfm-tooltip-bound") === "true") {
      return;
    }

    row.setAttribute("data-sfm-tooltip-bound", "true");

    row.addEventListener("mouseenter", (event) => {
      const tooltip = ensureTooltip();
      const note = row.getAttribute("data-sfm-note") || "";
      const friendSince = row.getAttribute("data-sfm-friend-since") || "";
      const yearsOfService = row.getAttribute("data-sfm-years-service") || "";
      const steamLevel = row.getAttribute("data-sfm-steam-level") || "";

      const parts = [];
      if (note && note !== "No note") parts.push(`📝 ${note}`);
      if (friendSince) parts.push(friendSince);
      if (yearsOfService) parts.push(yearsOfService);
      if (steamLevel) parts.push(steamLevel);

      if (parts.length === 0) {
        return;
      }

      tooltip.innerHTML = parts.join("<br>");
      tooltip.classList.add("sfm-visible");

      const x = event.clientX + 12;
      const y = event.clientY + 12;
      tooltip.style.left = `${x}px`;
      tooltip.style.top = `${y}px`;
    });

    row.addEventListener("mousemove", (event) => {
      const tooltip = ensureTooltip();
      tooltip.style.left = `${event.clientX + 12}px`;
      tooltip.style.top = `${event.clientY + 12}px`;
    });

    row.addEventListener("mouseleave", () => {
      const tooltip = ensureTooltip();
      tooltip.classList.remove("sfm-visible");
    });
  }

  function buildCounts(state, entries) {
    const countsByGroupId = new Map();
    for (const entry of entries) {
      const groupId = state.friendsMeta[entry.steamId]?.groupId;
      if (!groupId) {
        continue;
      }
      countsByGroupId.set(groupId, (countsByGroupId.get(groupId) || 0) + 1);
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

  function injectCreateGroupButton() {
    if (document.getElementById("sfm-create-group-btn")) {
      return;
    }

    // Find the Add a Friend button using the exact ID
    const addFriendBtn = document.getElementById("add_friends_button");
    
    if (addFriendBtn) {
      const createGroupBtn = document.createElement("button");
      createGroupBtn.id = "sfm-create-group-btn";
      createGroupBtn.className = "profile_friends manage_link btn_green_steamui btn_medium";
      createGroupBtn.style.marginLeft = "8px";
      createGroupBtn.innerHTML = '<span><svg class="sfm-folder-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 3.5C1 2.67157 1.67157 2 2.5 2H6L7.5 4H13.5C14.3284 4 15 4.67157 15 5.5V12.5C15 13.3284 14.3284 14 13.5 14H2.5C1.67157 14 1 13.3284 1 12.5V3.5Z" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="11" y1="7" x2="11" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="9" y1="9" x2="13" y2="9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> Create Group</span>';
      createGroupBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        addGroupFlow();
      });
      
      addFriendBtn.insertAdjacentElement('afterend', createGroupBtn);
      return;
    }

    // Fallback: inject as a floating button
    const friendsList = document.querySelector('#search_results, .profile_friends');
    if (friendsList && !document.getElementById("sfm-create-group-btn")) {
      const createGroupBtn = document.createElement("button");
      createGroupBtn.id = "sfm-create-group-btn";
      createGroupBtn.type = "button";
      createGroupBtn.className = "sfm-create-group-floating-btn";
      createGroupBtn.textContent = "📁  Create Group";
      createGroupBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        addGroupFlow();
      });
      
      document.body.appendChild(createGroupBtn);
    } else {
      // Could not find target for button injection
    }
  }

  async function injectControls(state, entries) {
    for (const entry of entries) {
      const { row, steamId } = entry;
      const currentMeta = state.friendsMeta[steamId] || { note: "", groupId: null };

      const existingControls = row.querySelector(`.sfm-inline-controls[data-sfm-controls="${steamId}"]`);
      if (row.getAttribute("data-sfm-injected") === "true" && existingControls) {
        existingControls.remove();
      } else {
        const anyControls = row.querySelectorAll(".sfm-inline-controls");
        for (const controls of anyControls) {
          controls.remove();
        }
      }

      row.setAttribute("data-sfm-note", currentMeta.note || "No note");
      row.setAttribute("data-sfm-friend-since", extractFriendSince(row));
      row.setAttribute("data-sfm-years-service", extractYearsOfService(row));
      row.setAttribute("data-sfm-steam-level", extractSteamLevel(row));
      bindRowTooltip(row);

      const controls = createFriendControls({
        steamId,
        currentMeta,
        groups: state.groups,
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
        }
      });

      row.classList.add("sfm-row-host");
      row.appendChild(controls);
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

    applyInProgress = true;
    try {
      observer.disconnect();
      const state = await getState();
      const entries = findFriendEntries();
      await injectControls(state, entries);
      injectCreateGroupButton();
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
          if (!node.closest(".sfm-inline-controls, #sfm-hover-tooltip, .sfm-group-header, #sfm-create-group-btn")) {
            shouldApply = true;
            break;
          }
        }
      }
      for (const node of mutation.removedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (!node.closest(".sfm-inline-controls, #sfm-hover-tooltip, .sfm-group-header, #sfm-create-group-btn")) {
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

  // Safety cleanup: hide drop zones on any mouseup
  document.addEventListener("mouseup", () => {
    if (activeDropZones.length > 0) {
      hideDropZones();
    }
  });

  queueApply();
})();
