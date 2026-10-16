import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateRouteTypes } from '@wot-ui/router/typed-routes'
import ts from 'typescript'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const options = {
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  strict: true,
  skipLibCheck: false,
  noEmit: true,
  types: [],
}
const expected = { path: ['/pages/home', '/shop/detail'], name: ['home', 'detail'] }

for (const fixture of readdirSync(resolve(root, 'type-tests')).filter(file => /\.[cm]?ts$/.test(file))) {
  const fileName = resolve(root, 'type-tests', fixture)
  const compilerOptions = /\.[cm]ts$/.test(fixture)
    ? { ...options, module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext }
    : options
  let source = readFileSync(fileName, 'utf8')
  if (fixture === 'generated.ts') {
    source += generateRouteTypes({
      pages: [{ path: 'pages/home', name: 'home' }, { path: 'pages/unnamed' }],
      subPackages: [{ root: 'shop', pages: [{ path: 'detail', name: 'detail' }] }],
    }, { strict: true })
  }
  const service = ts.createLanguageService({
    ...ts.sys,
    getCompilationSettings: () => compilerOptions,
    getScriptFileNames: () => [fileName],
    getScriptVersion: () => '0',
    getScriptSnapshot: (file) => {
      const text = file === fileName ? source : ts.sys.readFile(file)
      return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text)
    },
    getCurrentDirectory: () => root,
    getDefaultLibFileName: ts.getDefaultLibFilePath,
  })
  try {
    const diagnostics = ts.getPreEmitDiagnostics(service.getProgram())
    assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: file => file,
      getCurrentDirectory: () => root,
      getNewLine: () => '\n',
    }))
    let offset = 0
    let checks = 0
    for (const line of source.split('\n')) {
      const marker = line.match(/\/\/ @complete:(path|name)/)
      if (marker) {
        const position = offset + line.lastIndexOf('\'', marker.index)
        const completions = service.getCompletionsAtPosition(fileName, position, {})
        const names = completions?.entries.map(entry => entry.name) ?? []
        for (const value of expected[marker[1]])
          assert.ok(names.includes(value), `${fixture}: missing ${value} in completions for ${line}`)
        checks++
      }
      offset += line.length + 1
    }
    console.log(`${fixture}: type checks passed, ${checks} completion checks passed`)
  }
  finally {
    service.dispose()
  }
}
