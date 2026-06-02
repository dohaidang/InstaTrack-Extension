module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                // Luxury Design Tokens
                "lux-bg": "#0B1020",
                "lux-bg-sec": "#111827",
                "lux-primary": "#E1306C",
                "lux-secondary": "#833AB4",
                "lux-highlight": "#6366F1",
                "lux-success": "#22C55E",
                "lux-warning": "#F59E0B",
                "lux-danger": "#EF4444",
                "lux-text-primary": "#F8FAFC",
                "lux-text-secondary": "#94A3B8",
                "lux-glass": "rgba(255, 255, 255, 0.08)",
                "lux-glass-border": "rgba(255, 255, 255, 0.12)",

                // Legacy / gradient colors overridden for luxury theme
                "primary": "#E1306C",
                "primary-dim": "#C13584",
                "insta-yellow": "#f9ce34",
                "insta-orange": "#ee2a7b",
                "insta-purple": "#6228d7",
                "background-light": "#0B1020",
                "background-dark": "#0B1020",

                // Adaptive system design tokens
                "surface":                  "#0B1020",
                "surface-container-lowest": "#111827",
                "surface-container-low":    "rgba(255, 255, 255, 0.04)",
                "surface-container":        "rgba(255, 255, 255, 0.08)",
                "surface-container-high":   "rgba(255, 255, 255, 0.12)",
                "surface-container-highest":"rgba(255, 255, 255, 0.16)",
                "surface-variant":          "rgba(255, 255, 255, 0.08)",
                "on-surface":               "#F8FAFC",
                "on-surface-variant":       "#94A3B8",
                "outline":                  "rgba(255, 255, 255, 0.12)",
                "outline-variant":          "rgba(255, 255, 255, 0.08)",
                "primary-container":        "rgba(225, 48, 108, 0.2)",
                "on-primary":               "#F8FAFC",
                "secondary":                "#833AB4",
                "secondary-container":      "rgba(131, 58, 180, 0.2)",
                "on-secondary-container":   "#F8FAFC",
                "tertiary":                 "#6366F1",
                "tertiary-container":       "rgba(99, 102, 241, 0.2)",
                "on-tertiary":              "#F8FAFC",
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
