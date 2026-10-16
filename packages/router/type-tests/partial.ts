import { useRouter } from '@wot-ui/router'

// @expect:name ["home", "detail"]

declare module '@wot-ui/router' {
  interface RouterTypeConfig {
    name: 'home' | 'detail'
    strict: true
  }
}

const router = useRouter()
router.push({ name: 'home' }) // @complete:name
// 未注册 path 时，即使开启严格模式也保持兼容。
declare const dynamicPath: string
router.push(dynamicPath)
router.push({ path: dynamicPath })
// @ts-expect-error 只约束已经注册的 name
router.push({ name: 'typo' })
