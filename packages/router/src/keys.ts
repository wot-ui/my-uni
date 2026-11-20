import type { InjectionKey, Ref } from 'vue'
import type { RouteLocationNormalized, Router } from './types'

export const routerKey: InjectionKey<Router> = Symbol('__ROUTER__')
export const routeKey: InjectionKey<Ref<RouteLocationNormalized>> = Symbol('__ROUTE__')
