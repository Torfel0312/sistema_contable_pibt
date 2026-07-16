// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextJest = require("next/jest")

const createJestConfig = nextJest({
  dir: "./"
})

const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1"
  },
  testMatch: ["**/__tests__/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).[jt]s?(x)"],
  // e2e/ is a separate Playwright suite (pnpm test:e2e) — its *.spec.ts files
  // import @playwright/test, which doesn't run under jest/jsdom.
  testPathIgnorePatterns: ["/node_modules/", "/.next/", "/.worktrees/", "/.claude/", "/e2e/"],
  modulePathIgnorePatterns: ["<rootDir>/.claude/"],
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": ["babel-jest", { presets: ["next/babel"] }]
  }
}

module.exports = createJestConfig(customJestConfig)
