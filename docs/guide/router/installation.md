# 安装

本节介绍如何在 uni-app / uni-app x 项目中安装 `@wot-ui/router`，并用 `viteRouterInfo()` 读取 `pages.json`、提供路由虚拟模块和类型声明。

:::tip
推荐使用 [wot-starter](https://starter.wot-ui.cn) 作为参考，已经集成了 `@wot-ui/router` 和路由信息插件，可以直接使用，无需关心本章节配置。
:::

## 安装路由包

::: warning 路由补全功能的版本范围
本页的安装命令用于已发布的 router。路由信息插件和路径补全入口尚未发布，已发布的 `1.1.2` 不包含 `@wot-ui/router/vite`、`@wot-ui/router/client` 和 `@wot-ui/router/typed-routes`。源码体验与构建步骤见[路径与名称补全](./typed-routes.md#vite-plugin)；正式发布后会在该指南标明首个支持版本。
:::

::: code-group
```bash [pnpm]
pnpm add @wot-ui/router
```

```bash [npm]
npm i @wot-ui/router --save
```

```bash [yarn]
yarn add @wot-ui/router
```
:::

## 配置路由信息插件

`viteRouterInfo()` 只读取 `pages.json`，不会扫描页面或改写 `pages.json`。它提供 `virtual:uni-pages` / `virtual:wot-pages`，并按需生成类型声明。

```ts
// vite.config.ts
import { viteRouterInfo } from '@wot-ui/router/vite'
import uni from '@dcloudio/vite-plugin-uni'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    viteRouterInfo({
      dts: 'src/typed-router.d.ts',
    }),
    uni(),
    // 其他插件...
  ],
  // 其他配置...
})
```

页面注册、`tabBar`、`globalStyle` 和分包继续按 uni-app 原生方式维护在 `pages.json`。需要按名称跳转时，在页面项上增加 `name` 字段。

页面入口引用客户端类型，确保 `virtual:uni-pages` 有类型：

```ts
/// <reference types="@wot-ui/router/client" />
```

迁移步骤、选项说明以及 uni-app x 注意事项见[路径与名称补全](./typed-routes.md#vite-plugin)。
