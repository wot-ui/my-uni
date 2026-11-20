// @vitest-environment node

import type { Plugin, ResolvedConfig } from 'vite'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { viteRouterInfo } from '../vite'

const directories: string[] = []

function createProject(): string {
  const directory = mkdtempSync(join(tmpdir(), 'uni-router-info-'))
  directories.push(directory)
  return directory
}

function resolvedConfig(root: string): { config: ResolvedConfig, error: ReturnType<typeof vi.fn> } {
  const error = vi.fn()
  return {
    config: { root, logger: { error } } as unknown as ResolvedConfig,
    error,
  }
}

function pluginHooks(plugin: Plugin): {
  configResolved: (config: ResolvedConfig) => void
  buildStart: (this: { addWatchFile: (id: string) => void }) => void
  resolveId: (id: string) => string | null
  load: (id: string) => string | null
  watchChange: (id: string) => void
  configureServer: (server: unknown) => void
} {
  return plugin as unknown as {
    configResolved: (config: ResolvedConfig) => void
    buildStart: (this: { addWatchFile: (id: string) => void }) => void
    resolveId: (id: string) => string | null
    load: (id: string) => string | null
    watchChange: (id: string) => void
    configureServer: (server: unknown) => void
  }
}

function writePages(file: string, value: unknown): void {
  mkdirSync(join(file, '..'), { recursive: true })
  writeFileSync(file, JSON.stringify(value, null, 2))
}

function declare(plugin: Plugin, root: string): void {
  pluginHooks(plugin).configResolved(resolvedConfig(root).config)
}

afterEach(() => {
  while (directories.length)
    rmSync(directories.pop()!, { recursive: true, force: true })
})

describe('viteRouterInfo', () => {
  it('uses Vite plugin naming conventions', () => {
    expect(viteRouterInfo().name).toBe('vite-plugin-uni-router-info')
  })

  it('reads the root pages.json and writes a root declaration', () => {
    const root = createProject()
    writePages(join(root, 'pages.json'), {
      pages: [{ path: 'pages/home/index', name: 'home' }],
      subPackages: [{ root: 'sub', pages: [{ path: 'target', aliasPath: '/target' }] }],
    })

    declare(viteRouterInfo(), root)

    const declaration = readFileSync(join(root, 'typed-router.d.ts'), 'utf8')
    expect(declaration).toContain('"/pages/home/index"')
    expect(declaration).toContain('"/sub/target"')
    expect(declaration).toContain('"/target"')
    expect(declaration).toContain('"home"')
  })

  it('prefers src/pages.json and writes the declaration next to it', () => {
    const root = createProject()
    writePages(join(root, 'src/pages.json'), { pages: [{ path: 'pages/home/index' }] })

    declare(viteRouterInfo(), root)

    expect(readFileSync(join(root, 'src/typed-router.d.ts'), 'utf8')).toContain('"/pages/home/index"')
  })

  it('supports custom paths, strict mode and disabling types', () => {
    const root = createProject()
    writePages(join(root, 'config/pages.json'), { pages: [{ path: 'pages/home/index' }] })

    declare(viteRouterInfo({
      pages: 'config/pages.json',
      dts: 'types/router.d.ts',
      strict: true,
    }), root)
    expect(readFileSync(join(root, 'types/router.d.ts'), 'utf8')).toContain('strict: true')

    const withoutTypes = createProject()
    writePages(join(withoutTypes, 'pages.json'), { pages: [{ path: 'pages/home/index' }] })
    declare(viteRouterInfo({ dts: false }), withoutTypes)
    expect(existsSync(join(withoutTypes, 'typed-router.d.ts'))).toBe(false)
  })

  it('serves raw page metadata from both virtual modules', () => {
    const root = createProject()
    writePages(join(root, 'pages.json'), {
      pages: [{
        path: 'pages/home/index',
        name: 'home',
        type: 'home',
        layout: 'tabbar',
        style: { navigationBarTitleText: '首页' },
      }],
      subPackages: [{ root: 'sub', pages: [{ path: 'target', aliasPath: '/target' }] }],
    })
    const plugin = viteRouterInfo()
    declare(plugin, root)

    for (const id of ['virtual:uni-pages', 'virtual:wot-pages']) {
      const resolved = pluginHooks(plugin).resolveId(id)
      expect(resolved).toBe(`\0${id}`)
      const code = pluginHooks(plugin).load(resolved!)
      expect(code).toContain('"type": "home"')
      expect(code).toContain('"layout": "tabbar"')
      expect(code).toContain('"navigationBarTitleText": "首页"')
      expect(code).toContain('"root": "sub"')
      expect(code).toContain('"aliasPath": "/target"')
    }
  })

  it('does not rewrite an unchanged declaration', async () => {
    const root = createProject()
    writePages(join(root, 'pages.json'), { pages: [{ path: 'pages/home/index' }] })
    const plugin = viteRouterInfo()
    declare(plugin, root)
    const before = statSync(join(root, 'typed-router.d.ts')).mtimeMs

    await new Promise(delay => setTimeout(delay, 20))
    pluginHooks(plugin).buildStart.call({ addWatchFile: vi.fn() })

    expect(statSync(join(root, 'typed-router.d.ts')).mtimeMs).toBe(before)
  })

  it('watches pages.json and invalidates virtual modules in dev', async () => {
    const root = createProject()
    const pagesJson = join(root, 'pages.json')
    writePages(pagesJson, { pages: [{ path: 'pages/home/index' }] })
    const plugin = viteRouterInfo()
    declare(plugin, root)

    const handlers = new Map<string, (file: string) => void>()
    const invalidateModule = vi.fn()
    const send = vi.fn()
    pluginHooks(plugin).configureServer({
      watcher: {
        add: vi.fn(),
        on(event: string, callback: (file: string) => void) {
          handlers.set(event, callback)
        },
      },
      moduleGraph: {
        getModulesByFile: () => new Set([{ id: 'virtual' }]),
        invalidateModule,
      },
      ws: { send },
    })

    writePages(pagesJson, { pages: [{ path: 'pages/home/index' }, { path: 'pages/detail/index' }] })
    handlers.get('change')!(pagesJson)
    await new Promise(delay => setTimeout(delay, 120))

    expect(invalidateModule).toHaveBeenCalledTimes(2)
    expect(send).toHaveBeenCalledWith({ type: 'full-reload' })
    expect(readFileSync(join(root, 'typed-router.d.ts'), 'utf8')).toContain('"/pages/detail/index"')
  })

  it('ignores changes to other files', async () => {
    const root = createProject()
    const pagesJson = join(root, 'pages.json')
    writePages(pagesJson, { pages: [{ path: 'pages/home/index' }] })
    const plugin = viteRouterInfo()
    declare(plugin, root)

    writePages(pagesJson, { pages: [{ path: 'pages/detail/index' }] })
    pluginHooks(plugin).watchChange(join(root, 'other.json'))
    await new Promise(delay => setTimeout(delay, 80))

    expect(readFileSync(join(root, 'typed-router.d.ts'), 'utf8')).not.toContain('"/pages/detail/index"')
  })

  it('registers pages.json as a build watch file', () => {
    const root = createProject()
    const pagesJson = join(root, 'pages.json')
    writePages(pagesJson, { pages: [{ path: 'pages/home/index' }] })
    const plugin = viteRouterInfo()
    declare(plugin, root)
    const addWatchFile = vi.fn()

    pluginHooks(plugin).buildStart.call({ addWatchFile })

    expect(addWatchFile).toHaveBeenCalledWith(pagesJson)
  })

  it('keeps working when virtual modules are disabled', () => {
    const root = createProject()
    writePages(join(root, 'pages.json'), { pages: [{ path: 'pages/home/index' }] })
    const plugin = viteRouterInfo({ virtual: false })
    declare(plugin, root)

    expect(pluginHooks(plugin).resolveId('virtual:uni-pages')).toBeNull()
    expect(readFileSync(join(root, 'typed-router.d.ts'), 'utf8')).toContain('"/pages/home/index"')
  })

  it('logs and skips when pages.json is missing', () => {
    const root = createProject()
    const { config, error } = resolvedConfig(root)
    const plugin = viteRouterInfo()

    expect(() => pluginHooks(plugin).configResolved(config)).not.toThrow()
    expect(error).toHaveBeenCalledWith(expect.stringContaining('找不到 src/pages.json'))
    expect(() => pluginHooks(plugin).buildStart.call({ addWatchFile: vi.fn() })).not.toThrow()
  })

  it('recovers after a malformed pages.json is fixed', () => {
    const root = createProject()
    const pagesJson = join(root, 'pages.json')
    writeFileSync(pagesJson, '{ invalid')
    const { config, error } = resolvedConfig(root)
    const plugin = viteRouterInfo()

    pluginHooks(plugin).configResolved(config)
    expect(error).toHaveBeenCalledWith(expect.stringContaining('读取路由信息失败'))

    writePages(pagesJson, { pages: [{ path: 'pages/home/index' }] })
    pluginHooks(plugin).buildStart.call({ addWatchFile: vi.fn() })

    expect(readFileSync(join(root, 'typed-router.d.ts'), 'utf8')).toContain('"/pages/home/index"')
  })

  it('can fail the build when requested', () => {
    const root = createProject()
    const { config } = resolvedConfig(root)

    expect(() => pluginHooks(viteRouterInfo({ failOnError: true })).configResolved(config))
      .toThrow(/找不到 src\/pages.json/)
  })
})
