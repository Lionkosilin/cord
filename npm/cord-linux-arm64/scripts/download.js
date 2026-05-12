#!/usr/bin/env node
// Download platform-specific cord binary from GitHub Releases.
const fs = require('node:fs')
const path = require('node:path')
const https = require('node:https')

const pkgRoot = path.resolve(__dirname, '..')
const pkg = require(path.join(pkgRoot, 'package.json'))
const platform = pkg.name.replace('@fosenai/cord-', '')
const ext = platform.startsWith('win') ? '.exe' : ''
const outFile = path.join(pkgRoot, 'cord' + ext)
const url = `https://github.com/fosenai/cord/releases/download/v${pkg.version}/cord-${platform}${ext}`

console.log(`[cord/${platform}] downloading ${url}`)

function download(url, dest, redirects = 5) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'cord-npm-installer' } }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
        if (redirects <= 0) return reject(new Error('too many redirects'))
        const next = res.headers.location
        res.destroy()
        return download(next, dest, redirects - 1).then(resolve, reject)
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`))
      }
      const out = fs.createWriteStream(dest, { mode: 0o755 })
      res.pipe(out)
      out.on('finish', () => out.close(resolve))
      out.on('error', reject)
    }).on('error', reject)
  })
}

;(async () => {
  try {
    await download(url, outFile)
    fs.chmodSync(outFile, 0o755)
    console.log(`[cord/${platform}] installed at ${outFile}`)
  } catch (e) {
    console.error(`[cord/${platform}] download failed: ${e.message}`)
    console.error(`[cord/${platform}] manually:  curl -L -o cord ${url} && chmod +x cord`)
    process.exitCode = 1
  }
})()
