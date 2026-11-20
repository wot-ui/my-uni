// @vitest-environment node

import { mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs'
import { platform, tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import prettier from 'prettier'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  generateRouteTypes,
  pagesJsonToPagesConfig,
  parseJsonText,
  preprocessPagesJson,
  readPagesJson,
  resolveRouteTypesDts,
  writeRouteTypes,
  writeRouteTypesFromPagesJson,
} from '../typed-routes'

vi.mock('node:fs', async (importOriginal) => {
  const fs = await importOriginal<typeof import('node:fs')>()
  const mocked = {
    ...fs,
    writeFileSync: vi.fn(fs.writeFileSync),
    renameSync: vi.fn(fs.renameSync),
    rmSync: vi.fn(fs.rmSync),
  }
  return { ...mocked, default: mocked }
})

vi.mock('node:os', async (importOriginal) => {
  const os = await importOriginal<typeof import('node:os')>()
  const mocked = { ...os, platform: vi.fn(os.platform) }
  return { ...mocked, default: mocked }
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.resetAllMocks()
})

describe('路由类型生成', () => {
  it('包含主包、分包、无名称页面及别名，并对重复值去重', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = generateRouteTypes({
      pages: [
        { path: '/pages/home', name: 'home', aliasPath: '/home' },
        { path: 'pages/unnamed' },
        { path: 'pages/home', name: 'home' },
      ],
      subPackages: [{ root: '/shop/', pages: [{ path: '/detail', name: 'detail' }] }],
    })
    expect(result).toContain('path:\n      | "/home"\n      | "/pages/home"\n      | "/pages/unnamed"\n      | "/shop/detail"')
    expect(result).toContain('name:\n      | "detail"\n      | "home"')
    expect(result).not.toContain('strict: true')
    expect(warn).not.toHaveBeenCalled()
  })

  it('同名但不同路径时提示主包和分包的冲突，重复记录不增加警告', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = generateRouteTypes({
      pages: [{ path: '/home', name: 'home' }, { path: 'home/', name: 'home' }],
      subPackages: [{ root: 'shop', pages: [{ path: 'detail', name: 'home' }, { path: 'other', name: 'home' }] }],
    })
    expect(result).toContain('name:\n      | "home"')
    expect(warn).toHaveBeenCalledOnce()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"home" 对应多个路径：/home, /shop/detail, /shop/other'))
  })

  it('去除 root 和 path 首尾斜杠后再拼接，不产生空路径段', () => {
    const result = generateRouteTypes({
      subPackages: [
        { root: '/', pages: [{ path: '/detail' }] },
        { root: '///', pages: [{ path: '///detail///' }] },
        { root: '/shop/', pages: [{ path: '/detail/' }] },
      ],
    })
    expect(result).toContain('path:\n      | "/detail"\n      | "/shop/detail"')
  })

  it('支持空路由、严格模式和需要转义的名称', () => {
    expect(generateRouteTypes({}, { strict: true })).toContain('path: never\n    name: never\n    strict: true')
    const name = 'a"b\nc'
    expect(generateRouteTypes({ pages: [{ path: 'pages/home', name }] })).toContain(`name:\n      | ${JSON.stringify(name)}`)
  })

  it('多行声明经过 Prettier 后保持不变，避免重复生成引起格式抖动', async () => {
    for (const config of [{}, { pages: [{ path: 'pages/home', name: 'home' }, { path: 'pages/other', name: 'other' }] }]) {
      const result = generateRouteTypes(config, { strict: true })
      for (const singleQuote of [true, false]) {
        const formatted = await prettier.format(result, { parser: 'typescript', singleQuote, semi: true, printWidth: 40 })
        expect(formatted).toBe(result)
      }
    }
  })

  it.each(['EPERM', 'EACCES'])('在 Windows 遇到 %s 短暂占用时等待后重试，再原子替换完整文件', async (code) => {
    const fs = await vi.importActual<typeof import('node:fs')>('node:fs')
    const directory = mkdtempSync(join(tmpdir(), 'router-types-'))
    const dts = join(directory, 'router.d.ts')
    try {
      writeRouteTypes({}, { dts })
      const previous = readFileSync(dts, 'utf8')
      vi.mocked(platform).mockReturnValue('win32')
      const wait = vi.spyOn(Atomics, 'wait').mockReturnValue('timed-out')
      vi.mocked(renameSync).mockClear()
      const fail = () => {
        expect(readFileSync(dts, 'utf8')).toBe(previous)
        throw Object.assign(new Error('文件被占用'), { code })
      }
      vi.mocked(renameSync).mockImplementationOnce(fail).mockImplementationOnce(fail)
      const config = { pages: [{ path: 'pages/new' }] }
      writeRouteTypes(config, { dts })
      expect(renameSync).toHaveBeenCalledTimes(3)
      expect(wait.mock.calls.map(call => call[3])).toEqual([10, 20])
      expect(readFileSync(dts, 'utf8')).toBe(generateRouteTypes(config))
      expect(readdirSync(directory)).toEqual(['router.d.ts'])
    }
    finally {
      fs.rmSync(directory, { recursive: true, force: true })
    }
  })

  it.each([
    { system: 'win32', code: 'EPERM', attempts: 5 },
    { system: 'win32', code: 'EACCES', attempts: 5 },
    { system: 'win32', code: 'ENOENT', attempts: 1 },
    { system: 'linux', code: 'EPERM', attempts: 1 },
  ] as const)('$system 的 $code 持续失败时仅尝试 $attempts 次，保留旧文件并清理临时文件', async ({ system, code, attempts }) => {
    const fs = await vi.importActual<typeof import('node:fs')>('node:fs')
    const directory = mkdtempSync(join(tmpdir(), 'router-types-'))
    const dts = join(directory, 'router.d.ts')
    try {
      writeRouteTypes({}, { dts })
      const previous = readFileSync(dts, 'utf8')
      const error = Object.assign(new Error('替换失败'), { code })
      vi.mocked(platform).mockReturnValue(system)
      const wait = vi.spyOn(Atomics, 'wait').mockReturnValue('timed-out')
      vi.mocked(renameSync).mockClear().mockImplementation(() => {
        throw error
      })
      expect(() => writeRouteTypes({ pages: [{ path: 'pages/new' }] }, { dts })).toThrow(error)
      expect(renameSync).toHaveBeenCalledTimes(attempts)
      expect(wait.mock.calls.map(call => call[3])).toEqual(attempts === 5 ? [10, 20, 40, 80] : [])
      expect(readFileSync(dts, 'utf8')).toBe(previous)
      expect(readdirSync(directory)).toEqual(['router.d.ts'])
    }
    finally {
      fs.rmSync(directory, { recursive: true, force: true })
    }
  })

  it('页面改名或删除后替换声明，内容不变时不重复写入', () => {
    const directory = mkdtempSync(join(tmpdir(), 'router-types-'))
    const dts = join(directory, 'nested/router.d.ts')
    try {
      const config = { pages: [{ path: 'pages/old', name: 'old' }] }
      writeRouteTypes(config, { dts })
      const timestamp = new Date('2000-01-01T00:00:00Z')
      utimesSync(dts, timestamp, timestamp)
      writeRouteTypes(config, { dts })
      expect(statSync(dts).mtimeMs).toBe(timestamp.getTime())

      writeRouteTypes({ pages: [{ path: 'pages/new', name: 'new' }] }, { dts, strict: true })
      const result = readFileSync(dts, 'utf8')
      expect(result).toContain('"/pages/new"')
      expect(result).not.toContain('"old"')
      expect(result).toContain('strict: true')

      writeRouteTypes({}, { dts })
      expect(readFileSync(dts, 'utf8')).not.toContain('/pages/new')
      expect(readdirSync(join(directory, 'nested'))).toEqual(['router.d.ts'])
    }
    finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('替换前旧声明保持完整，临时文件已包含完整的新声明', async () => {
    const fs = await vi.importActual<typeof import('node:fs')>('node:fs')
    const directory = mkdtempSync(join(tmpdir(), 'router-types-'))
    const dts = join(directory, 'router.d.ts')
    const config = { pages: [{ path: 'pages/new', name: 'new' }] }
    try {
      writeRouteTypes({}, { dts })
      const previous = readFileSync(dts, 'utf8')
      vi.mocked(renameSync).mockImplementationOnce((source, target) => {
        expect(readFileSync(dts, 'utf8')).toBe(previous)
        expect(readFileSync(source, 'utf8')).toBe(generateRouteTypes(config))
        fs.renameSync(source, target)
      })
      writeRouteTypes(config, { dts })
      expect(readFileSync(dts, 'utf8')).toBe(generateRouteTypes(config))
      expect(readdirSync(directory)).toEqual(['router.d.ts'])
    }
    finally {
      fs.rmSync(directory, { recursive: true, force: true })
    }
  })

  it.each(['write', 'rename', 'cleanup'])('%s 失败时保留旧声明并抛出原始异常', async (stage) => {
    const fs = await vi.importActual<typeof import('node:fs')>('node:fs')
    const directory = mkdtempSync(join(tmpdir(), 'router-types-'))
    const dts = join(directory, 'router.d.ts')
    const error = new Error('生成声明失败')
    try {
      writeRouteTypes({}, { dts })
      const previous = readFileSync(dts, 'utf8')
      if (stage === 'write') {
        vi.mocked(writeFileSync).mockImplementationOnce((file) => {
          fs.writeFileSync(file, 'partial')
          throw error
        })
      }
      else {
        vi.mocked(renameSync).mockImplementationOnce(() => {
          throw error
        })
      }
      if (stage === 'cleanup') {
        vi.mocked(rmSync).mockImplementationOnce(() => {
          throw new Error('清理失败')
        })
      }
      expect(() => writeRouteTypes({ pages: [{ path: 'pages/new' }] }, { dts })).toThrow(error)
      expect(readFileSync(dts, 'utf8')).toBe(previous)
      if (stage !== 'cleanup')
        expect(readdirSync(directory)).toEqual(['router.d.ts'])
    }
    finally {
      fs.rmSync(directory, { recursive: true, force: true })
    }
  })
})

describe('pages.json 读取', () => {
  it.each([
    '{"pages":[],"flag":tr/**/ue}',
    '{"pages":[]} /* unfinished',
    '{"pages":[,]}',
    '{"pages":[],}',
  ])('保留 JSONC token 边界并校验尾逗号 %s', (source) => {
    if (source === '{"pages":[],}')
      expect(parseJsonText(source)).toEqual({ pages: [] })
    else
      expect(() => parseJsonText(source)).toThrow('无法解析')
  })

  it('允许闭合块注释位于 token 之间', () => {
    expect(parseJsonText('{"pages"/* comment */:/* comment */[]}')).toEqual({ pages: [] })
  })

  it.each(['h5', 'mp-weixin', 'app-android'])('按 %s 过滤嵌套条件区块并支持平台别名', (target) => {
    const source = `{"pages":[
      {"path":"common"},
      // #ifdef H5 || MP-WEIXIN
      {"path":"web-or-wechat"},
      // #ifdef WEB
      {"path":"web"},
      // #endif
      // #endif
      // #ifndef H5 || MP
      {"path":"app"},
      // #endif
    ]}`
    const value = pagesJsonToPagesConfig(parseJsonText(preprocessPagesJson(source, { platform: target })))
    expect(value.pages?.map(page => page.path)).toEqual(target === 'h5'
      ? ['common', 'web-or-wechat', 'web']
      : target === 'mp-weixin' ? ['common', 'web-or-wechat'] : ['common', 'app'])
  })

  it('支持显式标识与逻辑分组，不执行表达式中的代码', () => {
    const source = '// #ifdef (FEATURE && !MP) || H5\n{"pages":[]}\n// #endif'
    expect(parseJsonText(preprocessPagesJson(source, { platform: 'app', defines: ['FEATURE'] }))).toEqual({ pages: [] })
    expect(() => preprocessPagesJson('// #ifdef process.exit()\n// #endif', { platform: 'h5' })).toThrow('不支持')
  })

  it.each(['// #', '/* #'])('支持 %s 条件注释的 else 分支且不泄漏嵌套的禁用内容', (prefix) => {
    const directive = (value: string) => `${prefix}${value}${prefix.startsWith('/*') ? ' */' : ''}`
    const source = `{"pages":[
      ${directive('ifdef H5')}
      {"path":"web"},
      ${directive('else')}
      {"path":"native"},
      ${directive('ifdef MP')}
      {"path":"mini"},
      ${directive('else')}
      {"path":"app"},
      ${directive('endif')}
      ${directive('endif')}
    ]}`
    for (const [platform, expected] of [['h5', ['web']], ['mp-weixin', ['native', 'mini']], ['app', ['native', 'app']]] as const) {
      const result = pagesJsonToPagesConfig(parseJsonText(preprocessPagesJson(source, { platform })))
      expect(result.pages?.map(page => page.path)).toEqual(expected)
    }
  })

  it.each(['app', 'app-plus'])('条件编译读取 %s 平台、自定义上下文与 x 标识', (target) => {
    vi.stubEnv('UNI_PLATFORM', target)
    vi.stubEnv('UNI_APP_X', 'true')
    vi.stubEnv('UNI_UTS_PLATFORM', 'app-ios')
    vi.stubEnv('UNI_CUSTOM_CONTEXT', '{"CUSTOM":true,"VUE3":false,"UNI_APP_X":false,"APP_UVUE":false,"APP_IOS":false}')
    try {
      const result = preprocessPagesJson(`// #ifdef APP && APP-IOS && UNI_APP_X && CUSTOM && VUE3 && APP-UVUE && !APP-PLUS
{"pages":[]}
// #endif`)
      expect(parseJsonText(result)).toEqual({ pages: [] })
    }
    finally {
      vi.unstubAllEnvs()
    }
  })

  it('普通 App 的 JSON 条件上下文包含 APP_VUE', () => {
    vi.stubEnv('UNI_APP_X', '')
    vi.stubEnv('UNI_CUSTOM_CONTEXT', '')
    try {
      expect(parseJsonText(preprocessPagesJson('// #ifdef APP-VUE\n{}\n// #endif', { platform: 'app' }))).toEqual({})
    }
    finally {
      vi.unstubAllEnvs()
    }
  })

  it.each(['true', 'false'])('对齐 5.36 SDK 的 Vapor 与鸿蒙 JSVM 固有上下文（DOM2=%s）', (enabled) => {
    vi.stubEnv('UNI_APP_X', 'true')
    vi.stubEnv('UNI_APP_X_DOM2', enabled)
    vi.stubEnv('UNI_APP_X_HARMONY_SCRIPT_ENGINE', 'jsvm')
    vi.stubEnv('UNI_CUSTOM_CONTEXT', '{"VUE3_VAPOR":true,"APP_HARMONY_JSVM":true}')
    try {
      const source = `{"pages":[
        {"path":"common"},
        // #ifdef VUE3-VAPOR && APP-HARMONY-JSVM
        {"path":"vapor-jsvm"},
        // #endif
      ]}`
      const config = pagesJsonToPagesConfig(parseJsonText(preprocessPagesJson(source, { platform: 'app-harmony' })))
      expect(config.pages?.map(page => page.path)).toEqual(enabled === 'true' ? ['common', 'vapor-jsvm'] : ['common'])
    }
    finally {
      vi.unstubAllEnvs()
    }
  })

  it('缺少平台或条件区块不闭合时明确报错', () => {
    vi.stubEnv('UNI_PLATFORM', '')
    try {
      expect(() => preprocessPagesJson('// #ifdef H5\n{}\n// #endif')).toThrow('UNI_PLATFORM')
      expect(() => preprocessPagesJson('// #ifdef H5\n{}', { platform: 'h5' })).toThrow('缺少 #endif')
      expect(() => preprocessPagesJson('// #endif', { platform: 'h5' })).toThrow('不匹配')
      expect(() => preprocessPagesJson('// #if uniVersion > 4\n{}\n// #endif', { platform: 'h5' })).toThrow('不支持 #if')
    }
    finally {
      vi.unstubAllEnvs()
    }
  })

  it('嵌套 src 配置的默认声明仍位于 src，且不误判相似目录', () => {
    const cwd = resolve('router-types-project')
    expect(resolveRouteTypesDts(cwd, resolve(cwd, 'src/config/pages.json'))).toBe(resolve(cwd, 'src/typed-router.d.ts'))
    expect(resolveRouteTypesDts(cwd, resolve(cwd, 'src-other/pages.json'))).toBe(resolve(cwd, 'typed-router.d.ts'))
  })

  it('拒绝声明与 pages.json 指向同一路径，保留配置原文', async () => {
    const fs = await vi.importActual<typeof import('node:fs')>('node:fs')
    const directory = mkdtempSync(join(tmpdir(), 'router-types-'))
    const pagesJson = join(directory, 'pages.json')
    const source = '{"pages":[{"path":"home"}]}'
    try {
      fs.writeFileSync(pagesJson, source)
      expect(() => resolveRouteTypesDts(directory, pagesJson, './pages.json')).toThrow('同一文件')
      expect(() => writeRouteTypesFromPagesJson({ pagesJson, dts: pagesJson })).toThrow('同一文件')
      const alias = join(directory, 'alias.json')
      fs.linkSync(pagesJson, alias)
      expect(() => writeRouteTypesFromPagesJson({ pagesJson, dts: alias })).toThrow('同一文件')
      expect(readFileSync(pagesJson, 'utf8')).toBe(source)
    }
    finally {
      fs.rmSync(directory, { recursive: true, force: true })
    }
  })

  it('读取主包、分包、name 与 aliasPath，并兼容 subpackages 写法', () => {
    const config = pagesJsonToPagesConfig({
      pages: [{ path: 'pages/home/index', name: 'home', aliasPath: '/home', style: { navigationBarTitleText: '首页' } }],
      subpackages: [{ root: 'sub', pages: [{ path: 'target', name: 'target' }] }],
    }, 'pages.json')
    expect(config.pages).toEqual([{ path: 'pages/home/index', name: 'home', aliasPath: '/home' }])
    expect(config.subPackages).toEqual([{ root: 'sub', pages: [{ path: 'target', name: 'target' }] }])
    expect(generateRouteTypes(config)).toContain('path:\n      | "/home"\n      | "/pages/home/index"\n      | "/sub/target"')
  })

  it('支持 BOM、注释和尾随逗号，且不改动字符串内的斜杠与逗号', async () => {
    const fs = await vi.importActual<typeof import('node:fs')>('node:fs')
    const directory = mkdtempSync(join(tmpdir(), 'router-types-'))
    const file = join(directory, 'pages.json')
    try {
      fs.writeFileSync(file, `\uFEFF{
  // 主包
  "pages": [
    { "path": "pages/home/index", "name": "a//b,/*c*/" }, // 逗号后仍有注释
  ],
  /* 分包 */
  "subPackages": [
    { "root": "sub", "pages": [{ "path": "target", "name": "target" },], },
  ],
}`)
      const config = readPagesJson(file)
      expect(config.pages?.[0].name).toBe('a//b,/*c*/')
      expect(config.subPackages?.[0].pages[0].path).toBe('target')
    }
    finally {
      fs.rmSync(directory, { recursive: true, force: true })
    }
  })

  it('缺少 path 或顶层不是对象时给出文件与下标', () => {
    expect(() => pagesJsonToPagesConfig({ pages: [{ name: 'home' }] }, '/tmp/pages.json'))
      .toThrow('/tmp/pages.json.pages[0] 缺少字符串 path')
    expect(() => pagesJsonToPagesConfig({ pages: 'pages/home' }, '/tmp/pages.json'))
      .toThrow('/tmp/pages.json.pages 必须是数组')
    expect(() => pagesJsonToPagesConfig([], '/tmp/pages.json'))
      .toThrow('/tmp/pages.json 顶层必须是对象')
  })

  it('无法解析时保留原始解析错误和文件路径', async () => {
    const fs = await vi.importActual<typeof import('node:fs')>('node:fs')
    const directory = mkdtempSync(join(tmpdir(), 'router-types-'))
    const file = join(directory, 'pages.json')
    try {
      fs.writeFileSync(file, '{ "pages": [ }')
      expect(() => readPagesJson(file)).toThrow(`无法解析 ${file}`)
    }
    finally {
      fs.rmSync(directory, { recursive: true, force: true })
    }
  })

  it('直接从 pages.json 生成声明', async () => {
    const fs = await vi.importActual<typeof import('node:fs')>('node:fs')
    const directory = mkdtempSync(join(tmpdir(), 'router-types-'))
    const pagesJson = join(directory, 'pages.json')
    const dts = join(directory, 'typed-router.d.ts')
    try {
      fs.writeFileSync(pagesJson, JSON.stringify({
        pages: [{ path: 'pages/home/index', name: 'home' }],
        subPackages: [{ root: 'sub', pages: [{ path: 'target', name: 'target' }] }],
      }))
      writeRouteTypesFromPagesJson({ pagesJson, dts, strict: true })
      const result = readFileSync(dts, 'utf8')
      expect(result).toContain('| "/pages/home/index"')
      expect(result).toContain('| "/sub/target"')
      expect(result).toContain('| "home"')
      expect(result).toContain('strict: true')
    }
    finally {
      fs.rmSync(directory, { recursive: true, force: true })
    }
  })
})
