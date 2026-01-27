export interface UserProfile {
    username: string;
    fullName: string;
    avatarUrl: string;
    status: 'following' | 'not_following';
}

export interface ScanHistoryItem {
    id: string;
    date: string;
    newCount: number;
    lostCount: number;
    description: string;
    netChange: number;
}
