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

interface OwnerProfile {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string;
    followingCount: number;
    followerCount: number;
}

interface Stats {
    totalFollowers: number;
    totalFollowing: number;
    newFollowersCount: number;
    lostFollowersCount: number;
    mutualCount: number;
    notFollowingBackCount: number;

    newFollowersList: Follower[];
    lostFollowersList: Follower[];
    mutualList: Follower[];
    notFollowingBackList: Follower[];

    lastUpdated: string | null;
    username: string | null;
    avatarUrl: string | null;
    followingCount: number | null; // From Profile Info
    followerCount: number | null;
}

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
        followingCount: null,
        followerCount: null
    });

    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        try {
            const result = await chrome.storage.local.get(['snapshots', 'diffs', 'lastSnapshotDate', 'ownerProfile']);
            const lastDate = result.lastSnapshotDate as string;
            const diffs = result.diffs || {};
            const snapshots = result.snapshots || {};
            const ownerProfile = result.ownerProfile as OwnerProfile;

            let diffData = null;
            let snapshotData = null;

            if (lastDate) {
                diffData = diffs[lastDate];
                snapshotData = snapshots[lastDate];
            }

            setStats({
                totalFollowers: snapshotData?.followers?.length || 0,
                totalFollowing: snapshotData?.following?.length || 0,

                newFollowersCount: diffData?.counts?.new || diffData?.newFollowers?.length || 0,
                lostFollowersCount: diffData?.counts?.lost || diffData?.lostFollowers?.length || 0,
                mutualCount: diffData?.counts?.mutual || diffData?.mutual?.length || 0,
                notFollowingBackCount: diffData?.counts?.notFollowingBack || diffData?.notFollowingBack?.length || 0,

                newFollowersList: diffData?.newFollowers || [],
                lostFollowersList: diffData?.lostFollowers || [],
                mutualList: diffData?.mutual || [],
                notFollowingBackList: diffData?.notFollowingBack || [],

                lastUpdated: lastDate || null,
                username: ownerProfile?.username || 'Me',
                avatarUrl: ownerProfile?.avatarUrl || null,
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
            if (areaName === 'local' && (changes.snapshots || changes.diffs || changes.lastSnapshotDate || changes.ownerProfile)) {
                fetchStats();
            }
        };
        chrome.storage.onChanged.addListener(listener);
        return () => chrome.storage.onChanged.removeListener(listener);
    }, []);

    return { stats, loading, refresh: fetchStats };
};
