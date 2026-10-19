import type { RouteLocationNormalized, RoutePath } from '@wot-ui/router'
import { createRouter, useRoute } from '@wot-ui/router'

declare module '@wot-ui/router' {
  interface RouterTypeConfig {
    path: '/pages/home' | '/pages/detail/:id'
    strict: true
  }
}

const router = createRouter({ routes: [{ path: '/pages/home' }, { path: '/pages/detail/:id', name: 'detail' }] })
// 运行时路径可以是初始空值或参数展开后的实际地址，不能伪装成注册路径联合。
const actualPath: RouteLocationNormalized['path'] = '/pages/detail/1'
const initialPath: RouteLocationNormalized['path'] = ''
void actualPath
void initialPath

router.beforeEach((to, _from, next) => {
  // @ts-expect-error 守卫中的实际地址仍为 string
  router.push(to.fullPath)
  // @ts-expect-error 回传完整地址也需要调用方确认其有效性
  next(to.fullPath)
  // 仅演示显式断言的类型边界；实际守卫正常放行应调用 next()。
  next(to.fullPath as RoutePath)
  if (to.path === '/pages/home')
    router.push(to.path)
})

const route = useRoute()
// @ts-expect-error 当前路由的路径也不应自动变为 RoutePath
router.push(route.path)
router.push(route.path as RoutePath)
