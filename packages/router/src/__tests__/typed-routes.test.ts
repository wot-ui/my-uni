// @vitest-environment node

import { mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs'
import { platform, tmpdir } from 'node:os'
import { join } from 'node:path'
import prettier from 'prettier'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateRouteTypes, writeRouteTypes } from '../typed-routes'

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
