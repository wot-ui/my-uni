import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const example = resolve(root, 'examples/router-x')
const staging = mkdtempSync(resolve(tmpdir(), 'router-x-pack-'))
const packageRoot = resolve(root, 'packages/router')
execFileSync('pnpm', ['build'], { cwd: packageRoot, stdio: 'inherit' })
execFileSync('pnpm', ['pack', '--pack-destination', staging], { cwd: packageRoot, stdio: 'inherit' })
const version = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8')).version
const tarball = resolve(staging, `wot-ui-router-${version}.tgz`)
const destination = resolve(example, 'node_modules/@wot-ui/router')
rmSync(destination, { recursive: true, force: true })
mkdirSync(destination, { recursive: true })
execFileSync('tar', ['-xzf', tarball, '--strip-components=1', '-C', destination])
const evidence = resolve(example, 'unpackage')
mkdirSync(evidence, { recursive: true })
writeFileSync(resolve(evidence, 'package-source.json'), JSON.stringify({
  baseCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  tarball,
  sha256: createHash('sha256').update(readFileSync(tarball)).digest('hex'),
  note: 'Packed local working tree; not a published version or a source alias.',
}, null, 2))
console.log(`Prepared packed router in ${example}`)
