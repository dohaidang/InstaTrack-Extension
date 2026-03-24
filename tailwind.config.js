module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                // Legacy / gradient colors
                "primary": "#b6004f",
                "primary-dim": "#a00045",
                "insta-yellow": "#f9ce34",
                "insta-orange": "#ee2a7b",
                "insta-purple": "#6228d7",
                "background-light": "#fff4f6",
                "background-dark": "#12080d",

                // New design system tokens (from new HTML)
                "surface":                  "#fff4f6",
                "surface-container-lowest": "#ffffff",
                "surface-container-low":    "#ffecf2",
                "surface-container":        "#ffe0eb",
                "surface-container-high":   "#ffd8e7",
                "surface-container-highest":"#ffd0e3",
                "surface-variant":          "#ffd0e3",
                "on-surface":               "#4a2135",
                "on-surface-variant":       "#7d4d63",
                "outline":                  "#9b687f",
                "outline-variant":          "#d79db6",
                "primary-container":        "#ff7196",
                "on-primary":               "#ffeff0",
                "secondary":                "#99366c",
                "secondary-container":      "#ffc0db",
                "on-secondary-container":   "#802157",
                "tertiary":                 "#5e4ab3",
                "tertiary-container":       "#b4a4ff",
                "on-tertiary":              "#f6f0ff",
            },
            fontFamily: {
                "display": ["Plus Jakarta Sans", "sans-serif"],
                "headline": ["Plus Jakarta Sans", "sans-serif"],
                "body": ["Plus Jakarta Sans", "sans-serif"],
            },
            borderRadius: {
                DEFAULT: "1rem",
                "lg": "2rem",
                "xl": "3rem",
                "full": "9999px",
            },
            backgroundImage: {
                'insta-gradient': 'linear-gradient(45deg, #f9ce34, #ee2a7b, #6228d7)',
                'brand-gradient': 'linear-gradient(135deg, #b6004f 0%, #ff7196 50%, #b4a4ff 100%)',
            },
        },
    },
    plugins: [],
}
