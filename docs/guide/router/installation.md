# 安装
本节介绍如何在`uni-app`项目中安装`@wot-ui/router`和路由表生成插件`@uni-helper/vite-plugin-uni-pages`。

:::tip
推荐使用[wot-starter](https://starter.wot-ui.cn)作为参考，已经集成了`@wot-ui/router`和`@uni-helper/vite-plugin-uni-pages`，可以直接使用，无需关心本章节配置。
:::

## 安装路由包

::: warning 路由补全功能的版本范围
本页的安装命令用于已发布的 router。新的路径与名称补全功能尚未发布，已发布的 `1.1.2` 不包含 `@wot-ui/router/typed-routes` 入口。源码体验与构建步骤见[路径与名称补全](./typed-routes.md#auto-setup)；正式发布后会在该指南标明首个支持版本。
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

## 安装路由表生成插件

本项目使用`@uni-helper/vite-plugin-uni-pages`插件来自动生成路由表，该插件会读取`pages.json`文件并生成路由信息，通过`virtual:uni-pages`虚拟模块供应用使用。

::: code-group
```bash [npm]
npm i @uni-helper/vite-plugin-uni-pages --save-dev
```

```bash [yarn]
yarn add @uni-helper/vite-plugin-uni-pages -D
```

```bash [pnpm]
pnpm add @uni-helper/vite-plugin-uni-pages -D
```
:::

## 配置路由表生成插件

在`vite.config.ts`中配置`@uni-helper/vite-plugin-uni-pages`插件：

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import UniHelperPages from '@uni-helper/vite-plugin-uni-pages'
import uni from '@dcloudio/vite-plugin-uni'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    UniHelperPages({
      dts: 'src/uni-pages.d.ts',
      subPackages: [
        'src/subPages',
        // 可以添加更多子包目录
      ],
      /**
       * 排除的页面，相对于 dir 和 subPackages
       * @default []
       */
      exclude: ['**/components/**/*'],
    }),
    uni(),
    // 其他插件...
  ],
  // 其他配置...
})
```
