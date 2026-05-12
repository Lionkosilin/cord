#!/usr/bin/env node
// postinstall: verify the platform binary made it through optionalDependencies.
const { existsSync } = require('node:fs')
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
  console.warn(`[cord] no prebuilt binary for ${key}; please file an issue at`)
  console.warn(`[cord]   https://github.com/fosenai/cord/issues`)
  process.exit(0)
}

try {
  const root = path.dirname(require.resolve(`${pkg}/package.json`))
  const ext = process.platform === 'win32' ? '.exe' : ''
  const bin = path.join(root, `cord${ext}`)
  if (existsSync(bin)) {
    console.log(`[cord] ok: ${pkg}`)
  } else {
    console.warn(`[cord] ${pkg} installed but binary missing at ${bin}`)
  }
} catch {
  console.warn(`[cord] platform package ${pkg} not installed (optional deps may be filtered)`)
  console.warn(`[cord] try: npm install ${pkg}`)
}
