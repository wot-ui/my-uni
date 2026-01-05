/*
 * @Author: weisheng
 * @Date: 2026-01-05 19:02:58
 * @LastEditTime: 2026-01-05 19:06:25
 * @LastEditors: weisheng
 * @Description:
 * @FilePath: /my-uni/packages/router/src/__tests__/hooks.test.ts
 * 记得注释
 */
import { describe, expect, it, vi } from 'vitest'
import { inject, nextTick, ref } from 'vue'
import { useRoute, useRouter } from '../index'
import { routeKey, routerKey } from '../router'

// Mock vue inject
vi.mock('vue', async () => {
  const actual = await vi.importActual('vue')
  return {
    ...actual,
    inject: vi.fn(),
  }
})

describe('hooks', () => {
  describe('useRouter', () => {
    it('应该返回 router 实例', () => {
      const mockRouter = { push: vi.fn() }
      vi.mocked(inject).mockImplementation((key) => {
        if (key === routerKey)
          return mockRouter
        return undefined
      })

      const router = useRouter()
      expect(router).toBe(mockRouter)
    })

    it('如果在 Vue 上下文外调用应该抛出错误', () => {
      vi.mocked(inject).mockReturnValue(undefined)

      expect(() => useRouter()).toThrowError('useRouter 只可以在 Vue 上下文中使用')
    })
  })

  describe('useRoute', () => {
    it('应该返回响应式的 route 对象', async () => {
      const mockRoute = ref({ path: '/initial' })
      vi.mocked(inject).mockImplementation((key) => {
        if (key === routeKey)
          return mockRoute
        return undefined
      })

      const route = useRoute()
      expect(route.path).toBe('/initial')

      // 模拟路由变化
      mockRoute.value = { path: '/updated' } as any
      await nextTick()

      // 验证 route 对象是否更新
      expect(route.path).toBe('/updated')
    })

    it('如果在 Vue 上下文外调用应该抛出错误', () => {
      vi.mocked(inject).mockReturnValue(undefined)

      expect(() => useRoute()).toThrowError('useRoute 只可以在 Vue 上下文中使用')
    })
  })
})
