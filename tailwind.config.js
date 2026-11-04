/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './index.html',
        './src/**/*.{js,ts,jsx,tsx}',
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                paper: 'var(--paper)',
                'paper-raised': 'var(--paper-raised)',
                'paper-deep': 'var(--paper-deep)',
                ink: 'var(--ink)',
                'ink-soft': 'var(--ink-soft)',
                rule: 'var(--rule)',
                signal: 'var(--signal)',
                positive: 'var(--positive)',
                negative: 'var(--negative)',
                warning: 'var(--warning)',
            },
            fontFamily: {
                display: ['Fraunces', 'serif'],
                body: ['IBM Plex Sans', 'sans-serif'],
            },
            borderRadius: {
                ledger: '2px',
            },
        },
    },
    plugins: [],
};
