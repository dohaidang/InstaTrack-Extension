// Username History Helper for Chrome Extension
// Uses chrome.storage.local to persist username history

const STORAGE_KEY = 'usernameHistory';
const MAX_HISTORY = 20;

export interface UsernameHistoryItem {
    username: string;
    timestamp: number;
}

/**
 * Get username history from storage
 */
export async function getUsernameHistory(): Promise<string[]> {
    try {
        const result = await chrome.storage.local.get([STORAGE_KEY]);
        const history = result[STORAGE_KEY] as UsernameHistoryItem[] | undefined;
        return history?.map(item => item.username) || [];
    } catch (error) {
        console.error('Error getting username history:', error);
        return [];
    }
}

/**
 * Add username to history
 * - No duplicates (case-insensitive)
 * - Newest first
 * - Max 20 items
 */
export async function addUsernameToHistory(username: string): Promise<string[]> {
    if (!username || username.trim() === '') return getUsernameHistory();

    const normalizedUsername = username.trim().toLowerCase();

    try {
        const result = await chrome.storage.local.get([STORAGE_KEY]);
        let history = (result[STORAGE_KEY] as UsernameHistoryItem[]) || [];

        // Remove existing entry (case-insensitive)
        history = history.filter(
            item => item.username.toLowerCase() !== normalizedUsername
        );

        // Add to beginning
        history.unshift({
            username: username.trim(),
            timestamp: Date.now()
        });

        // Keep only MAX_HISTORY items
        history = history.slice(0, MAX_HISTORY);

        // Save to storage
        await chrome.storage.local.set({ [STORAGE_KEY]: history });

        return history.map(item => item.username);
    } catch (error) {
        console.error('Error adding username to history:', error);
        return [];
    }
}

/**
 * Clear all username history
 */
export async function clearUsernameHistory(): Promise<void> {
    try {
        await chrome.storage.local.remove(STORAGE_KEY);
    } catch (error) {
        console.error('Error clearing username history:', error);
    }
}

/**
 * Remove a specific username from history
 */
export async function removeUsernameFromHistory(username: string): Promise<string[]> {
    const normalizedUsername = username.toLowerCase();

    try {
        const result = await chrome.storage.local.get([STORAGE_KEY]);
        let history = (result[STORAGE_KEY] as UsernameHistoryItem[]) || [];

        history = history.filter(
            item => item.username.toLowerCase() !== normalizedUsername
        );

        await chrome.storage.local.set({ [STORAGE_KEY]: history });

        return history.map(item => item.username);
    } catch (error) {
        console.error('Error removing username from history:', error);
        return [];
    }
}
