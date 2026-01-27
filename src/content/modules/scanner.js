/**
 * DOM Scanner Logic
 * Main engine for iterating through Instagram's UI to extract follower lists.
 */
(function () {
    window.IG_SCANNER = window.IG_SCANNER || {};
    const { delay, randomDelay, log, error, waitForElement, q, qa } = window.IG_UTILS || {};
    const { syntheticClick, smoothScrollBy } = window.IG_INTERACTIONS || {};

    const SELECTORS = window.IG_SELECTORS || {};

    let _isScanning = false;
    let _collectedUsers = new Set(); // Username set to avoid dupes

    /**
     * Start the Followers Scan process
     * 1. Open Dialog by clicking "followers" link
     * 2. Find scrollable container
     * 3. Loop: Scroll -> Wait -> Parse Items -> Check if end reached
     */
    async function startScan() {
        if (_isScanning) return log("Scan already running.");
        _isScanning = true;
        _collectedUsers.clear();

        try {
            log(`Starting followers scan on ${window.location.href}...`);

            // 1. Open Dialog
            const followersLink = await waitForElement(SELECTORS.FOLLOWERS_LINK, 10000);
            if (!followersLink) throw new Error(`Could not find 'Followers' link using selector: ${SELECTORS.FOLLOWERS_LINK}. Ensure you are on a user profile page.`);

            log("Clicking Followers link...");
            await syntheticClick(followersLink);

            // Wait for dialog to open
            const dialog = await waitForElement(SELECTORS.DIALOG_CONTAINER, 5000);
            if (!dialog) throw new Error("Dialog did not open.");

            await delay(2000); // Wait for initial load

            // 2. Locate container
            // Prioritize specific class '_aano'
            let scrollContainer = dialog.querySelector(SELECTORS.SCROLLABLE_CONTAINER);

            if (!scrollContainer) {
                // Fallback: Find any div with significant height that isn't a progress bar
                const candidates = Array.from(dialog.querySelectorAll('div[style*="height"]'));
                scrollContainer = candidates.find(el => el.getAttribute('role') !== 'progressbar' && el.clientHeight > 200);
            }

            if (!scrollContainer) throw new Error("Could not find scrollable user list container (checked div._aano and robust fallbacks).");

            log("Found scroll container:", scrollContainer);

            // 3. Scrolling Loop
            let consecutiveNoNewUsers = 0;
            const MAX_NO_NEW_RETRIES = 5;
            let previousCount = 0;

            while (_isScanning) {
                // Parse current view
                const items = qa('div[role="listitem"]', dialog); // Use general listitem selector
                log(`Found ${items.length} list items in current view.`);

                // Extract data
                parseUsers(items);

                if (_collectedUsers.size === previousCount) {
                    consecutiveNoNewUsers++;
                    log(`No new users found. Retry ${consecutiveNoNewUsers}/${MAX_NO_NEW_RETRIES}`);
                } else {
                    consecutiveNoNewUsers = 0;
                    previousCount = _collectedUsers.size;
                    log(`Collected total: ${_collectedUsers.size} users`);
                }

                if (consecutiveNoNewUsers >= MAX_NO_NEW_RETRIES) {
                    log("Scan stopped: No more users loading (End of list or Rate limit).");
                    break;
                }

                // Scroll down
                const scrollAmount = scrollContainer.clientHeight * 0.8;
                scrollContainer.scrollTop += scrollAmount;

                // Wait for network load (Important: random delay)
                await randomDelay(1500, 3000);
            }

            log("Scan complete!", Array.from(_collectedUsers));
            // Ensure to close dialog or cleanup? Optional.

        } catch (err) {
            error("Scan failed:", err);
            _isScanning = false;
        } finally {
            _isScanning = false;
        }
    }

    function parseUsers(elements) {
        elements.forEach(el => {
            let username = null;

            // Strategy 1: Specific span class (often _ap3a or similar)
            const usernameEl = el.querySelector('span._ap3a');
            if (usernameEl) {
                username = usernameEl.innerText;
            }

            // Strategy 2: Look for first anchor tag with href="/username/" pattern
            if (!username) {
                const anchor = el.querySelector('a[href^="/"]');
                if (anchor) {
                    const parts = anchor.getAttribute('href').split('/').filter(Boolean);
                    // Usually /username/ so first part is username
                    if (parts.length > 0) {
                        username = parts[0];
                    }
                }
            }

            // Strategy 3: Inner text fallback (risky, might get garbage)
            if (!username) {
                const lines = el.innerText.split('\n');
                if (lines.length > 0) username = lines[0];
            }

            if (username && !username.includes(' ')) { // Basic filter to avoid full names
                _collectedUsers.add(username);
            } else {
                // log("Skipped item, could not resolve valid username:", el);
            }
        });
    }

    function stopScan() {
        _isScanning = false;
        log("Scan stopped by user.");
    }

    window.IG_SCANNER = {
        startScan,
        stopScan
    };
})();
