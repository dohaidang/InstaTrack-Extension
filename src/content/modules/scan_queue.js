/**
 * Scan Queue Module
 * Runs "scan all accounts" one account at a time. The popup creates the queue
 * (chrome.storage key: scanQueue); after each scan this module records the
 * result, waits a cooldown, and opens the next account's profile page.
 * Accounts are never scanned in parallel: Instagram rate-limits (HTTP 429)
 * aggressively and a throttled session would corrupt every scan in the batch.
 */
(function () {
    const { log, delay } = window.IG_UTILS || {};
    const QUEUE_KEY = 'scanQueue';
    const COOLDOWN_MIN_MS = 30000;
    const COOLDOWN_MAX_MS = 45000;
    // Errors that would hit every remaining account too, so the queue stops instead of retrying
    const FATAL_PATTERN = /cancelled by user|429|rate-limit|login|authentication failed/i;

    const sameUser = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();

    /**
     * Pure: record the outcome of the running item and pick what comes next.
     * @returns {{ queue: object, next: string | null }}
     */
    function recordResult(queue, username, outcome, now) {
        const items = queue.items.map(item => {
            if (item.status !== 'running' || !sameUser(item.username, username)) return item;
            return outcome.ok
                ? { username: item.username, status: 'done' }
                : { username: item.username, status: 'error', message: outcome.message || 'Scan failed.' };
        });

        const fatal = !outcome.ok && FATAL_PATTERN.test(outcome.message || '');
        if (fatal) {
            return {
                queue: {
                    ...queue,
                    items: items.map(item => item.status === 'pending' ? { ...item, status: 'skipped' } : item),
                    active: false,
                    waitingUntil: null,
                    updatedAt: now,
                    stopReason: outcome.message
                },
                next: null
            };
        }

        const next = items.find(item => item.status === 'pending');
        return {
            queue: { ...queue, items, active: Boolean(next), waitingUntil: null, updatedAt: now },
            next: next ? next.username : null
        };
    }

    /** Called by the content script after every scan; opens the next profile when one is left. */
    async function advanceQueue(username, outcome) {
        const stored = await chrome.storage.local.get([QUEUE_KEY]);
        const current = stored[QUEUE_KEY];
        if (!current || !current.active) return;

        const { queue, next } = recordResult(current, username, outcome, Date.now());
        if (!next) {
            await chrome.storage.local.set({ [QUEUE_KEY]: queue });
            log('Scan queue finished.', queue.stopReason || '');
            return;
        }

        const cooldown = Math.floor(Math.random() * (COOLDOWN_MAX_MS - COOLDOWN_MIN_MS + 1)) + COOLDOWN_MIN_MS;
        await chrome.storage.local.set({ [QUEUE_KEY]: { ...queue, waitingUntil: Date.now() + cooldown } });
        log(`Queue: waiting ${Math.round(cooldown / 1000)}s before @${next}...`);
        await delay(cooldown);

        // The user may have stopped the queue while we were waiting
        const refreshed = (await chrome.storage.local.get([QUEUE_KEY]))[QUEUE_KEY];
        if (!refreshed || !refreshed.active) return;

        const now = Date.now();
        await chrome.storage.local.set({
            [QUEUE_KEY]: {
                ...refreshed,
                items: refreshed.items.map(item => sameUser(item.username, next) && item.status === 'pending'
                    ? { username: item.username, status: 'running' }
                    : item),
                waitingUntil: null,
                updatedAt: now
            },
            targetUsername: next,
            startOnLoad: true,
            scanProgress: {
                phase: 'resolving',
                current: 0,
                total: 0,
                message: 'Opening Instagram…',
                timestamp: now,
                username: next
            }
        });
        location.href = `https://www.instagram.com/${encodeURIComponent(next)}/`;
    }

    window.IG_QUEUE = {
        advanceQueue,
        __test: { recordResult, FATAL_PATTERN }
    };
})();
