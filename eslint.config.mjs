import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    // The generated Prisma client. The previous entry named
    // src/generated/prisma, a path this project does not have, so it never
    // matched and the whole generated client was being linted.
    "generated/prisma/**",

    // Not compiled. tsconfig excludes all four; ESLint did not, so it was
    // reporting on code the build never sees.
    "legacy/**",
    "scratch/**",
    "src/**",
    ".broken_src/**",

    // Dot-directories belonging to editors, agents and tooling - .claude,
    // .cursor, .vibe, .trae, .qoder, .kiro and a dozen more. None are part of
    // the application and none are tracked in git, so CI never saw them, but
    // locally they produced about 10,400 of the 10,600 findings and made
    // `npm run lint` useless to run.
    "**/.*/**",
  ]),
]);

export default eslintConfig;
