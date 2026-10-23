/// <reference types="@dcloudio/types" />

import type { AnimationBackType, AnimationType, RouteBackLocation, RouteLocationBase, RouteLocationObject, RouteNavigationOptions, Router, RouteRecordRaw } from '@wot-ui/router'

type Equal<A, B> = [A] extends [B] ? [B] extends [A] ? true : false : false
type Assert<T extends true> = T

// 同时检查缺少和多余的动画值，且从构建后的公开入口导入类型。
export type ShowAnimationsMatchUni = Assert<Equal<AnimationType, NonNullable<UniNamespace.NavigateToOptions['animationType']>>>
export type BackAnimationsMatchUni = Assert<Equal<AnimationBackType, NonNullable<UniNamespace.NavigateBackOptions['animationType']>>>

declare const router: Router
declare const show: AnimationType
declare const close: AnimationBackType
router.push({ path: '/pages/home', animationType: show, animationDuration: 300 })
router.back({ delta: 2, animationType: close, animationDuration: 300 })
router.push({ path: '/pages/home', navType: 'back', animationType: close, delta: 2 })
router.replace({ name: 'home', animationType: show })
router.back()
router.back(2)
router.push({ path: '/pages/home', animationType: 'none' })
router.back({ animationType: 'auto' })

const location: RouteLocationObject = { name: 'home', navType: 'back', animationType: 'pop-out' }
router.push(location)
router.beforeEach(() => ({ name: 'home', navType: 'back', animationType: 'pop-out' }))
router.beforeEach((_to, _from, next) => next({ name: 'home', animationType: 'pop-in' }))

const base: RouteLocationBase = { animationType: show }
const back: RouteBackLocation = { animationType: close }
const navigation: RouteNavigationOptions = { ...back, navType: 'back' }
const openingOptions: RouteNavigationOptions = { animationType: 'pop-in', animationDuration: 300 }
router.push({ path: '/pages/home', ...openingOptions })
router.push({ path: '/pages/home', ...navigation })
router.back(navigation)
// 未知方向的配置也应保留 navType 与 animationType 的对应关系。
declare const sharedOptions: RouteNavigationOptions
const composedLocation: RouteLocationObject = { path: '/pages/home', ...sharedOptions }
router.push(composedLocation)
router.beforeEach(() => ({ name: 'home', ...sharedOptions }))
const route: RouteRecordRaw = { path: '/pages/home', style: { 'animationType': show, 'app-plus': { animationType: show } } }
void [base, navigation, route]

// @ts-expect-error 关闭动画的可复用配置必须显式声明返回方向
const missingDirection: RouteNavigationOptions = { animationType: 'pop-out' }
// @ts-expect-error 配置对象自身也应拒绝方向混用
const wrongDirection: RouteNavigationOptions = { navType: 'back', animationType: 'pop-in' }
// @ts-expect-error 不能用展开的返回配置覆盖成前进方向
router.push({ path: '/pages/home', ...navigation, navType: 'push' })
void [missingDirection, wrongDirection]

// @ts-expect-error 页面打开不接受关闭动画
router.push({ path: '/pages/home', animationType: 'slide-out-right' })
// @ts-expect-error 显式 push 同样不接受关闭动画
router.push({ path: '/pages/home', navType: 'push', animationType: 'pop-out' })
// @ts-expect-error 返回不接受显示动画
router.back({ animationType: 'slide-in-right' })
// @ts-expect-error navType back 必须使用关闭动画
router.push({ path: '/pages/home', navType: 'back', animationType: 'pop-in' })
// @ts-expect-error 拒绝未知动画值
router.push({ path: '/pages/home', animationType: 'invalid' })
// @ts-expect-error 返回同样拒绝未知动画值
router.back({ animationType: 'invalid' })
// @ts-expect-error 窗口配置必须使用显示动画
const invalidRoute: RouteRecordRaw = { path: '/pages/home', style: { 'app-plus': { animationType: 'fade-out' } } }
// @ts-expect-error 全局窗口配置必须使用显示动画
const invalidGlobalStyle: RouteRecordRaw = { path: '/pages/home', style: { animationType: 'fade-out' } }
// @ts-expect-error 守卫重定向同样校验动画方向
router.beforeEach(() => ({ name: 'home', navType: 'back', animationType: 'pop-in' }))
void [invalidRoute, invalidGlobalStyle]
