import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { platform } from 'node:os'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import process from 'node:process'

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
      result += ' '
      while (index < text.length && !(text[index] === '*' && text[index + 1] === '/')) {
        if (text[index] === '\n' || text[index] === '\r')
          result += text[index]
        index++
      }
      if (index >= text.length)
        throw new Error('块注释未闭合。')
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
  let previous = ''
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
      previous = char
      result += char
      continue
    }
    if (char === ',') {
      let lookahead = index + 1
      while (lookahead < text.length && /\s/.test(text[lookahead]))
        lookahead++
      if ((text[lookahead] === '}' || text[lookahead] === ']') && previous && !['[', '{', ',', ':'].includes(previous))
        continue
    }
    result += char
    if (!/\s/.test(char))
      previous = char
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

export interface PagesJsonPreprocessOptions {
  /** 当前 uni 编译目标；默认读取 UNI_PLATFORM。 */
  platform?: string
  /** 额外启用的条件编译标识。 */
  defines?: readonly string[]
}

function matchesCondition(expression: string, defines: Set<string>): boolean {
  const tokens = expression.match(/[A-Z_][\w-]*|\|\||&&|[!()]/gi) ?? []
  if (!tokens.length || tokens.join('') !== expression.replace(/\s/g, ''))
    throw new Error(`不支持的条件编译表达式：${expression}`)
  let position = 0
  function operand(): boolean {
    const token = tokens[position++]
    if (token === '!')
      return !operand()
    if (token === '(') {
      const value = disjunction()
      if (tokens[position++] !== ')')
        throw new Error(`条件编译表达式缺少右括号：${expression}`)
      return value
    }
    if (!token || !/^[A-Z_][\w-]*$/i.test(token))
      throw new Error(`无效的条件编译表达式：${expression}`)
    return defines.has(token.replace(/-/g, '_').toUpperCase())
  }
  function conjunction(): boolean {
    let value = operand()
    while (tokens[position] === '&&') {
      position++
      const right = operand()
      value = value && right
    }
    return value
  }
  function disjunction(): boolean {
    let value = conjunction()
    while (tokens[position] === '||') {
      position++
      const right = conjunction()
      value = value || right
    }
    return value
  }
  const value = disjunction()
  if (position !== tokens.length)
    throw new Error(`无效的条件编译表达式：${expression}`)
  return value
}

/** 仅过滤 pages.json 的条件区块，不修改源文件。虚拟模块与声明须复用同一结果。 */
export function preprocessPagesJson(source: string, options: PagesJsonPreprocessOptions = {}): string {
  if (!/^\s*(?:\/\/|\/\*)\s*#(?:if|ifdef|ifndef|elif|else|endif)\b/m.test(source))
    return source
  const target = (options.platform ?? process.env.UNI_PLATFORM)?.toLowerCase()
  if (!target && !options.defines?.length)
    throw new Error('pages.json 包含条件编译指令，请设置 UNI_PLATFORM 或指定 platform / --platform。')
  const normalize = (value: string) => value.replace(/-/g, '_').toUpperCase()
  const defines = new Set((options.defines ?? []).map(normalize))
  if (target)
    defines.add(normalize(target))
  if (target === 'h5' || target === 'web') {
    defines.add('H5')
    defines.add('WEB')
  }
  if (target?.startsWith('mp-'))
    defines.add('MP')
  if (target?.startsWith('quickapp-webview'))
    defines.add('QUICKAPP_WEBVIEW')
  const isX = process.env.UNI_APP_X === 'true'
  if (target === 'app' || target?.startsWith('app-')) {
    defines.add('APP')
    if (!isX && target !== 'app-harmony')
      defines.add('APP_PLUS')
    else if (isX)
      defines.delete('APP_PLUS')
  }
  if (process.env.UNI_CUSTOM_CONTEXT) {
    const context: unknown = JSON.parse(process.env.UNI_CUSTOM_CONTEXT)
    if (isRecord(context)) {
      for (const [key, enabled] of Object.entries(context)) {
        if (enabled)
          defines.add(normalize(key))
        else
          defines.delete(normalize(key))
      }
    }
  }
  defines.add('VUE3')
  if (isX) {
    defines.add('UNI_APP_X')
    if (process.env.UNI_APP_X_DOM2 === 'true')
      defines.add('VUE3_VAPOR')
    else
      defines.delete('VUE3_VAPOR')
    if (target === 'app-harmony' && process.env.UNI_APP_X_DOM2 === 'true' && process.env.UNI_APP_X_HARMONY_SCRIPT_ENGINE === 'jsvm')
      defines.add('APP_HARMONY_JSVM')
    else
      defines.delete('APP_HARMONY_JSVM')
  }
  if (target === 'app' || target?.startsWith('app-')) {
    defines.add(isX ? 'APP_UVUE' : 'APP_VUE')
    const utsPlatform = process.env.UNI_UTS_PLATFORM
    if (isX && (utsPlatform === 'app-android' || utsPlatform === 'app-ios'))
      defines.add(normalize(utsPlatform))
  }
  const active = [{ enabled: true, condition: true, alternate: false }]
  const result = source.split(/\r?\n/).map((line, index) => {
    const trimmed = line.trim()
    const directiveText = trimmed.startsWith('//')
      ? trimmed.slice(2).trim()
      : trimmed.startsWith('/*') && trimmed.endsWith('*/') ? trimmed.slice(2, -2).trim() : ''
    const directive = directiveText.match(/^#(if|ifdef|ifndef|elif|else|endif)\b(.*)$/)
    if (!directive)
      return active[active.length - 1].enabled ? line : ''
    const command = directive[1]
    const expression = directive[2].trim()
    if (!['ifdef', 'ifndef', 'else', 'endif'].includes(command))
      throw new Error(`pages.json 第 ${index + 1} 行不支持 #${command}，请使用 #ifdef / #ifndef / #else / #endif。`)
    if (command === 'endif') {
      if (active.length === 1 || expression)
        throw new Error(`pages.json 第 ${index + 1} 行的 #endif 不匹配。`)
      active.pop()
    }
    else if (command === 'else') {
      const current = active[active.length - 1]
      if (active.length === 1 || expression || current.alternate)
        throw new Error(`pages.json 第 ${index + 1} 行的 #else 不匹配。`)
      current.enabled = active[active.length - 2].enabled && !current.condition
      current.alternate = true
    }
    else {
      const matches = matchesCondition(expression, defines)
      const condition = command === 'ifdef' ? matches : !matches
      active.push({ enabled: active[active.length - 1].enabled && condition, condition, alternate: false })
    }
    return ''
  })
  if (active.length !== 1)
    throw new Error('pages.json 条件编译区块缺少 #endif。')
  return result.join('\n')
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
export function readPagesJson(file: string, options: PagesJsonPreprocessOptions = {}): RouteTypePagesConfig {
  return pagesJsonToPagesConfig(parsePagesJsonText(preprocessPagesJson(readFileSync(file, 'utf8'), options), file), file)
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
  const srcDirectory = resolve(cwd, 'src')
  const fromSrc = relative(srcDirectory, resolve(pagesJson))
  const insideSrc = fromSrc !== '..' && !fromSrc.startsWith(`..${sep}`) && !isAbsolute(fromSrc)
  const output = dts ? resolve(cwd, dts) : resolve(insideSrc ? srcDirectory : cwd, 'typed-router.d.ts')
  assertDistinctPaths(pagesJson, output)
  return output
}

function assertDistinctPaths(source: string, destination: string): void {
  const input = resolve(source)
  const output = resolve(destination)
  const samePath = platform() === 'win32' ? input.toLowerCase() === output.toLowerCase() : input === output
  let sameFile = false
  if (!samePath && existsSync(input) && existsSync(output)) {
    const inputStat = statSync(input)
    const outputStat = statSync(output)
    sameFile = inputStat.dev === outputStat.dev && inputStat.ino === outputStat.ino
  }
  if (samePath || sameFile)
    throw new Error('声明输出 dts 不能与输入 pages.json 指向同一文件。')
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

export interface WriteRouteTypesFromPagesJsonOptions extends RouteTypeOptions, PagesJsonPreprocessOptions {
  /** uni-app / uni-app x 项目根目录的 pages.json。 */
  pagesJson: string
  /** 生成的声明文件路径。 */
  dts: string
}

/** 读取 pages.json 并生成声明，适用于没有 uni-pages 插件的 uni-app x 项目。 */
export function writeRouteTypesFromPagesJson(options: WriteRouteTypesFromPagesJsonOptions): void {
  assertDistinctPaths(options.pagesJson, options.dts)
  writeRouteTypes(readPagesJson(options.pagesJson, options), {
    dts: options.dts,
    strict: options.strict,
  })
}
