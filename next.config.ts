import type { NextConfig } from "next"
import path from "path"
import { execSync } from "child_process"

function getCommitHash(short = true) {
  try {
    return execSync(`git rev-parse ${short ? "--short " : ""}HEAD`)
      .toString()
      .trim()
  } catch {
    return short ? "dev" : ""
  }
}

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname)
  },
  env: {
    NEXT_PUBLIC_COMMIT_SHA: getCommitHash(),
    NEXT_PUBLIC_COMMIT_SHA_FULL: getCommitHash(false)
  },
  experimental: {
    serverActions: {
      // Default is 1MB, which rejects movement attachment uploads (up to 30MB).
      // 35mb leaves headroom above the 30MB file cap for multipart overhead.
      bodySizeLimit: "35mb"
    }
  }
}

export default nextConfig
