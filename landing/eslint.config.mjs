import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      ".gemini/**",
      "node_modules/**",
      "next-env.d.ts",
      "codebase_dump*",
      "lint_errors.txt",
      "tmp/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement[name.name='button']",
          message: "Use shadcn Button from @/components/ui/button instead of raw <button>.",
        },
        {
          selector: "JSXOpeningElement[name.name='input']",
          message: "Use shadcn Input from @/components/ui/input instead of raw <input>.",
        },
        {
          selector: "JSXOpeningElement[name.name='textarea']",
          message: "Use shadcn Textarea from @/components/ui/textarea instead of raw <textarea>.",
        },
        {
          selector: "JSXOpeningElement[name.name='select']",
          message: "Use shadcn Select from @/components/ui/select instead of raw <select>.",
        },
      ],
    },
  },
  {
    files: ["components/ui/**"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
];

export default eslintConfig;
