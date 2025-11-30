// Advanced Ad-Blocking Content Script
// This runs on the web page and implements various ad-blocking techniques

// Statistics
let stats = {
    domElements: 0,
    networkRequests: 0,
    scripts: 0
};

// Ad-blocking state
let isBlockingActive = false;
let originalFetch = null;
let originalXHR = null;
let mutationObserver = null;

// DOM elements
const statusElements = {
    dom: document.getElementById('statusDom'),
    network: document.getElementById('statusNetwork'),
    mutation: document.getElementById('statusMutation'),
    script: document.getElementById('statusScript')
};

const statElements = {
    dom: document.getElementById('statDom'),
    network: document.getElementById('statNetwork'),
    scripts: document.getElementById('statScripts')
};

const logContainer = document.getElementById('logContainer');

// Ad server domains (educational examples)
const adServers = [
    'doubleclick.net',
    'googleads',
    'googlesyndication',
    'facebook.com/ads',
    'adsystem',
    'adservice',
    'adserver',
    'example-ads.com'
];

// Ad-related CSS selectors
const adSelectors = [
    '[class*="ad"]',
    '[id*="ad"]',
    '[class*="banner"]',
    '[class*="sponsor"]',
    '.ads',
    '.ad-container',
    '.ad-banner',
    '.ad-wrapper',
    '.sponsored',
    '.promo-banner',
    '[data-ad]',
    '[data-adclient]'
];

// Logging function
function logBlock(type, details, isWarning = false) {
    if (!isBlockingActive) return;

    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${isWarning ? 'log-warning' : ''}`;
    
    const timestamp = new Date().toLocaleTimeString();
    logEntry.textContent = `[${timestamp}] ${type} blocked: ${details}`;
    
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;

    // Update statistics
    if (type === 'DOM') {
        stats.domElements++;
        statElements.dom.textContent = stats.domElements;
    } else if (type === 'Network') {
        stats.networkRequests++;
        statElements.network.textContent = stats.networkRequests;
    } else if (type === 'Script') {
        stats.scripts++;
        statElements.scripts.textContent = stats.scripts;
    }
}

// Check if URL is from ad server
function isAdServer(url) {
    if (!url) return false;
    return adServers.some(server => url.toLowerCase().includes(server.toLowerCase()));
}

// Check if element is an ad
function isAdElement(element) {
    if (!element || !element.getAttribute) return false;

    // Check classes and IDs
    const className = element.className?.toString().toLowerCase() || '';
    const id = element.id?.toLowerCase() || '';
    
    if (adSelectors.some(selector => {
        if (selector.startsWith('[class*="')) {
            const keyword = selector.split('"')[1];
            return className.includes(keyword);
        }
        if (selector.startsWith('[id*="')) {
            const keyword = selector.split('"')[1];
            return id.includes(keyword);
        }
        return false;
    })) {
        return true;
    }

    // Check data attributes
    if (element.hasAttribute('data-ad') || element.hasAttribute('data-adclient')) {
        return true;
    }

    // Check common ad patterns
    const styles = window.getComputedStyle(element);
    if (styles.backgroundImage && styles.backgroundImage.includes('ad')) {
        return true;
    }

    return false;
}

// Check if script is ad-related
function isAdScript(scriptElement) {
    if (!scriptElement || !scriptElement.src) return false;
    return isAdServer(scriptElement.src);
}

// DOM Filtering
function removeExistingAds() {
    if (!isBlockingActive) return;

    adSelectors.forEach(selector => {
        try {
            document.querySelectorAll(selector).forEach(element => {
                if (isAdElement(element) && element.isConnected) {
                    element.remove();
                    logBlock('DOM', `Selector: ${selector}`);
                }
            });
        } catch (e) {
            // Silent fail for invalid selectors
        }
    });
}

// Network Interception
function setupNetworkInterception() {
    // Intercept fetch
    originalFetch = window.fetch;
    window.fetch = function(...args) {
        const url = args[0];
        if (isAdServer(url)) {
            logBlock('Network', url);
            return Promise.reject(new Error('Ad request blocked'));
        }
        return originalFetch.apply(this, args);
    };

    // Intercept XMLHttpRequest
    originalXHR = window.XMLHttpRequest;
    const XHR = originalXHR;
    window.XMLHttpRequest = function() {
        const xhr = new XHR();
        const originalOpen = xhr.open;
        
        xhr.open = function(method, url, ...rest) {
            if (isAdServer(url)) {
                logBlock('Network', url);
                throw new Error('Ad request blocked');
            }
            return originalOpen.call(this, method, url, ...rest);
        };
        
        return xhr;
    };
}

// Mutation Observer for dynamic content
function setupMutationObserver() {
    const observerConfig = {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'id', 'style']
    };

    mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            // Handle added nodes
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        if (isAdElement(node)) {
                            node.remove();
                            logBlock('DOM', 'Dynamic ad element');
                        }
                        
                        // Check children recursively
                        node.querySelectorAll?.('*').forEach(child => {
                            if (isAdElement(child)) {
                                child.remove();
                                logBlock('DOM', 'Dynamic child ad');
                            }
                        });
                    }
                });
            }
            
            // Handle attribute changes
            if (mutation.type === 'attributes' && mutation.target.nodeType === 1) {
                if (isAdElement(mutation.target)) {
                    mutation.target.remove();
                    logBlock('DOM', 'Attribute-changed ad');
                }
            }
        });
    });

    mutationObserver.observe(document.body, observerConfig);
}

// Script Overriding
function setupScriptOverriding() {
    // Override appendChild to catch dynamically added scripts
    const originalAppendChild = Element.prototype.appendChild;
    Element.prototype.appendChild = function(node) {
        if (node.nodeType === 1 && node.tagName === 'SCRIPT') {
            if (isAdScript(node)) {
                logBlock('Script', node.src || 'Inline ad script');
                return node; // Don't actually append
            }
        }
        return originalAppendChild.call(this, node);
    };

    // Override createElement for script elements
    const originalCreateElement = Document.prototype.createElement;
    Document.prototype.createElement = function(tagName, ...args) {
        const element = originalCreateElement.call(this, tagName, ...args);
        if (tagName.toLowerCase() === 'script') {
            const originalSetAttribute = element.setAttribute;
            element.setAttribute = function(name, value) {
                if (name === 'src' && isAdServer(value)) {
                    logBlock('Script', `Blocked script: ${value}`);
                    return; // Don't set the attribute
                }
                return originalSetAttribute.call(this, name, value);
            };
        }
        return element;
    };
}

// Start ad-blocking
function startAdBlocking() {
    if (isBlockingActive) return;
    
    isBlockingActive = true;
    logBlock('System', 'Ad-blocking started');
    
    // Update status indicators
    Object.values(statusElements).forEach(el => {
        el.textContent = 'Active';
        el.className = 'status-value status-active';
    });

    // Initialize all blocking techniques
    setupNetworkInterception();
    setupMutationObserver();
    setupScriptOverriding();
    removeExistingAds();
}

// Stop ad-blocking
function stopAdBlocking() {
    if (!isBlockingActive) return;
    
    isBlockingActive = false;
    logBlock('System', 'Ad-blocking stopped', true);

    // Update status indicators
    Object.values(statusElements).forEach(el => {
        el.textContent = 'Inactive';
        el.className = 'status-value status-inactive';
    });

    // Restore original functions
    if (originalFetch) {
        window.fetch = originalFetch;
    }
    if (originalXHR) {
        window.XMLHttpRequest = originalXHR;
    }
    if (mutationObserver) {
        mutationObserver.disconnect();
    }
}

// Test ad detection
function testAdDetection() {
    // Create test ad elements
    const testAd = document.createElement('div');
    testAd.className = 'test-ad-banner';
    testAd.innerHTML = 'Test Advertisement (Should be blocked)';
    testAd.style.cssText = 'padding: 10px; background: #ff6b6b; color: white; margin: 10px 0;';
    document.body.appendChild(testAd);

    // Simulate network request
    setTimeout(() => {
        if (isBlockingActive) {
            fetch('https://example-ads.com/test')
                .catch(() => logBlock('Test', 'Test network request blocked'));
        }
    }, 100);
}

// Event listeners
document.getElementById('startBlocking').addEventListener('click', startAdBlocking);
document.getElementById('stopBlocking').addEventListener('click', stopAdBlocking);
document.getElementById('clearLogs').addEventListener('click', () => {
    logContainer.innerHTML = '<div class="log-entry">Logs cleared</div>';
});
document.getElementById('testAds').addEventListener('click', testAdDetection);

// Initialize
startAdBlocking();