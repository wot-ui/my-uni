import { useRouter } from '@wot-ui/router'

// @expect:path ["/pages/home", "/pages/unnamed", "/shop/detail"]
// @expect:name ["home", "detail"]

// 测试脚本将真实生成器的输出加入这个独立项目。
const router = useRouter()
router.push({ path: '/pages/home' }) // @complete:path
router.push({ name: 'home' }) // @complete:name
router.push('/shop/detail?id=1')
router.push('/pages/unnamed')
// @ts-expect-error 生成结果启用了严格模式
router.push({ name: 'unknown' })
// @ts-expect-error 分包页面必须使用完整路径
router.push('/detail')
