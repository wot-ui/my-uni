import type { RouteRecordRaw } from '../types'
import { beforeEach, describe, expect, it } from 'vitest'
import { createRouter } from '../router'

describe('createRouter - 路由器创建', () => {
  let routes: RouteRecordRaw[]

  beforeEach(() => {
    (globalThis as any).resetMocks()
    routes = [
      { path: '/pages/index', name: 'index' },
      { path: '/pages/detail', name: 'detail' },
      { path: '/pages/user', name: 'user', meta: { auth: true } },
      { path: '/pages/about', aliasPath: '/pages/info' },
    ]
  })

  // 辅助函数：创建带有生命周期模拟的路由器
  function createRouterWithLifecycle(routes: RouteRecordRaw[]) {
    const router = createRouter({ routes })

    // 模拟 app 以捕获 mixin
    let capturedMixin: any = null
    const app: any = {
      provide: vi.fn(),
      config: { globalProperties: {} },
      mixin: (mixin: any) => {
        capturedMixin = mixin
      },
    }
    router.install(app)

    const mockNavigate = ({ url, success }: any) => {
      const path = url.split('?')[0]
      const routePath = path.startsWith('/') ? path.slice(1) : path
      const mockPage = { route: routePath, $page: { fullPath: url } }
      ;(globalThis as any).getCurrentPages = () => [mockPage]
      if (capturedMixin?.onLoad) {
        capturedMixin.onLoad.call({ $mpType: 'page' })
      }
      success?.()
    }

    uni.navigateTo = vi.fn(mockNavigate) as any
    uni.redirectTo = vi.fn(mockNavigate) as any
    uni.reLaunch = vi.fn(mockNavigate) as any
    uni.switchTab = vi.fn(mockNavigate) as any

    return router
  }

  describe('router instance - 路由器实例', () => {
    it('应该创建包含路由配置的路由器实例', () => {
      const router = createRouter({ routes })
      expect(router.routes).toEqual(routes)
      expect(router.currentRoute.value.path).toBe('/')
    })
  })

  describe('resolve - 路由解析', () => {
    it('应该解析字符串路径', () => {
      const router = createRouter({ routes })
      const resolved = router.push('/pages/index')
      expect(resolved).toBeInstanceOf(Promise)
    })

    it('应该解析路径对象', () => {
      const router = createRouter({ routes })
      const resolved = router.push({ path: '/pages/index' })
      expect(resolved).toBeInstanceOf(Promise)
    })

    it('应该解析命名路由', () => {
      const router = createRouter({ routes })
      const resolved = router.push({ name: 'index' })
      expect(resolved).toBeInstanceOf(Promise)
    })

    it('应该解析带参数的路由', () => {
      const router = createRouter({ routes })
      const resolved = router.push({ name: 'index', params: { id: '123' } })
      expect(resolved).toBeInstanceOf(Promise)
    })

    it('应该解析带查询参数的路由', () => {
      const router = createRouter({ routes })
      const resolved = router.push({ path: '/pages/index', query: { id: '1' } })
      expect(resolved).toBeInstanceOf(Promise)
    })

    it('应该解析别名路径', () => {
      const router = createRouter({ routes })
      const resolved = router.push('/pages/info')
      expect(resolved).toBeInstanceOf(Promise)
    })
  })

  describe('push - 导航跳转', () => {
    it('应该调用 uni.navigateTo 并传入正确的 URL', async () => {
      const router = createRouter({ routes })
      await router.push('/pages/index')

      expect(uni.navigateTo).toHaveBeenCalledWith(expect.objectContaining({ url: '/pages/index' }))
    })

    it('应该处理查询参数', async () => {
      const router = createRouter({ routes })
      await router.push({ path: '/pages/index', query: { id: '1', name: 'test' } })

      expect(uni.navigateTo).toHaveBeenCalledWith(expect.objectContaining({ url: '/pages/index?id=1&name=test' }))
    })

    it('应该在导航后更新 currentRoute', async () => {
      const router = createRouterWithLifecycle(routes)
      await router.push('/pages/index')

      expect(router.currentRoute.value.path).toBe('/pages/index')
    })

    it('页面缺少 fullPath 时应该同步同路径的新查询参数', () => {
      const router = createRouter({ routes })
      let capturedMixin: any = null
      const app: any = {
        provide: vi.fn(),
        config: { globalProperties: {} },
        mixin: (mixin: any) => {
          capturedMixin = mixin
        },
      }
      router.install(app)

      const mockPage = { route: 'pages/detail' }
      ;(globalThis as any).getCurrentPages = () => [mockPage]

      capturedMixin.onLoad.call({ $mpType: 'page' }, { id: '1' })
      capturedMixin.onLoad.call({ $mpType: 'page' }, { id: '2' })
      capturedMixin.onShow.call({ $mpType: 'page' })

      expect(router.currentRoute.value.query).toEqual({ id: '2' })
      expect(router.currentRoute.value.fullPath).toBe('/pages/detail?id=2')
    })

    it('连续 push 同一路径时应该同步新的查询参数', async () => {
      const router = createRouterWithLifecycle(routes)

      await router.push({ path: '/pages/detail', query: { id: '1' } })
      await router.push({ path: '/pages/detail', query: { id: '2' } })

      expect(router.currentRoute.value.query).toEqual({ id: '2' })
      expect(router.currentRoute.value.fullPath).toBe('/pages/detail?id=2')
    })
  })

  describe('页面生命周期 - 查询参数同步', () => {
    function setupLifecycle() {
      const router = createRouter({ routes })
      let lifecycle: any
      router.install({
        provide: vi.fn(),
        config: { globalProperties: {} },
        mixin: (mixin: any) => { lifecycle = mixin },
      } as any)
      const afterEach = vi.fn()
      router.afterEach(afterEach)
      const pages: { route: string, options?: Record<string, string>, $page?: { fullPath: string } }[] = []
      ;(globalThis as any).getCurrentPages = () => pages
      return {
        router,
        afterEach,
        pages,
        load: (query: Record<string, string>) => lifecycle.onLoad.call({ $mpType: 'page' }, query),
        show: () => lifecycle.onShow.call({ $mpType: 'page' }),
      }
    }

    it.each([true, false])('fullPath 存在为 %s 时，onShow 应保留 onLoad 参数且不重复触发 afterEach', (hasFullPath) => {
      const { router, afterEach, pages, load, show } = setupLifecycle()
      pages.push({ route: 'pages/detail', ...(hasFullPath ? { $page: { fullPath: '/pages/detail?id=2' } } : {}) })
      load({ id: '2' })
      show()
      show()

      expect(router.currentRoute.value.query).toEqual({ id: '2' })
      expect(router.currentRoute.value.fullPath).toBe('/pages/detail?id=2')
      expect(afterEach).toHaveBeenCalledTimes(1)
    })

    it('缺少 fullPath 时，返回同路径的上一页面应该恢复该页面的参数', () => {
      const { router, afterEach, pages, load, show } = setupLifecycle()
      pages.push({ route: 'pages/detail' })
      load({ id: '1' })
      show()
      pages.push({ route: 'pages/detail' })
      load({ id: '2' })
      show()
      expect(router.currentRoute.value.query).toEqual({ id: '2' })

      pages.pop()
      show()
      show()
      expect(router.currentRoute.value.query).toEqual({ id: '1' })
      expect(router.currentRoute.value.fullPath).toBe('/pages/detail?id=1')
      expect(afterEach).toHaveBeenCalledTimes(3)
    })

    it('缺少 fullPath 时，同一页面重新加载空参数应该清除旧参数', () => {
      const { router, afterEach, pages, load, show } = setupLifecycle()
      pages.push({ route: 'pages/detail' })
      load({ id: '1' })
      show()
      load({})
      show()
      expect(router.currentRoute.value.query).toEqual({})
      expect(router.currentRoute.value.fullPath).toBe('/pages/detail')
      expect(afterEach).toHaveBeenCalledTimes(2)
    })

    it('同路径、同参数的新页面也应该保存参数，即使路由更新被去重', () => {
      const { router, afterEach, pages, load, show } = setupLifecycle()
      pages.push({ route: 'pages/detail' })
      load({ id: '1' })
      pages.push({ route: 'pages/detail' })
      load({ id: '1' })
      show()
      expect(router.currentRoute.value.query).toEqual({ id: '1' })
      expect(afterEach).toHaveBeenCalledTimes(1)
    })

    it('未观察到 onLoad 且缺少 fullPath 时应该使用页面 options，不继承其他页面参数', () => {
      const { router, pages, show } = setupLifecycle()
      pages.push({ route: 'pages/detail', options: { id: '1' } })
      show()
      expect(router.currentRoute.value.query).toEqual({ id: '1' })

      pages.push({ route: 'pages/detail' })
      show()
      expect(router.currentRoute.value.query).toEqual({})
      expect(router.currentRoute.value.fullPath).toBe('/pages/detail')
    })

    it('onShow 应该同步 fullPath 的新参数，而不是复用旧参数', () => {
      const { router, afterEach, pages, load, show } = setupLifecycle()
      const page = { route: 'pages/detail', $page: { fullPath: '/pages/detail?id=1' } }
      pages.push(page)
      load({ id: '1' })
      show()
      page.$page.fullPath = '/pages/detail?id=2'
      show()
      show()
      expect(router.currentRoute.value.query).toEqual({ id: '2' })
      expect(afterEach).toHaveBeenCalledTimes(2)
    })
  })

  describe('replace - 替换当前页面', () => {
    it('应该调用 uni.redirectTo 并传入正确的 URL', async () => {
      const router = createRouter({ routes })
      await router.replace('/pages/index')

      expect(uni.redirectTo).toHaveBeenCalledWith(expect.objectContaining({ url: '/pages/index' }))
    })
  })

  describe('replaceAll - 重启应用', () => {
    it('应该调用 uni.reLaunch 并传入正确的 URL', async () => {
      const router = createRouter({ routes })
      await router.replaceAll('/pages/index')

      expect(uni.reLaunch).toHaveBeenCalledWith(expect.objectContaining({ url: '/pages/index' }))
    })
  })

  describe('pushTab - 切换 Tab 页', () => {
    it('应该调用 uni.switchTab 并传入正确的 URL', async () => {
      const router = createRouter({ routes })
      await router.pushTab('/pages/index')

      expect(uni.switchTab).toHaveBeenCalledWith(expect.objectContaining({ url: '/pages/index' }))
    })
  })

  describe('push - 带有动画配置', () => {
    it('应该在使用 push 时将 animationType 和 animationDuration 传给 uni.navigateTo', async () => {
      const router = createRouter({ routes })
      await router.push({
        path: '/pages/index',
        animationType: 'slide-in-bottom',
        animationDuration: 300,
      })

      expect(uni.navigateTo).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/pages/index', animationType: 'slide-in-bottom', animationDuration: 300 }),
      )
    })
  })

  describe('back - 返回上一页', () => {
    it('应该调用 uni.navigateBack 并使用默认 delta', () => {
      const router = createRouter({ routes })
      router.back()

      expect(uni.navigateBack).toHaveBeenCalledWith({ delta: 1 })
    })

    it('应该调用 uni.navigateBack 并使用自定义 delta', () => {
      const router = createRouter({ routes })
      router.back(2)

      expect(uni.navigateBack).toHaveBeenCalledWith({ delta: 2 })
    })

    it('应该调用 uni.navigateBack 并传入选项对象', () => {
      const router = createRouter({ routes })
      router.back({ delta: 1, animationType: 'slide-out-right', animationDuration: 300 })

      expect(uni.navigateBack).toHaveBeenCalledWith({ delta: 1, animationType: 'slide-out-right', animationDuration: 300 })
    })

    it('应该通过 navType 透传返回参数', async () => {
      const router = createRouter({ routes })
      await router.push({
        path: '/pages/index',
        navType: 'back',
        delta: 2,
        animationType: 'slide-out-bottom',
        animationDuration: 300,
      })

      expect(uni.navigateBack).toHaveBeenCalledWith(
        expect.objectContaining({ delta: 2, animationType: 'slide-out-bottom', animationDuration: 300 }),
      )
    })
  })

  describe('navType option - 导航类型选项', () => {
    it('应该使用路由对象中的 navType', async () => {
      const router = createRouter({ routes })
      await router.push({ path: '/pages/index', navType: 'replace' })

      expect(uni.redirectTo).toHaveBeenCalledWith(expect.objectContaining({ url: '/pages/index' }))
    })

    it('应该使用路由对象中的 navType 进行 Tab 切换', async () => {
      const router = createRouter({ routes })
      await router.push({ path: '/pages/index', navType: 'pushTab' })

      expect(uni.switchTab).toHaveBeenCalledWith(expect.objectContaining({ url: '/pages/index' }))
    })
  })
})
