import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { platform } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'

export interface RouteTypePage {
  path: string
  name?: string
  aliasPath?: string
}

export interface RouteTypePagesConfig {
  pages?: readonly RouteTypePage[]
  subPackages?: readonly {
    root: string
    pages: readonly RouteTypePage[]
  }[]
}

/** uni-app / uni-app x 根目录 pages.json 中与类型生成相关的字段。 */
export interface RouteTypePagesJson {
  pages?: readonly RouteTypePage[]
  subPackages?: readonly {
    root: string
    pages: readonly RouteTypePage[]
  }[]
  /** uni-app 同时接受 subpackages 这种写法。 */
  subpackages?: readonly {
    root: string
    pages: readonly RouteTypePage[]
  }[]
}

export interface RouteTypeOptions {
  /** 开启后仅接受已注册的路径和名称。默认只提供补全。 */
  strict?: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readText(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined
}

function normalizePages(value: unknown, label: string): RouteTypePage[] {
  if (value === undefined)
    return []
  if (!Array.isArray(value))
    throw new Error(`[@wot-ui/router/typed-routes] ${label} 必须是数组。`)
  return value.map((page, index) => {
    if (!isRecord(page))
      throw new Error(`[@wot-ui/router/typed-routes] ${label}[${index}] 必须是对象。`)
    const path = readText(page.path)
    if (!path)
      throw new Error(`[@wot-ui/router/typed-routes] ${label}[${index}] 缺少字符串 path。`)
    return {
      path,
      name: readText(page.name),
      aliasPath: readText(page.aliasPath),
    }
  })
}

function normalizePackages(value: unknown, label: string): RouteTypePagesConfig['subPackages'] {
  if (value === undefined)
    return []
  if (!Array.isArray(value))
    throw new Error(`[@wot-ui/router/typed-routes] ${label} 必须是数组。`)
  return value.map((pkg, index) => {
    if (!isRecord(pkg))
      throw new Error(`[@wot-ui/router/typed-routes] ${label}[${index}] 必须是对象。`)
    const root = readText(pkg.root)
    if (!root)
      throw new Error(`[@wot-ui/router/typed-routes] ${label}[${index}] 缺少字符串 root。`)
    return {
      root,
      pages: normalizePages(pkg.pages, `${label}[${index}].pages`),
    }
  })
}

/** 去除 JSONC 注释，保留字符串内的斜杠。pages.json 允许注释，但 JSON.parse 不接受。 */
function stripJsonComments(text: string): string {
  let result = ''
  let inString = false
  let escaped = false
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    const next = text[index + 1]
    if (inString) {
      result += char
      if (escaped)
        escaped = false
      else if (char === '\\')
        escaped = true
      else if (char === '"')
        inString = false
      continue
    }
    if (char === '"') {
      inString = true
      result += char
      continue
    }
    if (char === '/' && next === '/') {
      while (index < text.length && text[index] !== '\n')
        index++
      result += '\n'
      continue
    }
    if (char === '/' && next === '*') {
      index += 2
      while (index < text.length && !(text[index] === '*' && text[index + 1] === '/'))
        index++
      index++
      continue
    }
    result += char
  }
  return result
}

/** 去除对象和数组末尾的尾随逗号，字符串内的逗号保持不变。 */
function stripTrailingCommas(text: string): string {
  let result = ''
  let inString = false
  let escaped = false
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (inString) {
      result += char
      if (escaped)
        escaped = false
      else if (char === '\\')
        escaped = true
      else if (char === '"')
        inString = false
      continue
    }
    if (char === '"') {
      inString = true
      result += char
      continue
    }
    if (char === ',') {
      let lookahead = index + 1
      while (lookahead < text.length && /\s/.test(text[lookahead]))
        lookahead++
      if (text[lookahead] === '}' || text[lookahead] === ']')
        continue
    }
    result += char
  }
  return result
}

function parsePagesJsonText(text: string, file: string): unknown {
  const source = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text
  try {
    return JSON.parse(source)
  }
  catch (error) {
    try {
      return JSON.parse(stripTrailingCommas(stripJsonComments(source)))
    }
    catch {
      throw new Error(`[@wot-ui/router/typed-routes] 无法解析 ${file}：${(error as Error).message}`)
    }
  }
}

/** 解析 JSON/JSONC：支持 BOM、注释和尾随逗号。 */
export function parseJsonText(text: string, file = 'JSON'): unknown {
  return parsePagesJsonText(text, file)
}

/** 把 pages.json 的内容转换为生成器输入；支持主包、分包、name 与 aliasPath。 */
export function pagesJsonToPagesConfig(value: unknown, file = 'pages.json'): RouteTypePagesConfig {
  if (!isRecord(value))
    throw new Error(`[@wot-ui/router/typed-routes] ${file} 顶层必须是对象。`)
  return {
    pages: normalizePages(value.pages, `${file}.pages`),
    subPackages: normalizePackages(value.subPackages ?? value.subpackages, `${file}.subPackages`),
  }
}

/**
 * 直接读取 uni-app / uni-app x 的 pages.json，不依赖页面扫描插件。
 *
 * pages.json 的页面项可额外提供 name / aliasPath 供类型生成使用；运行时
 * createRouter({ routes }) 仍以自身路由表为准。
 */
export function readPagesJson(file: string): RouteTypePagesConfig {
  return pagesJsonToPagesConfig(parsePagesJsonText(readFileSync(file, 'utf8'), file), file)
}

/** 在项目根目录下查找 pages.json，优先 src/pages.json，其次根目录 pages.json。 */
export function resolvePagesJsonFile(cwd: string, pages?: string): string {
  if (pages)
    return resolve(cwd, pages)
  for (const candidate of ['src/pages.json', 'pages.json']) {
    const file = resolve(cwd, candidate)
    if (existsSync(file))
      return file
  }
  throw new Error(`在 ${cwd} 下找不到 src/pages.json 或 pages.json，请用 pages 选项指定。`)
}

/** 未显式指定时，src/pages.json 输出到 src/typed-router.d.ts，根 pages.json 输出到根目录。 */
export function resolveRouteTypesDts(cwd: string, pagesJson: string, dts?: string): string {
  if (dts)
    return resolve(cwd, dts)
  const pagesDirectory = dirname(pagesJson)
  const srcDirectory = resolve(cwd, 'src')
  if (pagesDirectory === srcDirectory || pagesJson.startsWith(`${srcDirectory}/`))
    return resolve(srcDirectory, 'typed-router.d.ts')
  return resolve(cwd, 'typed-router.d.ts')
}

/** 从与运行时一致的页面配置生成模块增强，不依赖特定页面扫描插件。 */
export function generateRouteTypes(config: RouteTypePagesConfig, options: RouteTypeOptions = {}): string {
  const paths = new Set<string>()
  const names = new Set<string>()
  const namePaths = new Map<string, Set<string>>()
  const addPage = (page: RouteTypePage, root = '') => {
    const path = `/${[root, page.path].map(part => part.replace(/^\/+|\/+$/g, '')).filter(Boolean).join('/')}`
    paths.add(path)
    // aliasPath 在运行时直接匹配，不拼接分包 root。
    if (page.aliasPath)
      paths.add(page.aliasPath)
    if (page.name) {
      names.add(page.name)
      const registered = namePaths.get(page.name) ?? new Set<string>()
      registered.add(path)
      namePaths.set(page.name, registered)
    }
  }
  config.pages?.forEach(page => addPage(page))
  config.subPackages?.forEach(pkg => pkg.pages.forEach(page => addPage(page, pkg.root)))

  for (const [name, registered] of namePaths) {
    if (registered.size > 1)
      console.warn(`[@wot-ui/router/typed-routes] 路由名称 ${JSON.stringify(name)} 对应多个路径：${[...registered].sort().join(', ')}。名称应全局唯一；运行时按名称导航只会匹配第一个页面。`)
  }

  const union = (values: Set<string>) => values.size
    ? `\n${[...values].sort().map(value => `      | ${JSON.stringify(value)}`).join('\n')}`
    : ' never'
  return `/* eslint-disable */
// Generated by @wot-ui/router/typed-routes. Do not edit.
// prettier-ignore
import '@wot-ui/router'

// prettier-ignore
declare module '@wot-ui/router' {
  interface RouterTypeConfig {
    path:${union(paths)}
    name:${union(names)}
${options.strict ? '    strict: true\n' : ''}  }
}
`
}

// uni-pages 使用同步钩子；仅在 Windows 的权限/占用错误后短暂等待，最多等待 150ms。
function renameWithRetry(source: string, target: string): void {
  for (let attempt = 0; ; attempt++) {
    try {
      renameSync(source, target)
      return
    }
    catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (platform() !== 'win32' || !['EPERM', 'EACCES'].includes(code ?? '') || attempt >= 4)
        throw error
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10 * 2 ** attempt)
    }
  }
}

/** 同步原子替换，适用于 uni-pages 的同步生命周期钩子；内容不变时不触发文件更新。 */
export function writeRouteTypes(config: RouteTypePagesConfig, options: RouteTypeOptions & { dts: string }): void {
  const content = generateRouteTypes(config, options)
  try {
    if (readFileSync(options.dts, 'utf8') === content)
      return
  }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
      throw error
  }
  const directory = dirname(options.dts)
  mkdirSync(directory, { recursive: true })
  const temporary = join(directory, `.${basename(options.dts)}.${randomUUID()}.tmp`)
  try {
    writeFileSync(temporary, content, 'utf8')
    renameWithRetry(temporary, options.dts)
  }
  catch (error) {
    try {
      rmSync(temporary, { force: true })
    }
    catch {
      // 清理失败时仍保留原始写入或替换错误。
    }
    throw error
  }
}

export interface WriteRouteTypesFromPagesJsonOptions extends RouteTypeOptions {
  /** uni-app / uni-app x 项目根目录的 pages.json。 */
  pagesJson: string
  /** 生成的声明文件路径。 */
  dts: string
}

/** 读取 pages.json 并生成声明，适用于没有 uni-pages 插件的 uni-app x 项目。 */
export function writeRouteTypesFromPagesJson(options: WriteRouteTypesFromPagesJsonOptions): void {
  writeRouteTypes(readPagesJson(options.pagesJson), {
    dts: options.dts,
    strict: options.strict,
  })
}
