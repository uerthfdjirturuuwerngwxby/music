// Advanced Ad-Blocking System for YouTube Music Player
class AdBlocker {
    constructor() {
        this.stats = {
            domElements: 0,
            networkRequests: 0,
            scripts: 0
        };
        
        this.isActive = true;
        this.originalFetch = null;
        this.originalXHR = null;
        this.mutationObserver = null;
        
        this.init();
    }

    // Ad server domains
    adServers = [
        'doubleclick.net',
        'googleads',
        'googlesyndication',
        'facebook.com/ads',
        'adsystem',
        'adservice',
        'adserver',
        'googletagservices',
        'gstatic.com/cv/js',
        'pagead2.googlesyndication'
    ];

    // Ad-related CSS selectors
    adSelectors = [
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
        '[data-adclient]',
        '.ytp-ad-module',
        '.ytp-ad-player-overlay',
        '.video-ads'
    ];

    init() {
        this.setupNetworkInterception();
        this.setupMutationObserver();
        this.setupScriptOverriding();
        this.removeExistingAds();
        this.log('Ad-blocking system initialized', 'system');
    }

    log(message, type = 'info') {
        const logContainer = document.getElementById('logContainer');
        if (!logContainer) return;

        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type === 'warning' ? 'log-warning' : ''} ${type === 'error' ? 'log-error' : ''}`;
        
        const timestamp = new Date().toLocaleTimeString();
        logEntry.textContent = `[${timestamp}] ${message}`;
        
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;

        // Update statistics in UI
        this.updateStatsUI();
    }

    updateStatsUI() {
        const statElements = {
            dom: document.getElementById('statDom'),
            network: document.getElementById('statNetwork'),
            scripts: document.getElementById('statScripts')
        };

        if (statElements.dom) statElements.dom.textContent = this.stats.domElements;
        if (statElements.network) statElements.network.textContent = this.stats.networkRequests;
        if (statElements.scripts) statElements.scripts.textContent = this.stats.scripts;
    }

    isAdServer(url) {
        if (!url) return false;
        return this.adServers.some(server => url.toLowerCase().includes(server.toLowerCase()));
    }

    isAdElement(element) {
        if (!element || !element.getAttribute) return false;

        const className = element.className?.toString().toLowerCase() || '';
        const id = element.id?.toLowerCase() || '';
        
        // Check CSS selectors
        if (this.adSelectors.some(selector => {
            if (selector.startsWith('[class*="')) {
                const keyword = selector.split('"')[1];
                return className.includes(keyword);
            }
            if (selector.startsWith('[id*="')) {
                const keyword = selector.split('"')[1];
                return id.includes(keyword);
            }
            return className.includes(selector.replace('.', '')) || id.includes(selector.replace('#', ''));
        })) {
            return true;
        }

        // Check data attributes
        if (element.hasAttribute('data-ad') || element.hasAttribute('data-adclient')) {
            return true;
        }

        // Check for common ad patterns
        const styles = window.getComputedStyle(element);
        if (styles.backgroundImage && styles.backgroundImage.includes('ad')) {
            return true;
        }

        return false;
    }

    setupNetworkInterception() {
        // Intercept fetch requests
        this.originalFetch = window.fetch;
        window.fetch = (...args) => {
            const url = args[0];
            if (this.isAdServer(url)) {
                this.stats.networkRequests++;
                this.log(`Blocked network request: ${url}`, 'warning');
                return Promise.reject(new Error('Ad request blocked'));
            }
            return this.originalFetch.apply(this, args);
        };

        // Intercept XMLHttpRequest
        this.originalXHR = window.XMLHttpRequest;
        const XHR = this.originalXHR;
        window.XMLHttpRequest = function() {
            const xhr = new XHR();
            const originalOpen = xhr.open;
            
            xhr.open = function(method, url, ...rest) {
                if (window.adBlocker && window.adBlocker.isAdServer(url)) {
                    window.adBlocker.stats.networkRequests++;
                    window.adBlocker.log(`Blocked XHR request: ${url}`, 'warning');
                    throw new Error('Ad request blocked');
                }
                return originalOpen.call(this, method, url, ...rest);
            };
            
            return xhr;
        };

        this.log('Network interception activated');
    }

    setupMutationObserver() {
        const observerConfig = {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'id', 'style']
        };

        this.mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1 && this.isAdElement(node)) {
                            node.remove();
                            this.stats.domElements++;
                            this.log('Removed dynamic ad element', 'info');
                        }
                    });
                }
            });
        });

        this.mutationObserver.observe(document.body, observerConfig);
        this.log('Mutation observer activated');
    }

    setupScriptOverriding() {
        // Override appendChild for scripts
        const originalAppendChild = Element.prototype.appendChild;
        Element.prototype.appendChild = function(node) {
            if (node.nodeType === 1 && node.tagName === 'SCRIPT') {
                const src = node.src || '';
                if (window.adBlocker && window.adBlocker.isAdServer(src)) {
                    window.adBlocker.stats.scripts++;
                    window.adBlocker.log(`Blocked ad script: ${src}`, 'warning');
                    return node; // Don't execute
                }
            }
            return originalAppendChild.call(this, node);
        };

        this.log('Script overriding activated');
    }

    removeExistingAds() {
        this.adSelectors.forEach(selector => {
            try {
                document.querySelectorAll(selector).forEach(element => {
                    if (this.isAdElement(element) && element.isConnected) {
                        element.remove();
                        this.stats.domElements++;
                    }
                });
            } catch (e) {
                // Silent fail for invalid selectors
            }
        });
        this.log('Existing ads removed from DOM');
    }

    // Enhanced YouTube ad-blocking
    blockYouTubeAds() {
        // Override YouTube player functions
        if (window.YT && window.YT.Player) {
            const originalLoadVideoById = window.YT.Player.prototype.loadVideoById;
            window.YT.Player.prototype.loadVideoById = function(videoId, ...args) {
                this.setOption('modestbranding', 1);
                this.setOption('rel', 0);
                this.setOption('showinfo', 0);
                this.setOption('iv_load_policy', 3);
                return originalLoadVideoById.call(this, videoId, ...args);
            };
        }

        // Block YouTube ad domains specifically
        const youtubeAdDomains = [
            'doubleclick.net',
            'googleads',
            'googlesyndication',
            'youtube.com/api/stats/ads',
            'youtube.com/pagead/'
        ];

        this.adServers = [...this.adServers, ...youtubeAdDomains];
        this.log('YouTube-specific ad-blocking activated');
    }

    disable() {
        this.isActive = false;
        
        // Restore original functions
        if (this.originalFetch) {
            window.fetch = this.originalFetch;
        }
        if (this.originalXHR) {
            window.XMLHttpRequest = this.originalXHR;
        }
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
        }
        
        this.log('Ad-blocking disabled', 'warning');
    }

    enable() {
        this.isActive = true;
        this.init();
        this.log('Ad-blocking enabled', 'system');
    }
}

// Initialize ad-blocker
window.adBlocker = new AdBlocker();

// Enhanced YouTube ad-blocking
setTimeout(() => {
    window.adBlocker.blockYouTubeAds();
}, 1000);