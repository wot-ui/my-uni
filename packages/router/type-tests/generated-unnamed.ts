import { useRouter } from '@wot-ui/router'

// @expect:path ["/pages/unnamed"]
// @expect:name []

// 测试脚本注入无名称页面的严格模式声明；按路径导航仍然可用。
const router = useRouter()
router.push({ path: '/pages/unnamed' }) // @complete:path
router.push('/pages/unnamed?from=share')
// @ts-expect-error 未配置 name 时不能按名称导航
router.push({ name: 'unknown' }) // @complete:name
