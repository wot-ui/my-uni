import { beforeEach, describe, expect, it } from 'vitest'
import { getUrlParams, isEmptyObject, normalizeUrl, stringifyQuery } from '../utils'

describe('getUrlParams - URL 参数解析', () => {
  beforeEach(() => {
    (globalThis as any).resetMocks()
  })

  it('应该正确解析 URL 参数', () => {
    const result = getUrlParams('/pages/index?id=1&name=test')
    expect(result).toEqual({ id: '1', name: 'test' })
  })

  it('应该处理没有参数的 URL', () => {
    const result = getUrlParams('/pages/index')
    expect(result).toEqual({})
  })

  it('应该处理空参数值', () => {
    const result = getUrlParams('/pages/index?id=&name=test')
    expect(result).toEqual({ id: '', name: 'test' })
  })

  it('应该解码 URL 编码的值', () => {
    const result = getUrlParams('/pages/index?name=%E6%B5%8B%E8%AF%95')
    expect(result).toEqual({ name: '测试' })
  })

  it('应该处理键中的特殊字符', () => {
    const result = getUrlParams('/pages/index?user_id=123')
    expect(result).toEqual({ user_id: '123' })
  })
})

describe('stringifyQuery - 查询参数序列化', () => {
  it('应该正确序列化查询对象', () => {
    const result = stringifyQuery('/pages/index', { id: '1', name: 'test' })
    expect(result).toBe('/pages/index?id=1&name=test')
  })

  it('应该处理空的查询对象', () => {
    const result = stringifyQuery('/pages/index', {})
    expect(result).toBe('/pages/index')
  })

  it('应该处理 null 和 undefined 值', () => {
    const result = stringifyQuery('/pages/index', { id: '1', name: null, age: undefined, num: 2 })
    expect(result).toBe('/pages/index?id=1&num=2')
  })

  it('应该追加到现有的查询字符串', () => {
    const result = stringifyQuery('/pages/index?existing=1', { new: '2' })
    expect(result).toBe('/pages/index?existing=1&new=2')
  })

  it('应该编码特殊字符', () => {
    const result = stringifyQuery('/pages/index', { name: '测试', id: '1' })
    expect(result).toBe('/pages/index?name=%E6%B5%8B%E8%AF%95&id=1')
  })

  it('应该处理数值类型', () => {
    const result = stringifyQuery('/pages/index', { id: 123, count: 0 })
    expect(result).toBe('/pages/index?id=123&count=0')
  })
})

describe('normalizeUrl - URL 标准化', () => {
  it('应该标准化多个斜杠的 URL', () => {
    expect(normalizeUrl('//pages//index')).toBe('/pages/index')
  })

  it('应该处理单个斜杠', () => {
    expect(normalizeUrl('/pages/index')).toBe('/pages/index')
  })

  it('应该处理尾部斜杠', () => {
    expect(normalizeUrl('/pages/index/')).toBe('/pages/index/')
  })

  it('应该处理空字符串', () => {
    expect(normalizeUrl('')).toBe('')
  })
})

describe('isEmptyObject - 空对象判断', () => {
  it('应该对空对象返回 true', () => {
    expect(isEmptyObject({})).toBe(true)
  })

  it('应该对 null 返回 true', () => {
    expect(isEmptyObject(null)).toBe(true)
  })

  it('应该对 undefined 返回 true', () => {
    expect(isEmptyObject(undefined)).toBe(true)
  })

  it('应该对非空对象返回 false', () => {
    expect(isEmptyObject({ id: 1 })).toBe(false)
  })
})
