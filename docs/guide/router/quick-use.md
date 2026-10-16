# 快速上手
:::tip
推荐使用[wot-starter](https://starter.wot-ui.cn)作为参考，已经集成了`@wot-ui/router`和`@uni-helper/vite-plugin-uni-pages`，可以直接使用，无需关心本章节配置。
:::
## 配置路由

### 使用 @uni-helper/vite-plugin-uni-pages 生成路由表

```ts
import { createRouter } from '@wot-ui/router'
// 从虚拟模块导入自动生成的路由信息
import { pages, subPackages } from 'virtual:uni-pages'

function generateRoutes() {
  const routes = pages.map((page: any) => {
    const newPath = `/${page.path}`
    return { ...page, path: newPath }
  })
  if (subPackages && subPackages.length > 0) {
    subPackages.forEach((subPackage: any) => {
      const subRoutes = subPackage.pages.map((page: any) => {
        const newPath = `/${subPackage.root}/${page.path}`
        return { ...page, path: newPath }
      })
      routes.push(...subRoutes)
    })
  }
  return routes
}

const router = createRouter({
  routes: generateRoutes() // 路由表信息
})
export default router
```

## 配置main.ts

```ts
import { createSSRApp } from 'vue'
import App from './App.vue'
import router from './router'
export function createApp() {
  const app = createSSRApp(App)
  app.use(router)
  return {
    app
  }
}
```

## 配置pages.json
在pages.json中为页面路由指定`name`字段后，即可以使用`name`跳转
>注意：此处定义的`name`字段必须全局唯一。
```json
//  pages.json
{
  "pages": [{
      "path": "pages/home/Home",
      "name": "home", // 路由 name 用于命名路由的跳转
      "style": {
        "mp-alipay": {
          "allowsBounceVertical": "NO"
        },
        "navigationBarTitleText": "首页"
      }
    },
    {
      "path": "pages/login/Login",
      "name": "login",
      "style": {
        "mp-alipay": {
          "allowsBounceVertical": "NO"
        },
        "navigationBarTitleText": ""
      }
    },
    {
      "path": "pages/mine/Mine",
      "name": "mine",
      "style": {
        "navigationBarTitleText": "",
        "navigationBarBackgroundColor": "#E7F0FF"
      }
    }
  ],
  "tabBar": {
    "color": "#bfbfbf",
    "selectedColor": "#0165FF",
    "backgroundColor": "#ffffff",
    "list": [{
        "pagePath": "pages/home/Home",
        "iconPath": "static/icon_home.png",
        "selectedIconPath": "static/icon_home_selected.png",
        "text": "首页"
      },
      {
        "pagePath": "pages/mine/Mine",
        "iconPath": "static/icon_mine.png",
        "selectedIconPath": "static/icon_mine_selected.png",
        "text": "我的"
      }
    ]
  },
  "globalStyle": {
    "navigationBarTextStyle": "black",
    "navigationBarBackgroundColor": "#FFF",
    "backgroundColor": "#F8F8F8"
  }
}
```

## 路径和名称补全（可选） {#typed-routes}

完成上面的路由配置后，可以为 `router.push({ path: … })`、`router.push({ name: … })` 等调用开启可选值提示，调用方式不变。

使用 uni-pages 的项目只需在现有插件配置中增加一个生成声明的钩子，再启动一次开发服务。完整步骤见[路径与名称补全](./typed-routes.md#auto-setup)，包括页面名称配置、可复制的 Vite 配置和生效检查。

默认只提供补全；如果还希望拼错时产生 TypeScript 错误，可以进一步开启[严格模式](./typed-routes.md#strict-mode)。

## 配置自动按需导入（可选）

使用`unplugin-auto-import`可以实现API的自动按需导入，提升开发效率。

### 安装unplugin-auto-import

::: code-group
```bash [npm]
npm i unplugin-auto-import --save-dev
```

```bash [yarn]
yarn add unplugin-auto-import -D
```

```bash [pnpm]
pnpm add unplugin-auto-import -D
```
:::

### 配置vite.config.ts

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import UniHelperPages from '@uni-helper/vite-plugin-uni-pages'
import uni from '@dcloudio/vite-plugin-uni'
import AutoImport from 'unplugin-auto-import/vite'

export default defineConfig({
  plugins: [
    UniHelperPages({
      dts: 'src/uni-pages.d.ts',
      subPackages: [
        'src/subPages',
        // 可以添加更多子包目录
      ],
      exclude: ['**/components/**/*'],
    }),
    uni(),
    AutoImport({
      imports: [
        'vue',
        '@vueuse/core',
        'pinia',
        'uni-app',
        {
          from: '@wot-ui/router',
          imports: ['createRouter', 'useRouter', 'useRoute']
        }
      ],
      dts: 'src/auto-imports.d.ts',
      eslintrc: {
        enabled: true,
        globalsPropValue: true
      }
    })
  ]
})
```

### 导航守卫示例

本项目中包含了完整的导航守卫示例，展示了如何使用路由守卫实现页面访问控制和导航日志记录：

```ts
// src/router/index.ts
router.beforeEach((to, from, next) => {
  console.log('🚀 beforeEach 守卫触发:', { to, from })

  // 演示：基本的导航日志记录
  if (to.path && from.path) {
    console.log(`📍 导航: ${from.path} → ${to.path}`)
  }

  // 演示：对受保护页面的简单拦截
  if (to.name === 'demo-protected') {
    const { confirm: showConfirm } = useGlobalMessage()
    console.log('🛡️  检测到访问受保护页面')

    return new Promise<void>((resolve, reject) => {
      showConfirm({
        title: '守卫拦截演示',
        msg: '这是一个受保护的页面，需要确认才能访问',
        confirmButtonText: '允许访问',
        cancelButtonText: '取消',
        success() {
          console.log('✅ 用户确认访问，允许导航')
          next()
          resolve()
        },
        fail() {
          console.log('❌ 用户取消访问，阻止导航')
          next(false)
          reject(new Error('用户取消访问'))
        },
      })
    })
  }

  // 继续导航
  next()
})

router.afterEach((to, from) => {
  console.log('🎯 afterEach 钩子触发:', { to, from })

  // 演示：简单的页面切换记录
  if (to.path) {
    console.log(`📄 页面切换完成: ${to.path}`)
  }

  // 演示：针对 afterEach 演示页面的简单提示
  if (to.name === 'demo-aftereach') {
    const { show: showToast } = useGlobalToast()
    console.log('📊 进入 afterEach 演示页面')
    setTimeout(() => {
      showToast('afterEach 钩子已触发！')
    }, 500)
  }
})
```

**说明：**
- `useGlobalMessage` 和 `useGlobalToast` 是本项目中的自定义工具函数，用于显示确认框和提示消息
- 实际使用时，可以根据项目需求使用 uni-app 原生的 `uni.showModal` 和 `uni.showToast` API

**使用 uni-app 原生 API 的示例：**

```ts
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    uni.showModal({
      title: '提示',
      content: '请先登录',
      success: (res) => {
        if (res.confirm) {
          next({ name: 'login' })
        } else {
          next(false)
        }
      }
    })
  } else {
    next()
  }
})

router.afterEach((to, from) => {
  if (to.meta.title) {
    uni.setNavigationBarTitle({ title: to.meta.title as string })
  }
})
```
