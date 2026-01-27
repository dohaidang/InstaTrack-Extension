/**
 * API Scanner Module
 * Fetches followers using Instagram's internal GraphQL API.
 */
(function () {
    window.IG_API = window.IG_API || {};
    const { delay, randomDelay, log, error, getCookie } = window.IG_UTILS || {};

    const QUERY_HASH = 'c76146de99bb02f6415203be841dd25a'; // Hash for edge_followed_by

    /**
     * Fetch a single page of followers
     */
    async function fetchFollowersPage(userId, first = 50, after = null) {
        const variables = {
            id: userId,
            include_reel: true,
            fetch_mutual: false,
            first: first,
        };
        if (after) variables.after = after;

        const url = `https://www.instagram.com/graphql/query/?query_hash=${QUERY_HASH}&variables=${encodeURIComponent(JSON.stringify(variables))}`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'x-csrftoken': getCookie('csrftoken'),
                    'x-ig-app-id': '936619743392459', // Common Web App ID
                    'x-requested-with': 'XMLHttpRequest'
                }
            });

            if (response.status === 401 || response.status === 403) {
                throw new Error("Authentication failed or Rate Limited. Please login to Instagram or wait.");
            }

            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }

            const json = await response.json();
            return json;
        } catch (err) {
            error("API Fetch Error:", err);
            throw err;
        }
    }

    /**
     * Get Current User ID from the DOM (sharedData or meta)
     * Robust way to find who we are looking at.
     */
    function getTargetUserId() {
        // 1. Try generic meta detection (often present on profile)
        // Note: This often requires the page to be the PROFILE page of the target user.
        // We will assume the user is ON the profile page they want to scan.

        // 2. Try looking for "profilePage_" in window._sharedData (if accessible)
        // Content script cannot access window variables directly easily without injection.
        // So we rely on DOM hacks.

        // Strategy: Look for specific meta content
        const meta = document.querySelector('meta[property="al:ios:url"]');
        if (meta) {
            const content = meta.getAttribute('content');
            // content="instagram://user?username=xxx" -> No ID here usually.
        }

        const metaId = document.querySelector('meta[property="instapp:owner_user_id"]');
        if (metaId) return metaId.getAttribute('content');

        // Strategy: Look for a script containing "user_id"
        // This is messy. Let's ask the user to input? No, automated.
        // Ideally, we fetch the current page HTML and regex it?

        // Fallback: If we are calling this, maybe we can fetch the user's profile JSON first?
        // https://www.instagram.com/{username}/?__a=1&__d=dis (deprecated/blocked often)

        throw new Error("Could not detect User ID from DOM. Please ensure you are on a Profile Page.");
    }

    // Better Strategy for ID: 
    // If we are on https://www.instagram.com/username/
    // We can fetch `https://www.instagram.com/api/v1/users/web_profile_info/?username={username}`
    // But that requires another endpoint.
    // Let's rely on the user confirming ID or a cleaner extraction if possible.
    // For now, let's implement a heuristic.

    async function resolveUserId(username) {
        const url = `https://www.instagram.com/web/search/topsearch/?context=blended&query=${username}&rank_token=0.3&include_reel=true`;
        // This is a search API, might give ID.
        // Creating a robust resolve function is hard without scraping.
        // Let's try the profile page meta again.

        // Actually, on modern IG, <meta property="instapp:owner_user_id" content="123" /> exists!
        const metaId = document.querySelector('meta[property="instapp:owner_user_id"]');
        if (metaId) return metaId.getAttribute('content');

        return null; // Fail
    }

    /**
     * Main function: Fetch ALL followers
     */
    /**
     * Main function: Fetch ALL followers
     */
    async function fetchAllFollowers() {
        // 1. Try to get ID from cookie (Self-Scan, most reliable for tracking own followers)
        let userId = getCookie('ds_user_id');

        if (userId) {
            log(`Detected Authenticated User ID from cookie: ${userId}`);
        } else {
            // 2. Fallback to Meta Tag (Profile Scan)
            const metaId = document.querySelector('meta[property="instapp:owner_user_id"]');
            if (metaId) {
                userId = metaId.getAttribute('content');
                log(`Detected User ID from page meta: ${userId}`);
            }
        }

        if (!userId) {
            throw new Error("Could not detect User ID. Please login to Instagram or navigate to a profile page.");
        }

        let allFollowers = [];
        let hasNext = true;
        let endCursor = null;
        let pageCount = 0;

        log(`Starting API Scan for User ID: ${userId}`);

        while (hasNext) {
            pageCount++;
            log(`Fetching page ${pageCount}... (Total so far: ${allFollowers.length})`);

            // Throttle
            await randomDelay(1000, 2000);

            try {
                const data = await fetchFollowersPage(userId, 50, endCursor);
                const edgeFollowedBy = data?.data?.user?.edge_followed_by;

                if (!edgeFollowedBy) {
                    throw new Error("Invalid API response format (missing edge_followed_by)");
                }

                const edges = edgeFollowedBy.edges || [];
                const newNodes = edges.map(e => ({
                    id: e.node.id,
                    username: e.node.username,
                    fullName: e.node.full_name,
                    avatarUrl: e.node.profile_pic_url
                }));

                allFollowers = [...allFollowers, ...newNodes];

                const pageInfo = edgeFollowedBy.page_info;
                hasNext = pageInfo.has_next_page;
                endCursor = pageInfo.end_cursor;

            } catch (e) {
                error("Error during loop:", e);
                // Retry logic could go here
                hasNext = false; // Stop for safety
            }
        }

        // Dedupe just in case
        const uniqueFollowers = Array.from(new Map(allFollowers.map(item => [item.id, item])).values());

        log(`Scan Complete. Found ${uniqueFollowers.length} followers.`);
        await saveSnapshot(uniqueFollowers);
        return uniqueFollowers;
    }

    async function saveSnapshot(followers) {
        const dateKey = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const storage = await chrome.storage.local.get(['snapshots', 'lastSnapshotDate']);

        const snapshots = storage.snapshots || {};
        const lastDate = storage.lastSnapshotDate;

        // Optional: Diff
        if (lastDate && snapshots[lastDate]) {
            const oldList = snapshots[lastDate];
            const oldSet = new Set(oldList.map(u => u.id));
            const newSet = new Set(followers.map(u => u.id));

            const newFollowers = followers.filter(u => !oldSet.has(u.id));
            const unfollowers = oldList.filter(u => !newSet.has(u.id));

            log(`Diff: +${newFollowers.length} new, -${unfollowers.length} unfollowed.`);
            // Save diffs if needed
        }

        snapshots[dateKey] = followers;

        await chrome.storage.local.set({
            snapshots: snapshots,
            lastSnapshotDate: dateKey
        });
        log("Snapshot saved to Chrome Storage.");
    }

    window.IG_API = {
        fetchAllFollowers
    };

})();
