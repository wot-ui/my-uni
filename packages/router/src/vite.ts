import type { ModuleNode, Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pagesJsonToPagesConfig, parseJsonText, resolvePagesJsonFile, resolveRouteTypesDts, writeRouteTypes } from './typed-routes'

export interface ViteRouterInfoOptions {
  /** 项目根目录，默认使用 Vite 的 root。 */
  cwd?: string
  /** pages.json 路径，相对 cwd；默认查找 src/pages.json 或 pages.json。 */
  pages?: string
  /** 声明输出路径，相对 cwd；默认 src/typed-router.d.ts 或根目录 typed-router.d.ts。传 false 可关闭。 */
  dts?: string | false
  /** 生成严格模式声明。 */
  strict?: boolean
  /** 是否提供 virtual:uni-pages 与 virtual:wot-pages，默认 true。 */
  virtual?: boolean
  /** pages.json 读取或类型生成失败时中断构建，默认只记录错误。 */
  failOnError?: boolean
}

const EMPTY_MODULE = `export const pages = []
export const subPackages = []
export default { pages, subPackages }
`

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readArray(value: unknown, label: string): Record<string, unknown>[] {
  if (value === undefined)
    return []
  if (!Array.isArray(value))
    throw new Error(`[@wot-ui/router] ${label} 必须是数组。`)
  return value.map((item, index) => {
    if (!isRecord(item))
      throw new Error(`[@wot-ui/router] ${label}[${index}] 必须是对象。`)
    return item
  })
}

function renderVirtualModule(value: Record<string, unknown>, file: string): string {
  const pages = readArray(value.pages, `${file}.pages`)
  const subPackages = readArray(value.subPackages ?? value.subpackages, `${file}.subPackages`)
  return `export const pages = ${JSON.stringify(pages, null, 2)}
export const subPackages = ${JSON.stringify(subPackages, null, 2)}
export default { pages, subPackages }
`
}

/**
 * 读取 uni-app / uni-app x 的 pages.json，提供路由虚拟模块并生成类型声明。
 *
 * 插件不扫描页面、不修改 pages.json，也不依赖页面宏或 pages.config；
 * pages.json 是路由信息的唯一来源。
 */
export function viteRouterInfo(options: ViteRouterInfoOptions = {}): Plugin {
  const virtualIds = ['virtual:uni-pages', 'virtual:wot-pages']
  const resolvedVirtualIds = virtualIds.map(id => `\0${id}`)
  let config: ResolvedConfig | undefined
  let devServer: ViteDevServer | undefined
  let pagesJson = ''
  let dts = ''
  let moduleSource = EMPTY_MODULE
  let timer: ReturnType<typeof setTimeout> | undefined

  const fail = (message: string, error?: unknown): void => {
    const detail = error instanceof Error ? `：${error.message}` : ''
    const text = `[@wot-ui/router] ${message}${detail}`
    if (options.failOnError)
      throw error instanceof Error ? error : new Error(text)
    config?.logger.error(text)
  }

  const read = (): boolean => {
    if (!pagesJson)
      return false
    try {
      const value = parseJsonText(readFileSync(pagesJson, 'utf8'), pagesJson)
      if (!isRecord(value))
        throw new Error(`${pagesJson} 顶层必须是对象。`)
      const nextSource = renderVirtualModule(value, pagesJson)
      if (dts)
        writeRouteTypes(pagesJsonToPagesConfig(value, pagesJson), { dts, strict: options.strict })
      const changed = nextSource !== moduleSource
      moduleSource = nextSource
      return changed
    }
    catch (error) {
      fail(`读取路由信息失败（${pagesJson}）`, error)
      return false
    }
  }

  const reload = (): void => {
    if (!devServer)
      return
    const seen = new Set<ModuleNode>()
    for (const id of resolvedVirtualIds) {
      devServer.moduleGraph.getModulesByFile(id)?.forEach((module) => {
        devServer!.moduleGraph.invalidateModule(module, seen)
      })
    }
    devServer.ws.send({ type: 'full-reload' })
  }

  const schedule = (): void => {
    if (timer)
      clearTimeout(timer)
    timer = setTimeout(() => {
      timer = undefined
      if (read())
        reload()
    }, 50)
  }

  return {
    name: 'vite-plugin-uni-router-info',
    enforce: 'pre',
    configResolved(resolved) {
      config = resolved
      try {
        const cwd = resolve(options.cwd ?? resolved.root)
        pagesJson = resolvePagesJsonFile(cwd, options.pages)
        dts = options.dts === false ? '' : resolveRouteTypesDts(cwd, pagesJson, options.dts)
      }
      catch (error) {
        fail('初始化路由信息失败', error)
        return
      }
      read()
    },
    buildStart() {
      if (!pagesJson)
        return
      this.addWatchFile(pagesJson)
      read()
    },
    resolveId(id) {
      if (options.virtual === false)
        return null
      return virtualIds.includes(id) ? `\0${id}` : null
    },
    load(id) {
      if (options.virtual === false)
        return null
      return resolvedVirtualIds.includes(id) ? moduleSource : null
    },
    watchChange(id) {
      if (pagesJson && resolve(id.split('?')[0]) === pagesJson)
        schedule()
    },
    configureServer(server) {
      if (!pagesJson)
        return
      devServer = server
      server.watcher.add(pagesJson)
      const onChange = (file: string) => {
        if (resolve(file) === pagesJson)
          schedule()
      }
      server.watcher.on('add', onChange)
      server.watcher.on('change', onChange)
      server.watcher.on('unlink', onChange)
    },
  }
}
