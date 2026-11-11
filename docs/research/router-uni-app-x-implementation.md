# Router 同包 x 入口实现与验证

2026-11-08，按用户选择在 `codex/router-uni-app-x` 分支实现实验性 `@wot-ui/router/x`。默认入口保留旧 uni-app 生命周期适配，新增入口共享导航核心并使用 uni-app x 公开路由事件。未修改版本号、提交、推送或发布。

当前结论：同包子入口方案已通过类型、制品消费、Web 交互与五目标 SDK 前端资源编译，可以继续原生运行验收。它还不是五端生产支持声明。

## 实现内容

| 部分 | 改动 |
| --- | --- |
| 共享核心 | `packages/router/src/core.ts` 承载原有解析、query、导航分发、守卫队列和 fullPath 去重；没有新增全入口守卫或并发策略 |
| 默认入口 | `router.ts` 保留旧 mixin 与 WeakMap 参数缓存，`index.ts` 保留原公开导出；旧生命周期和导航行为由原有测试覆盖 |
| x 入口 | `x.ts` 导出同名 createRouter/useRouter/useRoute 与原类型；新增 RouterX.syncRoute(query)、RouterX.dispose()；不依赖 mixin、$mpType 或旧 page.$page |
| 安装与清理 | 保留 provide/inject 和 `$Router/$Route`；检查事件 API 是否存在；同应用重复安装去重；替换实例、unmount 和 dispose 移除自身监听 |
| 类型与制品 | 主入口和 `/x` 分别声明 ESM/CJS 类型；共用 RouterTypeConfig 模块增强；生成器仍只在 typed-routes Node 子入口 |
| peer | Vue peer 调整为 `^3.4.21`，容纳 SDK 的 3.4.21 和旧工程的 3.4.38；没有升级现有 Vue/DCloud 安装或锁文件 |
| 示例与检查 | 独立 `examples/router-x` 消费本地 pack 制品；增加 13 项 x 测试、3 个类型 fixture、打包入口/依赖检查，并接入现有 CI |

使用入口：

```ts
import { createRouter, useRoute, useRouter } from '@wot-ui/router/x'
```

完整用法及示例准备命令见 [示例 README](../../examples/router-x/README.md)。`/x` 的入口选择是应用级选择，不在同一应用同时安装 legacy 和 x router。

## 实测后确定的行为边界

**默认同步晚于 onShow。** `onAppRoute` 是成功事件，Web 实测页面 onLoad/onShow 阶段的全局路由仍可能是上一页。需要早期值时，在活动主页面 `onLoad(query)` 内调用 `router.syncRoute(query)`，然后读取 `router.currentRoute.value`；useRoute 投影及模板仍遵守 Vue watch 调度。这是明确的 x 接入差异，不声称自动生命周期完全等价。[官方事件时序](https://doc.dcloud.net.cn/uni-app-x/api/app-route.html)

**使用已解码参数。** 首轮 Web 交互发现 UniPage.options 在本 SDK 中可能仍含编码。直接用它提前同步会多编码一次，后续成功事件再修正并多触发一次 afterEach。最终实现不读取 options 来猜测编码，显式同步只接收 onLoad query，自动同步接收事件 query。同一路由按 fullPath 去重。[页面参数](https://doc.dcloud.net.cn/uni-app-x/page.html)

**API 属性访问必须被编译器看见。** 初版将 uni 保存成别名再访问路由事件，Web 实际运行缺失事件 API；改成直接读取 `uni.onAppRoute` 与 `uni.offAppRoute` 后，SDK 正确收集按需导入。这个问题由浏览器启动发现，mock 安装测试无法证明编译器依赖收集正确。

晚安装不补发历史路由，currentRoute 初始为 `/`，直到下一次成功事件或显式 syncRoute。页面若只需导航完成后的展示状态，无需调用 syncRoute。主栈同步不用于 dialogPage 或后台页面。dispose 清理监听及安装属性，不取消已发起的导航或更换已有组件的注入。

保留的旧行为：back 返回 void 且不进入 beforeEach；重定向跳过第二轮守卫；并发按各守卫完成顺序下发；直接 uni/navigator/tabBar/系统返回没有新增前置守卫。首阶段没有接入 addInterceptor，因此没有引入双重守卫及拦截器取消时 Promise 悬空的新契约。[拦截器范围](https://doc.dcloud.net.cn/uni-app-x/api/interceptor.html)

## 验证结果

| 层次或平台 | 结果 | 证据边界 |
| --- | --- | --- |
| 原单测 + x 单测 | 105/105；原 92 项保持通过 | Vue/happy-dom 与导航 mock；不代表目标原生栈 |
| 类型与补全 | 15 个 fixture，24 项补全检查通过 | 覆盖 Bundler、NodeNext ESM/CJS、主模块增强约束 x 路径/名称 |
| pack 制品 | 主入口、x、typed-routes 的 ESM/CJS 消费通过；运行时无 Node 模块；x 无 legacy mixin 依赖 | 从 tarball 解包消费，Vue peer 由测试环境提供，不是 npm 联网安装或设备运行 |
| lint | 变更的库源码、类型 fixture、检查脚本通过 | 未升级 lint/编译依赖 |
| 旧 Demo | vue-tsc 通过；原 uni-app 4.85 H5 构建通过 | 首轮受 EMFILE 影响，使用本次命令局部的 CHOKIDAR_USEPOLLING=true 后成功；恢复自动生成的无关 components.d.ts 差异 |
| x Web | SDK 编译通过；Codex in-app browser 交互验证通过 | VDOM；不是 App Vapor |
| x 微信 | SDK 编译通过，生成 app.json 与页面/分包文件 | 未做开发者工具或真机运行 |
| x Android | SDK Vapor + TS + bytecode 前端资源编译通过，生成 16 个 `.bytes` 文件及 app-service.js | 未生成/安装 APK，未做模拟器/真机验收 |
| x iOS | SDK Vapor + TS + bytecode 前端资源编译通过，生成 11 个 `.bytes` 文件及 app-service.js | 未签名/安装 IPA，未做模拟器/真机验收 |
| x HarmonyOS | SDK Vapor + TS + bytecode 前端资源编译通过，生成 11 个 `.bytes` 文件、JS/ETS 资源 | 未做 Hvigor HAP 构建或设备运行 |
| 远端 CI | 已补充 pack 检查步骤 | 本分支未推送，远端尚未执行；Windows 脚本执行仍由远端 CI 确认 |

本轮 Web 已观察的场景：

1. 首次启动，组合式 useRoute 和模板 `$Route` 同步到首页。
2. 异步 beforeEach 允许导航；false 取消返回 NavigationCancelled，页面不离开。
3. name + params 传递中文、百分号、&；显式 onLoad 同步不再重复编码，成功事件不重复 afterEach。
4. 同路径 id=1 → id=2 → back，参数恢复到第一实例。
5. replace 到分包并 back；reLaunch 回首页。
6. 守卫重定向到分包，目的页正确。
7. 直接 uni.navigateTo、navigator 到分包，成功后全局路由同步。
8. router.pushTab 与点击原生 tabBar，切换正确。
9. 浏览器 history back、详情页刷新/直达后，路由与 query 正确。

这些是手动驱动浏览器的观察记录，不把表中 X01–X12 全部标为通过。系统手势、原生动画、原生清理与 HMR、错误回调的全部平台顺序、dialogPage、低版本能力缺失仍需各端验证。

## 工具链与源码对应

- 基线提交：`5de843537bd5077d3ae27c83aa2bfa7a69ff660b`；本分支有未提交改动。
- 本轮库源码 SHA-256 汇总：`001b511e7f7fa27cd52405b05ee6e78828d7967122db67ddbe41cd9ee8fa4887`；逐文件摘要见本地记录。
- HBuilder V：`1.129.1-alpha`；SDK 扩展：`5.33.2026102115-alpha`；uniapp-cli-vite 插件：`5.33.2026102120.0907`。
- SDK DCloud 子包版本：`3.0.0-alpha-5020720260921001`；SDK Vue 包：3.4.21。
- Node 22.17.1、pnpm 9.9.0；旧工程 Vue 3.4.38、TypeScript 5.5.4、DCloud `3.0.0-4080520251106001`。
- 用于 x 编译的 tarball 摘要：`1bd50b1506948c31ebc11e4c98f7991240afd7a3b71e108d8dff12369c3b80e8`。其 dist 的全部运行时与声明文件逐字节等于本轮当前 dist；之后仅补充了本地检查脚本的 package script 元数据。

本地原始证据位于 `examples/router-x/unpackage/`，按示例 .gitignore 排除：

- `verification/source-and-artifacts.json`：库源码与各目标制品的逐文件摘要。
- `verification/*-build.log`：完整编译日志；`types.log`、`legacy-types.log`：类型结果。
- `package-source.json`：实际 tarball 路径与摘要。
- `web-smoke.json`：浏览器步骤、DOM 终态和控制台记录。保留了初版启动失败记录，后续新 bundle 已修正；不把历史错误隐藏成从未发生。
- `web-smoke.jpg`：Web 参数/路由状态截图。截图记录交互时的 Web 构建，随后仅对示例 App 公共 CSS 做原生 class 选择器收敛，库运行时代码一致。

## 独立编译复现方式

本轮没有启动或占用 HBuilder 宿主/设备，直接在已安装 SDK 的 uniapp-cli-vite 目录运行其 Node 编译入口。先执行示例准备脚本，再设置以下环境，所有输入、输出均指向独立示例：

```text
UNI_APP_X=true
UNI_INPUT_DIR=<repo>/examples/router-x
UNI_OUTPUT_DIR=<repo>/examples/router-x/unpackage/dist/build/<target>
node node_modules/@dcloudio/vite-plugin-uni/bin/uni.js build -p <platform>
```

Web platform=h5；微信 platform=mp-weixin。App 另设置 `UNI_APP_X_VAPOR=true`、`UNI_APP_X_VAPOR_RENDER_TARGET=bytecode`；Android 使用 platform=app-android、`UNI_APP_PLATFORM=android`，iOS 使用 platform=app-ios、`UNI_APP_PLATFORM=ios`，鸿蒙使用 platform=app-harmony、`UNI_PLATFORM=app-harmony`。每端使用独立缓存目录。本轮均核对最终模式日志、DONE、产物和 bytes，未把 CLI 退出 0 单独当作成功。

首次 Android 直接命令未传 Vapor 环境时实际选中 VDOM；随后只传 Vapor 又显示 nativecode。均未作为预定 bytecode 通过结果，补齐上面的环境后才形成表中的记录。鸿蒙同样依据最终日志纠正了目标模式。此命令方式证明 SDK 前端资源编译，不替代桌面运行和原生发行构建。

## 剩余验收

检查时宿主与多台设备仍存在 `calendar-7-3-completion-1106` 所属的六个锁，包括 HBuilder V/SDK CLI、iOS 和 Android 目标。本轮未删除锁、终止进程或绕开锁使用这些宿主/设备。待原任务正常释放后，依照研究报告的 X01–X12 计划继续：

- 首先运行一个原生 Vapor 目标，验证安装、Symbol 注入、全局 getter、WeakMap/Promise、页面事件顺序，以及已生成的 TS/bytecode 资源确实可执行。
- 微信开发者工具及真机分别验证基础库要求、navigator/tabBar、分包和返回。
- iOS 侧滑完成/取消、Android 系统返回、HarmonyOS 返回独立留证。
- 真机及 APK/IPA/HAP 发行制品测试完成前，继续保留实验性说明，不发布五端支持声明。

范围继续限定在同包 x 适配；全入口异步守卫、旧 alias/hash 改善和导航并发控制不混入本分支。
