import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs'
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
import { generateRouteTypes } from '@wot-ui/router/typed-routes'
assert.equal(createRouter({ routes: [] }).currentRoute.value.path, '/')
assert.equal(typeof createRouterX({ routes: [] }).dispose, 'function')
assert.equal(typeof generateRouteTypes({}), 'string')
`)
execFileSync(process.execPath, [esmConsumer], { cwd: staging, stdio: 'pipe' })

for (const subpath of ['', '/x', '/typed-routes']) {
  const key = subpath ? `.${subpath}` : '.'
  const exports = manifest.exports[key]
  const esmFile = resolve(destination, exports.import.default)
  const cjsFile = resolve(destination, exports.require.default)
  assert.equal(realpathSync(require.resolve(`@wot-ui/router${subpath}`)), realpathSync(cjsFile))
  const esm = await import(pathToFileURL(esmFile).href)
  const cjs = require(`@wot-ui/router${subpath}`)
  assert.deepEqual(Object.keys(esm).sort(), Object.keys(cjs).sort())
  if (subpath === '/typed-routes') {
    assert.match(esm.generateRouteTypes({ pages: [{ path: 'pages/home' }] }), /pages\/home/)
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

const checked = new Set()
function checkRuntime(file, isX) {
  const identity = `${file}:${isX}`
  if (checked.has(identity))
    return
  checked.add(identity)
  const text = readFileSync(file, 'utf8')
  assert.doesNotMatch(text, /node:|typed-routes/)
  if (isX)
    assert.doesNotMatch(text, /\.mixin\(|\$mpType|\$page/)
  for (const match of text.matchAll(/(?:from|require\()\s*["'](\.[^"']+)["']/g))
    checkRuntime(resolve(dirname(file), match[1]), isX)
}
for (const name of ['index.mjs', 'index.cjs', 'x.mjs', 'x.cjs'])
  checkRuntime(resolve(destination, 'dist', name), name.startsWith('x.'))
console.log('Packed ESM/CJS entries and runtime dependency boundaries passed.')
console.log(`Consumer: ${staging}`)
