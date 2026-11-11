import type { App } from 'vue'
import type { SyncRoute } from './core'
import type { LocationQuery, Router, RouterOptions } from './types'
import { unref } from 'vue'
import { createRouterCore } from './core'
import { routeKey, routerKey } from './keys'
import { getUrlParams } from './utils'

export { routeKey, routerKey } from './keys'

export function createRouter(options: RouterOptions): Router {
  // 旧 uni-app 的页面参数缓存与生命周期保持独立。
  const pageQueries = new WeakMap<object, { fullPath: string | undefined, query: LocationQuery }>()
  return createRouterCore(options, install)

  function install(app: App, router: Router, syncRoute: SyncRoute) {
    const { currentRoute } = router
    app.provide(routerKey, router)
    app.provide(routeKey, currentRoute)

    app.config.globalProperties.$Router = router
    Object.defineProperty(app.config.globalProperties, '$Route', {
      enumerable: true,
      get: () => unref(currentRoute),
    })

    // Mixin 监听原生页面生命周期，同步路由状态
    app.mixin({
      onLoad(query: Record<string, any>) {
        if (this.$mpType === 'page') {
          // 小程序启动或页面加载时同步
          // 这里简单处理：如果当前 currentRoute 还是初始状态，或者路径不匹配，则尝试同步
          // 实际上 uni-app 多页面栈模型下，router 单例的 currentRoute 应该指向栈顶
          syncRouteFromPage(syncRoute, query)
        }
      },
      onShow() {
        if (this.$mpType === 'page') {
          syncRouteFromPage(syncRoute)
        }
      },
    })
  }

  function syncRouteFromPage(syncRoute: SyncRoute, query?: LocationQuery) {
    // 获取当前页面栈栈顶
    const pages = getCurrentPages()
    const page = pages[pages.length - 1] as any
    if (page && page.route) {
      const fullPath = page.$page?.fullPath
      const cached = pageQueries.get(page)
      const q = query ?? (cached && (!fullPath || fullPath === cached.fullPath)
        ? cached.query
        : fullPath ? getUrlParams(fullPath) : page.options ?? {})
      // 即使路由未变化也记录当前页面，避免遗漏同路径、同参数的新实例。
      pageQueries.set(page, { fullPath, query: q })

      syncRoute(`/${page.route}`, q)
    }
  }
}
