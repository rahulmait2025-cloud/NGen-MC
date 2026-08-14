import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const eslintConfig = [
    ...nextCoreWebVitals,
    ...nextTypeScript,
    {
        ignores: [
            ".agent/**",
            ".agents/**",
            ".ami/**",
            ".gemini/**",
            ".skills/**",
            ".vscode/**",
            "node_modules/**",
        ],
    },
    {
        rules: {
            "@typescript-eslint/no-unused-vars": ["error", { 
                "argsIgnorePattern": "^_",
                "varsIgnorePattern": "^_"
            }],
        },
    },
];

export default eslintConfig;
