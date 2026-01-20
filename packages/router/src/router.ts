import { shallowRef, unref } from 'vue'
import type { App, InjectionKey, Ref } from 'vue'
import type {
  LocationQuery,
  NavigationGuard,
  NavigationGuardNext,
  NavigationHookAfter,
  NavType,
  RouteBackRaw,
  RouteLocationNormalized,
  RouteLocationRaw,
  Router,
  RouterOptions,
} from './types'
import { START_LOCATION_NORMALIZED } from './types'
import { getUrlParams, normalizeUrl, stringifyQuery } from './utils'

// 注入 Key
export const routerKey: InjectionKey<Router> = Symbol('__ROUTER__')
export const routeKey: InjectionKey<Ref<RouteLocationNormalized>  > = Symbol('__ROUTE__')

export function createRouter(options: RouterOptions): Router {
  const currentRoute = shallowRef<RouteLocationNormalized>(
    START_LOCATION_NORMALIZED,
  )
  const routes = options.routes || []
  const beforeGuards: NavigationGuard[] = []
  const afterGuards: NavigationHookAfter[] = []

  // -------------------------
  // 核心跳转逻辑
  // -------------------------
  function resolve(to: RouteLocationRaw): RouteLocationNormalized {
    if (typeof to === 'string') {
      return resolvePath(to)
    }
    // 处理 name 匹配
    if (to.name) {
      const route = routes.find(r => r.name === to.name)
      if (!route) {
        throw new Error(`您正在尝试访问的路由 '${to.name}' 未在路由表中定义。请检查您的路由配置。`)
      }
      // 合并 params
      const path = fillParams(route.path, to.params)
      const finalQuery = to.params || {}
      return {
        path,
        name: to.name,
        params: to.params || {},
        query: finalQuery,
        hash: to.hash || '',
        fullPath: stringifyQuery(path, finalQuery),
        meta: route.meta || {},
        style: route.style || {},
        ...Object.fromEntries(
          Object.entries(route).filter(([key]) => !['path', 'name', 'meta', 'style', 'aliasPath'].includes(key))
        )
      }
    }

    // 处理 path 匹配
    if (to.path) {
      return resolvePath(to.path, to.query)
    }

    return { ...START_LOCATION_NORMALIZED }
  }

  function resolvePath(path: string, query?: LocationQuery): RouteLocationNormalized {
    // 简单查找
    // 注意：这里没有实现复杂的正则匹配，仅做简单全等或前缀匹配
    // 暂不使用 path-to-regexp
    const normalizedPath = normalizeUrl(path.split('?')[0])
    const route = routes.find(
      r => r.path === normalizedPath || r.aliasPath === normalizedPath,
    )

    if (!route) {
      throw new Error(`您正在尝试访问的路由 '${normalizedPath}' 未在路由表中定义。请检查您的路由配置。`)
    }

    const urlParams = getUrlParams(path)
    const finalQuery = { ...urlParams, ...(query || {}) }

    return {
      path: normalizedPath,
      name: route?.name,
      params: {},
      query: finalQuery,
      hash: '',
      fullPath: stringifyQuery(normalizedPath, finalQuery),
      meta: route?.meta || {},
      style: route?.style || {},
      ...Object.fromEntries(
        Object.entries(route || {}).filter(([key]) => !['path', 'name', 'meta', 'style', 'aliasPath'].includes(key))
      )
    }
  }

  function fillParams(path: string, params?: Record<string, any>): string {
    if (!params)
      return path
    let res = path
    for (const key in params) {
      res = res.replace(new RegExp(`:${key}`, 'g'), String(params[key]))
    }
    return res
  }

  // -------------------------
  // 导航方法
  // -------------------------
  function push(to: RouteLocationRaw) {
    return navigate(to, 'push')
  }
  function replace(to: RouteLocationRaw) {
    return navigate(to, 'replace')
  }
  function replaceAll(to: RouteLocationRaw) {
    return navigate(to, 'replaceAll')
  }
  function pushTab(to: RouteLocationRaw) {
    return navigate(to, 'pushTab')
  }
  function back(back?: RouteBackRaw) {
    if (back === undefined || typeof back === 'number') {
      uni.navigateBack({
        delta: (back ?? 1) as number,
      })
    }
    else {
      uni.navigateBack(back)
    }
  }

  async function navigate(to: RouteLocationRaw, type: NavType, skipGuards = false) {
    const targetLocation = resolve(to)
    const fromLocation = unref(currentRoute)

    // 1. 执行前置守卫
    if (!skipGuards) {
      try {
        await runGuardQueue(beforeGuards, targetLocation, fromLocation)
      }
      catch (error: any) {
        if (error && (error.message === 'NavigationCancelled' || error.message === 'NavigationRedirect')) {
          if (error.message === 'NavigationRedirect' && error.to) {
            return navigate(error.to, type, true)
          }
          return Promise.reject(error)
        }
        return Promise.reject(error)
      }
    }

    // 2. 执行实际跳转
    const url = targetLocation.fullPath
    // 优先使用参数中的 navType
    const finalType
      = (typeof to === 'object' && to.navType) || type || 'push'

    try {
      await performUniNavigate(finalType, url)

      // 3. 更新当前路由
      // 这里移除主动更新，完全依赖 syncRouteFromPage (页面 onLoad/onShow) 来更新状态
      // 这样可以避免 API 跳转和页面生命周期双重触发 afterEach 的问题

      // 4. 执行后置守卫
      // 移至 syncRouteFromPage 中触发，确保页面加载完成后执行

      return Promise.resolve()
    }
    catch (error: any) {
      return Promise.reject(error)
    }
  }

  function performUniNavigate(type: NavType, url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const success = () => resolve()
      const fail = (error: any) => {
        reject(new Error(`Navigation failed: ${error.message || error.errMsg || 'Unknown error'}`))
      }

      switch (type) {
        case 'push':
          uni.navigateTo({ url, success, fail })
          break
        case 'replace':
          uni.redirectTo({ url, success, fail })
          break
        case 'pushTab':
          uni.switchTab({ url, success, fail })
          break
        case 'replaceAll':
          uni.reLaunch({ url, success, fail })
          break
        case 'back':
          uni.navigateBack({ success, fail })
          break
        default:
          uni.navigateTo({ url, success, fail })
      }
    })
  }

  // -------------------------
  // 守卫执行器
  // -------------------------
  async function runGuardQueue(
    guards: NavigationGuard[],
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
  ) {
    for (const guard of guards) {
      await new Promise<void>((resolve, reject) => {
        const next: NavigationGuardNext = (val) => {
          ;(next as any)._called = true
          if (val === false) {
            reject(new Error('NavigationCancelled'))
          }
          else if (val === undefined || val === true) {
            resolve()
          }
          else {
            const error = new Error('NavigationRedirect')
            ;(error as any).to = val
            reject(error)
          }
        }

        const guardReturn = guard(to, from, next)
        let guardCall = Promise.resolve(guardReturn)

        if (guard.length < 3) {
          guardCall = guardCall.then(next)
        }
        else {
          const message = `The "next" callback was never called inside of ${
            guard.name ? `"${guard.name}"` : ''
          }:\n${guard.toString()}\n. If you are returning a value instead of calling "next", make sure to remove the "next" parameter from your function.`

          if (guardReturn !== null && typeof guardReturn === 'object' && 'then' in guardReturn) {
            guardCall = guardCall.then((resolvedValue) => {
              if (!(next as any)._called) {
                console.warn(message)
                return Promise.reject(new Error('Invalid navigation guard'))
              }
              return resolvedValue
            })
          }
          else {
            if (!(next as any)._called) {
              console.warn(message)
              reject(new Error('Invalid navigation guard'))
              return
            }
          }
        }

        guardCall.catch((err) => reject(err))
      })
    }
  }

  // -------------------------
  // 注册 API
  // -------------------------
  function beforeEach(guard: NavigationGuard) {
    beforeGuards.push(guard)
    return () => {
      const i = beforeGuards.indexOf(guard)
      if (i > -1)
        beforeGuards.splice(i, 1)
    }
  }

  function afterEach(guard: NavigationHookAfter) {
    afterGuards.push(guard)
    return () => {
      const i = afterGuards.indexOf(guard)
      if (i > -1)
        afterGuards.splice(i, 1)
    }
  }

  // -------------------------
  // Install
  // -------------------------
  function install(app: App) {
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
          syncRouteFromPage(router, query, afterGuards)
        }
      },
      onShow() {
        if (this.$mpType === 'page') {
          syncRouteFromPage(router, undefined, afterGuards)
        }
      },
    })
  }

  function syncRouteFromPage(router: Router, query?: any, afterGuards?: NavigationHookAfter[]) {
    // 获取当前页面栈栈顶
    const pages = getCurrentPages()
    const page = pages[pages.length - 1] as any
    if (page && page.route) {
      const fullPath = page.$page?.fullPath || `/${page.route}`
      const q = query || getUrlParams(fullPath)

      // 避免重复更新
      const newPath = `/${page.route}`
      const newFullPath = fullPath.startsWith('/') ? fullPath : `/${fullPath}`

      // 如果当前路由已经是最新，则跳过更新（避免重复触发）
      if (router.currentRoute.value.fullPath === newFullPath) {
        return
      }

      const from = unref(router.currentRoute)

      // 查找 route 配置以获取 name/meta
      const matched = router.routes.find(r => r.path === newPath || r.aliasPath === newPath)

      if (!matched) {
        console.warn(`[router] 路由 '${newPath}' 未在路由表中定义，但页面已加载。请检查您的路由配置。`)
      }

      const to: RouteLocationNormalized = {
        path: newPath,
        name: matched?.name,
        meta: matched?.meta || {},
        params: {},
        query: q,
        hash: '',
        fullPath: fullPath.startsWith('/') ? fullPath : `/${fullPath}`,
        style: matched?.style || {},
        ...Object.fromEntries(
          Object.entries(matched || {}).filter(([key]) => !['path', 'name', 'meta', 'style', 'aliasPath'].includes(key))
        )
      }

      router.currentRoute.value = to

      // 触发后置守卫（针对原生跳转/返回）
      afterGuards?.forEach(guard => guard(to, from))
    }
  }

  const router: Router = {
    currentRoute,
    routes,
    push,
    replace,
    replaceAll,
    pushTab,
    back,
    beforeEach,
    afterEach,
    install,
  }

  return router
}
