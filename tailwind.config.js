module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                // Luxury Design Tokens mapped to CSS variables
                "lux-bg": "var(--bg-color)",
                "lux-bg-sec": "var(--bg-sec)",
                "lux-primary": "#E1306C",
                "lux-secondary": "#833AB4",
                "lux-highlight": "#6366F1",
                "lux-success": "#22C55E",
                "lux-warning": "#F59E0B",
                "lux-danger": "#EF4444",
                "lux-text-primary": "var(--text-primary)",
                "lux-text-secondary": "var(--text-secondary)",
                "lux-glass": "var(--glass-bg)",
                "lux-glass-border": "var(--glass-border)",

                // Legacy / gradient colors overridden for luxury theme
                "primary": "#E1306C",
                "primary-dim": "#C13584",
                "insta-yellow": "#f9ce34",
                "insta-orange": "#ee2a7b",
                "insta-purple": "#6228d7",
                "background-light": "var(--bg-color)",
                "background-dark": "var(--bg-color)",

                // Adaptive system design tokens
                "surface":                  "var(--color-surface)",
                "surface-container-lowest": "var(--color-surface-container-lowest)",
                "surface-container-low":    "var(--color-surface-container-low)",
                "surface-container":        "var(--color-surface-container)",
                "surface-container-high":   "var(--color-surface-container-high)",
                "surface-container-highest":"var(--color-surface-container-highest)",
                "surface-variant":          "var(--color-surface-variant)",
                "on-surface":               "var(--color-on-surface)",
                "on-surface-variant":       "var(--color-on-surface-variant)",
                "outline":                  "var(--color-outline)",
                "outline-variant":          "var(--color-outline-variant)",
                "primary-container":        "var(--primary-glow)",
                "on-primary":               "var(--text-primary)",
                "secondary":                "#833AB4",
                "secondary-container":      "rgba(131, 58, 180, 0.2)",
                "on-secondary-container":   "var(--text-primary)",
                "tertiary":                 "#6366F1",
                "tertiary-container":       "rgba(99, 102, 241, 0.2)",
                "on-tertiary":              "var(--text-primary)",
            },
            fontFamily: {
                "display": ["Inter", "sans-serif"],
                "headline": ["Inter", "sans-serif"],
                "body": ["Inter", "sans-serif"],
            },
            borderRadius: {
                DEFAULT: "1rem",
                "lg": "2rem",
                "xl": "3rem",
                "full": "9999px",
            },
            backgroundImage: {
                'insta-gradient': 'linear-gradient(45deg, #f9ce34, #ee2a7b, #6228d7)',
                'brand-gradient': 'linear-gradient(135deg, #E1306C 0%, #833AB4 50%, #6366F1 100%)',
            },
        },
    },
    plugins: [],
}
