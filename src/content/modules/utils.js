/**
 * Content Script Utilities
 * Provides helper functions for delays, logging, and cookies
 */
(function () {
    window.IG_UTILS = window.IG_UTILS || {};

    const _logPrefix = '[InstaTrack]';

    // --- 1. Delay Helpers (Anti-Bot) ---

    /**
     * Pause execution for exactly ms milliseconds
     * @param {number} ms 
     */
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Pause execution for a random duration (Gaussian distribution simulation)
     * @param {number} min Minimum milliseconds
     * @param {number} max Maximum milliseconds
     */
    function randomDelay(min, max) {
        // Simple random range for now, can be improved to Gaussian
        const ms = Math.floor(Math.random() * (max - min + 1) + min);
        return delay(ms);
    }

    // --- 2. Logging ---

    function log(msg, ...args) {
        console.log(`%c${_logPrefix} ${msg}`, 'color: #ee2b8c; font-weight: bold;', ...args);
    }

    function error(msg, ...args) {
        console.error(`%c${_logPrefix} ERROR: ${msg}`, 'color: red; font-weight: bold;', ...args);
    }

    // Export to global scope
    window.IG_UTILS = {
        delay,
        randomDelay,
        log,
        error,
        getCookie: (name) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop().split(';').shift();
            return null;
        }
    };
})();
