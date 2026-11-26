import type {
    AccountStore,
    Follower,
    OwnerProfile,
    ScanCounts,
    ScanRecord,
    TrackerStateV2,
} from '../types';

export const TRACKER_STATE_KEY = 'trackerStateV2';

const emptyState = (): TrackerStateV2 => ({
    schemaVersion: 2,
    activeAccountId: null,
    accounts: {},
});

const asPerson = (value: any): Follower | null => {
    if (!value?.id || !value?.username) return null;
    return {
        id: String(value.id),
        username: String(value.username),
        fullName: String(value.fullName || value.full_name || ''),
        avatarUrl: value.avatarUrl || value.profile_pic_url || undefined,
    };
};

const migrateLegacy = (legacy: any): TrackerStateV2 => {
    const owner = legacy.ownerProfile as OwnerProfile | undefined;
    const lastDate = legacy.lastSnapshotDate as string | undefined;
    const snapshot = lastDate ? legacy.snapshots?.[lastDate] : null;
    const diff = lastDate ? legacy.diffs?.[lastDate] : null;

    if (!owner?.id || !lastDate || !snapshot) return emptyState();

    const people: Record<string, Follower> = {};
    const addPeople = (values: any[] = []) => {
        values.forEach((value) => {
            const person = asPerson(value);
            if (person) people[person.id] = { ...people[person.id], ...person };
        });
    };

    addPeople(snapshot.followers);
    addPeople(snapshot.following);
    addPeople(diff?.newFollowers);
    addPeople(diff?.lostFollowers);
    addPeople(diff?.mutual);
    addPeople(diff?.notFollowingBack);

    const followerIds = (snapshot.followers || []).map((item: any) => String(item.id));
    const followingIds = (snapshot.following || []).map((item: any) => String(item.id));
    const toIds = (values: any[] = []) => values.map((item) => String(item.id));
    const completedAt = new Date(`${lastDate}T12:00:00`).toISOString();
    const counts: ScanCounts = {
        followers: snapshot.reported?.followers || followerIds.length,
        following: snapshot.reported?.following || followingIds.length,
        new: diff?.counts?.new || diff?.newFollowers?.length || 0,
        lost: diff?.counts?.lost || diff?.lostFollowers?.length || 0,
        mutual: diff?.counts?.mutual || diff?.mutual?.length || 0,
        notFollowingBack: diff?.counts?.notFollowingBack || diff?.notFollowingBack?.length || 0,
    };
    const latestScan: ScanRecord = {
        id: `legacy-${lastDate}`,
        startedAt: completedAt,
        completedAt,
        status: 'complete',
        reported: { followers: counts.followers, following: counts.following },
        fetched: { followers: followerIds.length, following: followingIds.length },
        followerIds,
        followingIds,
        diffs: {
            new: toIds(diff?.newFollowers),
            lost: toIds(diff?.lostFollowers),
            mutual: toIds(diff?.mutual),
            notFollowingBack: toIds(diff?.notFollowingBack),
        },
        counts,
    };

    const account: AccountStore = {
        profile: { ...owner, avatarBase64: legacy.ownerAvatarBase64 || null },
        people,
        latestScan,
        history: [{
            id: latestScan.id,
            completedAt,
            status: 'complete',
            counts,
            lostIds: latestScan.diffs.lost,
        }],
    };

    return {
        schemaVersion: 2,
        activeAccountId: String(owner.id),
        accounts: { [String(owner.id)]: account },
    };
};

export async function getTrackerState(): Promise<TrackerStateV2> {
    const result = await chrome.storage.local.get([
        TRACKER_STATE_KEY,
        'snapshots',
        'diffs',
        'lastSnapshotDate',
        'ownerProfile',
        'ownerAvatarBase64',
    ]);

    const stored = result[TRACKER_STATE_KEY] as TrackerStateV2 | undefined;
    if (stored?.schemaVersion === 2) return stored;

    const migrated = migrateLegacy(result);
    if (migrated.activeAccountId) {
        await chrome.storage.local.set({ [TRACKER_STATE_KEY]: migrated });
    }
    return migrated;
}

export function getActiveAccount(state: TrackerStateV2): AccountStore | null {
    if (!state.activeAccountId) return null;
    return state.accounts[state.activeAccountId] || null;
}

export async function setActiveAccount(accountId: string): Promise<void> {
    const state = await getTrackerState();
    if (!state.accounts[accountId]) return;
    await chrome.storage.local.set({
        [TRACKER_STATE_KEY]: { ...state, activeAccountId: accountId },
    });
}

/** Stop tracking one account and drop its stored scans. */
export async function removeAccount(accountId: string): Promise<void> {
    const state = await getTrackerState();
    if (!state.accounts[accountId]) return;

    const { [accountId]: _removed, ...accounts } = state.accounts;
    const remainingIds = Object.keys(accounts);
    const activeAccountId = state.activeAccountId === accountId
        ? (remainingIds[0] ?? null)
        : state.activeAccountId;

    await chrome.storage.local.set({
        [TRACKER_STATE_KEY]: { ...state, accounts, activeAccountId },
    });
}

export async function clearTrackingData(): Promise<void> {
    await chrome.storage.local.remove([
        TRACKER_STATE_KEY,
        'snapshots',
        'diffs',
        'lastSnapshotDate',
        'ownerProfile',
        'ownerAvatarBase64',
        'scanProgress',
        'scanSession',
        'scanQueue',
    ]);
}
