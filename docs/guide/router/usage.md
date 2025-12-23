# 入门

## 编程式导航

>注意：这里`name` 和 `params`搭配使用，而`path` 可以与 `query` 一起使用。

### 基础用法

```ts
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from '@wot-ui/router'
import { getCurrentInstance } from 'vue'

// 使用hooks（推荐）
let router = useRouter()

// 或者 使用全局挂载的router
router = instence?.appContext.config.globalProperties.$Router

// 字符串路径
router.push('/user')

// 带有路径的对象
router.push({ path: '/user' })

// 命名的路由，并加上参数，让路由建立 url
router.push({ name: 'user', params: { username: 'eduardo' } })

// 带查询参数，结果是 /user?username=eduardo
router.push({ path: '/user', query: { username: 'eduardo' } })

// 指定跳转类型（覆盖默认的 push）
router.push({ path: '/user', navType: 'replace' })

// 带动画配置
router.push({ path: '/user', animationType: 'slide-in-right', animationDuration: 300 })

// 带 hash
router.push({ path: '/user', hash: '#section' })

</script>
```

### RouteLocationRaw 参数说明

`RouteLocationRaw` 可以是字符串或对象，对象形式支持以下属性：

| 属性 | 类型 | 描述 |
| --- | --- | --- |
| path | `string` | 路由路径 |
| name | `string \| symbol` | 路由名称 |
| params | `RouteParams` | 路由参数（与 name 搭配使用） |
| query | `LocationQuery` | 查询参数（与 path 搭配使用） |
| hash | `string` | URL hash 值 |
| replace | `boolean` | 是否使用 replace 方式跳转 |
| navType | `NavType` | 跳转类型：`'push'` \| `'replace'` \| `'replaceAll'` \| `'pushTab'` |
| animationType | `AnimationType` | 窗口动画类型 |
| animationDuration | `number` | 窗口动画持续时间，单位为 ms |

### RouteRecordRaw 路由配置说明

路由表中的每个路由配置支持以下属性：

| 属性 | 类型 | 描述 |
| --- | --- | --- |
| path | `string` | 路由路径 |
| name | `string \| symbol` | 路由名称（用于命名路由跳转） |
| meta | `RouteMeta` | 路由元信息（可存储任意自定义数据） |
| aliasPath | `string` | 路由别名路径（兼容旧版） |

```ts
// 示例：在 pages.json 中配置路由
{
  "path": "pages/user/User",
  "name": "user",
  "meta": {
    "title": "用户中心",
    "requiresAuth": true
  }
}

// 使用 meta 信息
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    next({ name: 'login' })
  } else {
    next()
  }
})
```

在user.vue接收传入的对象参数
```ts
<script setup lang="ts">
onLoad((option) => {
  if (option && option.username) {
    const username = option.username
  }
})
</script>
```
### 传递对象参数
url有长度限制，太长的字符串会传递失败，可改用[窗体通信](https://uniapp.dcloud.net.cn/tutorial/page.html#%E9%A1%B5%E9%9D%A2%E9%80%9A%E8%AE%AF)、[全局变量](https://ask.dcloud.net.cn/article/35021)，另外参数中出现空格等特殊字符时需要对参数进行编码，如下为使用encodeURIComponent对参数进行编码的示例。

```ts
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from '@wot-ui/router'
import { getCurrentInstance } from 'vue'

let router = useRouter()

const user = {
  name:'小星星',
  label:"小熊熊"
}

// 命名的路由，传递对象参数
router.push({ name: 'user', params: { user: encodeURIComponent(JSON.stringify(user)) } })

// path+query，传递对象参数
router.push({ path: '/user', query: { user: encodeURIComponent(JSON.stringify(user)) } })

</script>
```
在user.vue接收传入的对象参数
```ts
<script setup lang="ts">
onLoad((option) => {
  if (option && option.user) {
    const user = JSON.parse(decodeURIComponent(option.user))
  }
})

// 返回
function back() {
  router.back()
}
</script>
```


## 导航守卫

`uni-mini-router`支持`全局前置导航守卫 beforeEach`和`全局后置导航守卫 afterEach`，主要用来通过跳转或取消的方式守卫导航。

#### 全局前置守卫 beforeEach
你可以使用 `router.beforeEach` 注册一个全局前置守卫：

```ts
const router = createRouter({ ... })

router.beforeEach((to, from, next) => {
  // next入参 false 以取消导航
  next(false)
})
```

##### `beforeEach`守卫方法接收三个参数：
- `to`: 即将要进入的目标
- `from`: 当前导航正要离开的路由
- `next`: 用于resolve `beforeEach`钩子，需要确保 `next` 在导航守卫中都被严格调用一次

**next 参数说明：**

| 调用方式 | 描述 |
| --- | --- |
| `next()` | 执行默认路由跳转逻辑 |
| `next(false)` | 终止跳转逻辑，取消导航 |
| `next({ path: '/' })` | 重定向到不同的页面 |
| `next({ path: '/', navType: 'replaceAll' })` | 改变当前跳转类型并跳转到不同的页面 |

**导航守卫支持多种返回方式：**

```ts
// 方式1：使用 next 回调
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth) {
    next({ name: 'login' })
  } else {
    next()
  }
})

// 方式2：返回 Promise
router.beforeEach(async (to, from, next) => {
  const isAuthenticated = await checkAuth()
  if (!isAuthenticated) {
    next(false)
  } else {
    next()
  }
})

// 方式3：同步返回值
router.beforeEach((to, from) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    return { name: 'login' }
  }
  return true
})
```

**beforeEach 返回值：**
注册守卫后会返回一个函数，调用该函数可以移除对应的守卫：

```ts
const removeGuard = router.beforeEach((to, from, next) => {
  console.log('导航守卫')
  next()
})

// 移除守卫
removeGuard()
```

### 全局后置钩子 afterEach
你也可以注册全局后置钩子，然而和守卫不同的是，这些钩子不会接受 next 函数也不会改变导航本身

```ts
const router = createRouter({ ... })

router.afterEach((to, from) => {
  console.log(to)
  console.log(from)
})
```

它对于分析、更改页面标题、声明页面等辅助功能以及许多其他事情都很有用。

**afterEach 返回值：**
注册后置钩子后会返回一个函数，调用该函数可以移除对应的钩子：

```ts
const removeHook = router.afterEach((to, from) => {
  console.log('页面切换完成')
})

// 移除钩子
removeHook()
```

**注意：**
- 后置钩子不接收 `next` 函数
- 后置钩子无法改变导航本身
- 原生跳转（如 `uni.navigateTo`）也会触发后置钩子
- `onShow` 生命周期会更新路由信息并触发后置钩子

