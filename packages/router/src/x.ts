import type { App } from 'vue'
import type { SyncRoute } from './core'
import type {
  LocationQuery,
  RouteLocationNormalized,
  RouteLocationRaw,
  Router,
  RouterOptions,
} from './types'
import { createRouterCore, getRouterInternals } from './core'
import { useRouter as injectRouter } from './hooks'
import { routeKey, routerKey } from './keys'
import { stringifyQuery } from './utils'

export { useRoute } from './hooks'
export * from './types'

export interface RouterX extends Router {
  /** 使用页面 onLoad query 提前同步；内部会安全归一化各端编码差异。 */
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

interface CompatPage {
  route?: string
  __wxWebviewId__?: number
}

interface UniRuntime {
  getSystemInfoSync?: () => {
    uniPlatform?: string
  }
}

interface NativeRoute {
  path?: string
  fullPath?: string
  query?: LocationQuery
  params?: Record<string, any>
  hash?: string
  meta?: Record<string, any>
}

interface VueRouterLike {
  readonly currentRoute: { value: NativeRoute }
  beforeEach: (guard: (to: NativeRoute, from: NativeRoute) => unknown) => () => void
  afterEach: (guard: (to: NativeRoute, from: NativeRoute, failure?: unknown) => void) => () => void
  getRoutes: () => unknown[]
  resolve: (to: unknown) => unknown
  addRoute: (...args: any[]) => unknown
}

interface GuardRedirectError extends Error {
  to: RouteLocationRaw
}

// uni H5 会对导航 URL 的 query 再编码一次；记录原始 resolved query，
// 让 Vue Router 守卫恢复业务参数，同时不影响直接 uni 导航的解析结果。
interface PendingNavigation {
  path: string
  query: LocationQuery
  encodedQuery: LocationQuery
  expiresAt: number
}

interface AppWithH5Router extends App {
  router?: unknown
}

const installations = new WeakMap<App, () => void>()
const pendingNavigationTtl = 60_000
const pendingNavigationLimit = 16

function isVueRouterLike(value: unknown): value is VueRouterLike {
  if (!value || typeof value !== 'object')
    return false
  const candidate = value as Partial<VueRouterLike>
  return typeof candidate.beforeEach === 'function'
    && typeof candidate.afterEach === 'function'
    && typeof candidate.getRoutes === 'function'
    && typeof candidate.resolve === 'function'
    && typeof candidate.addRoute === 'function'
    && typeof candidate.currentRoute === 'object'
    && candidate.currentRoute !== null
    && 'value' in candidate.currentRoute
}

function decodeText(value: string): string {
  try {
    return decodeURIComponent(value)
  }
  catch {
    return value
  }
}

function decodeQueryValue(value: LocationQuery[string]): LocationQuery[string] {
  if (Array.isArray(value))
    return value.map(item => typeof item === 'string' ? decodeText(item) : item)
  return typeof value === 'string' ? decodeText(value) : value
}

function decodeQuery(query: LocationQuery): LocationQuery {
  return Object.fromEntries(
    Object.entries(query).map(([key, value]) => [
      decodeText(key),
      decodeQueryValue(value),
    ]),
  )
}

function isWeChatVdomPage(page: CompatPage | undefined): boolean {
  if (page?.__wxWebviewId__ != null)
    return true

  const getSystemInfoSync = (uni as unknown as UniRuntime).getSystemInfoSync
  if (typeof getSystemInfoSync !== 'function')
    return false

  try {
    return getSystemInfoSync()?.uniPlatform === 'mp-weixin'
  }
  catch {
    return false
  }
}

function normalizePageQuery(query: LocationQuery): LocationQuery {
  const pages = getCurrentPages() as unknown as CompatPage[]
  const page = pages[pages.length - 1]
  if (!isWeChatVdomPage(page))
    return { ...query }

  return decodeQuery(query)
}

function normalizeQueryValue(value: unknown): string {
  if (Array.isArray(value))
    return value.map(String).join(',')
  return value == null ? '' : String(value)
}

function encodeQuery(query: LocationQuery): LocationQuery {
  return Object.fromEntries(
    Object.entries(query)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, encodeURIComponent(normalizeQueryValue(value))]),
  )
}

function prunePendingNavigations(navigations: PendingNavigation[]) {
  const now = Date.now()
  for (let index = navigations.length - 1; index >= 0; index--) {
    if (navigations[index].expiresAt <= now)
      navigations.splice(index, 1)
  }
}

function findPendingNavigation(navigations: PendingNavigation[], path: string, query: LocationQuery) {
  prunePendingNavigations(navigations)
  for (let index = navigations.length - 1; index >= 0; index--) {
    const pending = navigations[index]
    if (pending.path !== path)
      continue
    const entries = Object.entries(pending.encodedQuery)
    if (entries.length !== Object.keys(query).length)
      continue
    const matched = entries.every(([key, value]) => Object.prototype.hasOwnProperty.call(query, key)
      && normalizeQueryValue(query[key]) === value)
    if (matched)
      return pending
  }
}

function consumePendingNavigation(navigations: PendingNavigation[], pending: PendingNavigation | undefined) {
  if (!pending)
    return
  const index = navigations.indexOf(pending)
  if (index > -1)
    navigations.splice(index, 1)
}

export function useRouter(): RouterX {
  return injectRouter() as RouterX
}

/** uni-app x 专用入口：使用主页面路由事件，不安装选项式 mixin。 */
export function createRouter(options: RouterOptions): RouterX {
  let updateRoute: SyncRoute | undefined
  let cleanup: (() => void) | undefined
  let installedApp: App | undefined
  let cleanupVueRouter: (() => void) | undefined
  let bridgeGuardError: Error | undefined
  const pendingNavigations: PendingNavigation[] = []
  const router: RouterX = Object.assign(createRouterCore(options, install), {
    syncRoute,
    dispose,
  })
  const internals = getRouterInternals(router)

  function wrapNavigation(method: 'push' | 'replace' | 'replaceAll' | 'pushTab') {
    const navigate = router[method]
    router[method] = async (to: RouteLocationRaw) => {
      if (cleanupVueRouter) {
        try {
          const resolved = internals.resolve(to)
          prunePendingNavigations(pendingNavigations)
          pendingNavigations.push({
            path: resolved.path,
            query: { ...resolved.query },
            encodedQuery: encodeQuery(resolved.query),
            expiresAt: Date.now() + pendingNavigationTtl,
          })
          if (pendingNavigations.length > pendingNavigationLimit)
            pendingNavigations.splice(0, pendingNavigations.length - pendingNavigationLimit)
        }
        catch {
          // 路由校验交给核心导航方法处理，避免改变已有错误语义。
        }
      }
      bridgeGuardError = undefined
      try {
        return await navigate(to)
      }
      catch (error) {
        const guardError = bridgeGuardError
        bridgeGuardError = undefined
        throw guardError || error
      }
    }
  }
  (['push', 'replace', 'replaceAll', 'pushTab'] as const).forEach(wrapNavigation)

  function syncRoute(query: LocationQuery) {
    if (!updateRoute)
      return
    const pages = getCurrentPages()
    const page = pages[pages.length - 1]
    if (page?.route)
      updateRoute(`/${page.route.replace(/^\/+/, '')}`, normalizePageQuery(query))
  }

  function dispose() {
    cleanupVueRouter?.()
    cleanupVueRouter = undefined
    cleanup?.()
    cleanup = undefined
    installedApp = undefined
    updateRoute = undefined
    pendingNavigations.splice(0)
  }

  function normalizeNativeRoute(route: NativeRoute): RouteLocationNormalized {
    const metaRoute = route.meta?.route
    const path = typeof metaRoute === 'string' && metaRoute
      ? `/${metaRoute.replace(/^\/+/, '')}`
      : route.path || '/'
    const pending = findPendingNavigation(pendingNavigations, path, route.query || {})
    const query = { ...(pending?.query || route.query || {}) } as LocationQuery
    try {
      const resolved = internals.resolve({ path, query })
      return {
        ...resolved,
        params: route.params || resolved.params,
        hash: route.hash || resolved.hash,
      }
    }
    catch {
      const matched = router.routes.find(r => r.path === path || r.aliasPath === path)
      return {
        path,
        name: matched?.name,
        params: route.params || {},
        query,
        hash: route.hash || '',
        fullPath: stringifyQuery(path, query),
        meta: matched?.meta || route.meta || {},
        style: matched?.style || {},
        ...Object.fromEntries(
          Object.entries(matched || {}).filter(([key]) => !['path', 'name', 'meta', 'style', 'aliasPath'].includes(key)),
        ),
      }
    }
  }

  function redirectTarget(error: GuardRedirectError) {
    const resolved = internals.resolve(error.to)
    const navType = typeof error.to === 'object' && error.to ? error.to.navType : undefined
    return {
      path: resolved.path,
      query: resolved.query,
      hash: resolved.hash || undefined,
      replace: navType === 'replace',
    }
  }

  function attachVueRouter(nativeRouter: unknown): boolean {
    if (cleanupVueRouter)
      return true
    if (!isVueRouterLike(nativeRouter))
      return false

    let removeBefore: (() => void) | undefined
    let removeAfter: (() => void) | undefined
    try {
      removeBefore = nativeRouter.beforeEach(async (to, from) => {
        try {
          await internals.runBeforeGuards(normalizeNativeRoute(to), normalizeNativeRoute(from))
          bridgeGuardError = undefined
          return true
        }
        catch (error) {
          if (error instanceof Error && error.message === 'NavigationCancelled') {
            bridgeGuardError = error
            return false
          }
          if (error instanceof Error && error.message === 'NavigationRedirect')
            return redirectTarget(error as GuardRedirectError)
          bridgeGuardError = error instanceof Error ? error : new Error(String(error))
          throw error
        }
      })
      removeAfter = nativeRouter.afterEach((to, from, failure) => {
        const nextRoute = normalizeNativeRoute(to)
        consumePendingNavigation(
          pendingNavigations,
          findPendingNavigation(pendingNavigations, nextRoute.path, to.query || {}),
        )
        if (failure)
          return
        const previousRoute = normalizeNativeRoute(from)
        internals.syncRoute(nextRoute.path, nextRoute.query)
        internals.runAfterGuards(nextRoute, previousRoute)
      })
      internals.setGuardHost('external')
      cleanupVueRouter = () => {
        removeBefore?.()
        removeAfter?.()
        internals.setGuardHost('core')
        cleanupVueRouter = undefined
      }
      return true
    }
    catch (error) {
      removeBefore?.()
      removeAfter?.()
      console.warn('[@wot-ui/router/x] H5 vue-router 守卫桥接失败，将继续使用内置守卫。', error)
      return false
    }
  }

  function attachAppVueRouter(app: App) {
    return attachVueRouter((app as AppWithH5Router).router)
  }

  function install(app: App, _router: Router, sync: SyncRoute) {
    if (installedApp === app) {
      attachAppVueRouter(app)
      return
    }
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
    const appWithH5Router = app as AppWithH5Router
    let restoreH5Hooks: (() => void) | undefined
    const callback = (event: AppRouteEvent) => {
      if (active && event.path)
        sync(`/${event.path.replace(/^\/+/, '')}`, normalizePageQuery(event.query))
    }
    onAppRoute(callback)

    installedApp = app
    updateRoute = sync
    attachAppVueRouter(app)

    // H5 的 uni 插件会在 app.use 内创建并安装内部 vue-router。
    // 在 Vue Router 安装前挂上桥接，才能覆盖 appLaunch 首次导航。
    if (typeof window !== 'undefined') {
      const originalUse = appWithH5Router.use
      const originalMount = appWithH5Router.mount
      const useWithRouterBridge = function (
        this: App,
        plugin: any,
        ...pluginOptions: any[]
      ) {
        if (isVueRouterLike(plugin))
          attachVueRouter(plugin)
        return (originalUse as (...args: any[]) => any).apply(appWithH5Router, [plugin, ...pluginOptions])
      }
      const mountWithRouterBridge = function (
        this: App,
        ...args: any[]
      ) {
        attachAppVueRouter(appWithH5Router)
        return (originalMount as (...args: any[]) => any).apply(appWithH5Router, args)
      }
      appWithH5Router.use = useWithRouterBridge
      appWithH5Router.mount = mountWithRouterBridge
      restoreH5Hooks = () => {
        if (appWithH5Router.use === useWithRouterBridge)
          appWithH5Router.use = originalUse
        if (appWithH5Router.mount === mountWithRouterBridge)
          appWithH5Router.mount = originalMount
      }
    }

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
      cleanupVueRouter?.()
      cleanupVueRouter = undefined
      restoreH5Hooks?.()
      restoreH5Hooks = undefined
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
