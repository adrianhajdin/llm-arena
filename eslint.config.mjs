import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Formatting is Prettier's job and correctness is ESLint's; the two never
 * overlap, which is why there is no formatting rule anywhere in here.
 *
 * Everything below enforces a rule that is written down in
 * `docs/coding-standards.md`. The rules that cannot be checked by a machine
 * live in that document instead of being faked with an approximate lint rule.
 */

/** `process.env.FOO`, but not the two build-time flags every file may read. */
const restrictedEnvAccess = [
  {
    selector:
      "MemberExpression[object.object.name='process'][object.property.name='env']" +
      ":not([property.name='NODE_ENV']):not([property.name='NEXT_RUNTIME'])" +
      ":not([property.value='NODE_ENV']):not([property.value='NEXT_RUNTIME'])",
    message:
      "Read configuration through serverEnv() in infrastructure/env.ts, or publicEnv in infrastructure/public-env.ts. Direct process.env access bypasses the fail-fast validation at startup.",
  },
];

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
    // Prisma's generated client is not ours to lint.
    "generated/**",
  ]),

  {
    name: "llm-arena/language",
    rules: {
      // Strict TypeScript, no `any`. A warning here is an error we ignore.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // Immutable data: const by default, nothing reassigned in place.
      "prefer-const": "error",
      "no-var": "error",
      "no-param-reassign": ["error", { props: true }],

      // Never show a raw provider error to the user; `console.error` on the
      // server is how the real one survives. Stray debug logs are not that.
      "no-console": ["warn", { allow: ["error", "warn"] }],
      eqeqeq: ["error", "smart"],

      "no-restricted-syntax": ["error", ...restrictedEnvAccess],
    },
  },

  {
    name: "llm-arena/accessibility",
    rules: {
      // The baseline every screen owes: real labels, real keyboard operation.
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/anchor-has-content": "error",
      "jsx-a11y/anchor-is-valid": "error",
      "jsx-a11y/aria-props": "error",
      "jsx-a11y/aria-proptypes": "error",
      "jsx-a11y/aria-role": "error",
      "jsx-a11y/click-events-have-key-events": "error",
      "jsx-a11y/heading-has-content": "error",
      "jsx-a11y/interactive-supports-focus": "error",
      "jsx-a11y/label-has-associated-control": "error",
      "jsx-a11y/no-autofocus": ["error", { ignoreNonDOM: true }],
      "jsx-a11y/no-noninteractive-element-interactions": "error",
      "jsx-a11y/no-static-element-interactions": "error",
      "jsx-a11y/role-has-required-aria-props": "error",
    },
  },

  {
    // Folder by feature: a feature owns its folder and reaches sideways through
    // nothing. Its own files import relatively; anything shared is
    // infrastructure. `app/` composes features, never the other way round.
    name: "llm-arena/feature-boundaries",
    files: ["features/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/*", "@/app/**"],
              message:
                "A feature cannot import from app/. Routes and layouts compose features, not the reverse.",
            },
            {
              group: ["@/features/*", "@/features/**"],
              message:
                "Import this feature's own files relatively. Reaching into another feature means the shared piece belongs in infrastructure/, or in a feature both can depend on.",
            },
            {
              group: ["../*/**"],
              message:
                "That relative path leaves this feature's folder. Use @/infrastructure/* for shared code.",
            },
          ],
        },
      ],
    },
  },

  {
    // Infrastructure is the bottom layer: it knows about no feature, no route.
    name: "llm-arena/infrastructure-boundaries",
    files: ["infrastructure/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/*", "@/app/**", "@/features/*", "@/features/**"],
              message:
                "infrastructure/ is the bottom layer. It cannot depend on a feature or a route.",
            },
          ],
        },
      ],
    },
  },

  {
    // The two modules allowed to read raw environment variables, plus config
    // files that run outside Next and cannot import a server-only module.
    name: "llm-arena/env-owners",
    files: [
      "infrastructure/env.ts",
      "infrastructure/public-env.ts",
      "*.config.ts",
      "*.config.mjs",
    ],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
]);

export default eslintConfig;
