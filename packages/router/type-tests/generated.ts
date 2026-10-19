import { useRouter } from '@wot-ui/router'

// @expect:path ["/home", "/pages/home", "/pages/unnamed", "/product", "/shop/detail"]
// @expect:name ["home", "detail"]

// 测试脚本将真实生成器的输出加入这个独立项目。
const router = useRouter()
router.push({ path: '/pages/home' }) // @complete:path
router.push({ name: 'home' }) // @complete:name
router.push('/shop/detail?id=1')
router.push('/pages/unnamed')
router.push('/home?from=share')
router.push('/product') // @complete:path
// @ts-expect-error 分包别名保持原样，不拼接 root
router.push('/shop/product')
// @ts-expect-error 别名只注册为路径，不作为名称
router.push({ name: '/home' })
// @ts-expect-error 生成结果启用了严格模式
router.push({ name: 'unknown' })
// @ts-expect-error 分包页面必须使用完整路径
router.push('/detail')
