const STORAGE_KEY = "steamFriendsManager";
const FRIENDSHIP_DATES_KEY = "steamFriendshipDates";
const TAGS_CACHE_KEY = "steamFriendsTags";

const DEFAULT_STATE = {
  groups: [],
  tags: [],
  friendsMeta: {}
};

function normalizeState(state) {
  if (!state || typeof state !== "object") {
    return { ...DEFAULT_STATE };
  }

  const groups = Array.isArray(state.groups)
    ? state.groups
        .filter((group) => group && typeof group.id === "string")
        .map((group) => ({
          id: String(group.id),
          name: typeof group.name === "string" ? group.name : "",
          order: Number.isFinite(group.order) ? group.order : 0
        }))
    : [];

  const tags = Array.isArray(state.tags)
    ? state.tags
        .filter((tag) => tag && typeof tag.id === "string" && typeof tag.name === "string")
        .map((tag) => ({
          id: String(tag.id),
          name: String(tag.name).trim(),
          color: typeof tag.color === "string" ? tag.color : "#4a9eb5"
        }))
    : [];

  const friendsMeta = state.friendsMeta && typeof state.friendsMeta === "object"
    ? Object.fromEntries(
        Object.entries(state.friendsMeta).map(([steamId, meta]) => {
          const safeMeta = meta && typeof meta === "object" ? meta : {};
          return [
            steamId,
            {
              note: typeof safeMeta.note === "string" ? safeMeta.note : "",
              groupId: typeof safeMeta.groupId === "string" ? safeMeta.groupId : null,
              tags: Array.isArray(safeMeta.tags) ? safeMeta.tags.filter((t) => typeof t === "string") : [],
              friendSince: Number.isFinite(safeMeta.friendSince) ? safeMeta.friendSince : null
            }
          ];
        })
      )
    : {};

  return { groups, tags, friendsMeta };
}

function createGroupId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `group-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function isExtensionContextValid() {
  try {
    return !!chrome.runtime?.id;
  } catch (e) {
    return false;
  }
}

async function getState() {
  if (!isExtensionContextValid()) {
    console.warn('[SFM] Extension context invalidated. Please reload the page.');
    return normalizeState(null);
  }
  
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  const existing = normalizeState(result[STORAGE_KEY]);

  if (!result[STORAGE_KEY]) {
    await chrome.storage.sync.set({ [STORAGE_KEY]: existing });
  }

  return existing;
}

async function saveState(newState) {
  if (!isExtensionContextValid()) {
    console.warn('[SFM] Extension context invalidated. Cannot save state. Please reload the page.');
    return normalizeState(newState);
  }
  
  const safeState = normalizeState(newState);
  await chrome.storage.sync.set({ [STORAGE_KEY]: safeState });
  return safeState;
}

async function updateFriend(steamId, partialData) {
  if (!steamId || typeof steamId !== "string") {
    return null;
  }

  const state = await getState();
  const current = state.friendsMeta[steamId] || { note: "", groupId: null, tags: [], friendSince: null };

  const next = {
    note: typeof partialData?.note === "string" ? partialData.note : current.note,
    groupId:
      partialData && Object.prototype.hasOwnProperty.call(partialData, "groupId")
        ? (typeof partialData.groupId === "string" ? partialData.groupId : null)
        : current.groupId,
    tags:
      partialData && Array.isArray(partialData.tags)
        ? partialData.tags.filter((t) => typeof t === "string")
        : current.tags,
    friendSince:
      partialData && Number.isFinite(partialData.friendSince)
        ? partialData.friendSince
        : current.friendSince
  };

  state.friendsMeta[steamId] = next;
  await saveState(state);
  return next;
}

async function addGroup(name) {
  const groupName = String(name || "").trim();
  if (!groupName) {
    return null;
  }

  const state = await getState();
  const nextOrder =
    state.groups.length > 0
      ? Math.max(...state.groups.map((group) => group.order)) + 1
      : 0;

  const group = {
    id: createGroupId(),
    name: groupName,
    order: nextOrder
  };

  state.groups.push(group);
  await saveState(state);
  return group;
}

async function updateGroup(groupId, updates) {
  if (!groupId || typeof groupId !== "string") {
    return null;
  }

  const state = await getState();
  const group = state.groups.find((g) => g.id === groupId);

  if (!group) {
    return null;
  }

  if (typeof updates?.name === "string") {
    const newName = updates.name.trim();
    if (newName) {
      group.name = newName;
    }
  }
  if (typeof updates?.order === "number" && Number.isFinite(updates.order)) {
    group.order = updates.order;
  }

  await saveState(state);
  return group;
}

async function deleteGroup(groupId) {
  if (!groupId || typeof groupId !== "string") {
    return false;
  }

  const state = await getState();
  const prevLength = state.groups.length;
  state.groups = state.groups.filter((group) => group.id !== groupId);

  if (state.groups.length === prevLength) {
    return false;
  }

  for (const steamId of Object.keys(state.friendsMeta)) {
    if (state.friendsMeta[steamId]?.groupId === groupId) {
      state.friendsMeta[steamId].groupId = null;
    }
  }

  await saveState(state);
  return true;
}

async function reorderGroups(groupIdsInNewOrder) {
  if (!Array.isArray(groupIdsInNewOrder)) {
    return false;
  }

  const state = await getState();
  const groupMap = new Map(state.groups.map((g) => [g.id, g]));

  // Update order property for each group
  groupIdsInNewOrder.forEach((groupId, index) => {
    const group = groupMap.get(groupId);
    if (group) {
      group.order = index;
    }
  });

  await saveState(state);
  return true;
}

async function addTag(name, color = "#4a9eb5") {
  const tagName = String(name || "").trim();
  if (!tagName) {
    return null;
  }

  const state = await getState();
  const tagColor = typeof color === "string" && color.match(/^#[0-9a-f]{6}$/i) ? color : "#4a9eb5";

  const tag = {
    id: createGroupId(),
    name: tagName,
    color: tagColor
  };

  state.tags.push(tag);
  await saveState(state);
  return tag;
}

async function updateTag(tagId, updates) {
  if (!tagId || typeof tagId !== "string") {
    return null;
  }

  const state = await getState();
  const tag = state.tags.find((t) => t.id === tagId);

  if (!tag) {
    return null;
  }

  if (typeof updates?.name === "string") {
    tag.name = updates.name.trim();
  }
  if (typeof updates?.color === "string" && updates.color.match(/^#[0-9a-f]{6}$/i)) {
    tag.color = updates.color;
  }

  await saveState(state);
  return tag;
}

async function deleteTag(tagId) {
  if (!tagId || typeof tagId !== "string") {
    return false;
  }

  const state = await getState();
  const prevLength = state.tags.length;
  state.tags = state.tags.filter((tag) => tag.id !== tagId);

  if (state.tags.length === prevLength) {
    return false;
  }

  for (const steamId of Object.keys(state.friendsMeta)) {
    if (state.friendsMeta[steamId]?.tags) {
      state.friendsMeta[steamId].tags = state.friendsMeta[steamId].tags.filter(
        (tId) => tId !== tagId
      );
    }
  }

  await saveState(state);
  return true;
}

async function saveFriendshipDates(friendsData) {
  const dates = {};
  for (const [steamId, data] of Object.entries(friendsData)) {
    if (Number.isFinite(data?.friendSince)) {
      dates[steamId] = data.friendSince;
    }
  }

  const state = await getState();
  for (const steamId of Object.keys(dates)) {
    if (state.friendsMeta[steamId]) {
      state.friendsMeta[steamId].friendSince = dates[steamId];
    } else {
      state.friendsMeta[steamId] = {
        note: "",
        groupId: null,
        tags: [],
        friendSince: dates[steamId]
      };
    }
  }
  await saveState(state);
  return dates;
}

function getFriendshipDateTimestamp() {
  return {
    lastSyncTime: Date.now(),
    expiryTime: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
  };
}

async function isFriendshipDateCacheValid() {
  const state = await getState();
  const syncTime = state.friendshipSyncTime;
  if (!syncTime || !Number.isFinite(syncTime.expiryTime)) {
    return false;
  }
  return Date.now() < syncTime.expiryTime;
}

globalThis.SFMStorage = {
  STORAGE_KEY,
  FRIENDSHIP_DATES_KEY,
  TAGS_CACHE_KEY,
  getState,
  saveState,
  updateFriend,
  addGroup,
  updateGroup,
  deleteGroup,
  reorderGroups,
  addTag,
  updateTag,
  deleteTag,
  saveFriendshipDates,
  getFriendshipDateTimestamp,
  isFriendshipDateCacheValid
};
