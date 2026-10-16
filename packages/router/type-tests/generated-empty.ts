import { useRouter } from '@wot-ui/router'

// @expect:path []
// @expect:name []

// 测试脚本注入空元数据的严格模式声明；已注册的空集合不能回退为 string。
const router = useRouter()
// @ts-expect-error 空路由没有可导航路径
router.push({ path: '/unknown' }) // @complete:path
// @ts-expect-error 空路由没有可导航名称
router.push({ name: 'unknown' }) // @complete:name
// @ts-expect-error 字符串导航同样受到约束
router.push('/unknown')
