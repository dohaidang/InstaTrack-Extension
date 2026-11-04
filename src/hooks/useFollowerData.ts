import { useState, useEffect } from 'react';
import type { Follower, Stats } from '../types';
import { getActiveAccount, getTrackerState, TRACKER_STATE_KEY } from '../utils/trackerStorage';

export const useFollowerData = () => {
    const [stats, setStats] = useState<Stats>({
        totalFollowers: 0,
        totalFollowing: 0,
        newFollowersCount: 0,
        lostFollowersCount: 0,
        mutualCount: 0,
        notFollowingBackCount: 0,

        newFollowersList: [],
        lostFollowersList: [],
        mutualList: [],
        notFollowingBackList: [],

        lastUpdated: null,
        username: null,
        avatarUrl: null,
        avatarBase64: null,
        followingCount: null,
        followerCount: null
    });

    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        try {
            const state = await getTrackerState();
            const account = getActiveAccount(state);
            const scan = account?.latestScan;
            const ownerProfile = account?.profile;
            const resolve = (ids: string[] = []): Follower[] => ids
                .map((id) => account?.people[id])
                .filter((person): person is Follower => Boolean(person));

            setStats({
                totalFollowers: scan?.counts.followers || 0,
                totalFollowing: scan?.counts.following || 0,

                newFollowersCount: scan?.counts.new || 0,
                lostFollowersCount: scan?.counts.lost || 0,
                mutualCount: scan?.counts.mutual || 0,
                notFollowingBackCount: scan?.counts.notFollowingBack || 0,

                newFollowersList: resolve(scan?.diffs.new),
                lostFollowersList: resolve(scan?.diffs.lost),
                mutualList: resolve(scan?.diffs.mutual),
                notFollowingBackList: resolve(scan?.diffs.notFollowingBack),

                lastUpdated: scan?.completedAt || null,
                username: ownerProfile?.username || null,
                avatarUrl: ownerProfile?.avatarUrl || null,
                avatarBase64: ownerProfile?.avatarBase64 || null,
                followingCount: ownerProfile?.followingCount || 0,
                followerCount: ownerProfile?.followerCount || 0
            });

        } catch (error) {
            console.error("Failed to fetch stats:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
            if (areaName === 'local' && (changes[TRACKER_STATE_KEY] || changes.snapshots || changes.diffs)) {
                fetchStats();
            }
        };
        chrome.storage.onChanged.addListener(listener);
        return () => chrome.storage.onChanged.removeListener(listener);
    }, []);

    return { stats, loading, refresh: fetchStats };
};
