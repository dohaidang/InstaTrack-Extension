/**
 * API Scanner Module
 * Fetches followers AND following using Instagram's public Web API and internal GraphQL.
 * Calculates Diff (Lost, New, Mutual, NotFollowingBack) and saves to storage.
 */
(function () {
    window.IG_API = window.IG_API || {};
    const { delay, randomDelay, log, error, getCookie } = window.IG_UTILS || {};

    // Constants
    const FOLLOWERS_HASH = 'c76146de99bb02f6415203be841dd25a'; // Hash for edge_followed_by
    const FOLLOWING_HASH = '3dec7e2c57367ef3da3d987d89f9dbc8'; // Hash for edge_follow
    const PROFILE_DOC_ID = '7950326061742202';
    const RATE_LIMIT_MSG = 'Instagram is rate-limiting requests (HTTP 429). Wait 30-60 minutes, then try again.';
    const MAX_PAGES = 400; // safety cap: 400 pages x 50 = 20k accounts per list
    const REQUEST_TIMEOUT_MS = 30000;
    const TRACKER_STATE_KEY = 'trackerStateV2';
    const MAX_HISTORY = 30;
    const SCAN_LOCK_TTL_MS = 60 * 60 * 1000;
    const MAX_COUNT_DRIFT_RATIO = 0.02;
    const MAX_COUNT_DRIFT_ACCOUNTS = 3;
    let currentScanId = null;
    let cancelledScanId = null;
    let activeRequestController = null;
    let activeProgressMeta = {};

    chrome.storage.onChanged.addListener((changes, areaName) => {
        const requestedId = changes.cancelScanId?.newValue;
        if (areaName === 'local' && requestedId && requestedId === currentScanId) {
            cancelledScanId = requestedId;
            activeRequestController?.abort();
        }
    });

    function normalizeUsername(value) {
        const username = String(value || '').trim().replace(/^@/, '');
        if (!/^[A-Za-z0-9._]{1,30}$/.test(username)) {
            throw new Error('Invalid Instagram username. Use only letters, numbers, dots, and underscores.');
        }
        return username;
    }

    /**
     * Progress Tracker - Updates chrome.storage for popup to read
     */
    async function updateProgress(phase, current, total, message, meta = {}) {
        try {
            await chrome.storage.local.set({
                scanProgress: {
                    phase,
                    current,
                        total,
                        message,
                        timestamp: Date.now(),
                        ...activeProgressMeta,
                        ...meta
                }
            });
        } catch (e) {
            // Silent fail - don't interrupt scan for progress updates
        }
    }

    /**
     * Helpers for headers
     */
    function getCommonHeaders() {
        const headers = {
            'x-csrftoken': getCookie('csrftoken'),
            'x-ig-app-id': '936619743392459',
            'x-asbd-id': '129477',
            'x-requested-with': 'XMLHttpRequest',
            'content-type': 'application/x-www-form-urlencoded'
        };
        // Only send a real LSD token; a fake one can get the request rejected
        const lsd = getLSD();
        if (lsd) headers['x-fb-lsd'] = lsd;
        return headers;
    }

    function getLSD() {
        try {
            const scripts = document.querySelectorAll('script');
            for (let s of scripts) {
                if (s.textContent && s.textContent.includes('"LSD",[],{"token":"')) {
                    const match = s.textContent.match(/"LSD",\[\],\{"token":"([^"]+)"\}/);
                    if (match) return match[1];
                }
            }
        } catch (e) { }
        return null;
    }

    /**
     * Step 1: Fetch User Profile
     * Primary: Web Search/Info API
     * Secondary: GraphQL DocID
     * Fallback: Meta Tags/DOM (only as last resort for ID, but preferably API)
     */
    async function fetchUserProfile(username) {
        log(`Fetching Profile Info for: ${username}...`);

        let profile = {
            id: null,
            username: username,
            fullName: null,
            avatarUrl: null,
            followingCount: 0,
            followerCount: 0,
            isPrivate: false
        };

        let rateLimited = false;

        // 1. Primary: Web JSON API (Most reliable for public info)
        try {
            const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: getCommonHeaders(),
            });

            if (response.status === 401 || response.status === 403) {
                throw new Error("Please login to Instagram");
            }
            if (response.status === 404) {
                throw new Error("Username not found");
            }
            if (response.status === 429) {
                rateLimited = true;
                throw new Error(RATE_LIMIT_MSG);
            }

            if (response.ok) {
                const data = await response.json();
                const user = data?.data?.user;
                if (user) {
                    profile.id = user.id;
                    profile.username = user.username;
                    profile.fullName = user.full_name;
                    profile.avatarUrl = user.profile_pic_url;
                    profile.followerCount = user.edge_followed_by?.count || 0;
                    profile.followingCount = user.edge_follow?.count || 0;
                    profile.isPrivate = user.is_private;
                    log("Resolved Profile via Web API", profile);
                    return profile;
                }
                log("web_profile_info returned no user", JSON.stringify(data).slice(0, 200));
            } else {
                log(`web_profile_info failed: HTTP ${response.status}`);
            }
        } catch (e) {
            log("Web API fetch failed, trying fallback...", e);
            if (e.message.includes("login")) throw e; // Propagate auth errors
        }

        // 1b. Own account: the logged-in user id is in a cookie, so ask the info endpoint directly
        const ownId = getCookie('ds_user_id');
        if (ownId) {
            try {
                const response = await fetch(`https://www.instagram.com/api/v1/users/${ownId}/info/`, {
                    method: 'GET',
                    headers: getCommonHeaders(),
                });
                if (response.ok) {
                    const user = (await response.json())?.user;
                    if (user && user.username && user.username.toLowerCase() === username.toLowerCase()) {
                        profile.id = String(user.pk || user.pk_id || user.id);
                        profile.username = user.username;
                        profile.fullName = user.full_name;
                        profile.avatarUrl = user.profile_pic_url;
                        profile.followerCount = user.follower_count || 0;
                        profile.followingCount = user.following_count || 0;
                        profile.isPrivate = user.is_private;
                        log("Resolved Profile via own-account info", profile);
                        return profile;
                    }
                    log(`own-account info username mismatch: ${user?.username}`);
                } else {
                    if (response.status === 429) rateLimited = true;
                    log(`own-account info failed: HTTP ${response.status}`);
                }
            } catch (e) { log("Own-account info error", e); }
        }

        // 1c. The profile page is already open: its id is embedded in the page and the
        // counts come from the list endpoints, which are throttled separately from the profile ones
        const pageProfile = await resolveProfileFromPage(username);
        if (pageProfile) return pageProfile;

        // Further fallbacks would only send more requests to a throttled endpoint
        if (rateLimited) throw new Error(RATE_LIMIT_MSG);

        // 2. Secondary: GraphQL Doc ID strategy
        try {
            const variables = {
                username: username,
                render_surface: "PROFILE",
                enable_integrity_filters: true
            };
            const body = new URLSearchParams();
            body.append('doc_id', PROFILE_DOC_ID);
            body.append('variables', JSON.stringify(variables));
            const lsd = getLSD();
            if (lsd) body.append('lsd', lsd);

            const response = await fetch('https://www.instagram.com/graphql/query', {
                method: 'POST', headers: getCommonHeaders(), body: body
            });

            if (response.ok) {
                const data = await response.json();
                const user = data?.data?.user;
                if (user) {
                    profile.id = user.id || user.pk;
                    profile.username = user.username;
                    profile.fullName = user.full_name;
                    profile.avatarUrl = user.profile_pic_url;
                    profile.followingCount = user.edge_follow?.count || user.following_count || 0;
                    profile.followerCount = user.edge_followed_by?.count || user.follower_count || 0;
                    profile.isPrivate = user.is_private;
                    log(`Resolved Profile via GraphQL`, profile);
                    return profile;
                }
            }
        } catch (e) { log("GraphQL Profile resolve error", e); }


        // 3. Last Resort: Passive Parsing (Meta Tags / SharedData)
        // If API fails, maybe we are ALREADY on the profile page and can just scrape ID.
        // This is fragile but saves the day for basic ID detection.
        const metaId = document.querySelector('meta[property="instapp:owner_user_id"]');
        if (metaId && metaId.content) {
            profile.id = metaId.content;
            log("Resolved ID via Meta Tag");
        }

        // Try scraping numbers/avatar if ID was found via meta logic
        if (profile.id) {
            try {
                const ogImage = document.querySelector('meta[property="og:image"]');
                if (ogImage) profile.avatarUrl = ogImage.content;

                // Try scraping counts...
                const listItems = document.querySelectorAll('header ul li');
                if (listItems.length >= 3) {
                    for (let li of listItems) {
                        const text = li.innerText.toLowerCase();
                        if (text.includes('following')) {
                            const spanWithTitle = li.querySelector('span[title]');
                            let val = 0;
                            if (spanWithTitle) val = parseCount(spanWithTitle.getAttribute('title'));
                            else { const match = text.match(/^([0-9,KM.]+)/); if (match) val = parseCount(match[1]); }
                            if (val > 0) profile.followingCount = val;
                        }
                        if (text.includes('follower')) {
                            const spanWithTitle = li.querySelector('span[title]');
                            let val = 0;
                            if (spanWithTitle) val = parseCount(spanWithTitle.getAttribute('title'));
                            else { const match = text.match(/^([0-9,KM.]+)/); if (match) val = parseCount(match[1]); }
                            if (val > 0) profile.followerCount = val;
                        }
                    }
                }
            } catch (scrapeErr) { }
            return profile;
        }

        throw new Error(`Could not resolve User Profile for ${username}. Please ensure you are logged in and the user exists.`);
    }

    async function resolveProfileFromPage(username) {
        // Only trust the page when it is the profile we were asked to scan
        if (!location.pathname.toLowerCase().startsWith(`/${username.toLowerCase()}/`)) return null;

        const html = document.documentElement.innerHTML;
        const match = html.match(/"page_id":"profilePage_(\d+)"/) || html.match(/"profile_id":"(\d+)"/);
        const metaId = document.querySelector('meta[property="instapp:owner_user_id"]');
        const id = match ? match[1] : (metaId && metaId.content) || null;
        if (!id) {
            log('Could not find the user id in the profile page');
            return null;
        }

        const profile = { id, username, fullName: null, avatarUrl: null, followingCount: 0, followerCount: 0, isPrivate: false };
        const ogImage = document.querySelector('meta[property="og:image"]');
        if (ogImage) profile.avatarUrl = ogImage.content;

        try {
            const followers = await fetchFollowersPage(id, 1);
            profile.followerCount = followers?.data?.user?.edge_followed_by?.count || 0;
            const following = await fetchFollowingPage(id, 1);
            profile.followingCount = following?.data?.user?.edge_follow?.count || 0;
        } catch (e) {
            log('Could not read counts from the list endpoints', e);
        }
        log('Resolved Profile via page + list endpoints', profile);
        return profile;
    }

    function parseCount(str) {
        if (!str) return 0;
        str = str.replace(/,/g, '');
        if (str.toUpperCase().includes('K')) return parseFloat(str) * 1000;
        if (str.toUpperCase().includes('M')) return parseFloat(str) * 1000000;
        return parseInt(str.replace(/[,.]/g, ''));
    }

    /**
     * Fetch Followers Page
     */
    async function fetchFollowersPage(userId, first = 50, after = null) {
        const variables = { id: userId, include_reel: true, fetch_mutual: false, first: first };
        if (after) variables.after = after;
        const url = `https://www.instagram.com/graphql/query/?query_hash=${FOLLOWERS_HASH}&variables=${encodeURIComponent(JSON.stringify(variables))}`;

        return await fetchWithAuth(url);
    }

    /**
     * Fetch Following Page
     */
    async function fetchFollowingPage(userId, first = 50, after = null) {
        const variables = { id: userId, include_reel: true, first: first };
        if (after) variables.after = after;
        const url = `https://www.instagram.com/graphql/query/?query_hash=${FOLLOWING_HASH}&variables=${encodeURIComponent(JSON.stringify(variables))}`;

        return await fetchWithAuth(url);
    }

    async function fetchWithAuth(url) {
        const controller = new AbortController();
        activeRequestController = controller;
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: getCommonHeaders(),
                signal: controller.signal
            });
            if (response.status === 401 || response.status === 403) throw new Error("Authentication failed. Please login.");
            if (response.status === 429) throw new Error(RATE_LIMIT_MSG);
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            return await response.json();
        } catch (err) {
            const failure = err.name === 'AbortError'
                ? new Error(cancelledScanId === currentScanId
                    ? 'Scan cancelled by user.'
                    : `Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s.`)
                : err;
            error("API Fetch Error:", failure);
            throw failure;
        } finally {
            clearTimeout(timeoutId);
            if (activeRequestController === controller) activeRequestController = null;
        }
    }

    /**
     * List Fetcher Loop
     */
    async function fetchList(userId, type = 'followers', expectedTotal = 0) {
        // Primary: friendships API (what the web app uses today)
        try {
            const result = await fetchListVia('friendships', userId, type, expectedTotal);
            if (result.users.length > 0 || !expectedTotal) return result;
            log(`friendships ${type} returned no users, trying GraphQL`);
        } catch (e) {
            if (e.partial) {
                // Never mask a half-fetched list with a second source
                await updateProgress('error', e.progressCount, expectedTotal, e.message);
                throw e;
            }
            log(`friendships ${type} failed, trying GraphQL`, e.message);
        }

        // Fallback: legacy GraphQL query_hash (currently returns counts but often no edges)
        try {
            return await fetchListVia('graphql', userId, type, expectedTotal);
        } catch (e) {
            await updateProgress('error', e.progressCount || 0, expectedTotal, e.message);
            throw e;
        }
    }

    async function fetchFriendshipsPage(userId, type, cursor) {
        const url = `https://www.instagram.com/api/v1/friendships/${userId}/${type}/?count=50`
            + (cursor ? `&max_id=${encodeURIComponent(cursor)}` : '');
        return await fetchWithAuth(url);
    }

    async function fetchListVia(source, userId, type, expectedTotal) {
        let allUsers = [];
        let hasNext = true;
        let endCursor = null;
        const fetchFunc = type === 'followers' ? fetchFollowersPage : fetchFollowingPage;
        const edgeKey = type === 'followers' ? 'edge_followed_by' : 'edge_follow';
        let pageCount = 0;

        while (hasNext && pageCount < MAX_PAGES) {
            if (cancelledScanId === currentScanId) throw new Error('Scan cancelled by user.');
            pageCount++;
            log(`Fetching ${type} page ${pageCount}... (Total: ${allUsers.length})`);

            // Update progress
            await updateProgress(
                type,
                allUsers.length,
                expectedTotal || allUsers.length + 50,
                `Fetching ${type}: ${allUsers.length}${expectedTotal ? '/' + expectedTotal : ''}`
            );

            await randomDelay(2000, 4000);

            try {
                let newNodes;
                if (source === 'friendships') {
                    const data = await fetchFriendshipsPage(userId, type, endCursor);
                    if (!Array.isArray(data?.users)) throw new Error("Invalid friendships format");
                    newNodes = data.users.map(u => ({
                        id: String(u.pk || u.pk_id || u.id),
                        username: u.username,
                        fullName: u.full_name,
                        avatarUrl: u.profile_pic_url
                    }));
                    endCursor = data.next_max_id || null;
                    hasNext = !!endCursor;
                } else {
                    const data = await fetchFunc(userId, 50, endCursor);
                    const edge = data?.data?.user?.[edgeKey];
                    if (!edge) throw new Error("Invalid API format");

                    newNodes = (edge.edges || []).map(e => ({
                        id: e.node.id,
                        username: e.node.username,
                        fullName: e.node.full_name,
                        avatarUrl: e.node.profile_pic_url
                    }));
                    hasNext = edge.page_info.has_next_page;
                    endCursor = edge.page_info.end_cursor;
                }

                allUsers = [...allUsers, ...newNodes];

                // Update progress after each page
                await updateProgress(
                    type,
                    allUsers.length,
                    expectedTotal || (hasNext ? allUsers.length + 50 : allUsers.length),
                    `Fetching ${type}: ${allUsers.length}${expectedTotal ? '/' + expectedTotal : ''}`
                );

            } catch (e) {
                // Abort: a partial list would produce bogus diffs (fake "lost followers")
                error(`Loop error in ${type}`, e);
                const reason = e.message ? ` ${e.message}` : '';
                const msg = `Error fetching ${type} (${allUsers.length}${expectedTotal ? '/' + expectedTotal : ''}). Data not saved.${reason}`;
                const failure = new Error(msg);
                failure.partial = allUsers.length > 0;
                failure.progressCount = allUsers.length;
                failure.progressTotal = expectedTotal;
                throw failure;
            }
        }
        const endedNaturally = !hasNext;
        if (!endedNaturally) {
            const msg = `${type} scan reached the ${MAX_PAGES}-page safety limit. Data not saved.`;
            const failure = new Error(msg);
            failure.progressCount = allUsers.length;
            failure.progressTotal = expectedTotal;
            throw failure;
        }

        // Pagination can repeat accounts across pages.
        return {
            users: Array.from(new Map(allUsers.map(u => [u.id, u])).values()),
            endedNaturally,
            pagesFetched: pageCount,
            source
        };
    }

    /**
     * Instagram's profile count can briefly drift from a naturally completed list.
     * Accept only a small, bounded difference so transient/deactivated accounts do
     * not permanently block commits while materially incomplete scans remain unsafe.
     */
    function isAcceptableListCount(fetched, expectedTotal) {
        if (!expectedTotal || fetched >= expectedTotal) return true;
        if (fetched <= 0) return false;

        const missing = expectedTotal - fetched;
        const allowedMissing = Math.min(
            MAX_COUNT_DRIFT_ACCOUNTS,
            Math.floor(expectedTotal * MAX_COUNT_DRIFT_RATIO)
        );
        return missing <= allowedMissing;
    }

    async function assertCompleteList(type, result, expectedTotal) {
        const fetched = result.users.length;
        if (!result.endedNaturally) {
            const msg = `Incomplete ${type} list: pagination did not finish. Data not saved.`;
            const failure = new Error(msg);
            failure.progressCount = fetched;
            failure.progressTotal = expectedTotal;
            throw failure;
        }
        if (!isAcceptableListCount(fetched, expectedTotal)) {
            const msg = `Incomplete ${type} list: got ${fetched}/${expectedTotal}. Data not saved.`;
            const failure = new Error(msg);
            failure.progressCount = fetched;
            failure.progressTotal = expectedTotal;
            throw failure;
        }
    }

    /**
     * Fetch avatar image and convert to base64
     * Must run in content script context (instagram.com) to bypass CDN CORS
     */
    async function fetchAvatarAsBase64(url) {
        if (!url) return null;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const blob = await response.blob();
            return await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result); // data:image/...;base64,...
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            error('[Avatar] Failed to fetch base64 avatar:', e);
            return null;
        }
    }

    /**
     * Main Entry
     */
    async function acquireScanLock(scanId, username) {
        const { scanSession } = await chrome.storage.local.get(['scanSession']);
        if (scanSession && Date.now() - scanSession.startedAt < SCAN_LOCK_TTL_MS) {
            throw new Error(`Another scan is already running for @${scanSession.username}.`);
        }
        await chrome.storage.local.set({ scanSession: { scanId, username, startedAt: Date.now() } });
    }

    async function releaseScanLock(scanId) {
        const { scanSession } = await chrome.storage.local.get(['scanSession']);
        if (scanSession?.scanId === scanId) await chrome.storage.local.remove('scanSession');
    }

    function emptyTrackerState() {
        return { schemaVersion: 2, activeAccountId: null, accounts: {} };
    }

    /**
     * @param previousFollowingIds the following list of the previous scan, or null when it is
     *   unknown. Without it there is nothing to compare against, so `newFollowing` stays empty
     *   instead of wrongly reporting every followed account as new.
     */
    function calculateDiffIds(
        followerIds,
        followingIds,
        previousFollowerIds = [],
        hasBaseline = true,
        previousFollowingIds = null
    ) {
        const followerSet = new Set(followerIds);
        const followingSet = new Set(followingIds);
        const previousFollowerSet = new Set(previousFollowerIds);
        const previousFollowingSet = new Set(previousFollowingIds || []);
        const hasFollowingBaseline = hasBaseline && Array.isArray(previousFollowingIds);
        return {
            new: hasBaseline ? followerIds.filter(id => !previousFollowerSet.has(id)) : [],
            lost: hasBaseline ? previousFollowerIds.filter(id => !followerSet.has(id)) : [],
            mutual: followerIds.filter(id => followingSet.has(id)),
            notFollowingBack: followingIds.filter(id => !followerSet.has(id)),
            newFollowing: hasFollowingBaseline ? followingIds.filter(id => !previousFollowingSet.has(id)) : []
        };
    }

    function migrateLegacyState(storage) {
        const state = emptyTrackerState();
        const owner = storage.ownerProfile;
        const date = storage.lastSnapshotDate;
        const snapshot = date ? storage.snapshots?.[date] : null;
        const diff = date ? storage.diffs?.[date] : null;
        if (!owner?.id || !snapshot) return state;

        const ownerId = String(owner.id);
        const people = {};
        const add = (items = []) => items.forEach(item => {
            if (!item?.id || !item?.username) return;
            people[String(item.id)] = {
                id: String(item.id),
                username: item.username,
                fullName: item.fullName || ''
            };
        });
        [snapshot.followers, snapshot.following, diff?.newFollowers, diff?.lostFollowers,
            diff?.mutual, diff?.notFollowingBack].forEach(add);

        const followerIds = (snapshot.followers || []).map(item => String(item.id));
        const followingIds = (snapshot.following || []).map(item => String(item.id));
        const ids = (items = []) => items.map(item => String(item.id));
        const completedAt = new Date(`${date}T12:00:00`).toISOString();
        const counts = {
            followers: snapshot.reported?.followers || followerIds.length,
            following: snapshot.reported?.following || followingIds.length,
            new: diff?.counts?.new || diff?.newFollowers?.length || 0,
            lost: diff?.counts?.lost || diff?.lostFollowers?.length || 0,
            mutual: diff?.counts?.mutual || diff?.mutual?.length || 0,
            notFollowingBack: diff?.counts?.notFollowingBack || diff?.notFollowingBack?.length || 0
        };
        const latestScan = {
            id: `legacy-${date}`,
            startedAt: completedAt,
            completedAt,
            status: 'complete',
            reported: { followers: counts.followers, following: counts.following },
            fetched: { followers: followerIds.length, following: followingIds.length },
            followerIds,
            followingIds,
            diffs: {
                new: ids(diff?.newFollowers),
                lost: ids(diff?.lostFollowers),
                mutual: ids(diff?.mutual),
                notFollowingBack: ids(diff?.notFollowingBack)
            },
            counts
        };
        state.activeAccountId = ownerId;
        state.accounts[ownerId] = {
            profile: { ...owner, id: ownerId, avatarBase64: storage.ownerAvatarBase64 || null },
            people,
            latestScan,
            history: [{
                id: latestScan.id,
                completedAt,
                status: 'complete',
                counts,
                lostIds: latestScan.diffs.lost
            }]
        };
        return state;
    }

    async function processAndSaveData({ scanId, startedAt, userProfile, followers, following, keepActive = false }) {
        const ownerId = String(userProfile.id);
        const storage = await chrome.storage.local.get([
            TRACKER_STATE_KEY, 'snapshots', 'diffs', 'lastSnapshotDate', 'ownerProfile', 'ownerAvatarBase64'
        ]);
        const state = storage[TRACKER_STATE_KEY]?.schemaVersion === 2
            ? storage[TRACKER_STATE_KEY]
            : migrateLegacyState(storage);
        const previousAccount = state.accounts[ownerId];
        const previousScan = previousAccount?.latestScan;
        const previousFollowerIds = previousScan?.followerIds || [];
        const followerIds = followers.map(person => String(person.id));
        const followingIds = following.map(person => String(person.id));
        const diffIds = calculateDiffIds(
            followerIds,
            followingIds,
            previousFollowerIds,
            Boolean(previousScan),
            Array.isArray(previousScan?.followingIds) ? previousScan.followingIds : null
        );

        const people = { ...(previousAccount?.people || {}) };
        [...followers, ...following].forEach(person => {
            const id = String(person.id);
            // Instagram CDN links are signed and expire, so every scan refreshes them. If a scan
            // did not return one for this person, keep the older link rather than losing the picture.
            const avatarUrl = person.avatarUrl || people[id]?.avatarUrl;
            people[id] = {
                id,
                username: person.username,
                fullName: person.fullName || '',
                ...(avatarUrl ? { avatarUrl } : {})
            };
        });

        const completedAt = new Date().toISOString();
        const counts = {
            followers: userProfile.followerCount || followers.length,
            following: userProfile.followingCount || following.length,
            new: diffIds.new.length,
            lost: diffIds.lost.length,
            mutual: diffIds.mutual.length,
            notFollowingBack: diffIds.notFollowingBack.length,
            newFollowing: diffIds.newFollowing.length
        };
        const latestScan = {
            id: scanId,
            startedAt,
            completedAt,
            status: 'complete',
            reported: {
                followers: userProfile.followerCount || followers.length,
                following: userProfile.followingCount || following.length
            },
            fetched: { followers: followers.length, following: following.length },
            followerIds,
            followingIds,
            diffs: diffIds,
            counts
        };
        const previousHistory = (previousAccount?.history || [])
            .filter(item => item.id !== scanId)
            .map(item => ({
                ...item,
                lostIds: Array.isArray(item.lostIds)
                    ? item.lostIds
                    : item.id === previousScan?.id
                        ? (previousScan.diffs?.lost || [])
                        : undefined
            }));
        const history = [
            { id: scanId, completedAt, status: 'complete', counts, lostIds: diffIds.lost },
            ...previousHistory
        ].slice(0, MAX_HISTORY);

        const prunePeople = historyItems => {
            const historicalLostIds = historyItems.flatMap(item => item.lostIds || []);
            const referencedIds = new Set([...followerIds, ...followingIds, ...historicalLostIds]);
            Object.keys(people).forEach(id => {
                if (!referencedIds.has(id)) delete people[id];
            });
        };
        prunePeople(history);

        // During a "scan all" run, keep the account the user is looking at instead of
        // jumping to whichever account happened to finish last.
        const keepCurrent = keepActive && state.activeAccountId && state.accounts[state.activeAccountId];
        const nextState = {
            ...state,
            schemaVersion: 2,
            activeAccountId: keepCurrent ? state.activeAccountId : ownerId,
            accounts: {
                ...state.accounts,
                [ownerId]: {
                    profile: userProfile,
                    people,
                    latestScan,
                    history
                }
            }
        };

        try {
            await chrome.storage.local.set({ [TRACKER_STATE_KEY]: nextState });
            log('Committed verified tracker snapshot.', { ownerId, scanId, counts });
        } catch (failure) {
            const isQuotaError = failure.message?.includes('QUOTA_BYTES') || failure.message?.includes('QuotaExceeded');
            if (!isQuotaError) throw failure;

            nextState.accounts[ownerId].history = history.slice(0, 5);
            nextState.accounts[ownerId].profile.avatarBase64 = null;
            // Pictures are the cheapest thing to give up: the list still works with initials
            Object.values(people).forEach(person => { delete person.avatarUrl; });
            prunePeople(nextState.accounts[ownerId].history);
            try {
                await chrome.storage.local.set({ [TRACKER_STATE_KEY]: nextState });
            } catch (retryFailure) {
                await updateProgress('error', 0, 0, 'Local storage is full. Clear older account data in Settings.');
                throw retryFailure;
            }
        }
    }

    async function runCrawler(targetUsername, options = {}) {
        let username;
        try {
            username = normalizeUsername(targetUsername || '');
        } catch (failure) {
            await updateProgress('error', 0, 0, failure.message);
            throw failure;
        }
        const scanId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const startedAt = new Date().toISOString();
        const progressMeta = { scanId, username };
        let lockAcquired = false;
        currentScanId = scanId;
        cancelledScanId = null;
        activeProgressMeta = progressMeta;

        try {
            await acquireScanLock(scanId, username);
            lockAcquired = true;
            await updateProgress('resolving', 0, 0, 'Resolving account…', progressMeta);
            await delay(500);
            const userProfile = await fetchUserProfile(username);
            if (!userProfile?.id) throw new Error('Could not detect this account. Confirm that you are logged in.');

            const userId = String(userProfile.id);
            await updateProgress('resolving', 1, 1, `Account verified: @${userProfile.username}`, progressMeta);
            const avatarBase64 = await fetchAvatarAsBase64(userProfile.avatarUrl);

            await updateProgress('followers', 0, userProfile.followerCount, 'Verifying followers…', progressMeta);
            const followersResult = await fetchList(userId, 'followers', userProfile.followerCount);
            await assertCompleteList('followers', followersResult, userProfile.followerCount);

            await updateProgress('following', 0, userProfile.followingCount, 'Verifying following…', progressMeta);
            const followingResult = await fetchList(userId, 'following', userProfile.followingCount);
            await assertCompleteList('following', followingResult, userProfile.followingCount);

            const followers = followersResult.users;
            const following = followingResult.users;
            await updateProgress('processing', 0, 1, 'Committing verified snapshot…', progressMeta);
            await processAndSaveData({
                scanId,
                startedAt,
                userProfile: { ...userProfile, id: userId, avatarBase64 },
                followers,
                following,
                keepActive: Boolean(options.keepActive)
            });

            const acceptedDrift = [];
            if (userProfile.followerCount > followers.length) {
                acceptedDrift.push(`followers ${followers.length}/${userProfile.followerCount}`);
            }
            if (userProfile.followingCount > following.length) {
                acceptedDrift.push(`following ${following.length}/${userProfile.followingCount}`);
            }
            const completionMessage = acceptedDrift.length
                ? `Saved with a small Instagram count drift (${acceptedDrift.join(', ')}).`
                : `Verified ${followers.length} followers and ${following.length} following.`;
            await updateProgress(
                'done',
                followers.length + following.length,
                followers.length + following.length,
                completionMessage,
                progressMeta
            );
            return { followers, following };
        } catch (failure) {
            const message = failure?.message || 'Scan failed. Previous verified data is unchanged.';
            await updateProgress(
                'error',
                failure?.progressCount ?? 0,
                failure?.progressTotal ?? 0,
                message,
                progressMeta
            );
            throw failure;
        } finally {
            if (lockAcquired) await releaseScanLock(scanId);
            if (currentScanId === scanId) currentScanId = null;
            activeProgressMeta = {};
            await chrome.storage.local.remove('cancelScanId');
        }
    }

    window.IG_API = {
        runCrawler,
        resolveUserId: fetchUserProfile,
        __test: { normalizeUsername, calculateDiffIds, migrateLegacyState, isAcceptableListCount, processAndSaveData }
    };

})();
