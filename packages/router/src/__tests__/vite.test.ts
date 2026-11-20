// @vitest-environment node

import type { Plugin, ResolvedConfig } from 'vite'
import { EventEmitter } from 'node:events'
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
  closeBundle: () => void
} {
  return plugin as unknown as {
    configResolved: (config: ResolvedConfig) => void
    buildStart: (this: { addWatchFile: (id: string) => void }) => void
    resolveId: (id: string) => string | null
    load: (id: string) => string | null
    watchChange: (id: string) => void
    configureServer: (server: unknown) => void
    closeBundle: () => void
  }
}

function createDevServer() {
  return {
    watcher: Object.assign(new EventEmitter(), { add: vi.fn() }),
    moduleGraph: {
      getModulesByFile: () => new Set([{ id: 'virtual' }]),
      invalidateModule: vi.fn(),
    },
    ws: { send: vi.fn() },
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
  vi.useRealTimers()
  vi.unstubAllEnvs()
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

  it.each([
    { pages: [{}] },
    { pages: [{ path: 123 }] },
    { subPackages: [{ pages: [] }] },
    { subPackages: [{ root: 'sub', pages: 'invalid' }] },
    { subPackages: [{ root: 'sub', pages: [{}] }] },
    { subpackages: [{ root: 'sub', pages: [null] }] },
  ])('validates all route fields with type generation disabled: %j', (value) => {
    const root = createProject()
    writePages(join(root, 'pages.json'), value)
    const plugin = viteRouterInfo({ dts: false, failOnError: true })

    expect(() => declare(plugin, root)).toThrow()
    expect(pluginHooks(plugin).load('\0virtual:uni-pages')).not.toContain('"path"')
  })

  it('normalizes missing subpackage pages while retaining extension fields', () => {
    const root = createProject()
    writePages(join(root, 'pages.json'), {
      pages: [{ path: 'pages/home/index', meta: { title: 'home' } }],
      subPackages: [{ root: 'sub', independent: true, meta: { title: 'package' } }],
    })
    const plugin = viteRouterInfo({ dts: false, failOnError: true })

    declare(plugin, root)

    const source = pluginHooks(plugin).load('\0virtual:uni-pages')
    expect(source).toContain('"pages": []')
    expect(source).toContain('"independent": true')
    expect(source).toContain('"title": "package"')
    expect(source).toContain('"title": "home"')
  })

  it.each([
    ['h5', 'pages/web/index', 'pages/weixin/index'],
    ['mp-weixin', 'pages/weixin/index', 'pages/web/index'],
  ])('uses the %s conditional pages for virtual modules and declarations', (platform, expected, excluded) => {
    vi.stubEnv('UNI_PLATFORM', platform)
    const root = createProject()
    writeFileSync(join(root, 'pages.json'), `{
      "pages": [
        // #ifdef H5
        { "path": "pages/web/index" },
        // #endif
        // #ifdef MP-WEIXIN
        { "path": "pages/weixin/index" },
        // #endif
      ]
    }`)
    const plugin = viteRouterInfo({ failOnError: true })

    declare(plugin, root)

    expect(pluginHooks(plugin).load('\0virtual:uni-pages')).toContain(expected)
    expect(pluginHooks(plugin).load('\0virtual:uni-pages')).not.toContain(excluded)
    const declaration = readFileSync(join(root, 'typed-router.d.ts'), 'utf8')
    expect(declaration).toContain(expected)
    expect(declaration).not.toContain(excluded)
  })

  it('accepts an explicit platform override and custom conditional defines', () => {
    vi.stubEnv('UNI_PLATFORM', 'mp-weixin')
    const root = createProject()
    writeFileSync(join(root, 'pages.json'), `{
      "pages": [
        // #ifdef H5 && FEATURE_ROUTER
        { "path": "pages/web/index" },
        // #endif
        // #ifdef MP-WEIXIN
        { "path": "pages/weixin/index" },
        // #endif
      ]
    }`)
    const plugin = viteRouterInfo({ platform: 'h5', defines: ['FEATURE_ROUTER'], failOnError: true })

    declare(plugin, root)

    expect(pluginHooks(plugin).load('\0virtual:uni-pages')).toContain('pages/web/index')
    expect(pluginHooks(plugin).load('\0virtual:uni-pages')).not.toContain('pages/weixin/index')
    expect(readFileSync(join(root, 'typed-router.d.ts'), 'utf8')).toContain('pages/web/index')
  })

  it('publishes valid route metadata when declaration writing fails in default mode', () => {
    vi.useFakeTimers()
    const root = createProject()
    const pagesJson = join(root, 'pages.json')
    writePages(pagesJson, { pages: [{ path: 'pages/home/index' }] })
    mkdirSync(join(root, 'types'))
    const plugin = viteRouterInfo({ dts: 'types' })
    const { config, error } = resolvedConfig(root)
    const server = createDevServer()

    pluginHooks(plugin).configResolved(config)
    pluginHooks(plugin).configureServer(server)

    expect(error).toHaveBeenCalledWith(expect.stringContaining('生成路由类型失败'))
    expect(pluginHooks(plugin).load('\0virtual:uni-pages')).toContain('pages/home/index')

    writePages(pagesJson, { pages: [{ path: 'pages/detail/index' }] })
    server.watcher.emit('change', pagesJson)
    vi.advanceTimersByTime(50)

    expect(pluginHooks(plugin).load('\0virtual:uni-pages')).toContain('pages/detail/index')
    expect(server.ws.send).toHaveBeenCalledWith({ type: 'full-reload' })
    pluginHooks(plugin).closeBundle()
  })

  it('fails before publishing route metadata when strict declaration writing fails', () => {
    const root = createProject()
    writePages(join(root, 'pages.json'), { pages: [{ path: 'pages/home/index' }] })
    mkdirSync(join(root, 'types'))
    const plugin = viteRouterInfo({ dts: 'types', failOnError: true })

    expect(() => declare(plugin, root)).toThrow()
    expect(pluginHooks(plugin).load('\0virtual:uni-pages')).not.toContain('pages/home/index')
  })

  it('rejects declaration output pointing to pages.json without changing the source', () => {
    const root = createProject()
    const pagesJson = join(root, 'pages.json')
    writePages(pagesJson, { pages: [{ path: 'pages/home/index' }] })
    const original = readFileSync(pagesJson, 'utf8')
    const plugin = viteRouterInfo({ dts: 'pages.json', failOnError: true })

    expect(() => declare(plugin, root)).toThrow()
    expect(readFileSync(pagesJson, 'utf8')).toBe(original)
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

  it.each(['malformed', 'deleted'])('reports %s pages.json in dev and recovers after it is fixed', (state) => {
    vi.useFakeTimers()
    const root = createProject()
    const pagesJson = join(root, 'pages.json')
    writePages(pagesJson, { pages: [{ path: 'pages/home/index' }] })
    const plugin = viteRouterInfo({ failOnError: true })
    const { config, error } = resolvedConfig(root)
    const server = createDevServer()
    pluginHooks(plugin).configResolved(config)
    pluginHooks(plugin).configureServer(server)

    if (state === 'malformed')
      writeFileSync(pagesJson, '{ invalid')
    else
      rmSync(pagesJson)
    server.watcher.emit(state === 'malformed' ? 'change' : 'unlink', pagesJson)

    expect(() => vi.advanceTimersByTime(50)).not.toThrow()
    expect(error).toHaveBeenCalledWith(expect.stringContaining('读取路由信息失败'))
    expect(server.ws.send).toHaveBeenCalledWith({
      type: 'error',
      err: expect.objectContaining({
        message: expect.stringContaining('读取路由信息失败'),
        id: pagesJson,
        plugin: 'vite-plugin-uni-router-info',
      }),
    })
    expect(readFileSync(join(root, 'typed-router.d.ts'), 'utf8')).toContain('"/pages/home/index"')

    writePages(pagesJson, { pages: [{ path: 'pages/detail/index' }] })
    server.watcher.emit(state === 'malformed' ? 'change' : 'add', pagesJson)
    vi.advanceTimersByTime(50)

    expect(server.ws.send).toHaveBeenCalledWith({ type: 'full-reload' })
    expect(readFileSync(join(root, 'typed-router.d.ts'), 'utf8')).toContain('"/pages/detail/index"')
    expect(pluginHooks(plugin).load('\0virtual:uni-pages')).toContain('pages/detail/index')
    pluginHooks(plugin).closeBundle()
  })

  it('cancels pending reads and removes its watcher listeners when closed', () => {
    vi.useFakeTimers()
    const root = createProject()
    const pagesJson = join(root, 'pages.json')
    writePages(pagesJson, { pages: [{ path: 'pages/home/index' }] })
    const plugin = viteRouterInfo({ failOnError: true })
    const server = createDevServer()
    declare(plugin, root)
    pluginHooks(plugin).configureServer(server)

    writePages(pagesJson, { pages: [{ path: 'pages/detail/index' }] })
    server.watcher.emit('change', pagesJson)
    pluginHooks(plugin).closeBundle()
    vi.advanceTimersByTime(50)

    expect(server.watcher.listenerCount('add')).toBe(0)
    expect(server.watcher.listenerCount('change')).toBe(0)
    expect(server.watcher.listenerCount('unlink')).toBe(0)
    expect(server.ws.send).not.toHaveBeenCalled()
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

  it.each(['pages.json', 'src/pages.json'])('recovers when an initially missing %s is created', (file) => {
    vi.useFakeTimers()
    const root = createProject()
    const plugin = viteRouterInfo()
    const { config, error } = resolvedConfig(root)
    const server = createDevServer()
    pluginHooks(plugin).configResolved(config)
    pluginHooks(plugin).configureServer(server)

    expect(error).toHaveBeenCalledWith(expect.stringContaining('找不到 src/pages.json'))
    expect(server.watcher.add).toHaveBeenCalledWith([join(root, 'src/pages.json'), join(root, 'pages.json')])

    writePages(join(root, file), { pages: [{ path: 'pages/home/index' }] })
    server.watcher.emit('add', join(root, file))
    vi.advanceTimersByTime(50)

    expect(pluginHooks(plugin).load('\0virtual:uni-pages')).toContain('pages/home/index')
    expect(readFileSync(join(root, file === 'src/pages.json' ? 'src/typed-router.d.ts' : 'typed-router.d.ts'), 'utf8'))
      .toContain('"/pages/home/index"')
    expect(server.ws.send).toHaveBeenCalledWith({ type: 'full-reload' })
    pluginHooks(plugin).closeBundle()
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

  it('still fails a synchronous build after pages.json becomes malformed', () => {
    const root = createProject()
    const pagesJson = join(root, 'pages.json')
    writePages(pagesJson, { pages: [{ path: 'pages/home/index' }] })
    const plugin = viteRouterInfo({ failOnError: true })
    declare(plugin, root)
    writeFileSync(pagesJson, '{ invalid')

    expect(() => pluginHooks(plugin).buildStart.call({ addWatchFile: vi.fn() }))
      .toThrow(/无法解析/)
  })
})
