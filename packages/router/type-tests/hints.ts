import type { Router } from '@wot-ui/router'
import { createRouter, useRouter } from '@wot-ui/router'

declare module '@wot-ui/router' {
  interface RouterTypeConfig {
    path: '/pages/home' | '/shop/detail'
    name: 'home' | 'detail'
  }
}

const router = createRouter({ routes: [{ path: '/pages/home', name: 'home' }] })
const injected = useRouter()
declare const typed: Router
router.push({ path: '/pages/home' }) // @complete:path
router.push({ name: 'home' }) // @complete:name
router.push('/pages/home') // @complete:path
injected.replace({ name: 'home' }) // @complete:name
injected.replaceAll({ path: '/pages/home' }) // @complete:path
typed.pushTab({ name: 'home' }) // @complete:name
router.beforeEach((_to, _from, next) => {
  next({ path: '/pages/home' }) // @complete:path
  next({ name: 'home' }) // @complete:name
})
router.beforeEach(() => ({ name: 'home' })) // @complete:name
router.beforeEach(async () => ({ path: '/pages/home' })) // @complete:path

declare const dynamic: string
router.push(dynamic)
router.push({ path: dynamic })
router.push({ name: dynamic })
router.push('/pages/home?keyword=test')
router.replace({ path: '/legacy/path' })
// @ts-expect-error 补全模式不放宽非字符串类型
router.push({ path: 123 })
