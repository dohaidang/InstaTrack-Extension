import type { ScanProgress, ScanQueue, TrackerStateV2 } from '../types';

export const SCAN_QUEUE_KEY = 'scanQueue';

/** A queue that has not changed for this long is assumed dead (Instagram tab closed). */
const QUEUE_STALE_MS = 3 * 60 * 1000;

export const queueIsLive = (
    queue: ScanQueue | null | undefined,
    lastProgressAt = 0,
    now = Date.now(),
): queue is ScanQueue => {
    if (!queue?.active) return false;
    const lastSignOfLife = Math.max(queue.updatedAt, queue.waitingUntil ?? 0, lastProgressAt);
    return now - lastSignOfLife < QUEUE_STALE_MS;
};

/** Oldest scan first, so the accounts that have waited longest are refreshed first. */
export const usernamesByStaleness = (state: TrackerStateV2): string[] =>
    Object.values(state.accounts)
        .sort((a, b) => a.latestScan.completedAt.localeCompare(b.latestScan.completedAt))
        .map((account) => account.profile.username);

const openProfile = async (username: string) => {
    const url = `https://www.instagram.com/${encodeURIComponent(username)}/`;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url?.includes('instagram.com') && tab.id) {
        await chrome.tabs.update(tab.id, { url });
    } else {
        await chrome.tabs.create({ url });
    }
};

const initialProgress = (username: string): ScanProgress => ({
    phase: 'resolving',
    current: 0,
    total: 0,
    message: 'Opening Instagram…',
    timestamp: Date.now(),
    username,
});

/** Scan one account. The content script starts the crawl once the profile page has loaded. */
export async function startSingleScan(username: string): Promise<ScanProgress> {
    const progress = initialProgress(username);
    await chrome.storage.local.remove(SCAN_QUEUE_KEY);
    await chrome.storage.local.set({
        targetUsername: username,
        startOnLoad: true,
        scanProgress: progress,
    });
    await openProfile(username);
    return progress;
}

/** Scan several accounts one after another (never in parallel — see scan_queue.js). */
export async function startQueueScan(usernames: string[]): Promise<ScanProgress | null> {
    if (!usernames.length) return null;

    const now = Date.now();
    const queue: ScanQueue = {
        active: true,
        startedAt: now,
        updatedAt: now,
        waitingUntil: null,
        items: usernames.map((username, index) => ({
            username,
            status: index === 0 ? 'running' : 'pending',
        })),
    };
    const progress = initialProgress(usernames[0]);
    await chrome.storage.local.set({
        [SCAN_QUEUE_KEY]: queue,
        targetUsername: usernames[0],
        startOnLoad: true,
        scanProgress: progress,
    });
    await openProfile(usernames[0]);
    return progress;
}

/** Stop the queue; cancels the scan that is currently running, if any. */
export async function stopQueueScan(queue: ScanQueue, runningScanId?: string): Promise<void> {
    const items = queue.items.map((item) => (
        item.status === 'pending' ? { ...item, status: 'skipped' as const } : item
    ));
    await chrome.storage.local.set({
        [SCAN_QUEUE_KEY]: {
            ...queue,
            items,
            active: false,
            waitingUntil: null,
            updatedAt: Date.now(),
            stopReason: 'Stopped by user.',
        },
        ...(runningScanId ? { cancelScanId: runningScanId } : {}),
    });
}
