// Background service worker for the music player extension
chrome.runtime.onInstalled.addListener(() => {
  console.log("Ad-Free YouTube Music Player installed");
});

// Network blocking for ads
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
  }
];

chrome.declarativeNetRequest.updateDynamicRules({
  addRules: adBlockingRules,
  removeRuleIds: adBlockingRules.map(rule => rule.id)
});
