// TypeScript 7 (the native, Go-based compiler) no longer ships the classic
// JS compiler API that typescript-eslint needs for type-aware linting
// (its peer range is "typescript >=4.8.4 <6.1.0").
//
// pnpm always satisfies a peer dependency from the root project when it can,
// so with `typescript@7` in devDependencies every @typescript-eslint package
// would receive TS 7 and crash at import time. This hook rewrites those
// packages to carry their own classic TypeScript 5.x as a regular dependency
// instead of a peer, keeping `pnpm lint` working while `tsc`/`pnpm typecheck`
// run on the native TypeScript 7 compiler.
//
// Remove this file (and the pin below) once typescript-eslint supports the
// TypeScript 7 API.
const LINTER_TYPESCRIPT_VERSION = "^5.9.3"

function readPackage(pkg) {
  const isTypescriptEslint =
    pkg.name === "typescript-eslint" || (pkg.name || "").startsWith("@typescript-eslint/")

  if (isTypescriptEslint && pkg.peerDependencies && pkg.peerDependencies.typescript) {
    delete pkg.peerDependencies.typescript
    if (pkg.peerDependenciesMeta) {
      delete pkg.peerDependenciesMeta.typescript
    }
    pkg.dependencies = {
      ...pkg.dependencies,
      typescript: LINTER_TYPESCRIPT_VERSION
    }
  }

  return pkg
}

module.exports = {
  hooks: {
    readPackage
  }
}
