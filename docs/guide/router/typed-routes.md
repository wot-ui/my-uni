# 路径与名称补全

::: warning 发布状态：未发布
本页介绍的是尚未发布的新功能。已发布的 `@wot-ui/router@1.1.2` 不包含 `RouterTypeConfig` 和 `@wot-ui/router/typed-routes` 入口；请勿直接用该版本照搬下面的配置。源码开发可按下文先构建 router，正式发布时会补充首个支持版本。
:::

配置后，在 TypeScript 代码中输入路由的 `path` 或 `name`，编辑器就能列出项目里的候选值。直接导入的 router 和 `useRouter()` 都支持，原有导航写法不用改。

```ts
import { useRouter } from '@wot-ui/router'

// 在组件 setup 中使用
const router = useRouter()

router.push({ path: '/pages/index/index' }) // 输入 path 时提示页面路径
router.push({ name: 'home' })              // 输入 name 时提示页面名称
router.push('/pages/index/index')          // 字符串写法也有路径提示
```

**默认提供补全，但不会因为字符串拼错而报类型错误。** 如果需要这种检查，请在完成接入后开启[严格模式](#strict-mode)。跳转时仍会按原有逻辑检查目标路由是否存在。

## 选择接入方式

| 你的项目 | 接入方式 |
| --- | --- |
| 使用 `@uni-helper/vite-plugin-uni-pages` 管理页面 | [自动生成声明](#auto-setup)，新增、删除、改名页面时自动更新 |
| 手工维护路由，或暂时不想修改构建配置 | [手工声明](#manual-setup)，页面变化后自行更新候选值 |

下面假设项目已经按[快速上手](./quick-use.md)创建并安装 router，能正常跳转。这里增加的是编辑器提示和类型检查，仍然需要原有的 `createRouter({ routes })` 和 `app.use(router)`。

## 方式一：使用 uni-pages 自动生成 {#auto-setup}

### 1. 给需要按名称跳转的页面配置 name

路径来自 uni-pages 扫描到的页面；名称来自页面配置中的 `name`，不会自动用文件名代替。

例如，在已有的 `src/pages/index/index.vue` 中添加或修改 `definePage`：

```vue
<script setup lang="ts">
definePage({
  name: 'home',
})
</script>

<template>
  <view>首页</view>
</template>
```

已有 `definePage` 时只添加 `name` 字段，保留页面其他配置。如果项目通过 `<route>` 块或页面配置文件声明元数据，在原来的位置设置 `name` 即可。

生成结果示例：

| 页面文件 | 配置的 name | path 候选值 | name 候选值 |
| --- | --- | --- | --- |
| `src/pages/index/index.vue` | `home` | `/pages/index/index` | `home` |
| `src/pages/about/index.vue` | 未设置 | `/pages/about/index` | 无 |
| `src/subPages/detail/index.vue` | `detail` | `/subPages/detail/index` | `detail` |

分包目录需要配置在 uni-pages 的 `subPackages` 中。路由名称应全局唯一。生成器发现同名对应不同路径时，会在构建终端列出冲突名称和路径；仍会生成声明，但运行时按名称导航只匹配第一个页面。请修改页面的 `name` 并同步更新调用处。同一名称与路径的重复记录只做去重，不会警告。

### 2. 在已有的 uni-pages 配置中增加生成钩子

修改 `vite.config.ts`，导入 `writeRouteTypes`，并给**现有的** `UniPages(...)` 增加 `onBeforeWriteFile`。下面展示它在 `plugins` 数组中的完整位置：

```ts
import { resolve } from 'node:path'
import uni from '@dcloudio/vite-plugin-uni'
import UniPages from '@uni-helper/vite-plugin-uni-pages'
import { writeRouteTypes } from '@wot-ui/router/typed-routes'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    UniPages({
      dts: 'src/uni-pages.d.ts',
      subPackages: ['src/subPages'], // 按项目实际目录配置，无分包可省略
      onBeforeWriteFile(ctx) {
        writeRouteTypes({
          pages: ctx.pageMetaData,
          subPackages: ctx.subPageMetaData,
        }, {
          dts: resolve(ctx.root, 'src/typed-router.d.ts'),
        })
      },
    }),
    uni(),
  ],
})
```

合并配置时保留项目已有的其他插件、`subPackages` 和 `exclude` 等选项。不要重复注册 uni-pages；如果已有 `onBeforeWriteFile`，把 `writeRouteTypes(...)` 加入原来的回调。

这里使用 `onBeforeWriteFile`，因为 uni-pages 在 `pages.json` 内容不变时可能跳过 `onAfterWriteFile`。前置钩子能确保声明缺失或生成选项改变时仍有机会更新。声明与 `pages.json` 并非一次原子事务；任一步失败都应修复原因并重新生成，不应忽略错误继续构建。

两个 `dts` 配置负责不同的声明文件：

| 配置 | 生成的文件 | 用途 |
| --- | --- | --- |
| `UniPages({ dts: ... })` | `src/uni-pages.d.ts` | uni-pages 自身的路径类型和原生导航 API 提示 |
| `writeRouteTypes(..., { dts: ... })` | `src/typed-router.d.ts` | `@wot-ui/router` 的路径和名称提示 |

`@wot-ui/router/typed-routes` 是包内的构建工具入口，无需单独安装。它使用 Node.js 文件 API，应在 Vite 配置或构建脚本中使用。

### 3. 启动项目并确认生效

安装包含该功能的已发布 router 包后，重启开发服务或执行一次构建即可。

**直接开发本仓库时，首次检出或删除 `packages/router/dist` 后，应先构建 workspace 中的 router 包，再启动示例项目：**

```sh
pnpm install --frozen-lockfile
pnpm build:router
pnpm dev:h5
```

`vite.config.ts` 在加载时就会导入 `@wot-ui/router/typed-routes`，因此构建 router 必须在启动 Vite 之前完成。仅修改 router 源码后也要重新构建，或另外运行 `pnpm dev:router` 持续更新产物。

确认 `src/typed-router.d.ts` 已生成，其中应能找到刚配置的 `home` 和 `/pages/index/index`。**这个文件由工具维护，不要手动编辑，也不需要在页面里 import 它。**

TypeScript 需要读到这个文件。已有 `src/**/*.ts` 或 `src/**/*.d.ts` 的 `include` 配置通常无需修改；否则将下面这一项合并到 `tsconfig.json` 的现有 `include` 中：

```json
{
  "include": ["src/**/*.d.ts"]
}
```

保留原来的 `.vue`、`.ts` 等其他匹配项。然后在一个 `<script setup lang="ts">` 中输入：

```ts
import { useRouter } from '@wot-ui/router'

const router = useRouter()
router.push({ name: '' }) // 光标放在引号内，应能看到 home 等候选值
router.push({ path: '' }) // 应能看到 /pages/index/index 等候选值
```

上面两行用于检查编辑器补全，实际跳转前需选定有效值。开发服务运行时，页面变化会触发声明更新；提交生成文件到版本库后，其他人首次打开项目也能直接获得候选值。

## 方式二：手工声明 {#manual-setup}

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

如果已经有 uni-pages 生成的 `LocationUrl`，可以用它替代手写路径联合：

```ts
import '@wot-ui/router'
import type { LocationUrl } from 'virtual:uni-pages'

declare module '@wot-ui/router' {
  interface RouterTypeConfig {
    path: LocationUrl
    name: 'home' | 'detail' // 名称仍需自行维护
  }
}
```

## 可选：拼错时让 TypeScript 报错 {#strict-mode}

默认模式适合先接入补全，不会影响已有的动态字符串。严格模式则要求导航目标符合已注册的类型：

| 调用（假设已注册 home） | 默认模式 | 严格模式 |
| --- | --- | --- |
| `router.push({ name: 'home' })` | 有补全，通过 | 有补全，通过 |
| `router.push({ name: 'hom' })` | 通过类型检查，运行时仍会校验 | 类型错误 |
| `router.push({ name: someString })`，变量类型为 `string` | 通过 | 类型错误，需先收窄类型 |
| `router.push('/pages/index/index?from=share')`，路径已注册 | 通过 | 通过 |

**自动生成方式**：在前面的 `onBeforeWriteFile` 回调里，为 `writeRouteTypes` 的第二个参数增加 `strict: true`，然后重启开发服务生成声明：

```ts
writeRouteTypes({
  pages: ctx.pageMetaData,
  subPackages: ctx.subPageMetaData,
}, {
  dts: resolve(ctx.root, 'src/typed-router.d.ts'),
  strict: true,
})
```

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

来自接口或用户输入的任意字符串仍需先验证，声明文件本身不会验证这些数据。严格模式只约束注册过的字段；例如只注册 `name` 时，`path` 仍接受普通字符串。

**自动生成总会注册 `path` 和 `name`，空集合会生成 `never`，不会回退成 `string`。** 如果页面都未配置 `name`，开启严格模式后只能按路径导航，按名称导航会报类型错误；先为需要按名称导航的页面配置 `name`。如果页面元数据整体为空，路径和名称导航都会被禁止，应检查页面扫描配置与钩子传入的数据。这与手工声明时省略某个字段不同：省略表示不约束该字段，`never` 表示该字段没有合法候选值。

## 支持范围

`push`、`replace`、`replaceAll`、`pushTab` 都使用同一套路径和名称候选值。守卫中调用 `next({ name: 'home' })`、返回重定向对象，以及异步返回重定向对象也支持。

目前只描述路径和名称，不校验 `params`、`query` 的业务字段；`pushTab` 的候选值也不会单独过滤成 tabBar 页面，使用时仍需遵守原有跳转限制。同一 TypeScript 项目中的 router 实例共享这份注册信息。

字符串路径支持 `?query`，不支持 `#hash` 片段，例如 `/pages/index/index#section`；运行时不会把片段解析为独立的 hash，也不提供锚点滚动。对象上的 `hash` 字段不代表字符串导航支持 hash。

## 没有提示时怎么排查 {#troubleshooting}

### 找不到 @wot-ui/router/typed-routes

确认使用的是包含该入口的 router 版本；较早的版本没有这个入口。如果直接开发本仓库，先运行 `pnpm build:router`，再启动示例项目。

### 有路径提示，但没有名称提示

检查页面是否配置了 `name`，以及生成声明里是否有对应名称。生成器不会从文件名推导名称；没有名称的页面只能提供路径候选值。

### 文件已经生成，但编辑器仍然没有提示

先检查生成文件里是否有目标路径或名称，再检查文件是否被当前项目的 `tsconfig.json` 包含，代码是否使用 TypeScript，以及 `useRouter` 是否来自 `@wot-ui/router`。确认后可重启编辑器的 TypeScript / Vue 语言服务。

### 页面已经改名，提示还是旧值

自动生成方式下，确认开发服务正在运行、钩子已接入现有的 uni-pages 实例；必要时重启开发服务。手工声明方式需要自己修改声明文件。

### 开启严格模式后，原来的动态跳转报错

严格模式不接受未经收窄的 `string`。需要保持原有动态跳转写法时，先使用默认补全模式；确认业务数据范围后，再逐步为变量补充类型或验证逻辑。

### 严格模式下，to.fullPath 或 useRoute().path 不能直接回传

守卫参数 `to`、`from` 和 `useRoute()` 返回的是运行时路由信息，其 `path`、`fullPath` 保持 `string`。它们可能是初始空地址或参数展开后的地址，如 `/pages/detail/1`，不能保证属于注册的 `/pages/detail/:id` 等字面量联合。

守卫正常放行应直接调用 `next()` 或返回 `true`，无需再次导航到 `to.fullPath`。需要暂存地址并在登录后恢复时，优先验证并收窄路径；只有调用方已确认地址有效、且实际路由解析支持该地址时，才使用显式断言：

```ts
import type { RouteLocationNormalized, RoutePath } from '@wot-ui/router'
import { useRouter } from '@wot-ui/router'

const router = useRouter()

function restoreConfirmedRoute(saved: RouteLocationNormalized) {
  // 前提：业务已验证 saved.fullPath 可用；不要对接口或用户输入直接断言。
  return router.replace(saved.fullPath as RoutePath)
}
```

`as RoutePath` 只跳过这一次编译期约束，不做运行时校验，也不增加动态路径匹配能力。默认补全模式下不需要该断言。

### 声明写入失败，开发服务或构建中断

检查 `dts` 指向的目录是否可写、目标是否被其他程序占用。写入使用同目录临时文件，完整写入后才替换目标；写入或替换失败会保留原文件并尝试清理临时文件。清理失败时可能留下 `.tmp` 文件，但不会覆盖最初的异常。进程被强制终止时也可能留下临时文件。

Windows 上替换目标时遇到 `EPERM` 或 `EACCES`，会间隔 10、20、40、80ms 重试，最多尝试 5 次，额外同步等待总计不超过 150ms。其他平台或错误不重试；超出上限仍会抛错。开发和构建使用相同规则，避免静默保留过期类型。

异常会向调用方抛出，避免构建继续使用过期的路由类型。如需更明确的诊断，可以在钩子中补充输出路径并重新抛出原始异常，不要捕获后忽略：

```ts
const dts = resolve(ctx.root, 'src/typed-router.d.ts')
try {
  writeRouteTypes({ pages: ctx.pageMetaData, subPackages: ctx.subPageMetaData }, { dts })
}
catch (error) {
  console.error(`无法更新路由声明：${dts}`)
  throw error
}
```

::: warning 声明文件命名
存在 `src/router/index.ts` 时，不要把声明命名为 `src/router.d.ts`，否则它可能遮蔽 `import router from './router'` 的类型解析。本文统一使用 `src/typed-router.d.ts`。
:::
