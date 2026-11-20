import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, symlinkSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const staging = mkdtempSync(resolve(tmpdir(), 'router-package-test-'))
const pnpmCommand = process.env.npm_execpath ? process.execPath : 'pnpm'
const pnpmArgs = process.env.npm_execpath ? [process.env.npm_execpath] : []
execFileSync(pnpmCommand, [...pnpmArgs, 'pack', '--pack-destination', staging], { cwd: root, stdio: 'pipe' })
const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const destination = resolve(staging, 'node_modules/@wot-ui/router')
mkdirSync(destination, { recursive: true })
execFileSync('tar', ['-xzf', resolve(staging, `wot-ui-router-${manifest.version}.tgz`), '--strip-components=1', '-C', destination])
// Only the Vue peer is supplied by the test environment; router comes from the tarball.
symlinkSync(realpathSync(resolve(root, 'node_modules/vue')), resolve(staging, 'node_modules/vue'), 'junction')
const require = createRequire(resolve(staging, 'consumer.cjs'))
const esmConsumer = resolve(staging, 'consumer.mjs')
writeFileSync(esmConsumer, `
import assert from 'node:assert/strict'
import { createRouter } from '@wot-ui/router'
import { createRouter as createRouterX } from '@wot-ui/router/x'
import { viteRouterInfo } from '@wot-ui/router/vite'
import { generateRouteTypes, readPagesJson } from '@wot-ui/router/typed-routes'
assert.equal(createRouter({ routes: [] }).currentRoute.value.path, '/')
assert.equal(typeof createRouterX({ routes: [] }).dispose, 'function')
assert.equal(typeof viteRouterInfo, 'function')
assert.equal(typeof generateRouteTypes({}), 'string')
assert.equal(typeof readPagesJson, 'function')
`)
execFileSync(process.execPath, [esmConsumer], { cwd: staging, stdio: 'pipe' })

assert.equal(manifest.bin?.['wot-router-types'], './bin/wot-router-types.mjs')
const cliProject = resolve(staging, 'typed-routes-cli')
mkdirSync(cliProject, { recursive: true })
writeFileSync(resolve(cliProject, 'pages.json'), JSON.stringify({
  pages: [{ path: 'pages/home/index', name: 'home' }],
  subPackages: [{ root: 'sub', pages: [{ path: 'target', name: 'target' }] }],
}))
execFileSync(process.execPath, [
  resolve(destination, 'bin/wot-router-types.mjs'),
  '--cwd',
  cliProject,
  '--pages',
  'pages.json',
  '--dts',
  'typed-router.d.ts',
  '--strict',
], { cwd: staging, stdio: 'pipe' })
const cliDts = readFileSync(resolve(cliProject, 'typed-router.d.ts'), 'utf8')
assert.match(cliDts, /"\/pages\/home\/index"/)
assert.match(cliDts, /"\/sub\/target"/)
assert.match(cliDts, /"home"/)
assert.match(cliDts, /"target"/)
assert.match(cliDts, /strict: true/)

const cliEntry = resolve(destination, 'bin/wot-router-types.mjs')
const cliPages = resolve(cliProject, 'pages.json')
const originalPages = readFileSync(cliPages, 'utf8')
assert.throws(() => execFileSync(process.execPath, [cliEntry, '--cwd', cliProject, '--dts', './pages.json'], { stdio: 'pipe' }))
assert.equal(readFileSync(cliPages, 'utf8'), originalPages)

writeFileSync(cliPages, `{"pages":[
  {"path":"common"},
  // #ifdef MP-WEIXIN
  {"path":"wechat"},
  // #endif
  // #ifdef H5
  {"path":"web"},
  // #endif
]}`)
execFileSync(process.execPath, [cliEntry, '--cwd', cliProject, '--platform', 'h5'], { stdio: 'pipe' })
const platformDts = readFileSync(resolve(cliProject, 'typed-router.d.ts'), 'utf8')
assert.match(platformDts, /"\/web"/)
assert.doesNotMatch(platformDts, /wechat/)

writeFileSync(cliPages, originalPages)
const watcherPreload = resolve(staging, 'watch-delay-preload.mjs')
writeFileSync(watcherPreload, `
import fs from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'
const originalWatch = fs.watch
fs.watch = (...args) => {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250)
  return originalWatch(...args)
}
syncBuiltinESMExports()
`)
const watcher = spawn(process.execPath, ['--import', pathToFileURL(watcherPreload).href, cliEntry, '--cwd', cliProject, '--watch'], { stdio: ['ignore', 'pipe', 'pipe'] })
const watcherExit = new Promise(resolveExit => watcher.once('exit', resolveExit))
let watcherOutput = ''
watcher.stdout.on('data', chunk => watcherOutput += chunk)
watcher.stderr.on('data', chunk => watcherOutput += chunk)
async function waitFor(predicate) {
  const deadline = Date.now() + 10000
  while (!predicate()) {
    assert.equal(watcher.exitCode, null, `CLI watcher exited: ${watcherOutput}`)
    assert.ok(Date.now() < deadline, `CLI watcher timed out: ${watcherOutput}`)
    await new Promise(resolveWait => setTimeout(resolveWait, 25))
  }
}
try {
  await waitFor(() => watcherOutput.includes('正在监听'))
  for (const [index, atomic] of [true, true, false].entries()) {
    const path = `watch-${index}`
    const value = JSON.stringify({ pages: [{ path }] })
    if (atomic) {
      const temporary = resolve(cliProject, 'pages.tmp')
      writeFileSync(temporary, value)
      renameSync(temporary, cliPages)
    }
    else {
      writeFileSync(cliPages, value)
    }
    await waitFor(() => readFileSync(resolve(cliProject, 'typed-router.d.ts'), 'utf8').includes(`"/${path}"`))
  }
}
finally {
  watcher.kill()
  await watcherExit
}

for (const subpath of ['', '/x', '/typed-routes', '/vite']) {
  const key = subpath ? `.${subpath}` : '.'
  const exports = manifest.exports[key]
  const esmFile = resolve(destination, exports.import.default)
  const cjsFile = resolve(destination, exports.require.default)
  assert.equal(realpathSync(require.resolve(`@wot-ui/router${subpath}`)), realpathSync(cjsFile))
  const esm = await import(pathToFileURL(esmFile).href)
  const cjs = require(`@wot-ui/router${subpath}`)
  assert.deepEqual(
    Object.keys(esm).sort(),
    Object.keys(cjs).filter(key => key !== '__toESM').sort(),
  )
  if (subpath === '/typed-routes') {
    assert.match(esm.generateRouteTypes({ pages: [{ path: 'pages/home' }] }), /pages\/home/)
  }
  else if (subpath === '/vite') {
    assert.equal(typeof esm.viteRouterInfo, 'function')
    assert.equal(typeof cjs.viteRouterInfo, 'function')
    assert.equal(esm.viteRouterInfo({ pages: 'pages.json', dts: 'typed-router.d.ts', cwd: cliProject }).name, 'vite-plugin-uni-router-info')
  }
  else {
    for (const entry of [esm, cjs]) {
      const router = entry.createRouter({ routes: [] })
      assert.equal(router.currentRoute.value.path, '/')
      assert.equal(typeof router.push, 'function')
      if (subpath === '/x') {
        assert.equal(typeof router.syncRoute, 'function')
        router.dispose()
      }
    }
  }
}

const clientEntry = resolve(destination, manifest.exports['./client'].types)
const clientTypes = readFileSync(clientEntry, 'utf8')
assert.match(clientTypes, /declare module 'virtual:uni-pages'/)
assert.match(clientTypes, /declare module 'virtual:wot-pages'/)
assert.doesNotMatch(clientTypes, /definePage/)
assert.throws(() => require.resolve('@wot-ui/router/pages'))
for (const file of ['client.d.ts', 'dist/vite.mjs', 'dist/vite.cjs', 'dist/vite.d.mts', 'dist/vite.d.cts'])
  assert.ok(readFileSync(resolve(destination, file), 'utf8').length > 0, `${file} missing from tarball`)

const checked = new Set()
function checkRuntime(file, isX) {
  const identity = `${file}:${isX}`
  if (checked.has(identity))
    return
  checked.add(identity)
  const text = readFileSync(file, 'utf8')
  assert.doesNotMatch(text, /node:|typed-routes/, `${file} must stay runtime-safe`)
  if (isX)
    assert.doesNotMatch(text, /\.mixin\(|\$mpType|\$page/)
  for (const match of text.matchAll(/(?:from|require\()\s*["'](\.[^"']+)["']/g))
    checkRuntime(resolve(dirname(file), match[1]), isX)
}
for (const name of ['index.mjs', 'index.cjs', 'x.mjs', 'x.cjs'])
  checkRuntime(resolve(destination, 'dist', name), name.startsWith('x.'))
console.log('Packed ESM/CJS entries and runtime dependency boundaries passed.')
console.log(`Consumer: ${staging}`)
