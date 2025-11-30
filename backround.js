// Background service worker for the ad-blocker extension

// Network blocking rules
const adBlockingRules = [
  {
    id: 1,
    priority: 1,
    action: { type: "block" },
    condition: {
      urlFilter: "*://*.doubleclick.net/*",
      resourceTypes: ["script", "image", "xmlhttprequest"]
    }
  },
  {
    id: 2,
    priority: 1,
    action: { type: "block" },
    condition: {
      urlFilter: "*://*.googleads.*/*",
      resourceTypes: ["script", "image", "xmlhttprequest"]
    }
  },
  {
    id: 3,
    priority: 1,
    action: { type: "block" },
    condition: {
      urlFilter: "*://*.googlesyndication.com/*",
      resourceTypes: ["script", "image", "xmlhttprequest"]
    }
  },
  {
    id: 4,
    priority: 1,
    action: { type: "block" },
    condition: {
      urlFilter: "*://*.adsystem.*/*",
      resourceTypes: ["script", "image", "xmlhttprequest"]
    }
  }
];

// Initialize the extension
chrome.runtime.onInstalled.addListener(() => {
  console.log("Advanced Ad Blocker installed");
  
  // Update dynamic rules for network blocking
  chrome.declarativeNetRequest.updateDynamicRules({
    addRules: adBlockingRules,
    removeRuleIds: adBlockingRules.map(rule => rule.id)
  });
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getBlockingStatus") {
    chrome.storage.local.get(['isBlockingEnabled'], (result) => {
      sendResponse({ isEnabled: result.isBlockingEnabled !== false });
    });
    return true; // Will respond asynchronously
  }
  
  if (request.action === "setBlockingStatus") {
    chrome.storage.local.set({ isBlockingEnabled: request.enabled });
    sendResponse({ success: true });
  }
});

// Track blocked requests
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    console.log('Blocked request:', details.url);
    return { cancel: true };
  },
  { urls: ["*://*.doubleclick.net/*", "*://*.googleads.*/*"] },
  ["blocking"]
);