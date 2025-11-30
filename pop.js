document.getElementById('openPlayer').addEventListener('click', function() {
    chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
});
