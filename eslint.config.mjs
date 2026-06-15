import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

import noHardcodedColors from "./tools/eslint-rules/no-hardcoded-colors.mjs";

const colorDependencyRule = (paths) => ({
  "no-restricted-imports": [
    "error",
    {
      paths: paths.map((name) => ({
        name,
        message: "Keep theme color dependencies domain-owned and acyclic."
      }))
    }
  ]
});

const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: [".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts"]
  },
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "theme-boundaries": {
        rules: {
          "no-hardcoded-colors": noHardcodedColors
        }
      }
    },
    rules: {
      "theme-boundaries/no-hardcoded-colors": "error"
    }
  },
  {
    files: ["src/theme/colors/route-colors.ts"],
    rules: colorDependencyRule(["./marker-colors"])
  },
  {
    files: ["src/theme/colors/marker-colors.ts"],
    rules: colorDependencyRule(["./route-colors"])
  },
  {
    files: ["src/theme/colors/status-colors.ts", "src/theme/colors/sync-colors.ts"],
    rules: colorDependencyRule([
      "./category-colors",
      "./marker-colors",
      "./route-colors",
      "./trip-state-colors"
    ])
  },
  {
    files: ["src/theme/colors/category-colors.ts"],
    rules: colorDependencyRule(["./marker-colors", "./route-colors", "./status-colors"])
  }
];

export default eslintConfig;
