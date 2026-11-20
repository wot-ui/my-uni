# Router 同包 x 入口实现与验证

2026-11-08 开始实现实验性 `@wot-ui/router/x`；2026-11-11 完成 H5、微信开发者工具以及 Android/iOS 模拟器原生运行验证；2026-11-13 完成五端复测并补齐 HarmonyOS 模拟器的 HAP 构建、本地调试签名、安装与运行验证。2026-11-15 在 5.36 SDK 上完成五端编译与运行验收。页面接入随后收敛为只读的 `viteRouterInfo()`：它只读取 `pages.json`，不再扫描页面或改写 `pages.json`。默认入口保留旧 uni-app 生命周期适配，新增入口共享导航核心并使用 uni-app x 公开路由事件。

当前结论：同包子入口方案已通过类型、制品消费、五端（Android、iOS、HarmonyOS、H5、微信）运行验证、H5 自动化 9 个场景、微信开发者工具 9 个场景，以及 Android/iOS/HarmonyOS 的 Vapor + TS + bytecode 模拟器验收。App Vapor 明确不支持 `$Route`/`$Router`，模板和脚本均需使用 `useRoute()`/`useRouter()`。它还不是生产支持声明：未做真机、低版本基础库和签名发布链路验收。

## 实现内容

| 部分 | 改动 |
| --- | --- |
| 共享核心 | `packages/router/src/core.ts` 承载解析、query、导航分发、守卫队列和 fullPath 去重；新增 `beforeResolve`、路由级 `beforeEnter` 与供平台适配器使用的内部守卫入口 |
| 默认入口 | `router.ts` 保留旧 mixin 与 WeakMap 参数缓存，`index.ts` 保留原公开导出；旧生命周期和导航行为由原有测试覆盖 |
| x 入口 | `x.ts` 导出同名 createRouter/useRouter/useRoute 与原类型；新增 RouterX.syncRoute(query)、RouterX.dispose()；不依赖 mixin、$mpType 或旧 page.$page，通过 `__wxWebviewId__` 或 `uniPlatform === 'mp-weixin'` 识别微信 VDOM 的 query 编码差异 |
| 安装与清理 | 保留 provide/inject；`$Router/$Route` 全局属性仅供 Web/小程序 VDOM 兼容，App Vapor 不支持；检查事件 API 是否存在；同应用重复安装去重；替换实例、unmount 和 dispose 移除自身监听与 H5 vue-router 桥接 |
| H5 守卫桥接 | 在 uni 插件安装内部 vue-router 前注册单一 `beforeEach/afterEach`，把守卫流水线交给 Vue Router；覆盖首次 appLaunch、uni API、tabBar 与 History 后退 |
| 类型与制品 | 主入口和 `/x` 分别声明 ESM/CJS 类型；共用 RouterTypeConfig 模块增强；生成器仍只在 typed-routes Node 子入口 |
| 页面与类型生成接入 | `@wot-ui/router/vite` 的 `viteRouterInfo()` 只读取 `pages.json`，提供 `virtual:uni-pages` / `virtual:wot-pages` 并生成 `typed-router.d.ts`；不扫描页面、不处理 `definePage()` / `pages.config.*`、不写 `pages.json`。`readPagesJson` / `wot-router-types` CLI 继续保留。 |
| peer | Vue peer 调整为 `^3.4.21`，容纳 SDK 的 3.4.21 和旧工程的 3.4.38；没有升级现有 Vue/DCloud 安装，锁文件仅随移除 pages 插件依赖而更新 |
| 示例与检查 | 独立 `examples/router-x` 消费本地 pack 制品；增加 26 项 x 测试、3 个类型 fixture、打包入口/依赖检查，并接入现有 CI |

使用入口：

```ts
import { createRouter, useRoute, useRouter } from '@wot-ui/router/x'
```

完整用法及示例准备命令见 [示例 README](https://github.com/wot-ui/my-uni/blob/c9258a94434a749dd4ad3d48a6ee3a25125bbf1d/examples/router-x/README.md)。`/x` 的入口选择是应用级选择，不在同一应用同时安装 legacy 和 x router。

## 实测后确定的行为边界

**非 H5 的默认同步晚于 onShow。** 非 H5 仍以 `onAppRoute` 成功事件为状态同步来源，页面 onLoad/onShow 阶段的全局路由可能是上一页。需要早期值时，在活动主页面 `onLoad(query)` 内调用 `router.syncRoute(query)`，然后读取 `router.currentRoute.value`；useRoute 投影及模板仍遵守 Vue watch 调度。H5 的 vue-router 桥接会在页面生命周期前完成 `currentRoute` 同步。[官方事件时序](https://doc.dcloud.net.cn/uni-app-x/api/app-route.html)

**App Vapor 不支持全局 `$Route`/`$Router`。** 2026-11-11 Android/iOS 模拟器实测，模板表达式 `$Route.fullPath` 会被编译成裸标识符，运行时报 `ReferenceError: $Route is not defined`，页面无法渲染。`app.config.globalProperties` 的 getter 可在 VDOM 场景继续兼容，但不作为 App Vapor 的模板或脚本契约；示例 `route-status` 已改用 `useRoute()`。

**归一化 query 编码差异。** 首轮 Web 交互发现 UniPage.options 在本 SDK 中可能仍含编码；微信 VDOM 进一步实测，带 `$page` 的页面对象在 `onLoad` 和 `onAppRoute` 中仍可能提供 URL 编码后的 query。若不处理，`syncRoute` 会先多编码一次，随后成功事件再修正并多触发一次 afterEach。最终实现对普通页面保持原 query，通过页面对象 `__wxWebviewId__` 或运行时 `uniPlatform === 'mp-weixin'` 识别微信 VDOM，并安全执行一次解码；后者覆盖冷启动时 `onAppRoute` 早于页面入栈的情况。显式同步只接收 onLoad query，自动同步接收事件 query。同一路由按 fullPath 去重。[页面参数](https://doc.dcloud.net.cn/uni-app-x/page.html)

**API 属性访问必须被编译器看见。** 初版将 uni 保存成别名再访问路由事件，Web 实际运行缺失事件 API；改成直接读取 `uni.onAppRoute` 与 `uni.offAppRoute` 后，SDK 正确收集按需导入。这个问题由浏览器启动发现，mock 安装测试无法证明编译器依赖收集正确。

晚安装不补发历史路由，currentRoute 初始为 `/`，直到下一次成功事件或显式 syncRoute。页面若只需导航完成后的展示状态，无需调用 syncRoute。主栈同步不用于 dialogPage 或后台页面。dispose 清理监听及安装属性，不取消已发起的导航或更换已有组件的注入。

保留的旧行为：back 返回 void 且不进入 beforeEach；重定向跳过第二轮守卫；并发按各守卫完成顺序下发。非 H5 的直接 uni/navigator/tabBar/系统返回没有新增前置守卫，也没有接入 addInterceptor，因此没有引入双重守卫及拦截器取消时 Promise 悬空的新契约。[拦截器范围](https://doc.dcloud.net.cn/uni-app-x/api/interceptor.html)

## H5 vue-router 守卫托管

uni-app H5 的运行时本身通过 `app.use(vueRouter)` 安装内部路由；`initRouter(app)` 会把实例写到 `app.router` / `getApp().$router`。本轮在 `/x` 安装时包装当前 Vue App 的 `app.use`，在检测到 vue-router 形状的插件后、其 `install` 执行前注册桥接，因此首次 `appLaunch` 也能经过守卫。

桥接只注册一对原生钩子：

- 原生 `beforeEach` 调用共享守卫流水线，顺序为全局 `beforeEach` → 匹配路由的 `beforeEnter` → 全局 `beforeResolve`；取消返回 `false`，重定向解析到最终路径后交给 Vue Router 重新导航。
- 原生 `afterEach` 在导航成功时先同步 `currentRoute`，再执行全局 `afterEach`。桥接激活期间，`onAppRoute` 只负责幂等同步，不再重复触发后置钩子。

与普通 uni API 的关系：H5 的 `navigateTo/redirectTo/reLaunch/switchTab` 最终都会调用内部 vue-router 的 `push/replace`，因此守卫对它们生效；浏览器 History 后退也进入同一流程。直接调用内部 `$router.push` 可以触发守卫，但不会自动创建 uni 页面状态，不应作为业务导航入口。

限制：

- 该能力依赖 uni H5 运行时内部实现而不是公开 API；若 SDK 改变 `app.router`/vue-router 插件行为，桥接可能失效。
- 暂未实现 Vue Router 的组件内守卫 `onBeforeRouteLeave/Update/Enter`，也没有复用 Vue Router 的 `beforeResolve` 原生钩子，而是由共享流水线统一执行。
- H5 守卫重定向只把 `navType: 'replace'` 映射为 Vue Router 的 `replace`；`pushTab`/`replaceAll` 不能通过单次 vue-router 重定向表达。
- 非 H5 仍无法对系统返回、iOS 侧滑、navigator、原生 tabBar 实施可等待的异步取消；`onBackPress` 同步且不可 async，`onBeforeAppRoute` 只能同步重写，不能取消。

## 原生模拟器运行验证（历史记录：2026-11-11、2026-11-13，5.33 SDK）

环境：

- Android：`Pixel_3a_API_34_extension_level_7_arm64-v8a`（`emulator-5556`），标准基座 `io.dcloud.uniappx`，Vapor + TS + bytecode。
- iOS：`iPhone 15 Pro (iOS 17.4)` 模拟器，`dcloud.launcher-x-vapor-ios-simulator-arm64-5.33.2026102117` 的 arm64 标准基座，Vapor + TS + bytecode。
- 工具链：HBuilder V `1.129.1-alpha`，uni-app x SDK `5.33.2026102115-alpha`；iOS 资源用 uniapp-cli-vite 编译（11 个 `.bytes` + `app-service.js`）。

已通过的原生场景：

1. 首次启动同步到 `/pages/home/index`，`useRoute` 响应式投影与全局路由一致。
2. 异步 `beforeEach` 后 push 详情页，中文、百分号、`&` 参数只编码一次；`onLoad` 内 `syncRoute` 提前同步，成功事件不重复 afterEach。
3. `beforeEach` 返回 `false` 时页面不离开，`navigate()` 得到 `NavigationCancelled`。
4. 守卫重定向到 `/sub/target?from=guard`，只对最终目标执行 afterEach。
5. `replace` 到分包、系统返回、直接 `uni.navigateTo`、`router.pushTab`、原生 tabBar、`navigator` 到分包均能同步全局路由。
6. iOS 完成首屏同步、push + 守卫 + 参数 + `syncRoute`、返回；Android 额外验证了取消、重定向、replace、tab 与分包。
7. 2026-11-13 重新构建后，Android `app-service.js` SHA-256 为 `305944f86cd8830a133a5f9ecf8c8b06b2ad718512c4e2a077aba211a7cb8f03`，iOS 为 `6b43a631bac98e0fa037342578c47ed60e7ab98d49e210ab0069edfd64c18225`；Android 复测首屏、守卫 push、取消、重定向、直接 uni、navigator、pushTab、tabBar 与系统返回，iOS 由 XCUITest 两组用例覆盖同组场景（含 repeat、replace、reLaunch），两边均无 crash。

本轮发现的环境/兼容问题：

- **App Vapor 不支持 `$Route`/`$Router`。** 模板中的 `$Route.fullPath` 在编译结果里成为裸标识符，运行时报 `ReferenceError`。示例已改用 `useRoute()`；这是 Vapor 平台契约，不是事件同步失败。
- **iOS HBuilder V 运行对话框误报缺少 x86_64 标准基座。** 实际已安装 arm64 基座；本轮复制 arm64 基座并注入 iOS 构建资源到 `uni-app-x/apps/__UNI__uniappx/www`，用 `simctl` 安装/启动完成验证。这是 HBuilder 工具链问题，不是 router 运行问题。
- **iOS 基座会缓存数据容器中的资源。** 只 terminate + install 时仍加载旧 bundle；必须 `simctl uninstall` 后重装（或由 HBuilder 清理缓存）才能确保新产物生效。首次遇到的路由状态不一致可由此解释，不作为库行为结论。
- **手动安装的 iOS 调试基座中 `setTimeout` 未触发。** 连 100ms 日志也未出现，因此定时器驱动的自动交互不可用于该基座；本轮改用 `onShow` 同步触发导航验证。该现象是否只存在于手动基座，需 HBuilder 正常连接运行后再确认。

## H5 与微信开发者工具验证（历史记录：2026-11-11、2026-11-13，5.33 SDK）

环境：

- H5：Chrome headless + CDP，静态服务通过 `python -m http.server 4173` 提供 `unpackage/dist/build/h5-sdk`。
- 微信：开发者工具 Stable `1.06.2504030`，基础库 `3.17.5`，游客模式 `touristappid`，项目目录为 `unpackage/dist/build/mp-weixin-sdk`。
- 两个目标均使用 uniapp-cli-vite `5.33.2026102120.0907`、uni-app x SDK `5.33.2026102115-alpha` 重新构建；日志确认 VDOM 模式和 `DONE Build complete`。

H5 最终重建后的 9 个场景全部通过：首屏同步、异步守卫 push + 编码参数 + `syncRoute`、replace 到分包、返回、取消、守卫重定向、直接 `uni.navigateTo`、`pushTab` + 原生 tabBar、navigator + 浏览器返回；未捕获 JS 异常和控制台错误均为 0。

H5 最终重建还修复了一个 query 编码边界：uni H5 的 `navigateTo` 会在内部对 URL query 再执行一次 `encodeQueryString`。`router.push` 已生成编码后的 `fullPath`，导致 vue-router 守卫收到多编码一层的字符串。`/x` 在 H5 包装导航时记录原始 resolved query，桥接按路径与编码 query 精确匹配后恢复原值；因此守卫、`afterEach` 和 `currentRoute` 都看到业务原始 query，同时直接 `uni.navigateTo` 或带字面量 `%41` 的 Vue Router 导航不会被误二次解码。对应回归测试覆盖普通解码值、字面量百分号序列和 Uni H5 再编码三种情况。

微信开发者工具原计划的 `cli auto --trust-project --port` 仍报 `Port is not provided`，因此改用 `--remote-debugging-port=9222`，通过 CDP 驱动 appservice、活动页面帧和工具底栏。基础库 3.17.5 的页面帧 URL 改为 `instanceframe.html?pageName=...`，验证脚本已兼容旧版按路由命名的页面帧。微信自动化的 9 个场景同样全部通过：首屏同步、异步守卫 push + 编码参数 + `syncRoute`、replace 到分包、返回、取消、守卫重定向、直接 `uni.navigateTo`、`pushTab` + 原生 tabBar、navigator + 返回；未捕获 JS 异常为 0，但开发者工具仍记录 `routeTo ... timeout` 等路由超时日志。

微信 VDOM 本轮发现并修复了两个非 Web 差异：

1. `onLoad` / `onAppRoute` query 对带 `$page` 的页面对象仍可能保持 URL 编码，直接 `syncRoute` 会二次编码。现在按 `__wxWebviewId__` 或 `uniPlatform === 'mp-weixin'` 识别微信 VDOM 并归一化一次；后者覆盖冷启动时路由事件早于页面入栈。
2. 开发者工具在连续 CDP 导航后会出现 `getCurrentPages()` 栈顶滞后，并打印 `routeTo ... timeout`；页面可见路由与页面帧仍可正常使用。验证脚本只在观测层加入可见路由兜底，不改变路由库断言。

## HarmonyOS 模拟器验证（历史记录：2026-11-13）

环境与产物：

- `OpenHarmony-6.0.0.47` 模拟器，UDID `454D5504D4143041524D052C6690FD8E2409D808CF43D5C176D2E00000000000`；DevEco Studio SDK API 20（`compatibleSdkVersion 6.0.0(20)`）。
- `manifest.json` 为 `vapor: true`、`vapor-render-target: bytecode`。按 5.36 launcher 的 `resolveHarmonyTemplatePath` 规则，该组合必须取 `project-dom2-dyn.zip`：`project-x.zip` 是 VDOM 基座，只声明 `@dcloudio/uni-app-x-runtime`，注入 Vapor 构建产物后会因 `index.generated.ets` 引用 `@dcloudio/uni-app-x-vapor-runtime` 而报 `Cannot find module`。
- 工程 `unpackage/verification/harmony-project-dyn/`，资源复制到 `entry/src/main/resources/resfile/uni-app-x/apps/HBuilder/www`；`ohpm install --all` 与 `hvigorw assembleHap --mode module -p product=default -p buildMode=debug --no-daemon` 均成功，`BUILD SUCCESSFUL`，生成 11 个 `.bytes` 文件。
- 调试签名使用 SDK 自带 `OpenHarmony.p12`、`hap-sign-tool.jar`，profile 从 `UnsgnedDebugProfileTemplate.json` 生成：`bundle-name=io.dcloud.uniappx`、`device-ids=[本机 UDID]`、有效期 10 年，证书链按叶子→CA→根顺序提供；`sign-profile` 与 `sign-app` 均成功。设备上旧签名不一致时先 `hdc uninstall`，再安装 `router-x-signed.hap` 并 `aa start`。
- 最终 `app-service.js` SHA-256 为 `f0cc733d806a636a0e77d0a52660f6c37f9531fa032d3c17e11ae069a361120a`，与注入工程内的文件一致。

通过的场景（截图 `harmony-20261113-*.png`，日志 `harmony-20261113-final-hilog.txt` / `harmony-20261113-route-log.txt`）：

1. 首屏同步 `/pages/home/index`，`launch/home-load/home-show/after` 完整。
2. 异步守卫后 push 详情，中文、百分号、`&` 参数编码一次，`beforeEnter`/`beforeResolve`/`after` 顺序正确。
3. 守卫返回 false 时停留在首页，无详情页生命周期。
4. 守卫重定向到 `/sub/target?from=guard`，系统返回后回到首页。
5. 详情页同路径新参数（`id=2`）重新进入并同步 `currentRoute`。
6. `replace` 到 `/sub/target?from=replace`，旧详情页 `onUnload`。
7. 直接 `uni.navigateTo` 后路由状态同步为 `/pages/detail/index?id=native`。
8. `navigator` 组件进入分包 `/sub/target?from=navigator`。
9. `router.pushTab` 进入 `/pages/tab/index`，原生 tabBar 返回首页。
10. `replaceAll`（reLaunch）回首页并卸载两个详情实例。

应用进程日志无 `FATAL`/`Fatal signal`/crash。可复现的限制：模拟器触摸注入与 `hdc shell hilog` 流会互相打断，本轮用 `hilog -x` 分段抓取后再合并；`uinput -T -c` 点击与 `uitest uiInput click` 均可用于 ArkUI 页面，截图坐标需按 1316×2832 物理像素换算。

## 验证结果

| 层次或平台 | 结果 | 证据边界 |
| --- | --- | --- |
| 原单测 + x 单测 | 140/140；覆盖默认入口、x 入口、Vite 插件和类型生成 | Vue/happy-dom 与导航 mock；不代表目标原生栈 |
| 类型与补全 | 15 个 fixture，24 项补全检查通过 | 覆盖 Bundler、NodeNext ESM/CJS、主模块增强约束 x 路径/名称 |
| pack 制品 | 主入口、x、typed-routes、vite 的 ESM/CJS 消费通过；`wot-router-types` CLI 可从打包制品运行，运行时无 Node 模块，x 无 legacy mixin 依赖 | 从 tarball 解包消费，Vue peer 由测试环境提供，不是 npm 联网安装或设备运行 |
| lint | 变更的库源码、类型 fixture、检查脚本通过 | 未升级 lint/编译依赖 |
| 根项目构建 | `pnpm build:h5` 和 `pnpm build:mp-weixin` 通过 | 传统 uni-app 构建 |
| 根项目类型检查 | `pnpm type-check` 仍报既有错误：Router 与 Vue Plugin 类型不匹配、ButtonOpenType/getRealtimePhoneNumber、echarts 的 NodeJS 命名空间 | 与本分支修改无关，需后续单独处理 |
| x Web | 2026-11-15 重新构建；Chrome CDP 自动化 9/9 通过，未捕获异常 0 | VDOM；不是 App Vapor |
| x 微信 | 2026-11-15 重新构建；开发者工具 9/9 通过，未捕获 JS 异常 0 | 游客模式开发者工具，不是真机，不等同基础库下限承诺 |
| x Android | Vapor + TS + bytecode 编译通过；模拟器验收 13/13 检查通过；无 crash | Pixel_3a_API_34 arm64 模拟器 + 标准基座；未签名 APK/真机 |
| x iOS | Vapor + TS + bytecode 编译通过；XCUITest 3/3 通过；无 crash | iPhone 15 Pro 模拟器；未签名 IPA/真机 |
| x HarmonyOS | Vapor + TS + bytecode 编译通过；核心场景 10/10，补充场景 1/1；无 FATAL | OpenHarmony 模拟器；未用 AGC 发布证书、未上架、未真机 |
| 远端 CI | 已补充 pack 检查步骤 | 推送后由 PR CI 执行，Windows 脚本仍由远端 CI 确认 |

H5 与 Web 已观察的场景：

1. 首次启动，组合式 `useRoute` 同步到首页；模板 `$Route` 未纳入 uni-app x 自动化，App Vapor 不支持，Web VDOM 的全局属性安装仅由单元测试覆盖。
2. 异步 beforeEach 允许导航；false 取消返回 NavigationCancelled，页面不离开。
3. name + params 传递中文、百分号、&；显式 onLoad 同步不再重复编码，成功事件不重复 afterEach。
4. 同路径 id=1 → id=2 → back，参数恢复到第一实例。
5. replace 到分包并 back；reLaunch 回首页。
6. 守卫重定向到分包，目的页正确。
7. 直接 uni.navigateTo、navigator 到分包，成功后全局路由同步。
8. router.pushTab 与点击原生 tabBar，切换正确。
9. 浏览器 history back、详情页刷新/直达后，路由与 query 正确。

以上是 H5、微信开发者工具与 Android/iOS/HarmonyOS 模拟器的观察记录，不把表中 X01–X12 全部标为通过。iOS 侧滑完成/取消、Android 系统返回的完整顺序、原生动画、HMR、错误回调的全平台顺序、dialogPage、低版本能力、微信真机、HarmonyOS 真机与 AGC 发布签名仍需验证。

## 工具链与源码对应

- 基线提交：`5de843537bd5077d3ae27c83aa2bfa7a69ff660b`；实现基线分支提交：`00b633d733634e39b14cbe4159566b3ad75c46ed`；本次 PR 还包含后续实现、示例与文档修正。
- 2026-11-08 库源码 SHA-256 汇总：`001b511e7f7fa27cd52405b05ee6e78828d7967122db67ddbe41cd9ee8fa4887`；2026-11-11 为微信 VDOM query 增加兼容归一化，并补齐冷启动时页面栈为空的双重识别；随后为 Uni H5 再编码增加原始 query 恢复。2026-11-13 重新打包与重建后 `x.mjs` 摘要未变，仍为 `ce71b1c389fed72c80a4df85a1790eb632e26f67d0e5d251f34910cf835ae133`。
- 历史工具链（2026-11-13）：HBuilder V `1.129.1-alpha`；SDK 扩展 `5.33.2026102115-alpha`；uniapp-cli-vite 插件 `5.33.2026102120.0907`。
- 最终验收工具链（2026-11-15）：uni-app x SDK `5.36.2026111207-alpha`；Android、iOS、HarmonyOS、H5 和微信均使用独立 fixture 验证。
- SDK DCloud 子包版本：`3.0.0-alpha-5020720260921001`；SDK Vue 包：3.4.21。
- 2026-11-08 编译：Node 22.17.1、pnpm 9.9.0；2026-11-13 复测：Node 22.19.0、pnpm 9.15.9、Xcode 16.2、iOS 17.4 模拟器、Pixel_3a_API_34 arm64 模拟器、OpenHarmony 6.0.0.47 模拟器、DevEco Studio API 20。
- 旧工程 Vue 3.4.38、TypeScript 5.5.4、DCloud `3.0.0-4080520251106001`。
- 2026-11-13 五端复测共用本轮重新打包的 tarball：`wot-ui-router-1.2.0.tgz`，摘要见 `verification/source-and-artifacts.json`；2026-11-11 的 H5/微信与 Android/iOS 分别使用 `861c31c8…` 与 `cbc5d2c8…`，2026-11-08 记录为 `1bd50b15…`。

本地原始证据位于 `examples/router-x/unpackage/`，按示例 .gitignore 排除：

- `verification/source-and-artifacts.json`：库源码与各目标制品的逐文件摘要。
- `verification/*-build.log`：完整编译日志；`types.log`、`legacy-types.log`：类型结果。
- `package-source.json`：实际 tarball 路径与摘要。
- `web-smoke.json`：浏览器步骤、DOM 终态和控制台记录。保留了初版启动失败记录，后续新 bundle 已修正；不把历史错误隐藏成从未发生。
- `web-smoke.jpg`：Web 参数/路由状态截图。截图记录交互时的 Web 构建，随后仅对示例 App 公共 CSS 做原生 class 选择器收敛，库运行时代码一致。
- `verification/h5-smoke.json`、`h5-smoke.mjs`、`h5-*.png`：H5 9 个场景结果、CDP 脚本和截图。
- `verification/mp-weixin-smoke.json`、`mp-weixin-smoke.mjs`、`mp-weixin-*.png`：微信开发者工具 9 个场景结果、CDP 脚本和截图；保留工具侧登录/文件系统噪声，未捕获 JS 异常单独记录为 0，路由超时日志仍保留。
- `verification/android-run.log`、`android-launch-cli.log`、`ios-build.log`：Android 启动尝试与 iOS 编译日志；实际 Android 运行由 HBuilder 界面触发。
- `verification/android-*.png`、`ios-*.png`：Android/iOS 模拟器首屏、详情、取消、重定向、Tab、分包与返回截图。
- `verification/android-logcat.txt`、`ios-log.txt`：关键路由日志摘录与时间顺序。
- `verification/harmony-20261113-*.png`、`harmony-20261113-final-hilog.txt`、`harmony-20261113-route-log.txt`：HarmonyOS 12 个场景截图、整段 hilog 与 66 行 `JSAPP` 路由日志。
- `verification/harmony-project-dyn/`、`harmony-signing/`：可直接重建的 HarmonyOS 工程（`project-dom2-dyn` 基座）、调试签名 profile 与证书链；`entry/build/default/outputs/default/router-x-signed.hap` 为验收安装包。

## Vite 插件支持程度实测（2026-11-15）

官方文档只承诺 uvue 编译器“在 Vite 基础上扩展开发”，大部分特性和配置项与 uni-app 的 Vue3 编译器一致；插件体系仍以 UTS 为主，并没有把任意 Vite 插件列为跨端稳定契约。本轮按 SDK 实际编译路径做了验证。

配置加载逻辑位于 `@dcloudio/vite-plugin-uni/dist/cli/utils.js` 的 `resolveConfigFile()` / `addConfigFile()`：在 HBuilderX 工程模式下，优先读取 `UNI_INPUT_DIR/vite.config.{js,ts,mjs,mts}`，不存在时回退到 SDK 自带的 `vite.config.js`；CLI 工程由 Vite 常规规则或 `-c` 指定。`runBuild()` 与 `buildUVue()` 最终都走 `buildByVite()`，因此项目 Vite 配置会进入 App/鸿蒙编译链，而不只作用于 H5。

验证工程为 `examples/router-x` 的临时副本，加入一个 `enforce: 'pre'` 探针插件：记录 `config`、`configResolved`、`buildStart`、`transform`、`generateBundle`、`closeBundle`，提供 `virtual:wot-probe` 虚拟模块，并在首页导入、渲染其导出值。用 5.36 SDK CLI 分别构建五个目标，结果如下：

| 目标 | 探针钩子 | `virtual:wot-probe` | 标记进入产物 |
| --- | --- | --- | --- |
| H5 | 全部执行，`.uvue` 可被 transform | resolveId/load 成功 | `assets/pages-home-index.*.js` |
| Android（Vapor + bytecode） | 全部执行，`.uvue` 可被 transform | resolveId/load 成功 | `app-service.js` |
| iOS（Vapor + bytecode） | 全部执行 | resolveId/load 成功 | `app-service.js` |
| HarmonyOS（Vapor + bytecode） | 全部执行 | resolveId/load 成功 | `assets/pages/home/index.js` |
| 微信小程序 | 全部执行 | resolveId/load 成功 | `pages/home/index.js` |

另测 `-p app` 的 Android 原生 uvue（native 引擎）路径，探针钩子同样执行，`generateBundle` 中可见 `pages/*.uvue.ts` 等中间产物。据此可以认为：构建期的常规 Vite 插件（`config`、`configResolved`、`resolveId`、`load`、`transform`、`generateBundle`、`closeBundle` 等）在 x 的 H5、App 三端和微信小程序都会执行，虚拟模块也可用。但不能据此推导为“完整 Vite 能力”：

- 只有 H5 的 `dev` 走 Vite dev server；App/小程序 dev 走 `vite build --watch`，`configureServer`、`transformIndexHtml`、HMR 相关钩子不适用于 App/小程序。
- App 端 transform 的输入虽包含 `.uvue`，产物仍要经过 uvue/uts、Kotlin/Swift/ArkTS 编译；依赖 DOM、HTML 入口、浏览器 CSS 或 Vue web runtime 的插件可能在原生目标失败。
- 官方扩展点是 UTS 插件；Vite 插件只能影响构建期资源处理，不能替代 UTS 原生能力。
- HBuilderX x 编译进程会注册 `typescript` 等模块别名。实测 `@uni-helper/vite-plugin-uni-pages@0.3.22` 在 HBuilderX 工程模式下因 `require('typescript')` 被重定向到未安装的 `compile-typescript` 插件而直接报“预编译器错误”；虽其源码已把 `uvue` 纳入扫描扩展名，仍不能作为 x 的即插即用 pages 方案。

因此不能直接依赖旧的 `@uni-helper/vite-plugin-uni-pages`。最终方案不再复制 pages 插件，而是在 router 内实现只读的 `viteRouterInfo()`：以 `pages.json` 为唯一来源，提供虚拟模块和类型声明。它不依赖 `typescript` 或 `esbuild`，也不与 HBuilderX 争抢 `pages.json`，因此 uni-app 与 uni-app x 可以共用同一套实现。

2026-11-15 使用 5.36 SDK 在独立 fixture 中完成了 H5、Android、iOS、HarmonyOS、微信五个目标的编译与运行验收；H5 自动化 9/9、Android 13/13 检查、iOS XCUITest 3/3、HarmonyOS 核心场景 10/10 加补充场景 1/1、微信 9/9 均通过。完整日志、截图和构建产物保存在本机 `/private/tmp/full-platform-20261115/` 及示例的 `unpackage/verification/`，该目录按项目约定被 `.gitignore` 排除，不作为仓库内证据依赖。该轮导航 fixture 使用 `viteRouterInfo()` 消费 `virtual:uni-pages`；导航运行时未变。

## 独立编译复现方式

以下记录 2026-11-08 的独立编译复现方式。2026-11-11 的模拟器验证改用 HBuilder 标准基座与手动注入的 iOS arm64 基座，见上节。先执行示例准备脚本，再设置以下环境，所有输入、输出均指向独立示例：

```text
UNI_APP_X=true
UNI_INPUT_DIR=<repo>/examples/router-x
UNI_OUTPUT_DIR=<repo>/examples/router-x/unpackage/dist/build/<target>
node node_modules/@dcloudio/vite-plugin-uni/bin/uni.js build -p <platform>
```

Web platform=h5；微信 platform=mp-weixin。App 另设置 `UNI_APP_X_VAPOR=true`、`UNI_APP_X_VAPOR_RENDER_TARGET=bytecode`；Android 使用 platform=app-android、`UNI_APP_PLATFORM=android`，iOS 使用 platform=app-ios、`UNI_APP_PLATFORM=ios`，鸿蒙使用 platform=app-harmony、`UNI_PLATFORM=app-harmony`。每端使用独立缓存目录。本轮均核对最终模式日志、DONE、产物和 bytes，未把 CLI 退出 0 单独当作成功。

首次 Android 直接命令未传 Vapor 环境时实际选中 VDOM；随后只传 Vapor 又显示 nativecode。均未作为预定 bytecode 通过结果，补齐上面的环境后才形成表中的记录。鸿蒙同样依据最终日志纠正了目标模式。此命令方式证明 SDK 前端资源编译，不替代桌面运行和原生发行构建。

## 剩余验收

2026-11-15 已完成 Android、iOS、HarmonyOS 模拟器，H5 和微信开发者工具的五端运行验收。剩余：

- 微信真机验证 query 编码、基础库下限、navigator/tabBar、分包和返回。
- 真机及 APK/IPA/HAP 发行制品测试。
- iOS 侧滑完成/取消、Android/HarmonyOS 系统返回的完整生命周期顺序仍需逐机型补充。
- 修复或复测 HBuilder V iOS 模拟器基座检测/数据容器缓存问题；在 HBuilder 正常连接运行时复测 `setTimeout` 与自动事件时序。

真机及发行制品完成前，继续保留实验性说明，不发布五端支持声明。

范围继续限定在同包 x 适配；全入口异步守卫、旧 alias/hash 改善和导航并发控制不混入本分支。
