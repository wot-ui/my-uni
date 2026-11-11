import type { App } from 'vue'
import type {
  LocationQuery,
  NavigationGuard,
  NavigationGuardNext,
  NavigationHookAfter,
  NavType,
  RouteBackRaw,
  RouteLocationNormalized,
  RouteLocationObject,
  RouteLocationRaw,
  Router,
  RouterOptions,
} from './types'
import { shallowRef, unref } from 'vue'
import { START_LOCATION_NORMALIZED } from './types'
import { getUrlParams, normalizeUrl, stringifyQuery } from './utils'

/** 内部平台边界，不从包入口导出。 */
export type SyncRoute = (path: string, query: LocationQuery) => void
export type InstallRouter = (app: App, router: Router, syncRoute: SyncRoute) => void

export function createRouterCore(options: RouterOptions, install: InstallRouter): Router {
  const currentRoute = shallowRef<RouteLocationNormalized>(START_LOCATION_NORMALIZED)
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
          Object.entries(route).filter(([key]) => !['path', 'name', 'meta', 'style', 'aliasPath'].includes(key)),
        ),
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
        Object.entries(route || {}).filter(([key]) => !['path', 'name', 'meta', 'style', 'aliasPath'].includes(key)),
      ),
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
      await performUniNavigate(finalType, url, typeof to === 'object' ? to : undefined)

      // 3. 更新当前路由
      // 这里移除主动更新，完全依赖 平台适配器的路由同步 来更新状态
      // 这样可以避免 API 跳转和页面生命周期双重触发 afterEach 的问题

      // 4. 执行后置守卫
      // 移至 平台适配器的路由同步中触发，确保页面加载完成后执行

      return Promise.resolve()
    }
    catch (error: any) {
      return Promise.reject(error)
    }
  }

  function performUniNavigate(
    type: NavType,
    url: string,
    location?: RouteLocationObject,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const success = () => resolve()
      const fail = (error: any) => {
        reject(new Error(`Navigation failed: ${error.message || error.errMsg || 'Unknown error'}`))
      }

      switch (type) {
        case 'push': {
          const navOptions = location?.navType !== 'back' ? location : undefined
          uni.navigateTo({
            url,
            success,
            fail,
            animationType: navOptions?.animationType as UniNamespace.NavigateToOptions['animationType'],
            animationDuration: navOptions?.animationDuration,
          })
          break
        }
        case 'replace':
          uni.redirectTo({ url, success, fail })
          break
        case 'pushTab':
          uni.switchTab({ url, success, fail })
          break
        case 'replaceAll':
          uni.reLaunch({ url, success, fail })
          break
        case 'back': {
          const navOptions = location?.navType === 'back' ? location : undefined
          uni.navigateBack({
            success,
            fail,
            delta: navOptions?.delta,
            animationType: navOptions?.animationType as UniNamespace.NavigateBackOptions['animationType'],
            animationDuration: navOptions?.animationDuration,
          })
          break
        }
        default: {
          const navOptions = location?.navType !== 'back' ? location : undefined
          uni.navigateTo({
            url,
            success,
            fail,
            animationType: navOptions?.animationType as UniNamespace.NavigateToOptions['animationType'],
            animationDuration: navOptions?.animationDuration,
          })
        }
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

        guardCall.catch(err => reject(err))
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
    install: app => install(app, router, syncRoute),
  }

  function syncRoute(newPath: string, q: LocationQuery) {
  // 避免重复更新
    const newFullPath = stringifyQuery(newPath, q)

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
      fullPath: newFullPath,
      style: matched?.style || {},
      ...Object.fromEntries(
        Object.entries(matched || {}).filter(([key]) => !['path', 'name', 'meta', 'style', 'aliasPath'].includes(key)),
      ),
    }

    router.currentRoute.value = to

    // 触发后置守卫（针对原生跳转/返回）
    afterGuards.forEach(guard => guard(to, from))
  }

  return router
}
