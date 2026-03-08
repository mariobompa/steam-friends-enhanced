chrome.runtime.onInstalled.addListener(() => {});

function getCookieValue(name, domain, callback) {
  chrome.cookies.getAll({ name, domain }, (cookies) => {
    if (cookies && cookies.length > 0) {
      callback(cookies[0].value);
      return;
    }
    callback(null);
  });
}

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getAccessToken") {
    // Try to get the steamLoginSecure cookie
    chrome.cookies.getAll({ name: "steamLoginSecure" }, async (cookies) => {
      if (cookies && cookies.length > 0) {
        sendResponse({ token: cookies[0].value });
      } else {
        // Try alternate domain
        chrome.cookies.getAll({ name: "steamLoginSecure", domain: ".steampowered.com" }, (altCookies) => {
          if (altCookies && altCookies.length > 0) {
            sendResponse({ token: altCookies[0].value });
          } else {
            sendResponse({ token: null });
          }
        });
      }
    });
    return true; // Will respond asynchronously
  }

  if (request.action === "getSessionId") {
    getCookieValue("sessionid", ".steamcommunity.com", (sessionId) => {
      if (sessionId) {
        sendResponse({ sessionId });
        return;
      }

      getCookieValue("sessionid", ".steampowered.com", (fallbackSessionId) => {
        sendResponse({ sessionId: fallbackSessionId || null });
      });
    });

    return true;
  }
});

