import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Node maintenance scripts written as CommonJS.
  {
    files: ["scripts/**/*.js", "patch-exfat.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "src/generated/prisma/**",
    // This project generates the Prisma client to ./generated, not ./src.
    // The wrong path above put ~1,900 errors from generated code in the report.
    "generated/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
