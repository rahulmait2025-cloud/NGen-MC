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
      ".next/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      "coverage/**",
      "scratch/**",
      "**/*.tmp.ts",
      "**/*.tmp.tsx",
      "list-pillars.mjs",
      "scratch-list-pillars.ts",
      "scripts/debug-db.js",
      "scripts/get_colleges.js",
      "scripts/apply_migration.js",
    ],
  },
{
        rules: {
            "@typescript-eslint/no-unused-vars": ["warn", {
                "argsIgnorePattern": "^_",
                "varsIgnorePattern": "^_",
                "caughtErrorsIgnorePattern": "^_"
            }],
        },
    },
];

export default eslintConfig;
