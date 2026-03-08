function createFriendControls({ steamId, currentMeta, groups, tags, onEditNote, onGroupChange, onTagsChange, onCreateTag, onUnfriend, onRemoveFromExtension, profileUrl }) {
  const TAG_PRESET_COLORS = [
    "#4a9eb5",
    "#5db3cc",
    "#6c8cff",
    "#9b59b6",
    "#e67e22",
    "#e74c3c",
    "#f1c40f",
    "#2ecc71",
    "#16a085",
    "#95a5a6"
  ];

  const container = document.createElement("div");
  container.className = "sfm-friend-controls";
  container.setAttribute("data-sfm-controls", steamId);

  // Menu button (ellipsis icon)
  const menuButton = document.createElement("button");
  menuButton.type = "button";
  menuButton.className = "sfm-menu-btn";
  menuButton.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="3" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="8" cy="13" r="1.5"/></svg>';

  // Dropdown menu
  const dropdown = document.createElement("div");
  dropdown.className = "sfm-menu-dropdown";
  dropdown.style.display = "none";

  // Edit Note menu item
  const editNoteItem = document.createElement("div");
  editNoteItem.className = "sfm-menu-item";
  editNoteItem.innerHTML = '<span class="sfm-menu-icon">📝</span><span>Edit Note</span>';
  editNoteItem.addEventListener("click", (e) => {
    e.stopPropagation();
    showNoteModal();
  });
  dropdown.appendChild(editNoteItem);

  // Assign Group menu item
  const assignGroupItem = document.createElement("div");
  assignGroupItem.className = "sfm-menu-item sfm-menu-item-submenu";
  assignGroupItem.innerHTML = '<span class="sfm-menu-icon">📁</span><span>Group</span><span class="sfm-menu-arrow">›</span>';
  
  const groupSubmenu = document.createElement("div");
  groupSubmenu.className = "sfm-submenu";
  
  const ungroupedOption = document.createElement("div");
  ungroupedOption.className = "sfm-submenu-item";
  if (!currentMeta?.groupId) ungroupedOption.classList.add("sfm-selected");
  ungroupedOption.textContent = "No group";
  ungroupedOption.addEventListener("click", async (e) => {
    e.stopPropagation();
    await onGroupChange(null);
    closeMenu();
  });
  groupSubmenu.appendChild(ungroupedOption);
  
  const orderedGroups = [...groups].sort((a, b) => a.order - b.order);
  for (const group of orderedGroups) {
    const option = document.createElement("div");
    option.className = "sfm-submenu-item";
    if (currentMeta?.groupId === group.id) option.classList.add("sfm-selected");
    option.textContent = group.name;
    option.addEventListener("click", async (e) => {
      e.stopPropagation();
      await onGroupChange(group.id);
      closeMenu();
    });
    groupSubmenu.appendChild(option);
  }
  
  assignGroupItem.appendChild(groupSubmenu);
  
  let groupSubmenuTimeout;
  const showGroupSubmenu = () => {
    clearTimeout(groupSubmenuTimeout);
    const rect = assignGroupItem.getBoundingClientRect();
    groupSubmenu.style.display = "flex";
    groupSubmenu.style.top = `${rect.top}px`;
    
    // Check if there's enough space on the right
    const submenuWidth = 250;
    const spaceOnRight = window.innerWidth - rect.right;
    
    if (spaceOnRight >= submenuWidth) {
      groupSubmenu.style.left = `${rect.right}px`;
      groupSubmenu.style.right = "auto";
    } else {
      groupSubmenu.style.left = "auto";
      groupSubmenu.style.right = `${window.innerWidth - rect.left + 1}px`;
    }
  };
  const hideGroupSubmenu = () => {
    groupSubmenuTimeout = setTimeout(() => {
      groupSubmenu.style.display = "none";
    }, 150);
  };
  
  assignGroupItem.addEventListener("mouseenter", showGroupSubmenu);
  assignGroupItem.addEventListener("mouseleave", hideGroupSubmenu);
  groupSubmenu.addEventListener("mouseenter", showGroupSubmenu);
  groupSubmenu.addEventListener("mouseleave", hideGroupSubmenu);
  
  dropdown.appendChild(assignGroupItem);

  // Add Tags menu item
  const addTagsItem = document.createElement("div");
  addTagsItem.className = "sfm-menu-item sfm-menu-item-submenu";
  addTagsItem.innerHTML = '<span class="sfm-menu-icon">🏷️</span><span>Tags</span><span class="sfm-menu-arrow">›</span>';
  
  const tagsSubmenu = document.createElement("div");
  tagsSubmenu.className = "sfm-submenu";
  tagsSubmenu.addEventListener("click", (e) => {
    e.stopPropagation();
  });
  
  if (!tags.length) {
    const emptyState = document.createElement("div");
    emptyState.className = "sfm-submenu-empty";
    emptyState.textContent = "No tags yet";
    tagsSubmenu.appendChild(emptyState);
  } else {
    for (const tag of tags) {
      const label = document.createElement("label");
      label.className = "sfm-submenu-tag";
      
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = tag.id;
      checkbox.checked = currentMeta?.tags?.includes(tag.id) || false;
      checkbox.addEventListener("click", (e) => {
        e.stopPropagation();
      });
      checkbox.addEventListener("change", async (e) => {
        e.stopPropagation();
        const selectedTags = Array.from(tagsSubmenu.querySelectorAll("input:checked")).map(
          (cb) => cb.value
        );
        await onTagsChange(selectedTags);
      });
      
      const tagLabel = document.createElement("span");
      tagLabel.className = "sfm-tag-label";
      tagLabel.textContent = tag.name;
      tagLabel.style.backgroundColor = tag.color;
      tagLabel.style.color = getContrastColor(tag.color);
      
      label.appendChild(checkbox);
      label.appendChild(tagLabel);
      label.addEventListener("click", (e) => {
        e.stopPropagation();
      });
      
      tagsSubmenu.appendChild(label);
    }
  }
  
  addTagsItem.appendChild(tagsSubmenu);
  
  let tagsSubmenuTimeout;
  const showTagsSubmenu = () => {
    clearTimeout(tagsSubmenuTimeout);
    const rect = addTagsItem.getBoundingClientRect();
    tagsSubmenu.style.display = "flex";
    tagsSubmenu.style.top = `${rect.top}px`;
    
    // Check if there's enough space on the right
    const submenuWidth = 250;
    const spaceOnRight = window.innerWidth - rect.right;
    
    if (spaceOnRight >= submenuWidth) {
      tagsSubmenu.style.left = `${rect.right}px`;
      tagsSubmenu.style.right = "auto";
    } else {
      tagsSubmenu.style.left = "auto";
      tagsSubmenu.style.right = `${window.innerWidth - rect.left + 1}px`;
    }
  };
  const hideTagsSubmenu = () => {
    tagsSubmenuTimeout = setTimeout(() => {
      tagsSubmenu.style.display = "none";
    }, 150);
  };
  
  addTagsItem.addEventListener("mouseenter", showTagsSubmenu);
  addTagsItem.addEventListener("mouseleave", hideTagsSubmenu);
  tagsSubmenu.addEventListener("mouseenter", showTagsSubmenu);
  tagsSubmenu.addEventListener("mouseleave", hideTagsSubmenu);
  
  dropdown.appendChild(addTagsItem);

  // View Profile menu item
  if (profileUrl) {
    const viewProfileItem = document.createElement("div");
    viewProfileItem.className = "sfm-menu-item";
    viewProfileItem.innerHTML = '<span class="sfm-menu-icon">👤</span><span>View Profile</span>';
    viewProfileItem.addEventListener("click", (e) => {
      e.stopPropagation();
      window.open(profileUrl, "_blank");
      closeMenu();
    });
    dropdown.appendChild(viewProfileItem);
  }

  // Divider
  const divider = document.createElement("div");
  divider.className = "sfm-menu-divider";
  dropdown.appendChild(divider);

  // Unfriend menu item
  const unfriendItem = document.createElement("div");
  unfriendItem.className = "sfm-menu-item sfm-menu-item-danger";
  unfriendItem.innerHTML = '<span class="sfm-menu-icon">❌</span><span>Unfriend</span>';
  unfriendItem.addEventListener("click", (e) => {
    e.stopPropagation();
    showUnfriendConfirmation();
  });
  dropdown.appendChild(unfriendItem);

  /**
   * Show/hide menu dropdown
   */
  function toggleMenu() {
    const isOpen = dropdown.style.display !== "none";
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  function openMenu() {
    // Close all other open menus first
    const allOpenMenus = document.querySelectorAll(".sfm-menu-dropdown");
    for (const menu of allOpenMenus) {
      if (menu !== dropdown && menu.style.display !== "none") {
        menu.style.display = "none";
        if (menu.parentElement === document.body) {
          document.body.removeChild(menu);
        }
      }
    }

    const rect = menuButton.getBoundingClientRect();
    dropdown.style.position = "fixed";
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.top = `${rect.bottom + 4}px`;
    dropdown.style.display = "block";
    document.body.appendChild(dropdown);
  }

  function closeMenu() {
    dropdown.style.display = "none";
    if (dropdown.parentElement === document.body) {
      document.body.removeChild(dropdown);
    }
  }

  /**
   * Show note editing modal
   */
  function showNoteModal() {
    const modal = document.createElement("div");
    modal.className = "sfm-modal-overlay";

    const content = document.createElement("div");
    content.className = "sfm-modal-content";

    const title = document.createElement("h3");
    title.textContent = "Edit Note";
    content.appendChild(title);

    const textarea = document.createElement("textarea");
    textarea.className = "sfm-note-textarea";
    textarea.value = currentMeta?.note || "";
    textarea.placeholder = "Add a note about this friend...";
    content.appendChild(textarea);

    const buttonContainer = document.createElement("div");
    buttonContainer.className = "sfm-modal-buttons";

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "sfm-btn sfm-btn-primary";
    saveButton.textContent = "Save";
    saveButton.addEventListener("click", () => {
      onEditNote(textarea.value);
      document.body.removeChild(modal);
      closeMenu();
    });
    buttonContainer.appendChild(saveButton);

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "sfm-btn sfm-btn-secondary";
    cancelButton.textContent = "Cancel";
    cancelButton.addEventListener("click", () => {
      document.body.removeChild(modal);
    });
    buttonContainer.appendChild(cancelButton);

    content.appendChild(buttonContainer);
    modal.appendChild(content);
    document.body.appendChild(modal);

    textarea.focus();
  }

  function showCreateTagModal() {
    const modal = document.createElement("div");
    modal.className = "sfm-modal-overlay";

    const content = document.createElement("div");
    content.className = "sfm-modal-content";

    const title = document.createElement("h3");
    title.textContent = "Create Tag";
    content.appendChild(title);

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "sfm-tag-name-input";
    nameInput.placeholder = "Tag name";
    nameInput.maxLength = 24;
    content.appendChild(nameInput);

    const paletteLabel = document.createElement("p");
    paletteLabel.className = "sfm-modal-text";
    paletteLabel.textContent = "Color";
    content.appendChild(paletteLabel);

    const palette = document.createElement("div");
    palette.className = "sfm-color-palette";

    let selectedColor = TAG_PRESET_COLORS[0];

    TAG_PRESET_COLORS.forEach((color, index) => {
      const swatch = document.createElement("button");
      swatch.type = "button";
      swatch.className = "sfm-color-swatch";
      swatch.style.backgroundColor = color;
      swatch.setAttribute("aria-label", `Choose color ${color}`);
      swatch.setAttribute("data-color", color);

      if (index === 0) {
        swatch.classList.add("sfm-selected");
      }

      swatch.addEventListener("click", () => {
        selectedColor = color;
        const allSwatches = palette.querySelectorAll(".sfm-color-swatch");
        allSwatches.forEach((item) => item.classList.remove("sfm-selected"));
        swatch.classList.add("sfm-selected");
      });

      palette.appendChild(swatch);
    });

    content.appendChild(palette);

    const buttonContainer = document.createElement("div");
    buttonContainer.className = "sfm-modal-buttons";

    const createButton = document.createElement("button");
    createButton.type = "button";
    createButton.className = "sfm-btn sfm-btn-primary";
    createButton.textContent = "Create";
    createButton.addEventListener("click", async () => {
      const tagName = nameInput.value.trim();
      if (!tagName) {
        alert("Please enter a tag name.");
        return;
      }

      if (typeof onCreateTag === "function") {
        const created = await onCreateTag(tagName, selectedColor);
        if (!created) {
          alert("Could not create tag. It may already exist or be invalid.");
          return;
        }
      }

      document.body.removeChild(modal);
      closeMenu();
    });
    buttonContainer.appendChild(createButton);

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "sfm-btn sfm-btn-secondary";
    cancelButton.textContent = "Cancel";
    cancelButton.addEventListener("click", () => {
      document.body.removeChild(modal);
    });
    buttonContainer.appendChild(cancelButton);

    content.appendChild(buttonContainer);
    modal.appendChild(content);
    document.body.appendChild(modal);

    nameInput.focus();
  }

  /**
   * Show unfriend confirmation
   */
  function showUnfriendConfirmation() {
    const modal = document.createElement("div");
    modal.className = "sfm-modal-overlay";

    const content = document.createElement("div");
    content.className = "sfm-modal-content";

    const title = document.createElement("h3");
    title.textContent = "Unfriend?";
    content.appendChild(title);

    const message = document.createElement("p");
    message.textContent = "This will remove them from your Steam friends list. This cannot be undone.";
    content.appendChild(message);

    const buttonContainer = document.createElement("div");
    buttonContainer.className = "sfm-modal-buttons";

    const unfriendButton = document.createElement("button");
    unfriendButton.type = "button";
    unfriendButton.className = "sfm-btn sfm-btn-danger";
    unfriendButton.textContent = "Unfriend";
    unfriendButton.addEventListener("click", () => {
      onUnfriend();
      document.body.removeChild(modal);
      closeMenu();
    });
    buttonContainer.appendChild(unfriendButton);

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "sfm-btn sfm-btn-secondary";
    cancelButton.textContent = "Cancel";
    cancelButton.addEventListener("click", () => {
      document.body.removeChild(modal);
    });
    buttonContainer.appendChild(cancelButton);

    content.appendChild(buttonContainer);
    modal.appendChild(content);
    document.body.appendChild(modal);
  }

  /**
   * Calculate contrast color (white or black) for text on background
   */
  function getContrastColor(hexColor) {
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? "#000000" : "#ffffff";
  }

  // Menu button click handler
  menuButton.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  // Close menu on outside click
  document.addEventListener("click", (e) => {
    if (!container.contains(e.target) && dropdown.style.display !== "none") {
      closeMenu();
    }
  });

  container.appendChild(menuButton);

  return container;
}

/**
 * Show Manage Tags modal
 */
function showManageTagsModal({ tags, onUpdateTag, onDeleteTag, onCreateTag, onClose }) {
  const TAG_PRESET_COLORS = [
    "#4a9eb5", "#5db3cc", "#6c8cff", "#9b59b6", "#e67e22",
    "#e74c3c", "#f1c40f", "#2ecc71", "#16a085", "#95a5a6"
  ];

  const modal = document.createElement("div");
  modal.className = "sfm-modal-overlay";

  const content = document.createElement("div");
  content.className = "sfm-modal-content sfm-modal-wide";

  const title = document.createElement("h3");
  title.textContent = "Manage Tags";
  content.appendChild(title);

  const listContainer = document.createElement("div");
  listContainer.className = "sfm-manage-list";

  function renderTagsList() {
    listContainer.innerHTML = "";

    if (!tags || tags.length === 0) {
      const emptyState = document.createElement("div");
      emptyState.className = "sfm-manage-empty";
      emptyState.textContent = "No tags yet. Create one to organize friends.";
      listContainer.appendChild(emptyState);
      return;
    }

    tags.forEach((tag) => {
      const row = document.createElement("div");
      row.className = "sfm-manage-item";
      row.dataset.tagId = tag.id;

      const colorSwatch = document.createElement("div");
      colorSwatch.className = "sfm-color-preview";
      colorSwatch.style.backgroundColor = tag.color;

      const nameLabel = document.createElement("span");
      nameLabel.className = "sfm-manage-item-name";
      nameLabel.textContent = tag.name;

      const actions = document.createElement("div");
      actions.className = "sfm-item-actions";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "sfm-btn sfm-btn-small";
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => showEditTagForm(tag));

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "sfm-btn sfm-btn-small sfm-btn-danger";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", async () => {
        if (confirm(`Delete tag "${tag.name}"? It will be removed from all friends.`)) {
          const success = await onDeleteTag(tag.id);
          if (success) {
            const index = tags.findIndex((t) => t.id === tag.id);
            if (index > -1) tags.splice(index, 1);
            renderTagsList();
          }
        }
      });

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);

      row.appendChild(colorSwatch);
      row.appendChild(nameLabel);
      row.appendChild(actions);

      listContainer.appendChild(row);
    });
  }

  function showEditTagForm(tag) {
    const editModal = document.createElement("div");
    editModal.className = "sfm-modal-overlay";

    const editContent = document.createElement("div");
    editContent.className = "sfm-modal-content";

    const editTitle = document.createElement("h3");
    editTitle.textContent = "Edit Tag";
    editContent.appendChild(editTitle);

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "sfm-tag-name-input";
    nameInput.placeholder = "Tag name";
    nameInput.maxLength = 24;
    nameInput.value = tag.name;
    editContent.appendChild(nameInput);

    const colorLabel = document.createElement("p");
    colorLabel.className = "sfm-modal-text";
    colorLabel.textContent = "Color";
    editContent.appendChild(colorLabel);

    const palette = document.createElement("div");
    palette.className = "sfm-color-palette";

    let selectedColor = tag.color;

    TAG_PRESET_COLORS.forEach((color) => {
      const swatch = document.createElement("button");
      swatch.type = "button";
      swatch.className = "sfm-color-swatch";
      swatch.style.backgroundColor = color;
      swatch.dataset.color = color;

      if (color === tag.color) {
        swatch.classList.add("sfm-selected");
      }

      swatch.addEventListener("click", () => {
        selectedColor = color;
        palette.querySelectorAll(".sfm-color-swatch").forEach((s) => s.classList.remove("sfm-selected"));
        swatch.classList.add("sfm-selected");
      });

      palette.appendChild(swatch);
    });

    editContent.appendChild(palette);

    const buttonContainer = document.createElement("div");
    buttonContainer.className = "sfm-modal-buttons";

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "sfm-btn sfm-btn-primary";
    saveBtn.textContent = "Save";
    saveBtn.addEventListener("click", async () => {
      const newName = nameInput.value.trim();
      if (!newName) {
        alert("Please enter a tag name.");
        return;
      }

      const success = await onUpdateTag(tag.id, { name: newName, color: selectedColor });
      if (success) {
        tag.name = newName;
        tag.color = selectedColor;
        renderTagsList();
        document.body.removeChild(editModal);
      }
    });

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "sfm-btn sfm-btn-secondary";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", () => {
      document.body.removeChild(editModal);
    });

    buttonContainer.appendChild(saveBtn);
    buttonContainer.appendChild(cancelBtn);
    editContent.appendChild(buttonContainer);
    editModal.appendChild(editContent);
    document.body.appendChild(editModal);

    nameInput.focus();
  }

  function showCreateTagForm() {
    const createModal = document.createElement("div");
    createModal.className = "sfm-modal-overlay";

    const createContent = document.createElement("div");
    createContent.className = "sfm-modal-content";

    const createTitle = document.createElement("h3");
    createTitle.textContent = "Create Tag";
    createContent.appendChild(createTitle);

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "sfm-tag-name-input";
    nameInput.placeholder = "Tag name";
    nameInput.maxLength = 24;
    createContent.appendChild(nameInput);

    const colorLabel = document.createElement("p");
    colorLabel.className = "sfm-modal-text";
    colorLabel.textContent = "Color";
    createContent.appendChild(colorLabel);

    const palette = document.createElement("div");
    palette.className = "sfm-color-palette";

    let selectedColor = TAG_PRESET_COLORS[0];

    TAG_PRESET_COLORS.forEach((color, index) => {
      const swatch = document.createElement("button");
      swatch.type = "button";
      swatch.className = "sfm-color-swatch";
      swatch.style.backgroundColor = color;
      swatch.dataset.color = color;

      if (index === 0) {
        swatch.classList.add("sfm-selected");
      }

      swatch.addEventListener("click", () => {
        selectedColor = color;
        palette.querySelectorAll(".sfm-color-swatch").forEach((s) => s.classList.remove("sfm-selected"));
        swatch.classList.add("sfm-selected");
      });

      palette.appendChild(swatch);
    });

    createContent.appendChild(palette);

    const buttonContainer = document.createElement("div");
    buttonContainer.className = "sfm-modal-buttons";

    const createBtn = document.createElement("button");
    createBtn.type = "button";
    createBtn.className = "sfm-btn sfm-btn-primary";
    createBtn.textContent = "Create";
    createBtn.addEventListener("click", async () => {
      const tagName = nameInput.value.trim();
      if (!tagName) {
        alert("Please enter a tag name.");
        return;
      }

      const newTag = await onCreateTag(tagName, selectedColor);
      if (newTag) {
        tags.push(newTag);
        renderTagsList();
        document.body.removeChild(createModal);
      } else {
        alert("Could not create tag. It may already exist or be invalid.");
      }
    });

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "sfm-btn sfm-btn-secondary";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", () => {
      document.body.removeChild(createModal);
    });

    buttonContainer.appendChild(createBtn);
    buttonContainer.appendChild(cancelBtn);
    createContent.appendChild(buttonContainer);
    createModal.appendChild(createContent);
    document.body.appendChild(createModal);

    nameInput.focus();
  }

  renderTagsList();
  content.appendChild(listContainer);

  const buttonContainer = document.createElement("div");
  buttonContainer.className = "sfm-modal-buttons";

  const createNewBtn = document.createElement("button");
  createNewBtn.type = "button";
  createNewBtn.className = "sfm-btn sfm-btn-primary";
  createNewBtn.textContent = "Create New Tag";
  createNewBtn.addEventListener("click", showCreateTagForm);

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "sfm-btn sfm-btn-secondary";
  closeBtn.textContent = "Close";
  closeBtn.addEventListener("click", () => {
    document.body.removeChild(modal);
    if (onClose) onClose();
  });

  buttonContainer.appendChild(createNewBtn);
  buttonContainer.appendChild(closeBtn);
  content.appendChild(buttonContainer);

  modal.appendChild(content);
  document.body.appendChild(modal);
}

/**
 * Show Manage Groups modal
 */
function showManageGroupsModal({ groups, friendCounts, onUpdateGroup, onDeleteGroup, onReorderGroups, onCreateGroup, onClose }) {
  const modal = document.createElement("div");
  modal.className = "sfm-modal-overlay";

  const content = document.createElement("div");
  content.className = "sfm-modal-content sfm-modal-wide";

  const title = document.createElement("h3");
  title.textContent = "Manage Groups";
  content.appendChild(title);

  const listContainer = document.createElement("div");
  listContainer.className = "sfm-manage-list";

  let draggedElement = null;
  let draggedGroupId = null;

  function renderGroupsList() {
    listContainer.innerHTML = "";

    if (!groups || groups.length === 0) {
      const emptyState = document.createElement("div");
      emptyState.className = "sfm-manage-empty";
      emptyState.textContent = "No groups yet. Create one to organize friends.";
      listContainer.appendChild(emptyState);
      return;
    }

    const sortedGroups = [...groups].sort((a, b) => a.order - b.order);

    sortedGroups.forEach((group) => {
      const row = document.createElement("div");
      row.className = "sfm-manage-item";
      row.dataset.groupId = group.id;
      row.draggable = true;

      const dragHandle = document.createElement("span");
      dragHandle.className = "sfm-drag-handle";
      dragHandle.textContent = "⋮⋮";

      const nameLabel = document.createElement("span");
      nameLabel.className = "sfm-manage-item-name";
      nameLabel.textContent = group.name;

      const countLabel = document.createElement("span");
      countLabel.className = "sfm-manage-item-count";
      const count = friendCounts?.[group.id] || 0;
      countLabel.textContent = `${count} friend${count !== 1 ? 's' : ''}`;

      const actions = document.createElement("div");
      actions.className = "sfm-item-actions";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "sfm-btn sfm-btn-small";
      editBtn.textContent = "Rename";
      editBtn.addEventListener("click", () => showRenameGroupForm(group));

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "sfm-btn sfm-btn-small sfm-btn-danger";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", async () => {
        const count = friendCounts?.[group.id] || 0;
        const message = count > 0
          ? `Delete group "${group.name}"? ${count} friend${count !== 1 ? 's' : ''} will be ungrouped.`
          : `Delete group "${group.name}"?`;

        if (confirm(message)) {
          const success = await onDeleteGroup(group.id);
          if (success) {
            const index = groups.findIndex((g) => g.id === group.id);
            if (index > -1) groups.splice(index, 1);
            renderGroupsList();
          }
        }
      });

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);

      row.appendChild(dragHandle);
      row.appendChild(nameLabel);
      row.appendChild(countLabel);
      row.appendChild(actions);

      // Drag and drop handlers
      row.addEventListener("dragstart", (e) => {
        draggedElement = row;
        draggedGroupId = group.id;
        row.classList.add("sfm-dragging");
        e.dataTransfer.effectAllowed = "move";
      });

      row.addEventListener("dragend", () => {
        row.classList.remove("sfm-dragging");
        draggedElement = null;
        draggedGroupId = null;
      });

      row.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";

        if (draggedElement && draggedElement !== row) {
          const rect = row.getBoundingClientRect();
          const midpoint = rect.top + rect.height / 2;

          if (e.clientY < midpoint) {
            row.parentNode.insertBefore(draggedElement, row);
          } else {
            row.parentNode.insertBefore(draggedElement, row.nextSibling);
          }
        }
      });

      row.addEventListener("drop", async (e) => {
        e.preventDefault();

        // Get new order from DOM
        const rows = Array.from(listContainer.querySelectorAll(".sfm-manage-item"));
        const newOrder = rows.map((r) => r.dataset.groupId);

        // Update groups array order
        groups.sort((a, b) => {
          return newOrder.indexOf(a.id) - newOrder.indexOf(b.id);
        });

        groups.forEach((g, idx) => {
          g.order = idx;
        });

        await onReorderGroups(newOrder);
      });

      listContainer.appendChild(row);
    });
  }

  function showRenameGroupForm(group) {
    const renameModal = document.createElement("div");
    renameModal.className = "sfm-modal-overlay";

    const renameContent = document.createElement("div");
    renameContent.className = "sfm-modal-content";

    const renameTitle = document.createElement("h3");
    renameTitle.textContent = "Rename Group";
    renameContent.appendChild(renameTitle);

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "sfm-tag-name-input";
    nameInput.placeholder = "Group name";
    nameInput.value = group.name;
    renameContent.appendChild(nameInput);

    const buttonContainer = document.createElement("div");
    buttonContainer.className = "sfm-modal-buttons";

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "sfm-btn sfm-btn-primary";
    saveBtn.textContent = "Save";
    saveBtn.addEventListener("click", async () => {
      const newName = nameInput.value.trim();
      if (!newName) {
        alert("Please enter a group name.");
        return;
      }

      const success = await onUpdateGroup(group.id, { name: newName });
      if (success) {
        group.name = newName;
        renderGroupsList();
        document.body.removeChild(renameModal);
      }
    });

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "sfm-btn sfm-btn-secondary";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", () => {
      document.body.removeChild(renameModal);
    });

    buttonContainer.appendChild(saveBtn);
    buttonContainer.appendChild(cancelBtn);
    renameContent.appendChild(buttonContainer);
    renameModal.appendChild(renameContent);
    document.body.appendChild(renameModal);

    nameInput.focus();
  }

  function showCreateGroupForm() {
    const createModal = document.createElement("div");
    createModal.className = "sfm-modal-overlay";

    const createContent = document.createElement("div");
    createContent.className = "sfm-modal-content";

    const createTitle = document.createElement("h3");
    createTitle.textContent = "Create Group";
    createContent.appendChild(createTitle);

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "sfm-tag-name-input";
    nameInput.placeholder = "Group name";
    createContent.appendChild(nameInput);

    const buttonContainer = document.createElement("div");
    buttonContainer.className = "sfm-modal-buttons";

    const createBtn = document.createElement("button");
    createBtn.type = "button";
    createBtn.className = "sfm-btn sfm-btn-primary";
    createBtn.textContent = "Create";
    createBtn.addEventListener("click", async () => {
      const groupName = nameInput.value.trim();
      if (!groupName) {
        alert("Please enter a group name.");
        return;
      }

      const newGroup = await onCreateGroup(groupName);
      if (newGroup) {
        groups.push(newGroup);
        renderGroupsList();
        document.body.removeChild(createModal);
      } else {
        alert("Could not create group.");
      }
    });

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "sfm-btn sfm-btn-secondary";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", () => {
      document.body.removeChild(createModal);
    });

    buttonContainer.appendChild(createBtn);
    buttonContainer.appendChild(cancelBtn);
    createContent.appendChild(buttonContainer);
    createModal.appendChild(createContent);
    document.body.appendChild(createModal);

    nameInput.focus();
  }

  renderGroupsList();
  content.appendChild(listContainer);

  const buttonContainer = document.createElement("div");
  buttonContainer.className = "sfm-modal-buttons";

  const createNewBtn = document.createElement("button");
  createNewBtn.type = "button";
  createNewBtn.className = "sfm-btn sfm-btn-primary";
  createNewBtn.textContent = "Create New Group";
  createNewBtn.addEventListener("click", showCreateGroupForm);

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "sfm-btn sfm-btn-secondary";
  closeBtn.textContent = "Close";
  closeBtn.addEventListener("click", () => {
    document.body.removeChild(modal);
    if (onClose) onClose();
  });

  buttonContainer.appendChild(createNewBtn);
  buttonContainer.appendChild(closeBtn);
  content.appendChild(buttonContainer);

  modal.appendChild(content);
  document.body.appendChild(modal);
}

globalThis.SFMUI = {
  createFriendControls,
  showManageTagsModal,
  showManageGroupsModal
};
