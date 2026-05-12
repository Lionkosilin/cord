#!/usr/bin/env node
// Cord CLI shim — resolves the platform-specific native binary and execs it.
const { spawnSync } = require('node:child_process')
const path = require('node:path')

const map = {
  'darwin-arm64': '@fosenai/cord-darwin-arm64',
  'darwin-x64':   '@fosenai/cord-darwin-x64',
  'linux-x64':    '@fosenai/cord-linux-x64',
  'linux-arm64':  '@fosenai/cord-linux-arm64',
  'win32-x64':    '@fosenai/cord-windows-x64',
}

const key = `${process.platform}-${process.arch}`
const pkg = map[key]
if (!pkg) {
  console.error(`cord: no prebuilt binary for ${key}`)
  console.error(`cord: supported platforms: ${Object.keys(map).join(', ')}`)
  process.exit(1)
}

let binPath
try {
  const root = path.dirname(require.resolve(`${pkg}/package.json`))
  const ext = process.platform === 'win32' ? '.exe' : ''
  binPath = path.join(root, `cord${ext}`)
} catch {
  console.error(`cord: platform package ${pkg} not installed`)
  console.error(`cord: try: npm install ${pkg}`)
  process.exit(1)
}

const result = spawnSync(binPath, process.argv.slice(2), { stdio: 'inherit' })
process.exit(result.status ?? 1)
