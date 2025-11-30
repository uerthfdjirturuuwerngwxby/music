// Advanced Ad-Blocking System for YouTube Music Player with Iframe Protection
class AdBlocker {
    constructor() {
        this.stats = {
            domElements: 0,
            networkRequests: 0,
            scripts: 0,
            iframes: 0
        };
        
        this.isActive = true;
        this.originalFetch = null;
        this.originalXHR = null;
        this.mutationObserver = null;
        this.iframeObserver = null;
        
        this.init();
    }

    // Extended ad server domains including iframe ad networks
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
        'pagead2.googlesyndication',
        'ad.doubleclick.net',
        'pubads.g.doubleclick.net',
        'securepubads.g.doubleclick.net',
        'ads.youtube.com',
        'www.googletagservices.com',
        'adform.net',
        'adsystem.walmart.com',
        'amazon-adsystem.com',
        'taboola.com',
        'outbrain.com',
        'revcontent.com',
        'zemanta.com',
        'quantserve.com',
        'scorecardresearch.com',
        'tynt.com',
        'adsco.re',
        'adsnative.com',
        'adnxs.com',
        'rubiconproject.com',
        'casalemedia.com',
        'contextweb.com',
        'openx.net',
        'lijit.com',
        'exponential.com',
        'zedo.com',
        'adbrite.com',
        'adtech.de',
        'adtechus.com',
        'advertising.com',
        'atdmt.com',
        'bluekai.com',
        'krxd.net',
        'moat.com',
        'smartadserver.com',
        'sonobi.com',
        'spotxchange.com',
        'yieldmo.com',
        'yieldone.com',
        'yieldlab.net',
        'yieldmanager.com',
        'yieldoptimizer.com',
        'yieldpartners.com',
        'yieldselect.com'
    ];

    // Iframe-specific ad patterns
    iframeAdPatterns = [
        '*://*.doubleclick.net/*',
        '*://*.googleads.*/*',
        '*://*.googlesyndication.com/*',
        '*://*.adsystem.*/*',
        '*://*.adservice.*/*',
        '*://*.adserver.*/*',
        '*://*.ads.*/*',
        '*://*.ad.*/*',
        '*://ads.*/*',
        '*://ad.*/*',
        '*://*.adform.net/*',
        '*://*.amazon-adsystem.com/*',
        '*://*.taboola.com/*',
        '*://*.outbrain.com/*'
    ];

    // Ad-related CSS selectors including iframe containers
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
        '.video-ads',
        'iframe[src*="ad"]',
        'iframe[src*="doubleclick"]',
        'iframe[src*="googleads"]',
        'iframe[src*="googlesyndication"]',
        '.ad-iframe',
        '.ad-frame',
        '.ads-iframe',
        '[class*="ad-iframe"]',
        '[class*="ads-iframe"]'
    ];

    init() {
        this.setupNetworkInterception();
        this.setupMutationObserver();
        this.setupScriptOverriding();
        this.setupIframeBlocking();
        this.removeExistingAds();
        this.blockExistingIframes();
        this.log('Advanced ad-blocking system initialized with iframe protection', 'system');
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

        if (statElements.dom) statElements.dom.textContent = this.stats.domElements + this.stats.iframes;
        if (statElements.network) statElements.network.textContent = this.stats.networkRequests;
        if (statElements.scripts) statElements.scripts.textContent = this.stats.scripts;
    }

    isAdServer(url) {
        if (!url) return false;
        const lowerUrl = url.toLowerCase();
        return this.adServers.some(server => lowerUrl.includes(server.toLowerCase()));
    }

    isAdIframe(iframe) {
        if (!iframe || !iframe.src) return false;
        
        // Check if iframe src matches known ad servers
        if (this.isAdServer(iframe.src)) {
            return true;
        }

        // Check for common iframe ad patterns
        const src = iframe.src.toLowerCase();
        const adPatterns = [
            'ad', 'ads', 'banner', 'sponsor', 'doubleclick', 'googlead', 'googlesyndication',
            'adserver', 'adservice', 'adform', 'amazon-adsystem', 'taboola', 'outbrain'
        ];

        return adPatterns.some(pattern => src.includes(pattern));
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

        // Check if it's an iframe with ad content
        if (element.tagName === 'IFRAME' && this.isAdIframe(element)) {
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
            attributeFilter: ['class', 'id', 'style', 'src']
        };

        this.mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) {
                            // Check if it's an iframe
                            if (node.tagName === 'IFRAME' && this.isAdIframe(node)) {
                                node.remove();
                                this.stats.iframes++;
                                this.log('Removed dynamic iframe ad', 'warning');
                                return;
                            }
                            
                            // Check for regular ad elements
                            if (this.isAdElement(node)) {
                                node.remove();
                                this.stats.domElements++;
                                this.log('Removed dynamic ad element', 'info');
                            }
                            
                            // Check children for iframes
                            if (node.querySelectorAll) {
                                node.querySelectorAll('iframe').forEach(iframe => {
                                    if (this.isAdIframe(iframe)) {
                                        iframe.remove();
                                        this.stats.iframes++;
                                        this.log('Removed nested iframe ad', 'warning');
                                    }
                                });
                            }
                        }
                    });
                }
                
                // Handle attribute changes (like src changes on iframes)
                if (mutation.type === 'attributes' && mutation.target.nodeType === 1) {
                    if (mutation.target.tagName === 'IFRAME' && mutation.attributeName === 'src') {
                        if (this.isAdIframe(mutation.target)) {
                            mutation.target.remove();
                            this.stats.iframes++;
                            this.log('Removed iframe ad after src change', 'warning');
                        }
                    }
                }
            });
        });

        this.mutationObserver.observe(document.body, observerConfig);
        this.log('Mutation observer activated for iframe protection');
    }

    setupScriptOverriding() {
        // Override appendChild for scripts and iframes
        const originalAppendChild = Element.prototype.appendChild;
        Element.prototype.appendChild = function(node) {
            if (node.nodeType === 1) {
                if (node.tagName === 'SCRIPT') {
                    const src = node.src || '';
                    if (window.adBlocker && window.adBlocker.isAdServer(src)) {
                        window.adBlocker.stats.scripts++;
                        window.adBlocker.log(`Blocked ad script: ${src}`, 'warning');
                        return node; // Don't execute
                    }
                }
                else if (node.tagName === 'IFRAME') {
                    if (window.adBlocker && window.adBlocker.isAdIframe(node)) {
                        window.adBlocker.stats.iframes++;
                        window.adBlocker.log(`Blocked iframe ad: ${node.src || 'unknown'}`, 'warning');
                        return node; // Don't append
                    }
                }
            }
            return originalAppendChild.call(this, node);
        };

        // Override createElement for scripts and iframes
        const originalCreateElement = Document.prototype.createElement;
        Document.prototype.createElement = function(tagName, ...args) {
            const element = originalCreateElement.call(this, tagName, ...args);
            if (tagName.toLowerCase() === 'script' || tagName.toLowerCase() === 'iframe') {
                const originalSetAttribute = element.setAttribute;
                element.setAttribute = function(name, value) {
                    if (name === 'src' && window.adBlocker && window.adBlocker.isAdServer(value)) {
                        window.adBlocker.log(`Blocked ${tagName} src: ${value}`, 'warning');
                        if (tagName.toLowerCase() === 'script') {
                            window.adBlocker.stats.scripts++;
                        } else {
                            window.adBlocker.stats.iframes++;
                        }
                        return; // Don't set the attribute
                    }
                    return originalSetAttribute.call(this, name, value);
                };
            }
            return element;
        };

        this.log('Script and iframe overriding activated');
    }

    setupIframeBlocking() {
        // Block iframe creation at the prototype level
        const OriginalHTMLIFrameElement = window.HTMLIFrameElement;
        
        if (OriginalHTMLIFrameElement) {
            window.HTMLIFrameElement = function() {
                const iframe = new OriginalHTMLIFrameElement();
                const originalSetAttribute = iframe.setAttribute;
                
                iframe.setAttribute = function(name, value) {
                    if (name === 'src' && window.adBlocker && window.adBlocker.isAdServer(value)) {
                        window.adBlocker.stats.iframes++;
                        window.adBlocker.log(`Blocked iframe creation: ${value}`, 'warning');
                        return;
                    }
                    return originalSetAttribute.call(this, name, value);
                };
                
                return iframe;
            };
            window.HTMLIFrameElement.prototype = OriginalHTMLIFrameElement.prototype;
        }

        this.log('Iframe blocking system activated');
    }

    removeExistingAds() {
        // Remove regular ad elements
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

    blockExistingIframes() {
        // Remove existing iframe ads
        document.querySelectorAll('iframe').forEach(iframe => {
            if (this.isAdIframe(iframe)) {
                iframe.remove();
                this.stats.iframes++;
                this.log(`Removed existing iframe ad: ${iframe.src || 'unknown'}`, 'warning');
            }
        });
        this.log('Existing iframe ads blocked');
    }

    // Enhanced YouTube ad-blocking with iframe protection
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

        // Additional YouTube-specific iframe blocking
        const youtubeIframeObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1 && node.tagName === 'IFRAME') {
                            // Block YouTube ad iframes specifically
                            if (node.src && (
                                node.src.includes('youtube.com/api/stats/ads') ||
                                node.src.includes('youtube.com/pagead/') ||
                                node.src.includes('google.com/pagead/') ||
                                node.src.includes('doubleclick.net/pagead/')
                            )) {
                                node.remove();
                                this.stats.iframes++;
                                this.log('Blocked YouTube ad iframe', 'warning');
                            }
                        }
                    });
                }
            });
        });

        youtubeIframeObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        this.log('YouTube-specific iframe ad-blocking activated');
    }

    // Method to manually block a specific iframe
    blockIframeBySrc(srcPattern) {
        document.querySelectorAll('iframe').forEach(iframe => {
            if (iframe.src && iframe.src.includes(srcPattern)) {
                iframe.remove();
                this.stats.iframes++;
                this.log(`Manually blocked iframe: ${srcPattern}`, 'warning');
            }
        });
    }

    // Method to test iframe blocking
    testIframeBlocking() {
        // Create test iframe ads (for demonstration)
        const testIframes = [
            'https://googleads.g.doubleclick.net/pagead/test',
            'https://pubads.g.doubleclick.net/gampad/test',
            'https://ads.youtube.com/test'
        ];

        testIframes.forEach(src => {
            const testIframe = document.createElement('iframe');
            testIframe.src = src;
            testIframe.style.display = 'none';
            document.body.appendChild(testIframe);
        });

        this.log('Test iframe ads created - they should be blocked immediately', 'system');
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
        if (this.iframeObserver) {
            this.iframeObserver.disconnect();
        }
        
        this.log('Ad-blocking disabled', 'warning');
    }

    enable() {
        this.isActive = true;
        this.init();
        this.log('Ad-blocking enabled', 'system');
    }

    // Get blocking statistics
    getStats() {
        return {
            totalBlocked: this.stats.domElements + this.stats.networkRequests + this.stats.scripts + this.stats.iframes,
            ...this.stats
        };
    }
}

// Initialize ad-blocker
window.adBlocker = new AdBlocker();

// Enhanced YouTube ad-blocking
setTimeout(() => {
    window.adBlocker.blockYouTubeAds();
}, 1000);

// Export for manual control
window.blockIframeAds = function(srcPattern) {
    if (window.adBlocker) {
        window.adBlocker.blockIframeBySrc(srcPattern);
    }
};

window.testAdBlocking = function() {
    if (window.adBlocker) {
        window.adBlocker.testIframeBlocking();
    }
};

console.log('Advanced Iframe Ad-Blocker Loaded!');
console.log('Available commands:');
console.log('- window.blockIframeAds("domain.com") - Manually block iframes from domain');
console.log('- window.testAdBlocking() - Test iframe blocking functionality');
