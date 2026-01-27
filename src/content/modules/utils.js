/**
 * Content Script Utilities
 * Provides helper functions for delays, logging, and synthetic events
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

    // --- 3. DOM Helpers ---

    /**
     * Safely query selector inside a container or document
     */
    function q(selector, context = document) {
        return context.querySelector(selector);
    }

    function qa(selector, context = document) {
        return Array.from(context.querySelectorAll(selector));
    }

    /**
     * Wait for an element to appear in DOM
     * @param {string} selector 
     * @param {number} timeoutMs 
     */
    function waitForElement(selector, timeoutMs = 10000) {
        return new Promise((resolve, reject) => {
            if (q(selector)) return resolve(q(selector));

            const observer = new MutationObserver((mutations) => {
                const el = q(selector);
                if (el) {
                    observer.disconnect();
                    resolve(el);
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Timeout waiting for ${selector}`));
            }, timeoutMs);
        });
    }

    // Export to global scope
    window.IG_UTILS = {
        delay,
        randomDelay,
        log,
        error,
        q,
        qa,
        waitForElement,
        getCookie: (name) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop().split(';').shift();
            return null;
        }
    };
})();
