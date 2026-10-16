import { createRouter, useRouter } from '@wot-ui/router'

declare module '@wot-ui/router' {
  interface RouterTypeConfig {
    path: '/pages/home' | '/shop/detail'
    name: 'home' | 'detail'
    strict: true
  }
}

const router = createRouter({ routes: [{ path: '/pages/home', name: 'home' }] })
router.push({ path: '/pages/home' }) // @complete:path
useRouter().replace({ name: 'home' }) // @complete:name
router.push('/pages/home') // @complete:path
router.push('/shop/detail?id=1')
router.push({ path: '/shop/detail?id=1', query: { other: 2 } })
router.beforeEach(() => ({ name: 'home' }))
router.beforeEach(async () => ({ path: '/pages/home' }))
router.beforeEach((_to, _from, next) => {
  next({ name: 'home' }) // @complete:name
  // @ts-expect-error 守卫重定向也需要使用已注册名称
  next({ name: 'typo' })
})
// @ts-expect-error 未注册路径
router.push({ path: '/pages/typo' })
// @ts-expect-error 未注册名称
useRouter().replaceAll({ name: 'typo' })
// @ts-expect-error 字符串跳转也需要使用已注册路径
router.push('/pages/typo')
// @ts-expect-error query 不能绕过路径检查
router.push('/pages/typo?id=1')
// @ts-expect-error 返回值重定向也需要使用已注册名称
router.beforeEach(() => ({ name: 'typo' }))
declare const dynamic: string
// @ts-expect-error 严格模式要求动态字符串先收窄类型
router.push(dynamic)
