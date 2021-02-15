module.exports = {
    rules: {
        // ignore missing imports in node playground templates
        "import/no-unresolved": [2, {
            ignore: [
                "\\./markers$",
                "\\./types$",
                "^ros$",
            ]
        }],
    },
};
