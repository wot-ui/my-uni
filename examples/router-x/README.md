# Router x 同包入口示例

本分支提供实验性 `@wot-ui/router/x`。默认 `@wot-ui/router` 仍服务旧 uni-app；两者共享导航与守卫实现。不要在同一个应用同时安装两种入口。

## 准备与运行

在仓库根目录执行：

```sh
node scripts/prepare-router-x.mjs
```

脚本构建并 pack 本地库，将 tarball 解包到本示例的 node_modules，仅替换 `@wot-ui/router`；不会链接库源码，也不会升级旧工程依赖。包哈希和路径记在 `unpackage/package-source.json`。生成器 `@wot-ui/router/typed-routes` 仅用于 Node 构建阶段。

用支持 App Vapor + TypeScript 的 HBuilder 工具链单独打开本目录。Web/微信目前按 SDK 的 VDOM 目标编译；App 选择 Vapor，验证日志中的脚本语言与 bytecode 目标。当前实验 SDK 为 `5.33.2026102115-alpha`，不是跨版本最低支持承诺。微信还需要支持路由事件的基础库（官方说明 ≥3.5.5）。不要用根目录旧 uni-app CLI 代替 x 编译。

本目录是独立消费与行为探针，不是完整产品 Demo。正式支持状态和分平台证据见 [实现记录](../../docs/research/router-uni-app-x-implementation.md)。运行原生目标前检查宿主和设备是否被其他测试占用。

## 安装与状态同步

```ts
import { createRouter, useRoute, useRouter } from '@wot-ui/router/x'

const router = createRouter({
  routes: [{ path: '/pages/detail/index', name: 'detail' }],
})
// 在 createApp 内、页面启动前调用：
app.use(router)
```

`push/replace/replaceAll/pushTab/back`、`beforeEach/afterEach`、`currentRoute/routes` 保留旧库的导航契约。`useRoute`、`useRouter` 从 `/x` 导入；`$Router/$Route` 同样安装到应用。x 使用 `uni.onAppRoute/offAppRoute`，不会注册全局 mixin，也不拦截全部 uni API。

**自动同步发生在成功路由事件阶段，晚于页面 onShow。** 如果页面需要在 onLoad 里使用最新的全局路由，显式提前同步：

```ts
import { onLoad } from '@dcloudio/uni-app'
import { useRouter } from '@wot-ui/router/x'

const router = useRouter()
onLoad((query) => {
  router.syncRoute(query)
  console.log(router.currentRoute.value.query)
})
```

这里传入 onLoad 的已解码参数。不要直接把 UniPage.options 当成同一种编码的数据：本轮 Web 实测二者有差异。`syncRoute` 读取主栈栈顶路径，因此只在活动主页面中调用，不在 dialogPage 或后台页面中调用。

提前同步与后续成功事件按 fullPath 去重，不增加相同路由的 afterEach 次数。`useRoute` 的投影由 Vue watch 更新；同一个同步调用栈内需要读立即值时用 `router.currentRoute.value`，模板更新遵守 Vue 调度。

晚安装不会收到过去的事件，初始 currentRoute 保持 `/`，直到下一次成功事件或显式 `syncRoute(savedOnLoadQuery)`。缺少路由事件 API 时安装明确报错，不自动退回不兼容的 mixin。

`router.dispose()` 移除自身监听并恢复本实例接管的全局属性/卸载函数；应用 `unmount()` 也会清理。HMR 如复用同一个 App 并创建新 router，会先清理旧实例。主动 dispose 后应销毁/重建应用，不把原有组件的注入当作已经替换。它不取消已发起的导航或 Promise，也不移除其他业务的路由监听。

## 类型与既有边界

typed-routes 继续生成对 `@wot-ui/router` 的模块增强，`/x` 使用同一套类型；无需另外生成第二套路由表。手写增强时也要先导入主模块（生成器已自动包含）：

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
- 直接 uni 调用、navigator、原生 tabBar、系统返回只做事后状态同步，没有新增全入口异步守卫。
- 重定向跳过第二轮守卫；并发导航没有新增排队/取消策略。
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
