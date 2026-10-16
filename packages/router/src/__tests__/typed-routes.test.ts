// @vitest-environment node

import { mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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

afterEach(() => vi.resetAllMocks())

describe('路由类型生成', () => {
  it('包含主包、分包、无名称页面及别名，并对重复值去重', () => {
    const result = generateRouteTypes({
      pages: [
        { path: '/pages/home', name: 'home', aliasPath: '/home' },
        { path: 'pages/unnamed' },
        { path: 'pages/home', name: 'home' },
      ],
      subPackages: [{ root: '/shop/', pages: [{ path: '/detail', name: 'detail' }] }],
    })
    expect(result).toContain('path: "/home" | "/pages/home" | "/pages/unnamed" | "/shop/detail"')
    expect(result).toContain('name: "detail" | "home"')
    expect(result).not.toContain('strict: true')
  })

  it('支持空路由、严格模式和需要转义的名称', () => {
    expect(generateRouteTypes({}, { strict: true })).toContain('path: never\n    name: never\n    strict: true')
    const name = 'a"b\nc'
    expect(generateRouteTypes({ pages: [{ path: 'pages/home', name }] })).toContain(`name: ${JSON.stringify(name)}`)
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
