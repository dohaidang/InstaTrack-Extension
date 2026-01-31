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
    const FOLLOWING_HASH = 'd04b0a864b4b54837c0d870b0e77e07f'; // Hash for edge_follow
    const PROFILE_DOC_ID = '7950326061742202';

    /**
     * Helpers for headers
     */
    function getCommonHeaders() {
        return {
            'x-csrftoken': getCookie('csrftoken'),
            'x-ig-app-id': '936619743392459',
            'x-requested-with': 'XMLHttpRequest',
            'x-fb-lsd': getLSD(),
            'content-type': 'application/x-www-form-urlencoded'
        };
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
        return 'AVr...'; // Placeholder
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
            }
        } catch (e) {
            log("Web API fetch failed, trying fallback...", e);
            if (e.message.includes("login")) throw e; // Propagate auth errors
        }

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
            body.append('lsd', getLSD());

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
        const variables = { id: userId, include_reel: true, fetch_mutual: false, first: first };
        if (after) variables.after = after;
        const url = `https://www.instagram.com/graphql/query/?query_hash=${FOLLOWING_HASH}&variables=${encodeURIComponent(JSON.stringify(variables))}`;

        return await fetchWithAuth(url);
    }

    async function fetchWithAuth(url) {
        try {
            const response = await fetch(url, { method: 'GET', headers: getCommonHeaders() });
            if (response.status === 401 || response.status === 403) throw new Error("Authentication failed. Please login.");
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            return await response.json();
        } catch (err) { error("API Fetch Error:", err); throw err; }
    }

    /**
     * List Fetcher Loop
     */
    async function fetchList(userId, type = 'followers') {
        let allUsers = [];
        let hasNext = true;
        let endCursor = null;
        const fetchFunc = type === 'followers' ? fetchFollowersPage : fetchFollowingPage;
        const edgeKey = type === 'followers' ? 'edge_followed_by' : 'edge_follow';
        let pageCount = 0;

        while (hasNext) {
            pageCount++;
            log(`Fetching ${type} page ${pageCount}... (Total: ${allUsers.length})`);
            await randomDelay(1000, 2000);

            try {
                const data = await fetchFunc(userId, 50, endCursor);
                const edge = data?.data?.user?.[edgeKey];
                if (!edge) throw new Error("Invalid API format");

                const edges = edge.edges || [];
                const newNodes = edges.map(e => ({
                    id: e.node.id,
                    username: e.node.username,
                    fullName: e.node.full_name,
                    avatarUrl: e.node.profile_pic_url
                }));

                allUsers = [...allUsers, ...newNodes];
                hasNext = edge.page_info.has_next_page;
                endCursor = edge.page_info.end_cursor;

                // Safety break
                // if (allUsers.length > 5000) hasNext = false; 

            } catch (e) {
                error(`Loop error in ${type}`, e);
                hasNext = false;
            }
        }
        return allUsers;
    }

    /**
     * Main Entry
     */
    async function runCrawler(targetUsername) {
        let userId;
        await delay(2000);

        // Resolve User
        let userProfile = null;
        if (targetUsername) {
            userProfile = await fetchUserProfile(targetUsername);
        } else {
            const cookieId = getCookie('ds_user_id');
            if (cookieId) {
                userId = cookieId;
                userProfile = { id: userId, username: "Me", fullName: "You", avatarUrl: null, followingCount: 0, followerCount: 0 };
            }
        }
        if (!userProfile || !userProfile.id) throw new Error("Could not detect User. Please login.");

        userId = userProfile.id;
        log(`Starting Crawl for ${userProfile.username} (${userId})`);

        // Save Profile First
        await chrome.storage.local.set({ ownerProfile: userProfile });

        // Fetch Both Lists
        log("Step 1: Fetching Followers...");
        const followers = await fetchList(userId, 'followers');

        log("Step 2: Fetching Following...");
        const following = await fetchList(userId, 'following');

        log(`Crawl Complete. Followers: ${followers.length}, Following: ${following.length}`);

        // Save & Compute Diff
        await processAndSaveData(followers, following);

        return { followers, following };
    }

    async function processAndSaveData(currFollowers, currFollowing) {
        const dateKey = new Date().toISOString().split('T')[0];
        const storage = await chrome.storage.local.get(['snapshots', 'diffs']);
        const snapshots = storage.snapshots || {};
        const diffs = storage.diffs || {};

        // Get Previous Snapshot
        const dates = Object.keys(snapshots).sort();
        const prevDate = dates.length > 0 ? dates[dates.length - 1] : null;

        let prevFollowers = [];
        if (prevDate && prevDate !== dateKey) {
            prevFollowers = snapshots[prevDate]?.followers || [];
        } else if (dates.length >= 2) {
            prevFollowers = snapshots[dates[dates.length - 2]]?.followers || [];
        }

        // --- Diff Logic ---
        const currFollowersMap = new Map(currFollowers.map(u => [u.id, u]));
        const prevFollowersMap = new Map(prevFollowers.map(u => [u.id, u]));

        const newFollowers = currFollowers.filter(u => !prevFollowersMap.has(u.id));
        const lostFollowers = prevFollowers.filter(u => !currFollowersMap.has(u.id));

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

        snapshots[dateKey] = {
            followers: currFollowers,
            following: currFollowing
        };
        diffs[dateKey] = diffResult;

        await chrome.storage.local.set({
            snapshots: snapshots,
            diffs: diffs,
            lastSnapshotDate: dateKey,
            isScanning: false
        });
        log("Saved Snapshots & Diffs.", diffResult);
    }

    window.IG_API = {
        runCrawler,
        resolveUserId: fetchUserProfile
    };

})();
