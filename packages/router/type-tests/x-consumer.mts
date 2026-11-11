import { createRouter } from '@wot-ui/router/x'
import '@wot-ui/router'

declare module '@wot-ui/router' {
  interface RouterTypeConfig {
    path: '/pages/home'
    name: 'home'
    strict: true
  }
}

const router = createRouter({ routes: [{ path: '/pages/home' }] })
router.push('/pages/home')
router.dispose()
// @ts-expect-error ESM 与主入口共用增强后的类型
router.push('/pages/typo')
