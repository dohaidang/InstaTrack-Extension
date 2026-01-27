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
        // Switch to API implementation
        if (window.IG_API) {
            window.IG_API.fetchAllFollowers()
                .then(data => {
                    log("API Scan finished successfully.");
                    // Optional: Send data back?
                })
                .catch(err => {
                    log("API Scan error:", err);
                });
            sendResponse({ status: "started_api" });
        } else {
            // Fallback
            window.IG_SCANNER.startScan();
            sendResponse({ status: "started_legacy" });
        }
    } else if (request.action === "STOP_SCAN") {
        window.IG_SCANNER.stopScan();
        sendResponse({ status: "stopped" });
    }
});

function log(msg, ...args) {
    console.log(`[InstaTrack Content] ${msg}`, ...args);
}
