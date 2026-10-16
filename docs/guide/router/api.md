# API 文档

## createRouter

▸ createRouter(options): `Router`

创建一个可以被 Vue 应用使用的 Router 实例。

### 参数
| 名称 | 类型 |描述|
| --- | --- | -- |
| options | `RouterOptions` |`RouterOptions`|

### 返回值
`Router` 实例，包含以下属性和方法：

| 属性/方法 | 类型 | 描述 |
| --- | --- | --- |
| `currentRoute` | `Ref<RouteLocationNormalized>` | 当前路由信息的响应式引用 |
| `routes` | `RouteRecordRaw[]` | 路由表配置数组 |
| `push` | `(to: RouteLocationRaw) => Promise<any>` | 保留当前页面，跳转到应用内的某个页面 |
| `replace` | `(to: RouteLocationRaw) => Promise<any>` | 关闭当前页面，跳转到应用内的某个页面 |
| `replaceAll` | `(to: RouteLocationRaw) => Promise<any>` | 关闭所有页面，打开到应用内的某个页面 |
| `pushTab` | `(to: RouteLocationRaw) => Promise<any>` | 跳转到 tabBar 页面 |
| `back` | `(back?: RouteBackRaw) => void` | 返回上一页面或多级页面 |
| `beforeEach` | `(guard: NavigationGuard) => () => void` | 注册全局前置导航守卫，返回移除守卫的函数 |
| `afterEach` | `(guard: NavigationHookAfter) => () => void` | 注册全局后置导航守卫，返回移除守卫的函数 |
| `install` | `(app: App) => void` | Vue 插件安装方法 |


## useRouter

▸ useRouter(): `Router`

返回路由器实例。相当于在模板中使用 $Router。

>不可以脱离 Vue 上下文使用

### 返回值

`Router`



## useRoute

▸ useRoute(): `Route`

返回当前的路由地址信息。相当于在模板中使用 $Route。

>不可以脱离 Vue 上下文使用，且只能在页面`mount`之后才可与使用。当使用场景为外部链接跳转进入或H5页面刷新时，默认从当前链接中取得query参数并放在`Route`的`query`字段中，这种场景建议走`onLoad`声明周期获取参数。

### 返回值

`Route`

## Router实例方法

导航目标中的 `path` 使用 `RoutePath`，`name` 使用 `RouteName`。配置声明后可提示项目内的候选值；默认仍接受动态字符串，严格模式才限制已注册的值。接入步骤见[路径与名称补全](./typed-routes.md)。

### push方法

▸ router.push(target:RouteLocationRaw): void

保留当前页面，跳转到应用内的某个页面，相当于使用 `uni.navigateTo(OBJECT)`。


### pushTab方法

▸ router.pushTab(target:RouteLocationRaw): void

跳转到 tabBar 页面，并关闭其他所有非 tabBar 页面，相当于使用 `uni.switchTab(OBJECT)`。

### replace方法

▸ router.replace(target:RouteLocationRaw): void

关闭当前页面，跳转到应用内的某个页面，相当于使用 `uni.redirectTo(OBJECT)`。

### replaceAll方法

▸ router.replaceAll(target:RouteLocationRaw): void

关闭所有页面，打开到应用内的某个页面，相当于使用 `uni.reLaunch(OBJECT)`。

### back方法

▸ router.back(back?: RouteBackRaw): void

关闭当前页面，返回上一页面或多级页面，相当于使用 `uni.navigateBack(OBJECT)`。

### 参数
| 名称 | 类型 | 描述 |
| --- | --- | --- |
| back | `number \| RouteBackLocation` | 返回的页面数或返回配置对象。默认值为 `1`，表示返回上一页。 |

**RouteBackLocation 类型：**
| 属性 | 类型 | 描述 |
| --- | --- | --- |
| delta | `number` | 返回的页面数，默认值为 `1` |
| animationType | `AnimationType` | 窗口动画类型 |
| animationDuration | `number` | 窗口动画持续时间，单位为 ms |

## 路由补全类型

以下类型从 `@wot-ui/router` 导出：

| 类型 | 用途 |
| --- | --- |
| `RouterTypeConfig` | 通过模块增强注册 `path`、`name` 字符串字面量联合类型，以及可选的 `strict: true` |
| `RoutePath` | 导航路径类型，支持已注册路径及其 `?query` 形式 |
| `RouteName` | 导航名称类型 |

未注册的字段保持 `string`。默认模式在提供补全的同时接受普通字符串；严格模式只接受已注册字段的候选值。`RouteRecordRaw` 仍用于定义运行时路由，补全声明不会代替路由配置。

## 路由声明生成工具

从 `@wot-ui/router/typed-routes` 导入，仅供 Node.js 构建配置或脚本使用。

该子入口同时导出以下类型（不从 `@wot-ui/router` 主入口导出）：

| 类型 | 结构与用途 |
| --- | --- |
| `RouteTypePage` | 单个页面：`path: string`，可选 `name: string`、`aliasPath: string` |
| `RouteTypePagesConfig` | 页面集合：可选 `pages` 和 `subPackages`；每个分包包含 `root` 和 `pages` |
| `RouteTypeOptions` | 生成选项：可选 `strict: boolean`；写入工具额外要求 `dts: string` |

```ts
import type { RouteTypePage, RouteTypePagesConfig, RouteTypeOptions } from '@wot-ui/router/typed-routes'
```

### writeRouteTypes

`writeRouteTypes(config, options): void`

根据页面配置生成声明文件。内容未变化时跳过写入，父目录不存在时自动创建。在同目录写完唯一临时文件后原子替换目标文件；写入或替换失败时尝试清理临时文件，并抛出原始异常。调用方可以补充输出路径等上下文，但应继续抛错，避免使用过期类型。

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `config` | `RouteTypePagesConfig` | 页面配置，结构见下方示例；调用方应提供与运行时路由一致的数据 |
| `options.dts` | `string` | 必填，声明文件输出路径；相对路径基于进程工作目录，推荐使用绝对路径 |
| `options.strict` | `boolean` | 默认 `false`；为 `true` 时在生成声明中启用严格模式 |

```ts
import { writeRouteTypes } from '@wot-ui/router/typed-routes'

writeRouteTypes({
  pages: [{ path: 'pages/index/index', name: 'home' }],
  subPackages: [{
    root: 'subPages',
    pages: [{ path: 'detail/index', name: 'detail' }],
  }],
}, {
  dts: 'src/typed-router.d.ts',
})
```

每个页面包含 `path: string`，以及可选的 `name: string`、`aliasPath: string`。主包路径加上前导 `/`，分包路径拼接为 `/${root}/${path}`；别名按配置值原样收集，不拼接分包目录。路径和名称分别去重、排序，没有名称的页面只生成路径类型。

拼接前会去掉 `root` 和 `path` 的首尾斜杠，并过滤空片段。同名对应不同路径时会输出包含名称与冲突路径的警告，但不会中止生成；同名同路径的重复记录不警告。运行时路由表仍由调用方维护，需确保两边的路径一致。

生成声明始终包含 `path` 和 `name`；空集合输出 `never`。严格模式下，无名称页面仍可按路径导航，但不能使用名称导航；完全空的元数据不允许任何路径或名称导航。未开启严格模式时仍接受普通字符串。

### generateRouteTypes

`generateRouteTypes(config, options?): string`

接收相同的页面配置，返回声明文本，不写入文件。`options` 仅包含可选的 `strict`，适合已有文件生成流程的项目。

这两个工具不负责扫描页面、解析 `pages.json` 或监听文件变化。使用 uni-pages 时可按[自动生成步骤](./typed-routes.md#auto-setup)接入；其他项目需自行读取配置并在变化后重新调用。带注释或条件编译的页面配置应先由对应工具解析，再传入生成器。

