const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'content', 'modules', 'api_scanner.js'),
  'utf8',
);
const context = {
  window: { IG_UTILS: {} },
  chrome: { storage: { onChanged: { addListener: () => {} } } },
  console,
  setTimeout,
  clearTimeout,
  URLSearchParams,
  Map,
  Set,
};
vm.runInNewContext(source, context, { filename: 'api_scanner.js' });

const {
  normalizeUsername,
  calculateDiffIds,
  migrateLegacyState,
  isAcceptableListCount,
} = context.window.IG_API.__test;

assert.equal(normalizeUsername('@valid.user_1'), 'valid.user_1');
assert.throws(() => normalizeUsername('bad/user'), /Invalid Instagram username/);
assert.throws(() => normalizeUsername(''), /Invalid Instagram username/);

assert.equal(isAcceptableListCount(218, 221), true);
assert.equal(isAcceptableListCount(217, 221), false);
assert.equal(isAcceptableListCount(49, 50), true);
assert.equal(isAcceptableListCount(48, 50), false);
assert.equal(isAcceptableListCount(48, 49), false);
assert.equal(isAcceptableListCount(0, 1), false);
assert.equal(isAcceptableListCount(10, 0), true);

assert.deepEqual(
  JSON.parse(JSON.stringify(calculateDiffIds(['1', '2'], ['2', '3'], [], false))),
  { new: [], lost: [], mutual: ['2'], notFollowingBack: ['3'], newFollowing: [] },
);

const migrated = migrateLegacyState({
  ownerProfile: { id: 'owner-1', username: 'owner', followerCount: 2, followingCount: 1 },
  ownerAvatarBase64: 'data:image/png;base64,demo',
  lastSnapshotDate: '2026-10-02',
  snapshots: {
    '2026-10-02': {
      followers: [{ id: '1', username: 'one' }, { id: '2', username: 'two' }],
      following: [{ id: '2', username: 'two' }],
      reported: { followers: 2, following: 1 },
    },
  },
  diffs: {
    '2026-10-02': {
      newFollowers: [{ id: '1', username: 'one' }],
      lostFollowers: [{ id: '5', username: 'five' }],
      mutual: [{ id: '2', username: 'two' }],
      notFollowingBack: [],
      counts: { new: 1, lost: 0, mutual: 1, notFollowingBack: 0 },
    },
  },
});

assert.equal(migrated.schemaVersion, 2);
assert.equal(migrated.activeAccountId, 'owner-1');
assert.deepEqual(
  JSON.parse(JSON.stringify(migrated.accounts['owner-1'].latestScan.followerIds)),
  ['1', '2'],
);
assert.equal(migrated.accounts['owner-1'].history.length, 1);
assert.deepEqual(
  JSON.parse(JSON.stringify(migrated.accounts['owner-1'].history[0].lostIds)),
  ['5'],
);

assert.deepEqual(
  JSON.parse(JSON.stringify(calculateDiffIds(['2', '4'], ['2', '3'], ['1', '2'], true))),
  // No previous following list passed: nothing to compare, so no bogus "new following"
  { new: ['4'], lost: ['1'], mutual: ['2'], notFollowingBack: ['3'], newFollowing: [] },
);

// New following = followed now, but not in the previous scan's following list
assert.deepEqual(
  JSON.parse(JSON.stringify(calculateDiffIds(['2', '4'], ['2', '3', '5'], ['1', '2'], true, ['2', '3']))).newFollowing,
  ['5'],
);
// Unfollowing someone is not "new following"
assert.deepEqual(
  JSON.parse(JSON.stringify(calculateDiffIds(['2'], ['2'], ['2'], true, ['2', '3']))).newFollowing,
  [],
);
// First scan has no baseline, even if a previous list is supplied
assert.deepEqual(
  JSON.parse(JSON.stringify(calculateDiffIds(['2'], ['2', '3'], [], false, []))).newFollowing,
  [],
);
// An empty previous following list is a real baseline: everything followed since is new
assert.deepEqual(
  JSON.parse(JSON.stringify(calculateDiffIds(['2'], ['2', '3'], ['2'], true, []))).newFollowing,
  ['2', '3'],
);

// ── Multi-account: scan queue ────────────────────────────────────────────────
const queueSource = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'content', 'modules', 'scan_queue.js'),
  'utf8',
);
const queueContext = {
  window: { IG_UTILS: { log: () => {}, delay: () => Promise.resolve() } },
  chrome: {},
  location: {},
  console,
  Date,
  Math,
  Promise,
  Boolean,
  String,
  encodeURIComponent,
};
vm.runInNewContext(queueSource, queueContext, { filename: 'scan_queue.js' });
const { recordResult } = queueContext.window.IG_QUEUE.__test;
const plain = (value) => JSON.parse(JSON.stringify(value));
const makeQueue = (statuses) => ({
  active: true,
  startedAt: 1,
  updatedAt: 1,
  waitingUntil: null,
  items: statuses.map(([username, status]) => ({ username, status })),
});

// A finished scan moves on to the next pending account
let step = recordResult(makeQueue([['a', 'running'], ['b', 'pending'], ['c', 'pending']]), 'a', { ok: true }, 5);
assert.equal(step.next, 'b');
assert.equal(step.queue.active, true);
assert.deepEqual(plain(step.queue.items.map((item) => item.status)), ['done', 'pending', 'pending']);

// Username matching ignores case
step = recordResult(makeQueue([['Alice', 'running'], ['bob', 'pending']]), 'alice', { ok: true }, 5);
assert.equal(step.queue.items[0].status, 'done');

// An ordinary failure is recorded, and the queue keeps going
step = recordResult(
  makeQueue([['a', 'running'], ['b', 'pending']]),
  'a',
  { ok: false, message: 'Username not found' },
  5,
);
assert.equal(step.next, 'b');
assert.equal(step.queue.items[0].status, 'error');
assert.equal(step.queue.items[0].message, 'Username not found');

// The last account finishing closes the queue
step = recordResult(makeQueue([['a', 'done'], ['b', 'running']]), 'b', { ok: true }, 5);
assert.equal(step.next, null);
assert.equal(step.queue.active, false);

// Rate limits, cancellation and login problems stop the whole queue
for (const message of [
  'Instagram is rate-limiting requests (HTTP 429). Wait 30-60 minutes, then try again.',
  'Scan cancelled by user.',
  'Please login to Instagram',
]) {
  step = recordResult(
    makeQueue([['a', 'running'], ['b', 'pending'], ['c', 'pending']]),
    'a',
    { ok: false, message },
    5,
  );
  assert.equal(step.next, null, message);
  assert.equal(step.queue.active, false, message);
  assert.equal(step.queue.stopReason, message);
  assert.deepEqual(plain(step.queue.items.map((item) => item.status)), ['error', 'skipped', 'skipped']);
}

// ── Multi-account: keeping the active account during a queue run ────────────
const makeStore = (initial) => {
  const values = { ...initial };
  return {
    values,
    chrome: {
      storage: {
        onChanged: { addListener: () => {} },
        local: {
          get: async (keys) => Object.fromEntries(keys.map((key) => [key, values[key]])),
          set: async (items) => { Object.assign(values, items); },
        },
      },
    },
  };
};
const loadScanner = (store) => {
  const scannerContext = {
    window: { IG_UTILS: { log: () => {}, error: () => {} } },
    chrome: store.chrome,
    console,
    setTimeout,
    clearTimeout,
    URLSearchParams,
    Map,
    Set,
    Date,
  };
  vm.runInNewContext(source, scannerContext, { filename: 'api_scanner.js' });
  return scannerContext.window.IG_API.__test.processAndSaveData;
};
const savePerson = (id, username) => ({ id, username, fullName: '' });
const existingAccount = (id, username) => ({
  profile: { id, username },
  people: {},
  latestScan: {
    id: `scan-${id}`, followerIds: [], followingIds: [], diffs: { lost: [] },
    completedAt: '2026-10-01T00:00:00.000Z',
  },
  history: [],
});
const scanInput = (id, username, extra = {}) => ({
  scanId: `new-${id}`,
  startedAt: '2026-11-01T00:00:00.000Z',
  userProfile: { id, username, followerCount: 1, followingCount: 0 },
  followers: [savePerson('9', 'nine')],
  following: [],
  ...extra,
});
const baseState = () => ({
  schemaVersion: 2,
  activeAccountId: 'A',
  accounts: { A: existingAccount('A', 'alpha'), B: existingAccount('B', 'bravo') },
});

(async () => {
  // Queue run: scanning B must not steal the active account from A
  let store = makeStore({ trackerStateV2: baseState() });
  await loadScanner(store)(scanInput('B', 'bravo', { keepActive: true }));
  assert.equal(store.values.trackerStateV2.activeAccountId, 'A');
  assert.equal(store.values.trackerStateV2.accounts.B.latestScan.id, 'new-B');

  // Single scan: the scanned account becomes the active one (previous behaviour)
  store = makeStore({ trackerStateV2: baseState() });
  await loadScanner(store)(scanInput('B', 'bravo'));
  assert.equal(store.values.trackerStateV2.activeAccountId, 'B');

  // A rescan stores who was newly followed since the previous scan, with a matching count
  store = makeStore({
    trackerStateV2: {
      schemaVersion: 2,
      activeAccountId: 'A',
      accounts: {
        A: {
          ...existingAccount('A', 'alpha'),
          latestScan: {
            ...existingAccount('A', 'alpha').latestScan,
            followerIds: ['9'],
            followingIds: ['7'],
          },
        },
      },
    },
  });
  await loadScanner(store)(scanInput('A', 'alpha', {
    following: [savePerson('7', 'seven'), savePerson('8', 'eight')],
  }));
  const rescanned = store.values.trackerStateV2.accounts.A.latestScan;
  assert.deepEqual(plain(rescanned.diffs.newFollowing), ['8']);
  assert.equal(rescanned.counts.newFollowing, 1);

  // A previous record from before this feature (no followingIds at all) reports none rather than everything
  store = makeStore({ trackerStateV2: baseState() });
  delete store.values.trackerStateV2.accounts.B.latestScan.followingIds;
  await loadScanner(store)(scanInput('B', 'bravo', { following: [savePerson('7', 'seven')] }));
  assert.deepEqual(plain(store.values.trackerStateV2.accounts.B.latestScan.diffs.newFollowing), []);

  // Other people's avatars are stored, so lists can show pictures and not only initials
  store = makeStore({ trackerStateV2: { schemaVersion: 2, activeAccountId: null, accounts: {} } });
  await loadScanner(store)(scanInput('D', 'delta', {
    followers: [{ id: '10', username: 'ten', fullName: 'Ten', avatarUrl: 'https://cdn.example/ten-1.jpg' }],
    following: [{ id: '11', username: 'eleven', fullName: '' }],
  }));
  let peopleStored = store.values.trackerStateV2.accounts.D.people;
  assert.equal(peopleStored['10'].avatarUrl, 'https://cdn.example/ten-1.jpg');
  assert.equal('avatarUrl' in peopleStored['11'], false);

  // A rescan refreshes an expired link, and keeps the old one when none comes back
  await loadScanner(store)(scanInput('D', 'delta', {
    scanId: 'new-D2',
    followers: [{ id: '10', username: 'ten', fullName: 'Ten', avatarUrl: 'https://cdn.example/ten-2.jpg' }],
    following: [{ id: '11', username: 'eleven', fullName: '', avatarUrl: 'https://cdn.example/eleven.jpg' }],
  }));
  peopleStored = store.values.trackerStateV2.accounts.D.people;
  assert.equal(peopleStored['10'].avatarUrl, 'https://cdn.example/ten-2.jpg');
  assert.equal(peopleStored['11'].avatarUrl, 'https://cdn.example/eleven.jpg');
  await loadScanner(store)(scanInput('D', 'delta', {
    scanId: 'new-D3',
    followers: [{ id: '10', username: 'ten', fullName: 'Ten' }],
    following: [],
  }));
  assert.equal(store.values.trackerStateV2.accounts.D.people['10'].avatarUrl, 'https://cdn.example/ten-2.jpg');

  // Queue run on a brand-new account with nothing active yet still selects it
  store = makeStore({ trackerStateV2: { schemaVersion: 2, activeAccountId: null, accounts: {} } });
  await loadScanner(store)(scanInput('C', 'charlie', { keepActive: true }));
  assert.equal(store.values.trackerStateV2.activeAccountId, 'C');

  console.log('Core scanner tests passed.');
})().catch((failure) => {
  console.error(failure);
  process.exit(1);
});
