/**
 * Content Script Entry Point
 * Loads all modules and orchestrates functionality.
 */
log("Loading Content Script...");

// Ensure modules are available globally (via IIFE namespace)
// Note: In MV3, modules are isolated. We rely on the order in manifest.json
// or use 'import' if we bundle. Since we are using simple JS files for now 
// (no complex bundler for content scripts besides vite capable of simple transforms),
// we assume globals are populated.

// Listen for messages from Popup/Background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    log("Message received:", request);

    if (request.action === "START_SCAN") {
        if (window.IG_API) {
            // If explicit username sent, use it, else default
            const target = request.username || null;
            window.IG_API.runCrawler(target)
                .then(() => log("Crawl finished."))
                .catch(err => log("Crawl error:", err));
            sendResponse({ status: "started_api" });
        }
    }
});

// Auto-Start Check (For Flow: Popup -> Open Tab -> Auto Start)
chrome.storage.local.get(['startOnLoad', 'targetUsername'], (result) => {
    if (result.startOnLoad && result.targetUsername) {
        log(`Auto-starting crawl for ${result.targetUsername}...`);

        // Reset flag immediately to prevent loop
        chrome.storage.local.set({ startOnLoad: false });

        // Wait a bit for page load then run
        setTimeout(() => {
            if (window.IG_API) {
                window.IG_API.runCrawler(result.targetUsername);
            }
        }, 3000);
    }
});

function log(msg, ...args) {
    console.log(`[InstaTrack Content] ${msg}`, ...args);
}
