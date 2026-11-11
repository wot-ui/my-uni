import type { App } from 'vue'
import type { SyncRoute } from './core'
import type { LocationQuery, Router, RouterOptions } from './types'
import { createRouterCore } from './core'
import { useRouter as injectRouter } from './hooks'
import { routeKey, routerKey } from './keys'

export { useRoute } from './hooks'
export * from './types'

export interface RouterX extends Router {
  /** 使用页面 onLoad 提供的已解码参数提前同步主页面状态。 */
  syncRoute: (query: LocationQuery) => void
  /** 移除本实例的路由监听；用于应用卸载和 HMR。 */
  dispose: () => void
}

interface AppRouteEvent {
  path: string
  query: LocationQuery
}

interface RouteEvents {
  onAppRoute: (callback: (event: AppRouteEvent) => void) => void
  offAppRoute: (callback: (event: AppRouteEvent) => void) => void
}

const installations = new WeakMap<App, () => void>()

export function useRouter(): RouterX {
  return injectRouter() as RouterX
}

/** uni-app x 专用入口：使用主页面路由事件，不安装选项式 mixin。 */
export function createRouter(options: RouterOptions): RouterX {
  let updateRoute: SyncRoute | undefined
  let cleanup: (() => void) | undefined
  let installedApp: App | undefined
  const router: RouterX = Object.assign(createRouterCore(options, install), {
    syncRoute,
    dispose,
  })

  function syncRoute(query: LocationQuery) {
    if (!updateRoute)
      return
    const pages = getCurrentPages()
    const page = pages[pages.length - 1]
    if (page?.route)
      updateRoute(`/${page.route.replace(/^\/+/, '')}`, { ...query })
  }

  function dispose() {
    cleanup?.()
    cleanup = undefined
    installedApp = undefined
    updateRoute = undefined
  }

  function install(app: App, _router: Router, sync: SyncRoute) {
    if (installedApp === app)
      return
    if (installedApp)
      throw new Error('[@wot-ui/router/x] 一个 router 实例只能安装到一个应用。')

    // 保留直接的 uni API 属性访问，供 uni-app x 编译器收集按需导入。
    const onAppRoute = (uni as unknown as Partial<RouteEvents>).onAppRoute
    const offAppRoute = (uni as unknown as Partial<RouteEvents>).offAppRoute
    if (typeof onAppRoute !== 'function' || typeof offAppRoute !== 'function') {
      throw new TypeError('[@wot-ui/router/x] 需要 uni.onAppRoute/offAppRoute，请使用支持路由事件的 uni-app x 工具链与运行环境。')
    }

    installations.get(app)?.()
    let active = true
    const callback = (event: AppRouteEvent) => {
      if (active && event.path)
        sync(`/${event.path.replace(/^\/+/, '')}`, { ...event.query })
    }
    onAppRoute(callback)

    installedApp = app
    updateRoute = sync
    const globals = app.config.globalProperties
    const previousRouter = Object.getOwnPropertyDescriptor(globals, '$Router')
    const previousRoute = Object.getOwnPropertyDescriptor(globals, '$Route')
    const unmount = app.unmount
    const unmountRouter = () => {
      dispose()
      unmount.call(app)
    }
    cleanup = () => {
      active = false
      offAppRoute(callback)
      if (app.unmount === unmountRouter)
        app.unmount = unmount
      if (installations.get(app) === dispose) {
        installations.delete(app)
        if (previousRouter)
          Object.defineProperty(globals, '$Router', previousRouter)
        else
          delete globals.$Router
        if (previousRoute)
          Object.defineProperty(globals, '$Route', previousRoute)
        else
          delete globals.$Route
      }
    }
    installations.set(app, dispose)
    try {
      Object.defineProperty(globals, '$Router', { configurable: true, enumerable: true, value: router })
      Object.defineProperty(globals, '$Route', { configurable: true, enumerable: true, get: () => router.currentRoute.value })
      app.provide(routerKey, router)
      app.provide(routeKey, router.currentRoute)
      app.unmount = unmountRouter
    }
    catch (error) {
      dispose()
      throw error
    }
  }

  return router
}
