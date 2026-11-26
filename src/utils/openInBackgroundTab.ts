import type { MouseEvent } from 'react';

/**
 * Chrome closes an extension popup as soon as it loses focus, and a foreground
 * tab (what target="_blank" opens) takes the focus. Opening the link in a
 * background tab leaves the popup where it is.
 *
 * Modified clicks (Ctrl/Cmd/Shift/Alt) and non-left buttons are left to the
 * browser so the anchor keeps behaving like a normal link.
 */
export function openInBackgroundTab(event: MouseEvent<HTMLAnchorElement>): void {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;

    const url = event.currentTarget.href;
    if (!url || typeof chrome === 'undefined' || !chrome.tabs?.create) return;

    event.preventDefault();
    void chrome.tabs.create({ url, active: false });
}
