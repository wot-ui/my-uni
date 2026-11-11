# @wot-ui/router 支持 uni-app x 的可行性研究

后续进展：用户已选择同包 `/x` 入口并授权分支实现，当前代码与验证结果见 [实现记录](./router-uni-app-x-implementation.md)。下文保留探索时的 1.2.0 基线结论，源码行号对应该基线。

结论：值得进入隔离 POC。现有路径解析、查询参数、守卫队列和类型生成逻辑具有复用基础；1.2.0 的全局 mixin 状态同步方式不能作为 App Vapor 的兼容实现。建议采用共享核心与运行时适配器，先验证独立 x 入口的消费方式，再决定发行结构。当前没有任何 x 平台的编译或运行验收结果，不能发布支持声明。

范围：2026-11-08 的探索记录；不迁移库、不修改公共 API、不升级旧工程依赖、不发布。源码基线为 `5de843537bd5077d3ae27c83aa2bfa7a69ff660b`，包版本 1.2.0。开始时工作区干净，未发现适用的 AGENTS.md 或既有 OpenSpec 迁移提案。本轮仅新增本研究文档；临时探针位于 `/tmp/my-uni-router-x-research/`。

## 实际公开契约与迁移分类

下表中的“可复用”表示源码层判断，不表示已在 x 运行。“需适配”包含仍须实际编译验证的候选方案。

| 能力 | 1.2.0 实际行为及源码 | 分类与 x 处理 |
| --- | --- | --- |
| 入口 | [index.ts:15](/Users/xqk/FE/my-uni/packages/router/src/index.ts:15) 导出 `createRouter`、`useRouter`、`useRoute` 和全部 types 导出 | 可复用入口概念；内部 `resolve`、注入 key 没有从包主入口导出，不能当作既有公共 API |
| Router 对象 | [types.ts:1506](/Users/xqk/FE/my-uni/packages/router/src/types.ts:1506)：`currentRoute`、`routes`、`push/replace/replaceAll/pushTab/back`、`beforeEach/afterEach/install` | 需保持名称、返回值和注册后取消函数语义 |
| 路由解析 | [router.ts:36](/Users/xqk/FE/my-uni/packages/router/src/router.ts:36)：name 查表，params 替换占位符并同时序列化为 query；path 分支合并 URL 参数与 query | 纯 TS 可复用；不是完整动态路由匹配器 |
| query 编解码 | [utils.ts:6](/Users/xqk/FE/my-uni/packages/router/src/utils.ts:6)：decodeURIComponent；stringify 时过滤 null/undefined、对 `String(value)` 编码 | 可复用；数组会转逗号字符串，重复键保留最后值，不自行升级为 Vue Router 的数组语义 |
| 导航分发 | [router.ts:116](/Users/xqk/FE/my-uni/packages/router/src/router.ts:116)、[router.ts:182](/Users/xqk/FE/my-uni/packages/router/src/router.ts:182)：五种 uni 导航；push/replace/replaceAll/pushTab 返回 Promise，success 后 resolve，fail 包装 Error | 需薄适配；动画、delta、错误形状、回调时序逐端验证 |
| back | [router.ts:128](/Users/xqk/FE/my-uni/packages/router/src/router.ts:128)：直接 `uni.navigateBack`，返回 void，不经过 beforeEach | 可保留行为；不能宣称旧库已具备返回前置守卫 |
| navType 覆盖 | [router.ts:162](/Users/xqk/FE/my-uni/packages/router/src/router.ts:162)：对象参数可覆盖调用方法对应的导航方式；`navType: 'back'` 仍先 resolve 并执行守卫 | 有约束；与 `router.back()` 是两条不同路径，必须分别测试 |
| 前置守卫 | [router.ts:242](/Users/xqk/FE/my-uni/packages/router/src/router.ts:242)：顺序 await；支持返回值/Promise/next；false 拒绝 `NavigationCancelled`；重定向目标跳过本轮全部守卫 | 纯逻辑可复用；三参数非 Promise 守卫未同步调用 next 会报错，不等同于任意延迟 next 都受支持 |
| 路由状态与后置钩子 | [router.ts:335](/Users/xqk/FE/my-uni/packages/router/src/router.ts:335)：app.mixin 的页面 onLoad/onShow 驱动；相同 fullPath 不更新、不执行 afterEach | 核心适配点；afterEach 不是每次成功导航都会调用，也不代表 onReady 或转场结束 |
| 页面读取 | [router.ts:363](/Users/xqk/FE/my-uni/packages/router/src/router.ts:363)：栈顶 route、`$page?.fullPath`、onLoad 参数、options，WeakMap 按页面缓存 | 改用 x 公开 UniPage 和路由事件数据；不能要求 x 模拟旧私有字段 |
| 安装与注入 | [router.ts:335](/Users/xqk/FE/my-uni/packages/router/src/router.ts:335)：provide 两个 Symbol key；写 `$Router`，defineProperty getter `$Route`；注册 mixin | app.use/provide/inject 可作为候选；全局属性 getter 与 Vapor 模板可见性独立验证，不能静默删掉旧入口能力 |
| 组合式 hooks | [index.ts:18](/Users/xqk/FE/my-uni/packages/router/src/index.ts:18)：inject；useRoute 以 reactive 对象接收 watch + Object.assign 更新 | 复用候选；验证 Symbol、单份 Vue、响应式更新、watch 清理。Object.assign 不删除旧扩展键，是已有风险 |
| 路由元数据与样式类型 | [types.ts:41](/Users/xqk/FE/my-uni/packages/router/src/types.ts:41)、[types.ts:1125](/Users/xqk/FE/my-uni/packages/router/src/types.ts:1125)；name/meta/style/自定义字段复制进 route | 数据可复用；GlobalStyle 内大量旧 app-plus/H5/小程序配置不代表 x 支持，router 本身也不应用这些窗口配置 |
| typed-routes | [typed-routes.ts:26](/Users/xqk/FE/my-uni/packages/router/src/typed-routes.ts:26)、[typed-routes.ts:86](/Users/xqk/FE/my-uni/packages/router/src/typed-routes.ts:86)：generateRouteTypes/writeRouteTypes，主包/分包/alias/name，strict 可选 | Node 构建侧可复用；不能导入 App 运行时。新增 x 子入口时须保持模块增强身份一致 |
| pages 配置接入 | [src/router/index.ts:10](/Users/xqk/FE/my-uni/src/router/index.ts:10)、[vite.config.ts:36](/Users/xqk/FE/my-uni/vite.config.ts:36)：Demo 自行展平 virtual:uni-pages；构建钩子写声明 | 库没有内置 pages.json 扫描器或 tabBar 校验器；x POC 先使用小型明确路由表，随后验证构建侧配置集成 |

补充既有边界：`hash` 在 name 解析结果中保留，但没有拼入 fullPath；path 分支 hash 置空。`replace` 字段没有驱动分发，真正覆盖方式的是 navType。aliasPath 能匹配元数据，但发送给 uni 的仍是别名路径；不能据此宣称跨端别名重写已经实现。`redirectedFrom` 只见类型声明，没有对应赋值。库没有 RouterView、RouterLink、动态 addRoute、onError 或 ready API。

## 官方能力与关键适配点

### App Vapor 与插件安装

官方当前说明：App Vapor 只支持组合式 API；同一 x 工程编译到 Web/小程序目前仍使用 VDOM。Android、iOS、HarmonyOS 的 Vapor 引入版本不同，不能以文件后缀推断模式。[Vapor 文档](https://doc.dcloud.net.cn/uni-app-x/app-vapor.html)、[选项式 API](https://doc.dcloud.net.cn/uni-app-x/vue/options-api.html)

因此现有“全局 mixin + this.$mpType”同步机制需要替换。这不等于 app.use 或全部 globalProperties 都不可用。官方有插件对象/函数安装与 globalProperties 用法，但说明包含编译处理约束；现有 getter 闭包能否在目标 TS + Vapor 组合运行仍是 POC 问题。应分别验证 install、provide/inject、模板访问和 getter 更新，不把 Android VDOM/UTS 的限制机械套给 Vapor。[全局 API](https://doc.dcloud.net.cn/uni-app-x/vue/global-api.html)、[组合式 API](https://doc.dcloud.net.cn/uni-app-x/vue/composition-api.html)

### 状态同步有公开事件候选，但不是直接替换

本轮补充发现 `uni.onAppRoute/offAppRoute`：官方表列 Web/微信/Android/iOS/HarmonyOS 为 5.25 起，微信事件监听另要求基础库至少 3.5.5。成功事件在目标 onShow 之后，涵盖启动、返回和切换 tab；只针对主页面，不包含 dialogPage。前置事件同步执行，rewriteRoute 不能异步调用，也不能重写返回路由。[应用路由事件](https://doc.dcloud.net.cn/uni-app-x/api/app-route.html)

建议把成功事件作为 x 全局同步的首选 POC，而不是用拦截器 success 代替真实页面状态。首次安装还须检查当前页面栈：监听器不会补发已错过的事件。注销只移除自身函数引用；安装需要防重复，测试 HMR、重复 app.use、重新创建 router，不调用无参数 offAppRoute 清掉其他业务监听。

**时序是阻塞项。** 现有库可能在 onLoad 阶段已经更新 currentRoute；改成 onAppRoute 后，目标页自己的 onLoad/onShow 读取 useRoute 时可能仍见上页。需用同一场景测量 `beforeEach → uni success → onLoad/onShow → currentRoute/watch → afterEach → onReady` 的实际顺序。若应用依赖 onLoad 中读取新路由，可能需要页面组合式生命周期桥接；仅加成功事件不能宣称完全等价。

事件 ID 可用于去除同一事件的重复投递，但不得直接取代现有 fullPath 去重，否则同路径同参数的新页面会增加 afterEach 次数。前后台恢复、同 tab 重选与双重同步也必须保留既有行为边界。

### 页面对象与返回能力

`getCurrentPages()` 返回主页面 UniPage 数组，公开 route/options 可作为同步输入；dialogPage 有独立归属和子栈。文档没有提供与旧 `page.$page.fullPath` 等价的通用契约，x 应由公开 path/query 构造 fullPath，验证参数只解码一次、页面对象标识稳定性以及返回后的参数恢复。[页面栈](https://doc.dcloud.net.cn/uni-app-x/api/get-current-pages.html)、[UniPage](https://doc.dcloud.net.cn/uni-app-x/api/unipage.html)

onBackPress 不能用 async 来阻止默认返回；iOS 侧滑不触发它，微信小程序也不提供该页面钩子。因此“所有返回均可 await beforeEach 再继续”不能作为跨端承诺。保持现有返回后状态同步是第一阶段范围，新的返回拦截策略应另行设计。[页面生命周期](https://doc.dcloud.net.cn/uni-app-x/page.html)

### 拦截器适用于可选增强

当前库没有使用 addInterceptor，也没有替换 uni 全局方法。官方 x 拦截器列出五个导航 API，示例支持 invoke 返回 false 和修改 url，并有 removeInterceptor；小程序 navigator 组件不经过该拦截器。本文查阅的页面没有建立 Promise invoke 在所有目标端的等待/取消/回调完成契约，必须单独测量。[拦截器](https://doc.dcloud.net.cn/uni-app-x/api/interceptor.html)

若以后启用拦截器，需解决 router 调用被再次拦截造成双守卫、重定向重入、取消后的 Promise 是否悬空、以及移除自身监听的问题。第一阶段只保持 router 方法的异步守卫，不把拦截器作为必须依赖。

### 导航参数仍受平台约束

navigateTo/redirectTo 面向非 tabBar 页面，switchTab 面向 tabBar 且 URL 不携带 query；reLaunch 到 tabBar 也不能带参数。现有 router 会直接序列化 query 后下发，没有预先检查这类约束。迁移应记录真实成功/失败，不用 mock 接受任意 URL 得出兼容结论。动画参数与返回 delta 同样逐端检查。[导航 API](https://doc.dcloud.net.cn/uni-app-x/api/navigator)

## 导航入口覆盖矩阵

这里区分“当前库已实现的前置守卫”和“x 需要验证的事后同步”，不把新能力写成旧契约。

| 入口 | 当前 beforeEach | 当前状态同步路径 | x 目标与边界 |
| --- | --- | --- | --- |
| router.push/replace/replaceAll/pushTab | 有；resolve 失败时不执行 | 页面 mixin | 保留异步取消/重定向；验证事件或生命周期桥接 |
| router 方法传 navType: back | 有，但先解析传入的目标 | 页面 mixin | 必须验证守卫目标与实际返回栈顶的差异 |
| router.back | 无 | 返回页面 onShow | 保持 void、返回后同步 |
| 直接 uni 五个导航 API | 无 | 页面 mixin | 先保留事后同步；统一前置拦截属于增强 |
| navigator | 无 | 页面 mixin | 测 open-type；小程序不可依赖 addInterceptor 捕获 |
| 原生 tabBar 点击 | 无 | 页面 onShow | 测首次切入、缓存切换和重复点击；不能默认可异步阻止 |
| Android 系统返回 | 无 | 页面 onShow | 验证栈顶更新；末页退出属于 App 生命周期，不伪造路由 |
| iOS 侧滑返回 | 无 | 页面 onShow | 测完成和取消手势；不要依赖 onBackPress |
| Web history/刷新/直达 | 无 | 页面 onLoad/onShow | 验证启动事件注册时间、参数恢复与浏览器历史；刷新不能假定保留原栈 |
| dialogPage 打开/关闭 | 没有专门设计 | 只读取主栈，受 mixin 调用影响 | 暂以主栈状态不受弹窗改变为验收目标；弹窗路由 API 是另一个范围 |

## 构建与类型依赖闭合

[package.json](/Users/xqk/FE/my-uni/packages/router/package.json) 声明 Vue peer `~3.4.38`；[tsdown.config.ts:15](/Users/xqk/FE/my-uni/packages/router/tsdown.config.ts:15) 生成 ESM/CJS 与声明，target 为 node16.14；[tsconfig.json](/Users/xqk/FE/my-uni/packages/router/tsconfig.json) 使用旧 `@dcloudio/types`。

本轮构建后检查：运行时 index.mjs 仅外部导入 Vue，没有 node:*；index 声明也未发现 UniNamespace/@dcloudio 类型外泄。Node API 集中在 typed-routes 子入口。因而“生成器使用 fs，整个 router 无法进 App”的判断不成立，但消费工程仍必须排除生成器进入设备 bundle。

待解决事项：

1. x 编译器如何解析 npm 包的 `.mjs`、exports、Vue external，是否出现第二份 Vue，现有 peer 是否与消费端 runtime 冲突。不能仅修改 peer 为任意版本来通过安装。
2. x 页面中 `App` 与框架 VueApp 类型是否可赋值；Symbol InjectionKey、WeakMap、Promise、函数 length 和函数附加属性在 TS bytecode 目标的真实行为。
3. 生成的 RouterTypeConfig 固定增强 `@wot-ui/router`；如果新增 `/x`，必须从同一类型定义转出，或显式调整生成器设计。避免 IDE 有补全而运行时路由表不一致。
4. 类型生成应消费平台过滤后的 pages.json/分包配置，与实际路由表一致。现有生成器没有 tabBar 专属类型，也不解析原始 JSONC；不要将旧 uni-pages 插件兼容性当作库本身兼容性。
5. exports 主入口 types 统一指向 `.d.mts`；子入口有独立 `.d.mts/.d.cts`。当前 `main=dist/index.js`、unpkg/jsdelivr 指向的 global 文件不在本轮产物中：是已有打包元数据风险，遇到绕过 exports 的消费工具需验证，不能归咎于 x。
6. 最终以 pack 后实际制品安装进干净 x 工程验证，源码 alias/workspace 链接只可用于诊断。旧库测试和 CI 保持独立，不升级旧 DCloud 编译链来解决 x。

## 平台与版本证据矩阵

| 目标 | 模式与建议验证前提 | 本轮证据 | 状态 |
| --- | --- | --- | --- |
| 原 uni-app 库 | Vue 3.4.38；TypeScript 5.5.4；Vitest 4.0.16；tsdown 0.18.2；DCloud types 3.4.12 | 92 项单测、12 个类型用例与 22 项补全检查通过，ESM/CJS 构建通过 | 仅静态/Node/Vue mock 基线 |
| x Web | 当前官方描述为 VDOM；事件方案需相应 SDK 能力 | 已读本机 SDK Web dist-x 中事件实现；未编译消费工程 | 未验证 |
| x 微信小程序 | VDOM；事件方案先固定 SDK 与基础库 ≥3.5.5 | 只有官方文档依据 | 未验证；rewriteRoute 如单独研究需满足 ≥3.8.0 等条件并真机验证 |
| x Android | App Vapor + TS，先固定完整 SDK/基座版本 | 安装环境盘点，未编译/运行 | 未验证 |
| x iOS | App Vapor + TS，记录模拟器/系统/基座 | 安装环境盘点，未编译/运行 | 未验证；侧滑另验 |
| x HarmonyOS | App Vapor + TS，记录 SDK/API/设备/基座 | 安装环境盘点，未编译/运行 | 未验证 |

本机盘点：HBuilder V 应用版本 `1.129.1-alpha`；已安装 uni-app SDK 扩展 `5.33.2026102115-alpha`。SDK 内 `@dcloudio/uni-h5` package.json 为 `3.0.0-alpha-5020720260921001`，dist-x 中存在 onAppRoute/offAppRoute/onBeforeAppRoute/rewriteRoute 实现。这只是安装文件的静态证据，不证明当前运行环境或所有原生基座与其一致。正式 POC 应记录应用、SDK、编译器子包、基座完整版本和产物哈希。

旧 Demo 当前 DCloud 依赖为 `3.0.0-4080520251106001`，不能用其 build:h5/build:app 成功代替 x 编译。历史 H5/微信回归记录没有在本轮重新运行，也不是 x 支持证据。

## 风险排序与架构选择

| 优先级 | 风险 | 通过条件 |
| --- | --- | --- |
| P0 | mixin 无法成为 Vapor 状态同步基础；替代事件时机可能晚于业务 onLoad | x 页面实测首次进入、返回、直达的读取时机；明确是否需要生命周期桥接 |
| P0 | npm 产物与 Vue/类型/TS bytecode 消费不闭合 | 干净 Web 和至少一个原生 Vapor 工程实际消费 pack 制品；无第二份 Vue/Node 模块泄漏 |
| P1 | `$Router/$Route` getter、注入与响应式行为不等价 | 模板/组合式场景独立验证；不支持项正式说明，不用空实现冒充 |
| P1 | 编解码、同路径新实例、缓存 tab 与返回混淆 | 同页不同 query 来回、编码边界、原生导航后状态与计数准确 |
| P1 | 重复安装、HMR、跨页监听泄漏 | 每实例只注册一次；移除自身；销毁重进事件不倍增 |
| P2 | 原有并发/重定向/alias/hash 等契约缺口被混入迁移 | 冻结当前行为与单独缺陷清单；新增策略单独提案 |

| 方案 | 优点 | 成本或风险 | 判断 |
| --- | --- | --- | --- |
| 原包内部堆条件编译 | 用户入口不变 | tsdown 可能消除条件注释；旧用户与 x 安装/依赖强耦合，消费者编译时未必能剪掉旧路径 | 不作为首选 |
| 共享核心 + legacy/x 适配器 + 独立 x 子入口 | 避免核心复制，旧默认入口可保持稳定，便于独立验证 | 需验证 exports 与模块增强；同包 Vue peer 仍是共同约束 | 首选 POC 结构，尚未决定正式新增 API |
| 共享核心 + 独立 x 包 | 可独立声明 Vue/框架类型与版本基线 | 多包发布与文档维护成本；容易类型分叉 | 若 peer/打包约束无法在单包解决，则采用 |
| 完整 UTS 重写 | 可探索非 TS 的原生消费路径 | 当前目标无需因此改写所有纯逻辑，维护两套语义成本高 | 本轮不推荐 |

推荐内部边界是：纯解析/守卫执行、Vue 注入与状态投影、平台导航与页面事件适配、Node 类型生成四部分。x 适配器 POC 优先事件同步，同时验证早期生命周期桥接。新入口或分包选择应由真实消费结果决定，不能预设双包，也不能把 Wot 的组件目录结构照搬进 router。

## 最小 POC 与验收计划

隔离工程至少包含两个 tab 页面、一个普通详情页（可重复进入）、一个分包页、一个登录页；可附一个 dialogPage 观察主栈稳定性。每个页面记录场景 ID、序号、page identity、path/query/currentRoute、回调阶段和源码 SHA；页面显示最终断言，日志保留时序。不要用伪造 mixin、伪造 UniPage 私有字段来替代平台能力。

| 场景 | 必须观察的结果 |
| --- | --- |
| X01 制品消费 | pack 安装；createApp/app.use；useRouter 注入一致；useRoute 模板更新；所有目标入口依赖闭合 |
| X02 首次启动与直达 | 冷启动首页/二级页；onLoad、onShow 内读取路由；afterEach 次数；监听注册前后补偿不重复 |
| X03 五种导航 | push/replace/replaceAll/pushTab/back 与 navType 覆盖分别测；原生栈形态、delta、非法目标/非法 tab 跳转与错误回调 |
| X04 参数与返回 | 中文、空串、%25、%26、编码斜杠、数组、null/undefined；同路径不同参数两次 push 后 back；不双重解码 |
| X05 守卫 | return/Promise/next 的允许、取消、抛错、重定向；核对 reject 内容、跳转数、from/to、afterEach 不重复 |
| X06 并发与重复 | 慢守卫 A + 快守卫 B；连续同 URL；重定向到自身/相互重定向；区分原库行为与额外增强 |
| X07 外部入口 | uni 调用、navigator 各 open-type、原生 tab 点击；先验证事后同步，不默认要求新增前置拦截 |
| X08 返回入口 | Android 按键、iOS 手势完成/取消、Web history；末页返回/退出，页面卸载后不遗留回调 |
| X09 生命周期与清理 | 前后台、tab 缓存恢复、重复安装、HMR、卸载重进；只移除自身监听；dialogPage 不污染主路由 |
| X10 类型与配置 | 主包/分包/条件编译页面、name/path/alias、strict 与补全；实际路由表和生成声明一致 |
| X11 可选拦截器探针 | invoke false、Promise resolve/reject、success/fail/complete 的顺序与次数；取消是否 settle；不纳入首轮兼容承诺 |
| X12 全局属性 | `$Router/$Route` 模板访问、getter 连续更新；若受限，记录受影响用法而非静默移除 |

执行顺序：先构建和契约，再 x Web 与一个 App Vapor 目标验证架构，随后微信、另两个原生目标。Web 不能替代 Vapor。各端分别保存编译最终日志、实际运行产物标识、场景结果；再执行真机和发行构建验收。

- Web：冷启动/刷新/直达、浏览器前进后退、hash/history 配置、返回栈限制。
- 微信：记录开发者工具和基础库版本；navigator/tabBar 原生行为、分包及启动参数；涉及 rewriteRoute 的增强不能仅靠工具模拟器验收。
- Android：模拟器与至少一台真机的系统返回、导航动画和生命周期时序。
- iOS：模拟器与真机的导航、侧滑完成/取消、应用恢复；不能以 API 回调代替手势验收。
- HarmonyOS：固定系统/API/基座，独立检查返回、tab 缓存和事件顺序，不复用 Android 结论。

可参考官方 [自动化起步](https://doc.dcloud.net.cn/uni-app-x/worktile/auto/quick-start.html) 与 [自动化 API](https://doc.dcloud.net.cn/uni-app-x/worktile/auto/api.html)。后续执行前核对当前工具帮助和设备占用；本轮未启动、占用或终止任何其他会话的宿主/设备。

建议分阶段工作量，按一位熟悉该库的开发者估算，设备和工具链可用为前提：

| 阶段 | 产出与退出条件 | 估计投入 |
| --- | --- | --- |
| A 隔离 POC | X01/X02/X03/X12 在 Web + 一个 Vapor 目标跑通或定位阻塞；决定事件时序与入口方案 | 2–3 人日 |
| B 正式提案及适配 | 核心与适配边界、旧入口回归、类型与制品契约；不捆绑全入口守卫增强 | 3–5 人日 |
| C 分平台验证 | 扩展 X04–X10，五目标分别留证；修复明确的适配问题 | 5–8 人日 |
| D 发行准备 | 真机/发行制品抽验、文档支持矩阵、迁移说明 | 2–4 人日 |

这些是规划估计，不是发布日期；出现编译器缺陷、签名或基座阻塞时需重估。A 阶段结束即可决定是否继续，不必先迁移整个 Demo。

## 本轮验证记录与参考材料

- `pnpm -F @wot-ui/router exec vitest run`：5 个文件，92/92 通过。环境为 happy-dom，导航为 mock，不能证明原生页面栈。
- `pnpm -F @wot-ui/router test:types`：构建成功；12 个类型用例与 22 项补全检查通过。未执行 x 工程编译。
- [Node 契约探针](/tmp/my-uni-router-x-research/contract-probe.mjs)：只导入本轮 dist，并 mock 导航回调。验证 back 不进守卫/返回 undefined；success 不触发生命周期时 currentRoute 仍为 `/`；alias 原样下发；并发慢 A/快 B 的下发顺序为 B/A；重定向只执行一轮守卫。它证明现有 JS 分支行为，不能证明 x 运行能力。
- [现有 mock](/Users/xqk/FE/my-uni/packages/router/src/__tests__/setup.ts:23) 的 redirectTo/switchTab 简化成 push，且测试手动触发 mixin。这些测试适合逻辑回归，不能承担平台语义验收。
- 官方 global-api/page/app-route 页面原始 HTML 保存在 `/tmp/my-uni-router-x-research/`；其余官方依据以上述相邻链接为准，查阅日期均为 2026-11-08。临时目录不是长期归档。

本轮使用的 Wot 本机参考为只读：

- [迁移技能](/Users/xqk/FE/wot-ui/.agents/skills/migrate-uni-app-to-x/SKILL.md) 与 [证据分层](/Users/xqk/FE/wot-ui/.agents/skills/migrate-uni-app-to-x/references/target-validation.md)：建立旧契约、隔离适配、区分 mock/编译/运行/发行。
- [x README](/Users/xqk/FE/wot-ui/uni-app-x/README.md:7) 与 [manifest](/Users/xqk/FE/wot-ui/uni-app-x/manifest.json:7)：确认其实际 Vapor + TS/bytecode 配置及历史入口，仅作试验参考。

决策建议：下一步仅批准 A 阶段隔离 POC，先回答 npm 消费、状态同步时机和全局属性三个 P0/P1 问题，再进入正式支持提案。本轮探索到此完成，未实现或承诺任何新公共入口。
