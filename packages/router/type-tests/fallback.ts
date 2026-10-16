import type { RouteLocationRaw, RouteName, RoutePath } from '@wot-ui/router'
import { createRouter, useRouter } from '@wot-ui/router'

const path: RoutePath = '/any/path?query=1'
const name: RouteName = 'any-name'
const location: RouteLocationRaw = { path, name }
const router = createRouter({ routes: [{ path, name }] })
router.push(location)
useRouter().replace(path)
router.beforeEach((_to, _from, next) => next({ name }))
router.beforeEach(() => ({ path }))
// @ts-expect-error 非字符串名称仍然报错
router.push({ name: 123 })
