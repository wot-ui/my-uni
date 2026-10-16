import { mkdtempSync, readFileSync, rmSync, statSync, utimesSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { generateRouteTypes, writeRouteTypes } from '../typed-routes'

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
    }
    finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
