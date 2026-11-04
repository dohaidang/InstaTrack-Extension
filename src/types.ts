/** A single Instagram account as stored in diffs. */
export interface Follower {
    id: string;
    username: string;
    fullName: string;
    avatarUrl?: string;
}

/** Profile of the scanned account (chrome.storage key: ownerProfile). */
export interface OwnerProfile {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string;
    followingCount: number;
    followerCount: number;
    avatarBase64?: string | null;
}

export interface ScanCounts {
    followers: number;
    following: number;
    new: number;
    lost: number;
    mutual: number;
    notFollowingBack: number;
}

export interface ScanDiffIds {
    new: string[];
    lost: string[];
    mutual: string[];
    notFollowingBack: string[];
}

export interface ScanRecord {
    id: string;
    startedAt: string;
    completedAt: string;
    status: 'complete';
    reported: Pick<ScanCounts, 'followers' | 'following'>;
    fetched: Pick<ScanCounts, 'followers' | 'following'>;
    followerIds: string[];
    followingIds: string[];
    diffs: ScanDiffIds;
    counts: ScanCounts;
}

export interface ScanSummary {
    id: string;
    completedAt: string;
    status: 'complete';
    counts: ScanCounts;
    /** IDs lost during this scan. Optional for records created before this field existed. */
    lostIds?: string[];
}

export interface AccountStore {
    profile: OwnerProfile;
    people: Record<string, Follower>;
    latestScan: ScanRecord;
    history: ScanSummary[];
}

export interface TrackerStateV2 {
    schemaVersion: 2;
    activeAccountId: string | null;
    accounts: Record<string, AccountStore>;
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
    scanId?: string;
    username?: string;
}

export type QueueItemStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped';

export interface ScanQueueItem {
    username: string;
    status: QueueItemStatus;
    message?: string;
}

/**
 * Sequential "scan all accounts" run (chrome.storage key: scanQueue).
 * Created by the popup, advanced by the content script after each scan.
 */
export interface ScanQueue {
    active: boolean;
    startedAt: number;
    /** Last time the queue changed state; used to detect a queue whose tab was closed. */
    updatedAt: number;
    /** Set while the content script is cooling down before opening the next account. */
    waitingUntil: number | null;
    items: ScanQueueItem[];
    /** Why the queue ended early (rate limit, cancel, login required). */
    stopReason?: string;
}

/** One row of the scan history list. */
export interface SnapshotEntry {
    id: string;
    accountId: string;
    username: string;
    date: string;
    followerCount: number;
    followingCount: number;
    newCount: number;
    lostCount: number;
}

export type StatusType = 'Mutual' | 'Lost' | 'New' | 'Not Following Back';
