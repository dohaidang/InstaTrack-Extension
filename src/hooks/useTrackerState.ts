import { useCallback, useEffect, useState } from 'react';
import type { ScanQueue, TrackerStateV2 } from '../types';
import { getTrackerState, TRACKER_STATE_KEY } from '../utils/trackerStorage';
import { SCAN_QUEUE_KEY } from '../utils/scanLauncher';

/** Full tracker state (every account) plus the "scan all" queue, kept in sync with storage. */
export const useTrackerState = () => {
    const [state, setState] = useState<TrackerStateV2 | null>(null);
    const [queue, setQueue] = useState<ScanQueue | null>(null);

    const load = useCallback(async () => {
        const [trackerState, stored] = await Promise.all([
            getTrackerState(),
            chrome.storage.local.get([SCAN_QUEUE_KEY]),
        ]);
        setState(trackerState);
        setQueue((stored[SCAN_QUEUE_KEY] as ScanQueue | undefined) ?? null);
    }, []);

    useEffect(() => {
        void load();
        const listener = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
            if (area !== 'local') return;
            if (changes[TRACKER_STATE_KEY]) void load();
            if (changes[SCAN_QUEUE_KEY]) setQueue((changes[SCAN_QUEUE_KEY].newValue as ScanQueue | undefined) ?? null);
        };
        chrome.storage.onChanged.addListener(listener);
        return () => chrome.storage.onChanged.removeListener(listener);
    }, [load]);

    return { state, queue, reload: load };
};
