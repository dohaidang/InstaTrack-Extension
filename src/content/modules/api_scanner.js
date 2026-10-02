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
    const MIN_COMPLETENESS = 0.9; // fetched list must reach 90% of the reported count

    /**
     * Progress Tracker - Updates chrome.storage for popup to read
     */
    async function updateProgress(phase, current, total, message) {
        try {
            await chrome.storage.local.set({
                scanProgress: {
                    phase,
                    current,
                    total,
                    message,
                    timestamp: Date.now()
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
            const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`;
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
        try {
            const response = await fetch(url, { method: 'GET', headers: getCommonHeaders() });
            if (response.status === 401 || response.status === 403) throw new Error("Authentication failed. Please login.");
            if (response.status === 429) throw new Error(RATE_LIMIT_MSG);
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            return await response.json();
        } catch (err) { error("API Fetch Error:", err); throw err; }
    }

    /**
     * List Fetcher Loop
     */
    async function fetchList(userId, type = 'followers', expectedTotal = 0) {
        // Primary: friendships API (what the web app uses today)
        try {
            const users = await fetchListVia('friendships', userId, type, expectedTotal);
            if (users.length > 0 || !expectedTotal) return users;
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
                const reason = e.message === RATE_LIMIT_MSG ? ` ${RATE_LIMIT_MSG}` : '';
                const msg = `Error fetching ${type} (${allUsers.length}${expectedTotal ? '/' + expectedTotal : ''}). Data not saved.${reason}`;
                const failure = new Error(msg);
                failure.partial = allUsers.length > 0;
                failure.progressCount = allUsers.length;
                throw failure;
            }
        }
        // Pagination can repeat accounts across pages
        return Array.from(new Map(allUsers.map(u => [u.id, u])).values());
    }

    /**
     * Reject lists that are far smaller than the count Instagram reports.
     * Skipped when the expected total is unknown (0).
     */
    async function assertCompleteList(type, fetched, expectedTotal) {
        if (!expectedTotal) return;
        if (fetched < expectedTotal * MIN_COMPLETENESS) {
            const msg = `Incomplete ${type} list: got ${fetched}/${expectedTotal}. Data not saved.`;
            await updateProgress('error', fetched, expectedTotal, msg);
            throw new Error(msg);
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
    async function runCrawler(targetUsername) {
        let userId;

        // Initialize progress
        await updateProgress('resolving', 0, 0, 'Resolving user profile...');
        await delay(2000);

        // Resolve User
        let userProfile = null;
        try {
            if (targetUsername) {
                userProfile = await fetchUserProfile(targetUsername);
            } else {
                const cookieId = getCookie('ds_user_id');
                if (cookieId) {
                    userId = cookieId;
                    userProfile = { id: userId, username: "Me", fullName: "You", avatarUrl: null, followingCount: 0, followerCount: 0 };
                }
            }
        } catch (e) {
            await updateProgress('error', 0, 0, e.message || 'Failed to resolve user');
            throw e;
        }

        if (!userProfile || !userProfile.id) {
            await updateProgress('error', 0, 0, 'Could not detect User. Please login.');
            throw new Error("Could not detect User. Please login.");
        }

        userId = userProfile.id;
        log(`Starting Crawl for ${userProfile.username} (${userId})`);
        await updateProgress('resolving', 1, 1, `Found: @${userProfile.username}`);

        // Remember who the stored (pre-ownerId) snapshots belonged to, then save the new profile
        const prevProfile = (await chrome.storage.local.get(['ownerProfile'])).ownerProfile;
        const legacyOwnerId = prevProfile?.id;
        await chrome.storage.local.set({ ownerProfile: userProfile });

        // Fetch avatar as base64 (content script context = no CORS block)
        log('[Avatar] Fetching avatar as base64...');
        const avatarBase64 = await fetchAvatarAsBase64(userProfile.avatarUrl);
        if (avatarBase64) {
            await chrome.storage.local.set({ ownerAvatarBase64: avatarBase64 });
            log('[Avatar] Saved base64 avatar to storage.');
        }

        // Fetch Followers
        log("Step 1: Fetching Followers...");
        await updateProgress('followers', 0, userProfile.followerCount, 'Starting followers fetch...');
        const followers = await fetchList(userId, 'followers', userProfile.followerCount);
        await assertCompleteList('followers', followers.length, userProfile.followerCount);

        // Fetch Following
        log("Step 2: Fetching Following...");
        await updateProgress('following', 0, userProfile.followingCount, 'Starting following fetch...');
        const following = await fetchList(userId, 'following', userProfile.followingCount);
        await assertCompleteList('following', following.length, userProfile.followingCount);

        log(`Crawl Complete. Followers: ${followers.length}, Following: ${following.length}`);

        // Processing
        await updateProgress('processing', 0, 1, 'Processing data...');
        await processAndSaveData(followers, following, userId, legacyOwnerId,
            { followers: userProfile.followerCount, following: userProfile.followingCount });

        // Done
        await updateProgress('done', followers.length + following.length, followers.length + following.length,
            `Done! ${followers.length} followers, ${following.length} following`);

        return { followers, following };
    }

    async function processAndSaveData(currFollowers, currFollowing, ownerId, legacyOwnerId, reported) {
        const dateKey = new Date().toISOString().split('T')[0];
        const storage = await chrome.storage.local.get(['snapshots', 'diffs']);
        const snapshots = storage.snapshots || {};
        const diffs = storage.diffs || {};

        // Previous snapshot = latest EARLIER day of the SAME account.
        // Snapshots saved before ownerId existed are assumed to belong to legacyOwnerId.
        const ownerOf = (snap) => snap.ownerId ?? legacyOwnerId;
        const prevDate = Object.keys(snapshots).sort()
            .filter(d => d < dateKey && ownerOf(snapshots[d]) === ownerId)
            .pop();
        const hasPrev = !!prevDate;
        const prevFollowers = hasPrev ? (snapshots[prevDate].followers || []) : [];

        // --- Diff Logic ---
        const currFollowersMap = new Map(currFollowers.map(u => [u.id, u]));
        const prevFollowersMap = new Map(prevFollowers.map(u => [u.id, u]));

        // Without a baseline (first scan of this account) nothing is "new" or "lost"
        const newFollowers = hasPrev ? currFollowers.filter(u => !prevFollowersMap.has(u.id)) : [];
        const lostFollowers = hasPrev ? prevFollowers.filter(u => !currFollowersMap.has(u.id)) : [];

        const currFollowingMap = new Map(currFollowing.map(u => [u.id, u]));
        const mutual = currFollowers.filter(u => currFollowingMap.has(u.id));
        const notFollowingBack = currFollowing.filter(u => !currFollowersMap.has(u.id));

        const diffResult = {
            newFollowers,
            lostFollowers,
            mutual,
            notFollowingBack,
            counts: {
                new: newFollowers.length,
                lost: lostFollowers.length,
                mutual: mutual.length,
                notFollowingBack: notFollowingBack.length
            }
        };

        // [FIX] Strip avatarUrl & fullName from snapshots - only needed for diff (id, username)
        // avatarUrl is kept in diffs for UI display. This reduces snapshot size by ~60%.
        const toSlim = (arr) => arr.map(({ id, username }) => ({ id, username }));
        snapshots[dateKey] = {
            ownerId,
            // Counts as shown on the Instagram profile (the API omits some unavailable accounts)
            reported: { followers: reported?.followers || 0, following: reported?.following || 0 },
            followers: toSlim(currFollowers),
            following: toSlim(currFollowing)
        };
        diffs[dateKey] = diffResult;

        // [FIX Layer 2] Prune old snapshots — keep only MAX_SNAPSHOTS most recent days
        const MAX_SNAPSHOTS = 3;
        const allDates = Object.keys(snapshots).sort(); // ascending: oldest first
        if (allDates.length > MAX_SNAPSHOTS) {
            const toDelete = allDates.slice(0, allDates.length - MAX_SNAPSHOTS);
            toDelete.forEach(d => {
                delete snapshots[d];
                delete diffs[d];
                log(`[Prune] Deleted old snapshot: ${d}`);
            });
        }

        // [FIX Layer 3] Graceful save with QuotaExceeded recovery
        const saveToStorage = async () => {
            await chrome.storage.local.set({
                snapshots: snapshots,
                diffs: diffs,
                lastSnapshotDate: dateKey,
                isScanning: false
            });
        };

        try {
            await saveToStorage();
            log("Saved Snapshots & Diffs.", diffResult);
        } catch (e) {
            const isQuotaError = e.message?.includes('QUOTA_BYTES') || e.message?.includes('QuotaExceeded');
            if (isQuotaError) {
                // Emergency prune: xóa snapshot cũ nhất rồi retry
                const remainingDates = Object.keys(snapshots).sort();
                if (remainingDates.length > 1) {
                    const oldest = remainingDates[0];
                    delete snapshots[oldest];
                    delete diffs[oldest];
                    log(`[Emergency Prune] Removed oldest snapshot (${oldest}) to free space.`);
                    try {
                        await saveToStorage();
                        log("Saved after emergency prune.", diffResult);
                    } catch (retryErr) {
                        error("Storage still full after emergency prune.", retryErr);
                        await updateProgress('error', 0, 0,
                            'Storage đầy! Vào Settings → Clear Data để giải phóng.');
                        throw retryErr;
                    }
                } else {
                    error("Storage full and no old snapshots to prune.", e);
                    await updateProgress('error', 0, 0,
                        'Storage đầy! Vào Settings → Clear Data để giải phóng.');
                    throw e;
                }
            } else {
                throw e;
            }
        }
    }

    window.IG_API = {
        runCrawler,
        resolveUserId: fetchUserProfile
    };

})();
