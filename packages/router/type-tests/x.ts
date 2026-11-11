import { createRouter, useRoute, useRouter } from '@wot-ui/router/x'
import '@wot-ui/router'

// @expect:path ["/pages/home", "/shop/detail"]
// @expect:name ["home", "detail"]

declare module '@wot-ui/router' {
  interface RouterTypeConfig {
    path: '/pages/home' | '/shop/detail'
    name: 'home' | 'detail'
    strict: true
  }
}

const router = createRouter({ routes: [{ path: '/pages/home', name: 'home' }] })
router.push('/pages/home') // @complete:path
useRouter().push({ name: 'home' }) // @complete:name
router.syncRoute({ id: '1' })
router.dispose()
useRouter().syncRoute({})
useRoute().fullPath.toUpperCase()
// @ts-expect-error x 入口同样使用主入口的模块增强
router.push('/pages/typo')
// @ts-expect-error 守卫重定向同样使用增强后的名称
router.beforeEach(() => ({ name: 'typo' }))
