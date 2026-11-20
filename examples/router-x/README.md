# Router x 同包入口示例

本分支提供实验性 `@wot-ui/router/x`。默认 `@wot-ui/router` 仍服务旧 uni-app；两者共享导航与守卫实现。不要在同一个应用同时安装两种入口。

## 准备与运行

在仓库根目录执行：

```sh
node scripts/prepare-router-x.mjs
```

脚本构建并 pack 本地库，将 tarball 解包到本示例的 node_modules，仅替换 `@wot-ui/router`；不会链接库源码，也不会升级旧工程依赖。包哈希和路径记在 `unpackage/package-source.json`。路由信息插件 `@wot-ui/router/vite` 和生成器 `@wot-ui/router/typed-routes` 仅用于 Node 构建阶段。

用支持 App Vapor + TypeScript 的 HBuilder 工具链单独打开本目录。Web/微信目前按 SDK 的 VDOM 目标编译；App 选择 Vapor，验证日志中的脚本语言与 bytecode 目标。2026-11-15 的验收使用 `5.36.2026111207-alpha`，不是跨版本最低支持承诺。微信还需要支持路由事件的基础库（官方说明 ≥3.5.5）。不要用根目录旧 uni-app CLI 代替 x 编译。

本目录是独立消费与行为探针，不是完整产品 Demo。正式支持状态和分平台证据见 [实现记录](../../docs/research/router-uni-app-x-implementation.md)。运行原生目标前检查宿主和设备是否被其他测试占用。

## 页面配置

页面注册、样式和分包维护在 `pages.json`；路由信息插件只读取它，不扫描页面或改写文件：

```ts
import { viteRouterInfo } from '@wot-ui/router/vite'

export default {
  plugins: [
    viteRouterInfo({
      pages: 'pages.json',
      dts: 'typed-router.d.ts',
    }),
  ],
}
```

入口或 `router.ts` 增加 `/// <reference types="@wot-ui/router/client" />` 以获得 `virtual:uni-pages` 类型。需要按名称跳转时，在 `pages.json` 页面项中增加 `name`；插件会生成对应的 `typed-router.d.ts`。

## 安装与状态同步

```ts
import { createRouter, useRoute, useRouter } from '@wot-ui/router/x'

const router = createRouter({
  routes: [{ path: '/pages/detail/index', name: 'detail' }],
})
// 在 createApp 内、页面启动前调用：
app.use(router)
```

`push/replace/replaceAll/pushTab/back`、`beforeEach/beforeResolve/afterEach`、路由级 `beforeEnter`、`currentRoute/routes` 保留旧库的导航契约。`useRoute`、`useRouter` 从 `/x` 导入。**App Vapor 不支持 `$Route`/`$Router`，模板和脚本都不要依赖它们**；Vapor 页面必须使用 setup 返回的 `useRoute()`/`useRouter()`。`app.config.globalProperties` 上的同名属性仅继续服务 Web/小程序 VDOM 与既有兼容场景，不属于 App Vapor 契约。x 使用 `uni.onAppRoute/offAppRoute`，不会注册全局 mixin。

**App Vapor 不要依赖全局属性。** Android/iOS 模拟器实测 `<text>{{ $Route.fullPath }}</text>` 会被编译成裸标识符并抛 `ReferenceError`；示例的 `route-status` 已改用 `useRoute()`。即使脚本侧仍能访问全局 getter，也不属于 Vapor 支持范围。

## H5 的 vue-router 守卫托管

uni-app x 的 H5 运行时内部已经使用 vue-router。`/x` 会在内部 vue-router 安装前桥接一个守卫宿主：`beforeEach`、`beforeEnter`、`beforeResolve`、`afterEach` 均由同一个 Vue Router 导航流程执行。标准 H5 插件顺序下，首次 `appLaunch`、普通 API 跳转、tabBar、History 后退和直接调用 `uni.navigateTo` 都会进入守卫流水线，`currentRoute` 也会在 vue-router 完成后同步。uni H5 内部会对导航 URL 的 query 再编码一次，桥接会按原始 resolved query 恢复守卫输入；直接 `uni.navigateTo` 和字面量百分号参数不会因此被二次解码。

H5 想使用 vue-router 原生能力时，可通过内部实例注册额外钩子，但不要另外创建第二个 vue-router：

```ts
const vueRouter = (getApp() as any).$router
vueRouter.afterEach((to) => {
  console.log('native vue-router afterEach', to.fullPath)
})
```

导航仍应优先调用 `router.push` 或 `uni.navigateTo`。直接调用 `$router.push` 需要自己提供 uni 页面状态，不属于跨端稳定契约。

**非 H5 的自动同步发生在成功路由事件阶段，晚于页面 onShow。** App Vapor、小程序没有可等待的全局 vue-router 守卫宿主；如果页面需要在 onLoad 里使用最新的全局路由，显式提前同步：

```ts
import { onLoad } from '@dcloudio/uni-app'
import { useRouter } from '@wot-ui/router/x'

const router = useRouter()
onLoad((query) => {
  router.syncRoute(query)
  console.log(router.currentRoute.value.query)
})
```

这里传入 onLoad query 即可。Web/App 的 onLoad query 通常已解码，微信 VDOM 则可能在 `onLoad` 和 `onAppRoute` 中保留 URL 编码。`/x` 通过页面对象的 `__wxWebviewId__` 或运行时 `uniPlatform === 'mp-weixin'` 识别微信 VDOM；命中后会对 query 安全执行一次 `decodeURIComponent`，其他目标保持原值。冷启动时即使 `onAppRoute` 早于页面入栈，也会按运行时平台识别并归一化。业务侧不要再次手动解码，避免二次解码；也不要把 UniPage.options 当成跨端同编码的数据。`syncRoute` 读取主栈栈顶路径，因此只在活动主页面中调用，不在 dialogPage 或后台页面中调用。

提前同步与后续成功事件按 fullPath 去重，不增加相同路由的 afterEach 次数。`useRoute` 的投影由 Vue watch 更新；同一个同步调用栈内需要读立即值时用 `router.currentRoute.value`，模板更新遵守 Vue 调度。

晚安装不会收到过去的事件，初始 currentRoute 保持 `/`，直到下一次成功事件或显式 `syncRoute(savedOnLoadQuery)`。缺少路由事件 API 时安装明确报错，不自动退回不兼容的 mixin。

`router.dispose()` 移除自身监听并恢复本实例接管的全局属性/卸载函数；应用 `unmount()` 也会清理。HMR 如复用同一个 App 并创建新 router，会先清理旧实例。主动 dispose 后应销毁/重建应用，不把原有组件的注入当作已经替换。它不取消已发起的导航或 Promise，也不移除其他业务的路由监听。

## 类型与既有边界

`viteRouterInfo()` 会用 `pages.json` 生成对 `@wot-ui/router` 的模块增强，`/x` 使用同一套类型；无需另外生成第二套路由表。也可以只用 CLI 生成。手写增强时也要先导入主模块（生成器已自动包含）：

```ts
import '@wot-ui/router'
declare module '@wot-ui/router' {
  interface RouterTypeConfig {
    path: '/pages/detail/index'
    name: 'detail'
    strict: true
  }
}
```

- `router.back()` 返回 void，且不走 beforeEach；通过对象 navType 调用 back 是另一条原有路径。
- H5 由内部 vue-router 托管，直接 uni 调用、tabBar 和 History 后退也会执行异步守卫。
- 非 H5 只有 `router.push/replace/replaceAll/pushTab` 及带 `navType` 的对象导航会执行异步前置守卫；直接 uni 调用、navigator、原生 tabBar、系统返回只做事后状态同步。
- 非 H5 无法用 `onBackPress` 或 `addInterceptor` 等价实现可等待的系统返回/侧滑取消；不要把 H5 的返回守卫行为直接外推到 App Vapor。
- 重定向跳过第二轮守卫；并发导航没有新增排队/取消策略。
- H5 守卫重定向只映射 vue-router 的 `replace`；`navType` 的 `pushTab`/`replaceAll` 不会通过 vue-router 重定向保留。
- 暂未实现 `onBeforeRouteLeave`、`onBeforeRouteUpdate`、`onBeforeRouteEnter` 等组件内守卫。
- 监听主页面路由，暂不增加 dialogPage 路由功能。
- 样式类型、动画、别名和 hash 的既有定义不代表各 x 目标都支持。
- peer 范围调整为 `^3.4.21`，容纳本轮 SDK 的 Vue 3.4.21 与旧工程 3.4.38；旧工程锁定的 Vue 与 DCloud 依赖没有升级。

## 本地检查

```sh
pnpm -F @wot-ui/router exec vitest run
pnpm -F @wot-ui/router test:types
pnpm -F @wot-ui/router test:package
```

`test:package` 在临时目录测试 tarball 内的 ESM/CJS 入口及运行时依赖边界，仅从测试环境提供 Vue peer。它不能替代 x 编译和设备验收。现有 CI 已加入此检查；远端 CI 需提交后另行观察。
