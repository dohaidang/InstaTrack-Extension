import { useState, useEffect } from 'react';

interface Follower {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string;
}

interface Snapshot {
    [date: string]: Follower[];
}

interface Stats {
    totalFollowers: number;
    newFollowersCount: number;
    lostFollowersCount: number;
    newFollowersList: Follower[];
    lostFollowersList: Follower[];
    lastUpdated: string | null;
    username: string | null;
    avatarUrl: string | null;
}

export const useFollowerData = () => {
    const [stats, setStats] = useState<Stats>({
        totalFollowers: 0,
        newFollowersCount: 0,
        lostFollowersCount: 0,
        newFollowersList: [],
        lostFollowersList: [],
        lastUpdated: null,
        username: null,
        avatarUrl: null
    });

    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        try {
            const result = await chrome.storage.local.get(['snapshots', 'lastSnapshotDate']);
            const snapshots = (result.snapshots || {}) as Snapshot;
            const lastDate = result.lastSnapshotDate as string;

            if (!lastDate || !snapshots[lastDate]) {
                setLoading(false);
                return;
            }

            const currentFollowers = snapshots[lastDate];

            // Find previous snapshot
            const dates = Object.keys(snapshots).sort();
            const currentIndex = dates.indexOf(lastDate);
            const prevDate = currentIndex > 0 ? dates[currentIndex - 1] : null;

            let newFollowers: Follower[] = [];
            let lostFollowers: Follower[] = [];

            if (prevDate) {
                const prevFollowers = snapshots[prevDate];
                const currentSet = new Set(currentFollowers.map(f => f.id));
                const prevSet = new Set(prevFollowers.map(f => f.id));

                newFollowers = currentFollowers.filter(f => !prevSet.has(f.id));
                lostFollowers = prevFollowers.filter(f => !currentSet.has(f.id));
            }

            // Extract user info from first follower (just as a heuristic if needed, or maybe we stored user info elsewhere)
            // Actually, the current API scanner doesn't explicitly store the OWNER's info in storage.
            // We might need to update that later. For now, use placeholder or extract from stored data?
            // Wait, we don't have owner info in the follower list items.
            // Dashboard has meaningful defaults.

            setStats({
                totalFollowers: currentFollowers.length,
                newFollowersCount: newFollowers.length,
                lostFollowersCount: lostFollowers.length,
                newFollowersList: newFollowers,
                lostFollowersList: lostFollowers,
                lastUpdated: lastDate,
                username: 'Me', // Placeholder until we store owner info
                avatarUrl: null // Placeholder
            });

        } catch (error) {
            console.error("Failed to fetch stats:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();

        // Listen for changes
        const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
            if (areaName === 'local' && (changes.snapshots || changes.lastSnapshotDate)) {
                fetchStats();
            }
        };

        chrome.storage.onChanged.addListener(listener);
        return () => chrome.storage.onChanged.removeListener(listener);
    }, []);

    return { stats, loading, refresh: fetchStats };
};
