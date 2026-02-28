// @ts-check
import eslint from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
    {
        ignores: [
            "eslint.config.mjs",
            "prisma.config.ts",
            "dist/**",
            "node_modules/**",
            "coverage/**",
            "prisma/migrations/**",
        ],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    eslintPluginPrettierRecommended,
    {
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.jest,
            },
            sourceType: "commonjs",
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        plugins: {
            import: importPlugin,
        },
        settings: {
            "import/resolver": {
                typescript: {
                    project: "./tsconfig.json",
                },
            },
        },
        rules: {
            // Prettier
            "prettier/prettier": [
                "error",
                {
                    singleQuote: false,
                    jsxSingleQuote: false,
                    tabWidth: 4,
                    useTabs: false,
                    semi: true,
                    trailingComma: "all",
                    printWidth: 100,
                    bracketSpacing: true,
                    arrowParens: "always",
                    endOfLine: "lf",
                },
            ],

            // TypeScript strict rules
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/no-unsafe-argument": "error",
            "@typescript-eslint/explicit-function-return-type": "error",
            "@typescript-eslint/explicit-member-accessibility": [
                "error",
                { accessibility: "explicit" },
            ],
            "@typescript-eslint/await-thenable": "error",
            "@typescript-eslint/no-misused-promises": "error",
            "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],

            // Import ordering
            "import/order": [
                "error",
                {
                    groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
                    pathGroups: [
                        {
                            pattern: "@nestjs/**",
                            group: "external",
                            position: "before",
                        },
                        {
                            pattern: "@common/**",
                            group: "internal",
                            position: "before",
                        },
                        {
                            pattern: "@config/**",
                            group: "internal",
                            position: "before",
                        },
                        {
                            pattern: "@modules/**",
                            group: "internal",
                            position: "before",
                        },
                    ],
                    pathGroupsExcludedImportTypes: ["builtin"],
                    "newlines-between": "always",
                    alphabetize: {
                        order: "asc",
                        caseInsensitive: true,
                    },
                },
            ],
            "import/no-duplicates": "error",

            // General
            "no-console": "warn",
            "no-debugger": "error",
        },
    },
);
