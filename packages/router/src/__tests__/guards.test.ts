import type { RouteRecordRaw } from '../types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRouter } from '../router'

describe('router guards - 路由守卫', () => {
  let routes: RouteRecordRaw[]

  beforeEach(() => {
    (globalThis as any).resetMocks()
    routes = [
      { path: '/pages/index', name: 'index' },
      { path: '/pages/detail', name: 'detail', meta: { auth: true } },
      { path: '/pages/user', name: 'user' },
    ]
  })

  describe('beforeEach - 前置守卫', () => {
    it('应该在导航前执行 beforeEach 守卫', async () => {
      const router = createRouter({ routes })
      const guard = vi.fn((to, from, next) => {
        next()
      })

      router.beforeEach(guard)
      await router.push('/pages/index')

      expect(guard).toHaveBeenCalled()
    })

    it('应该传递正确的 to 和 from 参数', async () => {
      const router = createRouter({ routes })
      const guard = vi.fn((to, from, next) => {
        next()
      })

      router.beforeEach(guard)
      await router.push('/pages/index')

      expect(guard).toHaveBeenCalledWith(
        expect.objectContaining({ path: '/pages/index' }),
        expect.objectContaining({ path: '/' }),
        expect.any(Function),
      )
    })

    it('应该在守卫返回 false 时取消导航', async () => {
      const router = createRouter({ routes })
      const guard = vi.fn(() => false)

      router.beforeEach(guard)
      await expect(router.push('/pages/index')).rejects.toThrow('NavigationCancelled')
    })

    it('应该在守卫返回路由位置时进行重定向', async () => {
      const router = createRouter({ routes })
      const guard = vi.fn(() => '/pages/user')

      router.beforeEach(guard)
      await router.push('/pages/index')

      expect(uni.navigateTo).toHaveBeenCalledWith(expect.objectContaining({ url: '/pages/user' }))
    })

    it('应该支持返回 Promise 的异步守卫', async () => {
      const router = createRouter({ routes })
      const guard = vi.fn(async () => {
        return true
      })

      router.beforeEach(guard)
      await router.push('/pages/index')

      expect(guard).toHaveBeenCalled()
    })

    it('应该支持返回重定向的异步守卫', async () => {
      const router = createRouter({ routes })
      const guard = vi.fn(async () => {
        return '/pages/user'
      })

      router.beforeEach(guard)
      await router.push('/pages/index')

      expect(uni.navigateTo).toHaveBeenCalledWith(expect.objectContaining({ url: '/pages/user' }))
    })

    it('应该按顺序执行多个守卫', async () => {
      const router = createRouter({ routes })
      const executionOrder: number[] = []

      const guard1 = vi.fn((to, from, next) => {
        executionOrder.push(1)
        next()
      })
      const guard2 = vi.fn((to, from, next) => {
        executionOrder.push(2)
        next()
      })

      router.beforeEach(guard1)
      router.beforeEach(guard2)
      await router.push('/pages/index')

      expect(executionOrder).toEqual([1, 2])
    })

    it('应该允许移除守卫', async () => {
      const router = createRouter({ routes })
      const guard = vi.fn((to, from, next) => {
        next()
      })

      const removeGuard = router.beforeEach(guard)
      removeGuard()
      await router.push('/pages/index')

      expect(guard).not.toHaveBeenCalled()
    })

    it('应该在守卫抛出错误时停止导航', async () => {
      const router = createRouter({ routes })
      const guard = vi.fn(() => {
        throw new Error('Test error')
      })

      router.beforeEach(guard)
      await expect(router.push('/pages/index')).rejects.toThrow('Test error')
    })
  })

  describe('afterEach - 后置守卫', () => {
    // Helper to setup router with lifecycle mocking
    function createRouterWithLifecycle(routes: RouteRecordRaw[]) {
      const router = createRouter({ routes })

      // Mock app to capture mixin
      let capturedMixin: any = null
      const app: any = {
        provide: vi.fn(),
        config: { globalProperties: {} },
        mixin: (mixin: any) => {
          capturedMixin = mixin
        },
      }
      router.install(app)

      // Override uni.navigateTo to trigger lifecycle
      uni.navigateTo = vi.fn(({ url, success }) => {
        const routePath = url.startsWith('/') ? url.slice(1) : url
        const mockPage = {
          route: routePath,
          $page: { fullPath: url },
        };
        (globalThis as any).getCurrentPages = () => [mockPage]

        if (capturedMixin && capturedMixin.onLoad) {
          capturedMixin.onLoad.call({ $mpType: 'page' })
        }
        success?.()
      }) as any

      // Also mock redirectTo for redirect tests
      uni.redirectTo = vi.fn(({ url, success }) => {
        const routePath = url.startsWith('/') ? url.slice(1) : url
        const mockPage = {
          route: routePath,
          $page: { fullPath: url },
        };
        (globalThis as any).getCurrentPages = () => [mockPage]

        if (capturedMixin && capturedMixin.onLoad) {
          capturedMixin.onLoad.call({ $mpType: 'page' })
        }
        success?.()
      }) as any

      return router
    }

    it('应该在导航后执行 afterEach 守卫', async () => {
      const router = createRouterWithLifecycle(routes)
      const guard = vi.fn()

      router.afterEach(guard)
      await router.push('/pages/index')

      expect(guard).toHaveBeenCalled()
    })

    it('应该传递正确的 to 和 from 参数', async () => {
      const router = createRouterWithLifecycle(routes)
      const guard = vi.fn()

      router.afterEach(guard)
      await router.push('/pages/index')

      expect(guard).toHaveBeenCalledWith(
        expect.objectContaining({ path: '/pages/index' }),
        expect.objectContaining({ path: '/' }),
      )
    })

    it('应该在导航取消时不执行', async () => {
      const router = createRouterWithLifecycle(routes)
      const beforeGuard = vi.fn(() => false)
      const afterGuard = vi.fn()

      router.beforeEach(beforeGuard)
      router.afterEach(afterGuard)

      await expect(router.push('/pages/index')).rejects.toThrow('NavigationCancelled')

      expect(afterGuard).not.toHaveBeenCalled()
    })

    it('应该在重定向后执行', async () => {
      const router = createRouterWithLifecycle(routes)
      const beforeGuard = vi.fn(() => '/pages/user')
      const afterGuard = vi.fn()

      router.beforeEach(beforeGuard)
      router.afterEach(afterGuard)
      await router.push('/pages/index')

      expect(afterGuard).toHaveBeenCalledWith(
        expect.objectContaining({ path: '/pages/user' }),
        expect.objectContaining({ path: '/' }),
      )
    })

    it('应该允许移除守卫', async () => {
      const router = createRouterWithLifecycle(routes)
      const guard = vi.fn()

      const removeGuard = router.afterEach(guard)
      removeGuard()
      await router.push('/pages/index')

      expect(guard).not.toHaveBeenCalled()
    })
  })

  describe('combined guards - 组合守卫', () => {
    // Helper to setup router with lifecycle mocking (same as above)
    function createRouterWithLifecycle(routes: RouteRecordRaw[]) {
      const router = createRouter({ routes })
      let capturedMixin: any = null
      const app: any = {
        provide: vi.fn(),
        config: { globalProperties: {} },
        mixin: (mixin: any) => { capturedMixin = mixin },
      }
      router.install(app)

      const mockNavigate = ({ url, success }: any) => {
        const path = url.split('?')[0]
        const routePath = path.startsWith('/') ? path.slice(1) : path
        const mockPage = { route: routePath, $page: { fullPath: url } }
        ;(globalThis as any).getCurrentPages = () => [mockPage]
        if (capturedMixin?.onLoad)
          capturedMixin.onLoad.call({ $mpType: 'page' })
        success?.()
      }
      uni.navigateTo = vi.fn(mockNavigate) as any
      uni.redirectTo = vi.fn(mockNavigate) as any
      return router
    }

    it('应该按正确顺序执行 beforeEach 和 afterEach', async () => {
      const router = createRouterWithLifecycle(routes)
      const executionOrder: string[] = []

      router.beforeEach(() => {
        executionOrder.push('before')
        return true
      })
      router.afterEach(() => {
        executionOrder.push('after')
      })

      await router.push('/pages/index')

      expect(executionOrder).toEqual(['before', 'after'])
    })

    it('应该处理认证守卫模式', async () => {
      const router = createRouterWithLifecycle(routes)
      const isLoggedIn = false

      router.beforeEach((to) => {
        if (to.meta?.auth && !isLoggedIn) {
          return '/pages/index'
        }
      })

      await router.push('/pages/detail')

      expect(uni.navigateTo).toHaveBeenCalledWith(expect.objectContaining({ url: '/pages/index' }))
    })
  })

  describe('beforeResolve and beforeEnter - Vue Router 对齐能力', () => {
    it('应该按 beforeEach -> beforeEnter -> beforeResolve 顺序执行', async () => {
      const order: string[] = []
      const router = createRouter({
        routes: [
          { path: '/pages/index', name: 'index' },
          {
            path: '/pages/detail',
            name: 'detail',
            beforeEnter: (_to, _from, next) => {
              order.push('beforeEnter')
              next()
            },
          },
        ],
      })
      router.beforeEach((_to, _from, next) => {
        order.push('beforeEach')
        next()
      })
      router.beforeResolve((_to, _from, next) => {
        order.push('beforeResolve')
        next()
      })

      await router.push('/pages/detail')

      expect(order).toEqual(['beforeEach', 'beforeEnter', 'beforeResolve'])
    })

    it('应该只在进入匹配路由时执行对应 beforeEnter', async () => {
      const detailGuard = vi.fn()
      const userGuard = vi.fn()
      const router = createRouter({
        routes: [
          { path: '/pages/index', name: 'index' },
          { path: '/pages/detail', name: 'detail', beforeEnter: detailGuard },
          { path: '/pages/user', name: 'user', beforeEnter: [userGuard] },
        ],
      })

      await router.push('/pages/detail')
      await router.push('/pages/index')

      expect(detailGuard).toHaveBeenCalledOnce()
      expect(userGuard).not.toHaveBeenCalled()
    })

    it('应该允许 beforeResolve 取消导航', async () => {
      const router = createRouter({ routes })
      router.beforeResolve(() => false)

      await expect(router.push('/pages/index')).rejects.toThrow('NavigationCancelled')
      expect(uni.navigateTo).not.toHaveBeenCalled()
    })

    it('应该允许 beforeResolve 重定向并移除守卫', async () => {
      const router = createRouter({ routes })
      const removeGuard = router.beforeResolve(() => '/pages/user')

      await router.push('/pages/index')
      expect(uni.navigateTo).toHaveBeenCalledWith(expect.objectContaining({ url: '/pages/user' }))

      removeGuard()
      vi.mocked(uni.navigateTo).mockClear()
      await router.push('/pages/index')
      expect(uni.navigateTo).toHaveBeenCalledWith(expect.objectContaining({ url: '/pages/index' }))
    })
  })

  describe('bug fixes - 问题修复', () => {
    it('router.push 触发时，onLoad 不应重复触发 afterEach', async () => {
      const router = createRouter({ routes })
      const afterEachSpy = vi.fn()
      router.afterEach(afterEachSpy)

      // Mock app to capture mixin
      let capturedMixin: any = null
      const app: any = {
        provide: vi.fn(),
        config: { globalProperties: {} },
        mixin: (mixin: any) => {
          capturedMixin = mixin
        },
      }
      router.install(app)

      // Override uni.navigateTo to simulate race condition
      uni.navigateTo = vi.fn(({ url, success }) => {
        // 1. Simulate page stack update so syncRouteFromPage sees the new page
        // We override getCurrentPages to return the target page
        // Note: uni-app routes usually don't have leading slash, but we handle it
        const routePath = url.startsWith('/') ? url.slice(1) : url

        const mockPage = {
          route: routePath,
          $page: { fullPath: url },
        };

        (globalThis as any).getCurrentPages = () => [mockPage]

        // 2. Simulate onLoad firing immediately (while router.push is still executing)
        if (capturedMixin && capturedMixin.onLoad) {
          // Call onLoad with context
          capturedMixin.onLoad.call({ $mpType: 'page' })
        }

        // 3. Call success to allow router.push to proceed
        success?.()
      }) as any

      await router.push('/pages/index')

      // Expect afterEach to be called exactly once
      // If bug exists, it would be 2
      expect(afterEachSpy).toHaveBeenCalledTimes(1)

      // Verify it was called with correct args
      const to = afterEachSpy.mock.calls[0][0]
      expect(to.path).toBe('/pages/index')
    })
  })
})
