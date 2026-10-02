/** A single Instagram account as stored in diffs. */
export interface Follower {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string;
}

/** Profile of the scanned account (chrome.storage key: ownerProfile). */
export interface OwnerProfile {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string;
    followingCount: number;
    followerCount: number;
}

/** Aggregated numbers/lists derived from the latest snapshot + diff. */
export interface Stats {
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
    avatarBase64: string | null;
    followingCount: number | null;
    followerCount: number | null;
}

/** Live crawl progress written by the content script (chrome.storage key: scanProgress). */
export interface ScanProgress {
    phase: 'idle' | 'resolving' | 'followers' | 'following' | 'processing' | 'done' | 'error';
    current: number;
    total: number;
    message: string;
    timestamp: number;
}

/** One row of the scan history list. */
export interface SnapshotEntry {
    date: string;
    followerCount: number;
    followingCount: number;
    newCount: number;
    lostCount: number;
}

export type StatusType = 'Mutual' | 'Lost' | 'New' | 'Not Following Back';
