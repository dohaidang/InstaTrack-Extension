/**
 * Synthetic Interactions
 * Mimics human behavior (mouse clicks, scrolling) without directly modifying DOM properties where detectable.
 */
(function () {
    window.IG_INTERACTIONS = window.IG_INTERACTIONS || {};

    const { delay, randomDelay, log } = window.IG_UTILS || {};

    /**
     * Dispatch synthetic events for a click (mousedown -> mouseup -> click)
     * @param {HTMLElement} element 
     */
    async function syntheticClick(element) {
        if (!element) return;

        // 1. Scroll into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await delay(Math.floor(Math.random() * 500) + 300);

        // 2. Calculate coordinates
        const rect = element.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        const options = {
            bubbles: true,
            composed: true,
            cancelable: true,
            view: window,
            screenX: window.screenX + x,
            screenY: window.screenY + y,
            clientX: x,
            clientY: y,
        };

        // 3. Dispatch events chain
        element.dispatchEvent(new MouseEvent('mousedown', options));
        await delay(Math.floor(Math.random() * 80) + 20); // Hold time
        element.dispatchEvent(new MouseEvent('mouseup', options));
        element.dispatchEvent(new MouseEvent('click', options));

        log(`Clicked element:`, element.tagName);
    }

    /**
     * Scroll an element by a certain amount smoothly
     * @param {HTMLElement} container 
     * @param {number} distance 
     */
    async function smoothScrollBy(container, distance) {
        if (!container) return;

        const steps = Math.floor(Math.random() * 10) + 15; // 15-25 steps
        const stepSize = distance / steps;

        for (let i = 0; i < steps; i++) {
            container.scrollTop += stepSize;
            await delay(Math.floor(Math.random() * 20) + 10);
        }
    }

    window.IG_INTERACTIONS = {
        syntheticClick,
        smoothScrollBy
    };
})();
