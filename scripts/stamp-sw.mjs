/**
 * Replaces the __BUILD__ placeholder in the service worker with a per-build
 * stamp, so every deploy lands in a fresh cache and the activate handler
 * cleans out the previous one. Without this an installed app can serve stale
 * assets from a cache whose name never changed.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const path = new URL('../public/sw.js', import.meta.url)
const stamp =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ??
  process.env.GITHUB_SHA?.slice(0, 8) ??
  String(Date.now())

const source = readFileSync(path, 'utf8')
const next = source.replace(/memey-shell-[A-Za-z0-9_]+/, `memey-shell-${stamp}`)
writeFileSync(path, next)
console.log(`service worker cache stamped: memey-shell-${stamp}`)
