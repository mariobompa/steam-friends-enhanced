if (!globalThis.SFMStorage) {
  throw new Error("SFMStorage must be loaded before auth.js");
}

const SFMAuth = (() => {
  let cachedAccessToken = null;

  function normalizeAccessToken(rawToken) {
    if (typeof rawToken !== "string") {
      return null;
    }

    let token = rawToken.trim();
    if (!token) {
      return null;
    }

    for (let index = 0; index < 2; index += 1) {
      if (token.includes("||")) {
        token = token.split("||").pop().trim();
      } else if (/%7C%7C/i.test(token)) {
        token = token.split(/%7C%7C/i).pop().trim();
      }

      if (!token.includes("%")) {
        break;
      }

      try {
        const decoded = decodeURIComponent(token);
        if (decoded === token) {
          break;
        }
        token = decoded;
      } catch {
        break;
      }
    }

    if (token.includes("||") || /%7C%7C/i.test(token)) {
      token = token.split(/\|\||%7C%7C/i).pop().trim();
    }

    return token || null;
  }

  /**
   * Extract access token from Steam cookies via background service worker
   * The token is stored in the steamLoginSecure cookie
   * Format is usually: steamid||jwt_token or steamid%7C%7Cjwt_token (URL encoded)
   * We need just the jwt_token part
   */
  async function getAccessToken() {
    if (cachedAccessToken) {
      return cachedAccessToken;
    }

    try {
      // Request token from background service worker (has better cookie access)
      const response = await chrome.runtime.sendMessage({ action: "getAccessToken" });
      
      if (response && response.token) {
        const token = normalizeAccessToken(response.token);
        if (!token) {
          console.warn("Received invalid token format from service worker");
          return null;
        }
        
        cachedAccessToken = token;
        console.log("Successfully extracted Steam access token via service worker");
        return cachedAccessToken;
      } else {
        console.warn("Service worker could not retrieve access token");
      }
    } catch (error) {
      console.debug("Could not get access token from service worker:", error);
    }

    // Fallback: try direct cookie access
    try {
      const cookies = await chrome.cookies.getAll({ name: "steamLoginSecure" });
      
      if (cookies && cookies.length > 0 && cookies[0].value) {
        const token = normalizeAccessToken(cookies[0].value);
        if (!token) {
          console.warn("Received invalid token format from cookies");
          return null;
        }
        
        cachedAccessToken = token;
        console.log("Successfully extracted Steam access token from cookies");
        return cachedAccessToken;
      }
    } catch (error) {
      console.debug("Direct cookie access failed:", error);
    }

    console.warn("Could not extract access token");
    return null;
  }

  /**
   * Fetch friend list with friendship dates from Steam API
   * Uses the official Steam Web API endpoint
   */
  async function fetchFriendshipDates(accessToken) {
    const sanitizedAccessToken = normalizeAccessToken(accessToken);
    if (!sanitizedAccessToken) {
      console.warn("No access token available for Steam API");
      return {};
    }

    try {
      const response = await fetch(
        `https://api.steampowered.com/ISteamUserOAuth/GetFriendList/v1/?access_token=${encodeURIComponent(sanitizedAccessToken)}&relationship=friend`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json"
          }
        }
      );

      if (!response.ok) {
        console.error("Steam API returned error:", response.status);
        return {};
      }

      const rawBody = await response.text();
      let data;

      try {
        data = JSON.parse(rawBody);
      } catch (parseError) {
        console.error("Steam API returned non-JSON response:", {
          status: response.status,
          bodyPreview: rawBody.slice(0, 300)
        });
        return {};
      }

      console.log("Received friend list data from Steam API", data);
      const friends = Array.isArray(data?.friends)
        ? data.friends
        : Array.isArray(data?.friendlist?.friends)
          ? data.friendlist.friends
          : null;

      if (!friends) {
        console.warn("Unexpected Steam API response format", data);
        return {};
      }

      // Convert friendlist to object with steamId as key
      const friendsData = {};
      for (const friend of friends) {
        const friendSince = Number(friend.friend_since);

        if (friend.steamid && Number.isFinite(friendSince)) {
          friendsData[friend.steamid] = {
            friendSince: friendSince * 1000 // Convert Unix timestamp to milliseconds
          };
        }
      }

      return friendsData;
    } catch (error) {
      console.error("Error fetching friendship dates from Steam API:", error);
      return {};
    }
  }

  async function getSessionId() {
    try {
      const response = await chrome.runtime.sendMessage({ action: "getSessionId" });
      if (response && typeof response.sessionId === "string" && response.sessionId.trim()) {
        return response.sessionId.trim();
      }
    } catch (error) {
      console.debug("Could not get sessionid from service worker:", error);
    }

    return null;
  }

  /**
   * Calculate human-readable friendship duration
   * e.g., "Friends for 3 years, 2 months"
   */
  function calculateFriendshipDuration(friendSinceTimestamp) {
    if (!Number.isFinite(friendSinceTimestamp)) {
      return null;
    }

    const now = Date.now();
    const diffMs = now - friendSinceTimestamp;
    const diffSeconds = Math.floor(diffMs / 1000);

    if (diffSeconds < 60) {
      return "Just became friends";
    }

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""}`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""}`;
    }

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) {
      return `${diffDays} day${diffDays !== 1 ? "s" : ""}`;
    }

    const diffMonths = Math.floor(diffDays / 30.44);
    if (diffMonths < 12) {
      return `${diffMonths} month${diffMonths !== 1 ? "s" : ""}`;
    }

    const diffYears = Math.floor(diffMonths / 12);
    const remainingMonths = diffMonths % 12;

    if (remainingMonths === 0) {
      return `${diffYears} year${diffYears !== 1 ? "s" : ""}`;
    }

    return `${diffYears} year${diffYears !== 1 ? "s" : ""}, ${remainingMonths} month${remainingMonths !== 1 ? "s" : ""}`;
  }

  /**
   * Format a Unix timestamp as a readable date
   * e.g., "Jan 15, 2021"
   */
  function formatFriendshipDate(timestamp) {
    if (!Number.isFinite(timestamp)) {
      return null;
    }

    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }

  /**
   * Remove a friend via Steam API
   */
  async function removeFriend(steamId, accessToken) {
    if (!steamId) {
      console.error("Invalid steamId");
      return false;
    }

    try {
      const sessionId = await getSessionId();
      if (!sessionId) {
        console.error("Could not get Steam sessionid cookie for unfriend request");
        return false;
      }

      const url = "https://steamcommunity.com/actions/RemoveFriendAjax";
      const body = new URLSearchParams({
        sessionID: sessionId,
        steamid: String(steamId)
      }).toString();

      console.log("Calling Steam Community RemoveFriendAjax");
      
      const response = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest"
        },
        body
      });

      console.log("Steam API response status:", response.status);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("Steam unfriend request failed:", {
          status: response.status,
          bodyPreview: errorBody.slice(0, 300)
        });
        return false;
      }

      const rawBody = await response.text();
      if (!rawBody.trim()) {
        console.log("Friend removed successfully (empty response body)");
        return true;
      }

      try {
        const result = JSON.parse(rawBody);
        const success = result === true || result?.success === 1 || result?.success === true;
        if (!success) {
          console.error("Steam unfriend response did not indicate success:", result);
        }
        return success;
      } catch {
        console.log("Friend removed successfully (non-JSON response body)");
        return true;
      }
    } catch (error) {
      console.error("Error removing friend via Steam Community endpoint:", error);
      return false;
    }
  }

  /**
   * Sync friendship dates from Steam API and save to storage
   * Respects cache expiry (7 days)
   */
  async function syncFriendshipDates() {
    try {
      // Check if cache is still valid
      const isCacheValid = await SFMStorage.isFriendshipDateCacheValid();
      if (isCacheValid) {
        console.log("Friendship dates cache is still valid, skipping sync");
        return true;
      }

      // Get access token
      const accessToken = await getAccessToken();
      if (!accessToken) {
        console.warn("Could not get access token for friendship date sync");
        return false;
      }

      // Fetch from API
      const friendsData = await fetchFriendshipDates(accessToken);
      if (Object.keys(friendsData).length === 0) {
        console.warn("No friendship data returned from API");
        return false;
      }

      // Save to storage
      await SFMStorage.saveFriendshipDates(friendsData);

      // Update sync timestamp
      const syncTime = SFMStorage.getFriendshipDateTimestamp();
      const state = await SFMStorage.getState();
      state.friendshipSyncTime = syncTime;
      await SFMStorage.saveState(state);

      console.log("Friendship dates synced successfully");
      return true;
    } catch (error) {
      console.error("Error syncing friendship dates:", error);
      return false;
    }
  }

  return {
    getAccessToken,
    fetchFriendshipDates,
    calculateFriendshipDuration,
    formatFriendshipDate,
    syncFriendshipDates,
    removeFriend
  };
})();

globalThis.SFMAuth = SFMAuth;
