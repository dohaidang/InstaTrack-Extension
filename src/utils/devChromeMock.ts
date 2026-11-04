type ChangeListener = (
  changes: Record<string, chrome.storage.StorageChange>,
  areaName: string,
) => void;

export function installChromeMock(): void {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) return;

  const completedAt = new Date().toISOString();
  const demoEnabled = new URLSearchParams(window.location.search).has('demo');
  const demoState = {
    schemaVersion: 2,
    activeAccountId: 'demo-owner',
    accounts: {
      'demo-owner': {
        profile: {
          id: 'demo-owner', username: 'ledger.demo', fullName: 'Ledger Demo', avatarUrl: '',
          followerCount: 1248, followingCount: 563,
        },
        people: {
          '1': { id: '1', username: 'paper.signal', fullName: 'Paper Signal' },
          '2': { id: '2', username: 'quiet.archive', fullName: 'Quiet Archive' },
          '3': { id: '3', username: 'record.room', fullName: 'Record Room' },
        },
        latestScan: {
          id: 'demo-scan', startedAt: completedAt, completedAt, status: 'complete',
          reported: { followers: 1248, following: 563 },
          fetched: { followers: 1248, following: 563 },
          followerIds: ['1', '2'], followingIds: ['1', '3'],
          diffs: { new: ['2'], lost: ['3'], mutual: ['1'], notFollowingBack: ['3'] },
          counts: { followers: 1248, following: 563, new: 12, lost: 4, mutual: 402, notFollowingBack: 161 },
        },
        history: [
          {
            id: 'demo-scan', completedAt, status: 'complete',
            counts: { followers: 1248, following: 563, new: 12, lost: 4, mutual: 402, notFollowingBack: 161 },
            lostIds: ['3'],
          },
        ],
      },
    },
  };
  const values: Record<string, unknown> = {
    darkMode: true,
    language: 'en',
    ...(demoEnabled ? { trackerStateV2: demoState } : {}),
  };
  const listeners = new Set<ChangeListener>();

  const local = {
    get: async (
      keys?: string | string[] | Record<string, unknown> | null,
      callback?: (result: Record<string, unknown>) => void,
    ) => {
      if (keys == null) {
        const result = { ...values };
        callback?.(result);
        return result;
      }
      const requested = typeof keys === 'string'
        ? [keys]
        : Array.isArray(keys)
          ? keys
          : Object.keys(keys);
      const result = Object.fromEntries(requested.map((key) => [key, values[key]]));
      callback?.(result);
      return result;
    },
    set: async (items: Record<string, unknown>) => {
      const changes: Record<string, chrome.storage.StorageChange> = {};
      Object.entries(items).forEach(([key, value]) => {
        changes[key] = { oldValue: values[key], newValue: value };
        values[key] = value;
      });
      listeners.forEach((listener) => listener(changes, 'local'));
    },
    remove: async (keys: string | string[]) => {
      const requested = Array.isArray(keys) ? keys : [keys];
      const changes: Record<string, chrome.storage.StorageChange> = {};
      requested.forEach((key) => {
        changes[key] = { oldValue: values[key], newValue: undefined };
        delete values[key];
      });
      listeners.forEach((listener) => listener(changes, 'local'));
    },
    getBytesInUse: async () => new Blob([JSON.stringify(values)]).size,
  };

  (globalThis as any).chrome = {
    storage: {
      local,
      onChanged: {
        addListener: (listener: ChangeListener) => listeners.add(listener),
        removeListener: (listener: ChangeListener) => listeners.delete(listener),
      },
    },
    tabs: {
      query: async () => [],
      create: async ({ url }: { url?: string }) => {
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
        return {};
      },
      update: async () => ({}),
    },
  };
}
