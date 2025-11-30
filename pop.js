// Popup script for the ad-blocker extension

document.addEventListener('DOMContentLoaded', function() {
    const toggle = document.getElementById('toggleBlocking');
    const viewDetails = document.getElementById('viewDetails');
    
    // Load current blocking status
    chrome.storage.local.get(['isBlockingEnabled'], function(result) {
        const isEnabled = result.isBlockingEnabled !== false;
        toggle.checked = isEnabled;
    });
    
    // Toggle blocking
    toggle.addEventListener('change', function() {
        const isEnabled = this.checked;
        chrome.storage.local.set({ isBlockingEnabled: isEnabled });
        
        // Send message to all tabs to update blocking status
        chrome.tabs.query({}, function(tabs) {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                    action: "setBlockingStatus",
                    enabled: isEnabled
                });
            });
        });
    });
    
    // View details
    viewDetails.addEventListener('click', function() {
        chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
    });
    
    // Update statistics (this would need to communicate with content scripts)
    function updateStats() {
        // In a real extension, you would get these from the background script
        // or content scripts via messaging
        document.getElementById('domCount').textContent = 'N/A';
        document.getElementById('networkCount').textContent = 'N/A';
        document.getElementById('scriptCount').textContent = 'N/A';
    }
    
    updateStats();
});