# 路径与名称补全

::: warning 发布状态：未发布
本页介绍的是尚未发布的新功能。已发布的 `@wot-ui/router@1.1.2` 不包含 `RouterTypeConfig`、`@wot-ui/router/typed-routes` 和 `@wot-ui/router/vite` 入口；请勿直接用该版本照搬下面的配置。源码开发可按下文先构建 router，正式发布时会补充首个支持版本。
:::

配置后，在 TypeScript 代码中输入路由的 `path` 或 `name`，编辑器就能列出项目里的候选值。直接导入的 router 和 `useRouter()` 都支持，原有导航写法不用改。

```ts
import { useRouter } from '@wot-ui/router'

const router = useRouter()

router.push({ path: '/pages/index/index' })
router.push({ name: 'home' })
router.push('/pages/index/index')
```

**默认提供补全，但不会因为字符串拼错而报类型错误。** 如果需要这种检查，请在完成接入后开启[严格模式](#strict-mode)。

## 选择接入方式

| 你的项目 | 接入方式 |
| --- | --- |
| 需要 `virtual:uni-pages` 和路径/名称补全 | [`viteRouterInfo()`](#vite-plugin) |
| 只需要类型声明 | [`viteRouterInfo({ virtual: false })`](#vite-plugin)或 [CLI](#cli) |
| 手工维护路由，或暂时不想修改构建配置 | [手工声明](#manual-setup) |

下面假设项目已经按[快速上手](./quick-use.md)创建并安装 router，能正常跳转。这里增加的是编辑器提示和类型检查，仍然需要原有的 `createRouter({ routes })` 和 `app.use(router)`。

## 方式一：viteRouterInfo（推荐） {#vite-plugin}

`viteRouterInfo()` 只做一件事：读取 `pages.json`，把其中的页面信息转为 `virtual:uni-pages`，并按需生成 `typed-router.d.ts`。

它不扫描 `.vue` / `.uvue`，不读取 `definePage()` 或 `<route>`，不处理 `pages.config.*`，也不会改写 `pages.json`。`pages.json` 是唯一事实来源，因此 uni-app 和 uni-app x 的行为完全一致，也不会与 HBuilderX 争抢文件。

### 1. 配置 Vite 插件

```ts
// vite.config.ts
import { viteRouterInfo } from '@wot-ui/router/vite'
import uni from '@dcloudio/vite-plugin-uni'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    viteRouterInfo({
      dts: 'src/typed-router.d.ts',
    }),
    uni(),
    // 其他插件...
  ],
})
```

默认依次查找 `src/pages.json`、`pages.json`；声明输出到 `src/typed-router.d.ts` 或根目录 `typed-router.d.ts`。也可以显式指定：

```ts
viteRouterInfo({
  pages: 'pages.json',
  dts: 'typed-router.d.ts',
  strict: true,
  failOnError: true,
})
```

只生成类型时可以关闭虚拟模块：

```ts
viteRouterInfo({
  dts: 'src/typed-router.d.ts',
  virtual: false,
})
```

### 2. 在 pages.json 中声明页面

页面注册、样式、`tabBar`、`globalStyle` 和分包都按 uni-app 原生方式写在 `pages.json`。需要按名称跳转时，在页面项上增加 `name`；`type: "home"` 仍然用于标记首页：

```json
{
  "pages": [
    {
      "path": "pages/home/index",
      "name": "home",
      "type": "home",
      "layout": "tabbar",
      "style": { "navigationBarTitleText": "首页" }
    },
    {
      "path": "pages/detail/index",
      "name": "detail",
      "style": { "navigationBarTitleText": "详情" }
    }
  ],
  "subPackages": [
    {
      "root": "subPages",
      "pages": [
        { "path": "detail/index", "name": "sub-detail", "aliasPath": "/detail" }
      ]
    }
  ]
}
```

`name`、`type`、`layout`、`aliasPath` 是 router 读取的扩展字段；uni-app / uni-app x 编译器会忽略它们。新增页面时由 uni-app 或 HBuilderX 写入 `path`，再按需补充名称。

### 3. 引用虚拟模块和类型

`src/router/index.ts` 从虚拟模块读取路由表：

```ts
/// <reference types="@wot-ui/router/client" />
import { createRouter } from '@wot-ui/router'
import { pages, subPackages } from 'virtual:uni-pages'

const routes = pages.map(page => ({ ...page, path: `/${page.path}` }))
for (const subPackage of subPackages) {
  for (const page of subPackage.pages)
    routes.push({ ...page, path: `/${subPackage.root}/${page.path}` })
}

export default createRouter({ routes })
```

`@wot-ui/router/client` 只提供 `virtual:uni-pages` / `virtual:wot-pages` 的类型声明；运行时数据由插件注入。`pages` / `subPackages` 会保留 `pages.json` 中的 `name`、`type`、`layout`、`style`、`aliasPath` 等字段。

### 4. 从 uni-helper pages 迁移

1. 移除 `@uni-helper/vite-plugin-uni-pages` 依赖和 `UniHelperPages(...)` 插件。
2. 用 `viteRouterInfo(...)` 替换，只保留 `pages`、`dts`、`strict` 等读取选项。
3. 删除 `pages.config.*` 和 `definePage()` / `<route>` 元数据；页面注册和样式直接以 `pages.json` 为准。
4. 删除旧的 `src/uni-pages.d.ts`，在入口或 `src/router/index.ts` 增加 `/// <reference types="@wot-ui/router/client" />`。
5. `virtual:uni-pages` 的导入保持不变；`typed-router.d.ts` 由插件自动生成。

### 5. 性能与边界

插件在 Vite 启动时只读取一个 `pages.json`，启动成本基本与页面数量无关，也没有运行时开销。`pages.json` 变化后会防抖重新读取；内容变化时使虚拟模块失效，并在 dev 下 full reload。

- 不写入 `pages.json`，原有注释和 `#ifdef` 会原样保留。
- 不依赖 `esbuild`、`typescript` 或页面 AST 解析。
- 新增、删除、改名页面以 `pages.json` 为准，不支持页面文件里的隐式元数据。
- 读取失败默认只记录错误；需要中断构建时传 `failOnError: true`。

### 6. uni-app x 注意事项

- App Vapor **不支持** `$Route` / `$Router` 模板全局变量。模板里写 `$Route.fullPath` 会编译成裸标识符并在运行时抛 `ReferenceError`。请使用 `useRoute()` / `useRouter()`，或直接读取 `router.currentRoute.value`。
- uni-app x 的页面列表由 `pages.json` 提供，`viteRouterInfo()` 只读取它，不参与页面编译或 HBuilderX 的页面管理。
- HBuilderX 图形界面和 CLI 构建都会经过 Vite 配置；如果使用自定义多环境构建，仍需保证 `vite.config.ts` 被加载。

## 方式二：CLI {#cli}

不接入 Vite 时，可以在本地或 CI 显式运行包内 CLI：

```sh
npx wot-router-types --pages pages.json --dts typed-router.d.ts
```

- 未传 `--pages` 时，依次查找 `src/pages.json`、`pages.json`。
- 未传 `--dts` 时，`pages.json` 在 `src` 下则输出 `src/typed-router.d.ts`，否则输出根目录 `typed-router.d.ts`。
- `--strict` 生成严格模式；`--watch` 监听 `pages.json` 变化。
- 会打印本次生成的路径数与名称数，例如 `pages.json -> typed-router.d.ts（4 个路径，0 个名称）`。

源码仓库中可以直接运行：

```sh
node packages/router/bin/wot-router-types.mjs --pages pages.json --dts typed-router.d.ts
```

也可以在自定义 Node 脚本中调用构建入口：

```ts
import { readPagesJson, writeRouteTypes } from '@wot-ui/router/typed-routes'

writeRouteTypes(readPagesJson('pages.json'), {
  dts: 'typed-router.d.ts',
  strict: true,
})
```

## 方式三：手工声明 {#manual-setup}

不使用自动生成时，新建 `src/typed-router.d.ts`，把实际路由路径和名称写入其中：

```ts
import '@wot-ui/router'

declare module '@wot-ui/router' {
  interface RouterTypeConfig {
    path: '/pages/index/index' | '/pages/about/index' | '/subPages/detail/index'
    name: 'home' | 'detail'
  }
}
```

确保文件被 `tsconfig.json` 包含，即可获得提示。顶部的 `import '@wot-ui/router'` 要保留，它让这份声明扩展现有模块。

手工声明只描述候选值，**不会创建或修改运行时路由**。这里的值必须与 `createRouter({ routes })` 使用的路由表一致，新增、删除、改名路由后要同步维护。自动生成和手工声明选一种即可，不要重复定义相同字段。

## 可选：拼错时让 TypeScript 报错 {#strict-mode}

默认模式适合先接入补全，不会影响已有的动态字符串。严格模式则要求导航目标符合已注册的类型：

| 调用（假设已注册 home） | 默认模式 | 严格模式 |
| --- | --- | --- |
| `router.push({ name: 'home' })` | 有补全，通过 | 有补全，通过 |
| `router.push({ name: 'hom' })` | 通过类型检查，运行时仍会校验 | 类型错误 |
| `router.push({ name: someString })`，变量类型为 `string` | 通过 | 类型错误，需先收窄类型 |
| `router.push('/pages/index/index?from=share')`，路径已注册 | 通过 | 通过 |

**自动生成方式**：给 `viteRouterInfo()` 增加 `strict: true`，然后重启开发服务生成声明：

```ts
viteRouterInfo({
  strict: true,
})
```

使用 CLI 时同样传入 `strict: true`。

**手工声明方式**：直接在 `RouterTypeConfig` 中增加 `strict: true` 字段：

```ts
import '@wot-ui/router'

declare module '@wot-ui/router' {
  interface RouterTypeConfig {
    path: '/pages/index/index' | '/pages/about/index' | '/subPages/detail/index'
    name: 'home' | 'detail'
    strict: true
  }
}
```

对于已知的动态选项，可以给变量标注 `RouteName`，让类型检查发生在赋值处：

```ts
import type { RouteName } from '@wot-ui/router'

const target: RouteName = 'home'
router.push({ name: target })
```

来自接口或用户输入的任意字符串仍需先验证。严格模式只约束注册过的字段；例如只注册 `name` 时，`path` 仍接受普通字符串。

**自动生成总会注册 `path` 和 `name`，空集合会生成 `never`，不会回退成 `string`。** 如果页面都未配置 `name`，开启严格模式后只能按路径导航。如果 `pages.json` 的页面列表为空，路径和名称导航都会被禁止，应先检查文件路径和内容。

## 支持范围

`push`、`replace`、`replaceAll`、`pushTab` 都使用同一套路径和名称候选值。守卫中调用 `next({ name: 'home' })`、返回重定向对象，以及异步返回重定向对象也支持。

目前只描述路径和名称，不校验 `params`、`query` 的业务字段；`pushTab` 的候选值也不会单独过滤成 tabBar 页面，使用时仍需遵守原有跳转限制。同一 TypeScript 项目中的 router 实例共享这份注册信息。

字符串路径支持 `?query`，不支持 `#hash` 片段。运行时不会把片段解析为独立的 hash，也不提供锚点滚动。

## 没有提示时怎么排查 {#troubleshooting}

### 找不到 @wot-ui/router/typed-routes

确认使用的是包含该入口的 router 版本；较早的版本没有这个入口。如果直接开发本仓库，先运行 `pnpm build:router`，再启动示例项目。

### 有路径提示，但没有名称提示

检查 `pages.json` 的页面项是否配置了 `name`，以及生成声明里是否有对应名称。生成器不会从文件名推导名称。

### 文件已经生成，但编辑器仍然没有提示

先检查生成文件里是否有目标路径或名称，再检查文件是否被当前项目的 `tsconfig.json` 包含，代码是否使用 TypeScript，以及 `useRouter` 是否来自 `@wot-ui/router`。确认后可重启编辑器的 TypeScript / Vue 语言服务。

### 页面已经改名，提示还是旧值

确认 `pages.json` 已更新、`viteRouterInfo()` 已配置且开发服务正在运行；必要时重启开发服务。手工声明方式需要自己修改声明文件。

### 开启严格模式后，原来的动态跳转报错

严格模式不接受未经收窄的 `string`。需要保持原有动态跳转写法时，先使用默认补全模式；确认业务数据范围后，再逐步为变量补充类型或验证逻辑。

### 严格模式下，to.fullPath 或 useRoute().path 不能直接回传

守卫参数 `to`、`from` 和 `useRoute()` 返回的是运行时路由信息，其 `path`、`fullPath` 保持 `string`。守卫正常放行应直接调用 `next()` 或返回 `true`，无需再次导航到 `to.fullPath`。需要恢复暂存地址时，优先验证并收窄路径；只有业务已确认地址有效时，才使用 `as RoutePath`。

### 声明写入失败，开发服务或构建中断

检查 `dts` 指向的目录是否可写、目标是否被其他程序占用。写入使用同目录临时文件，完整写入后才替换目标；写入或替换失败会保留原文件并尝试清理临时文件。

Windows 上替换目标时遇到 `EPERM` 或 `EACCES`，会间隔 10、20、40、80ms 重试，最多尝试 5 次。其他平台或错误不重试。

`viteRouterInfo()` 默认记录错误但不阻断编译，需要让构建失败时传入 `failOnError: true`。CLI 会直接抛错并返回非零退出码。

::: warning 声明文件命名
存在 `src/router/index.ts` 时，不要把声明命名为 `src/router.d.ts`，否则它可能遮蔽 `import router from './router'` 的类型解析。本文统一使用 `src/typed-router.d.ts`。
:::
