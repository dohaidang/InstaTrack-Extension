module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "primary": "#ee2b8c",
                "background-light": "#f8f6f7",
                "background-dark": "#12080d",
                "insta-yellow": "#f9ce34",
                "insta-orange": "#ee2a7b",
                "insta-purple": "#6228d7",
            },
            fontFamily: {
                "display": ["Plus Jakarta Sans", "sans-serif"]
            },
            backgroundImage: {
                'insta-gradient': 'linear-gradient(45deg, #f9ce34, #ee2a7b, #6228d7)',
            }
        },
    },
    plugins: [],
}
