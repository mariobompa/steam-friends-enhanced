const STORAGE_KEY = "steamFriendsManager";

const DEFAULT_STATE = {
  groups: [],
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

  const friendsMeta = state.friendsMeta && typeof state.friendsMeta === "object"
    ? Object.fromEntries(
        Object.entries(state.friendsMeta).map(([steamId, meta]) => {
          const safeMeta = meta && typeof meta === "object" ? meta : {};
          return [
            steamId,
            {
              note: typeof safeMeta.note === "string" ? safeMeta.note : "",
              groupId: typeof safeMeta.groupId === "string" ? safeMeta.groupId : null
            }
          ];
        })
      )
    : {};

  return { groups, friendsMeta };
}

function createGroupId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `group-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

async function getState() {
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  const existing = normalizeState(result[STORAGE_KEY]);

  if (!result[STORAGE_KEY]) {
    await chrome.storage.sync.set({ [STORAGE_KEY]: existing });
  }

  return existing;
}

async function saveState(newState) {
  const safeState = normalizeState(newState);
  await chrome.storage.sync.set({ [STORAGE_KEY]: safeState });
  return safeState;
}

async function updateFriend(steamId, partialData) {
  if (!steamId || typeof steamId !== "string") {
    return null;
  }

  const state = await getState();
  const current = state.friendsMeta[steamId] || { note: "", groupId: null };

  const next = {
    note: typeof partialData?.note === "string" ? partialData.note : current.note,
    groupId:
      partialData && Object.prototype.hasOwnProperty.call(partialData, "groupId")
        ? (typeof partialData.groupId === "string" ? partialData.groupId : null)
        : current.groupId
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

globalThis.SFMStorage = {
  STORAGE_KEY,
  getState,
  saveState,
  updateFriend,
  addGroup,
  deleteGroup
};
