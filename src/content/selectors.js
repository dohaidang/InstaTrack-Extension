/**
 * Instagram DOM Selectors
 * Centralized selectors to easily adapt to Instagram changes
 */
const SELECTORS = {
    // Main profile components
    PROFILE_HEADER: 'header',
    BIO_SECTION: 'section > div:last-child',

    // Stats (Posts, Followers, Following)
    STATS_LIST: 'ul.x78zum5',
    FOLLOWERS_LINK: 'a[href*="/followers"]',
    FOLLOWING_LINK: 'a[href*="/following"]',

    // Dialogs
    DIALOG_CONTAINER: 'div[role="dialog"]',
    DIALOG_TITLE: 'h1',
    SCROLLABLE_CONTAINER: 'div._aano',

    // User List Items
    USER_ROW: 'div[role="dialog"] div[role="listitem"]', // Updated to match current structure logic roughly
    // Specific elements within a row
    USERNAME: 'span._ap3a',
    FULLNAME: 'span.x1lliihq',
    AVATAR_IMG: 'img',

    // Loading/Error states
    LOADING_SPINNER: 'svg[aria-label="Loading..."]',
    RETRY_BUTTON: 'button'
};

// Export for usage in other modules (via window object in non-module context)
if (typeof window !== 'undefined') {
    window.IG_SELECTORS = SELECTORS;
}
