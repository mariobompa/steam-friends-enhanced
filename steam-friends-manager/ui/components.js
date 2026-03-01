function createFriendControls({ steamId, currentMeta, groups, onEditNote, onGroupChange }) {
  const container = document.createElement("div");
  container.className = "sfm-inline-controls";
  container.setAttribute("data-sfm-controls", steamId);

  const noteButton = document.createElement("button");
  noteButton.type = "button";
  noteButton.className = "sfm-note-btn";
  noteButton.title = "Edit note";
  noteButton.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.5 1.5L14.5 4.5L5 14H2V11L11.5 1.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/><line x1="10" y1="3" x2="13" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

  const groupButton = document.createElement("button");
  groupButton.type = "button";
  groupButton.className = "sfm-group-btn";
  groupButton.title = "Assign to group";
  groupButton.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 4L8 4L10 6L14 6C14.5523 6 15 6.44772 15 7L15 12C15 12.5523 14.5523 13 14 13L2 13C1.44772 13 1 12.5523 1 12L1 5C1 4.44772 1.44772 4 2 4Z" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>';

  const groupDropdown = document.createElement("div");
  groupDropdown.className = "sfm-group-dropdown";

  const ungroupedOption = document.createElement("div");
  ungroupedOption.className = "sfm-group-option";
  ungroupedOption.textContent = "No group";
  ungroupedOption.setAttribute("data-group-id", "");
  if (!currentMeta?.groupId) {
    ungroupedOption.classList.add("sfm-selected");
  }
  groupDropdown.appendChild(ungroupedOption);

  const orderedGroups = [...groups].sort((a, b) => a.order - b.order);
  for (const group of orderedGroups) {
    const option = document.createElement("div");
    option.className = "sfm-group-option";
    option.textContent = group.name;
    option.setAttribute("data-group-id", group.id);
    if (currentMeta?.groupId === group.id) {
      option.classList.add("sfm-selected");
    }
    groupDropdown.appendChild(option);
  }

  const noteArea = document.createElement("textarea");
  noteArea.className = "sfm-note-input";
  noteArea.rows = 2;
  noteArea.placeholder = "Add note";
  noteArea.value = currentMeta?.note || "";

  noteButton.addEventListener("click", (e) => {
    e.stopPropagation();
    const wasOpen = container.classList.contains("sfm-note-open");
    container.classList.toggle("sfm-note-open");
    groupButton.classList.remove("sfm-group-open");
    groupDropdown.style.display = "none";
    if (groupDropdown.parentElement === document.body) {
      document.body.removeChild(groupDropdown);
    }
    if (container.classList.contains("sfm-note-open")) {
      const rect = noteButton.getBoundingClientRect();
      noteArea.style.position = "fixed";
      noteArea.style.left = `${rect.left}px`;
      noteArea.style.top = `${rect.bottom + 4}px`;
      noteArea.style.display = "block";
      document.body.appendChild(noteArea);
      noteArea.focus();
      noteArea.select();
    } else {
      noteArea.style.display = "none";
      if (noteArea.parentElement === document.body) {
        document.body.removeChild(noteArea);
      }
    }
  });

  groupButton.addEventListener("click", (e) => {
    e.stopPropagation();
    const wasOpen = groupButton.classList.contains("sfm-group-open");
    groupButton.classList.toggle("sfm-group-open");
    container.classList.remove("sfm-note-open");
    noteArea.style.display = "none";
    if (noteArea.parentElement === document.body) {
      document.body.removeChild(noteArea);
    }
    if (noteArea.parentElement === document.body) {
      document.body.removeChild(noteArea);
    }
    if (groupButton.classList.contains("sfm-group-open")) {
      const rect = groupButton.getBoundingClientRect();
      groupDropdown.style.position = "fixed";
      groupDropdown.style.left = `${rect.left}px`;
      groupDropdown.style.top = `${rect.bottom + 4}px`;
      groupDropdown.style.display = "block";
      document.body.appendChild(groupDropdown);
    } else {
      groupDropdown.style.display = "none";
      if (groupDropdown.parentElement === document.body) {
        document.body.removeChild(groupDropdown);
      }
    }
  });

  groupDropdown.addEventListener("click", (e) => {
    const option = e.target.closest(".sfm-group-option");
    if (option) {
      const groupId = option.getAttribute("data-group-id") || null;
      onGroupChange(groupId);
      groupButton.classList.remove("sfm-group-open");
      groupDropdown.style.display = "none";
      if (groupDropdown.parentElement === document.body) {
        document.body.removeChild(groupDropdown);
      }
    }
  });

  noteArea.addEventListener("blur", () => {
    onEditNote(noteArea.value);
    container.classList.remove("sfm-note-open");
    noteArea.style.display = "none";
    if (noteArea.parentElement === document.body) {
      document.body.removeChild(noteArea);
    }
  });

  document.addEventListener("click", (e) => {
    if (!container.contains(e.target) && !groupDropdown.contains(e.target)) {
      groupButton.classList.remove("sfm-group-open");
      groupDropdown.style.display = "none";
      if (groupDropdown.parentElement === document.body) {
        document.body.removeChild(groupDropdown);
      }
    }
  });

  container.appendChild(noteButton);
  container.appendChild(groupButton);

  return container;
}

globalThis.SFMUI = {
  createFriendControls
};
