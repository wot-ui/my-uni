/*
 * @Author: weisheng
 * @Date: 2025-12-22 14:36:30
 * @LastEditTime: 2026-01-05 18:49:47
 * @LastEditors: weisheng
 * @Description:
 * @FilePath: /my-uni/packages/router/src/index.ts
 * 记得注释
 */
import type { RouteLocationNormalized, Router } from './types'
import { inject, reactive, watch } from 'vue'
import type { Ref } from 'vue'
import { routeKey, routerKey } from './router'

export { createRouter } from './router'
export * from './types'

export function useRouter(): Router {
  const router = inject<Router>(routerKey)
  if (router) {
    return router
  } else {
    throw new Error('useRouter 只可以在 Vue 上下文中使用，请确保你已经正确地注册了 "uni-mini-router" 并且当前正处于 Vue 上下文中')
  }
}

export function useRoute(): RouteLocationNormalized {
  const currentRoute = inject<Ref<RouteLocationNormalized>>(routeKey)
  if (currentRoute) {
    const route = reactive(currentRoute.value)
    watch(currentRoute, (to) => {
      Object.assign(route, to)
    })
    return route as RouteLocationNormalized
  } else {
    throw new Error('useRoute 只可以在 Vue 上下文中使用，请确保你已经正确地注册了 "uni-mini-router" 并且当前正处于 Vue 上下文中')
  }
}
