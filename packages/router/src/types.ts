import type { App, Ref } from 'vue'

export type RouteParams = Record<string, string | string[]>
export type LocationQuery = Record<string, string | null | (string | null)[]>
export type RouteMeta = Record<string | number | symbol, unknown>

export type AnimationType = 'auto' | 'none' | 'slide-out-right' | 'slide-out-left' | 'slide-out-top' | 'slide-out-bottom' | 'fade-out' | 'zoom-in' | 'zoom-fade-in' | 'pop-out'

export type RGBAColor = `rgba(${number}, ${number}, ${number}, ${number})`
export type HEXColor = `#${string}`
export type PxSize = `${number}px`
export type PercentageSize = `${number}%`
export type ThemeVar = `@${string}`

export interface RouteLocationBase {
  animationType?: AnimationType
  animationDuration?: number
}

export interface RouteBackLocation extends RouteLocationBase {
  delta?: number
}

export interface RouteRecordRaw {
  /**
   * 路由路径
   */
  path: string
  /**
   * 路由名称
   */
  name?: string
  /**
   * 路由元数据
   */
  meta?: RouteMeta
  /**
   * 页面窗口表现 style
   */
  style?: GlobalStyle
  /**
   * 路由别名路径 未实现
   */
  aliasPath?: string
  [key: string]: any
}

interface AppPlus {
  /**
   * 窗体背景色，支持 HEX 颜色
   *
   * 无论 vue 页面还是 nvue 页面，在 App 上都有一个父级原生窗体，该窗体的背景色生效时间快于页面里的 css 生效时间
   *
   * @default "#FFFFFF"
   *
   * @desc App (vue 页面需要将 body 背景色设为透明)
   *
   * @format color
   */
  background?: HEXColor
  /**
   * 页面回弹效果，设置为 "none" 时关闭效果
   *
   * @desc App-vue（nvue Android 无页面级bounce效果，仅 list、recycle-list、waterfall 等滚动组件有 bounce 效果）
   */
  bounce?: string
  /**
   * 侧滑返回功能，仅支持 "close" / "none"
   *
   * "close" 启用侧滑返回
   *
   * "none" 禁用侧滑返回
   *
   * @default "close"
   *
   * @desc App-iOS
   */
  popGesture?: 'close' | 'none'
  /**
   * iOS 软键盘上完成工具栏的显示模式，设置为 "none" 时关闭工具栏
   *
   * @default "auto"
   *
   * @desc App-iOS
   */
  softInputNavBar?: 'auto' | 'none'
  /**
   * 软键盘弹出模式，仅支持 "adjustResize" / "adjustPan"
   *
   * @default "adjustPan"
   *
   * @desc App
   */
  softInputMode?: 'adjustResize' | 'adjustPan'
  /**
   * 下拉刷新
   *
   * @desc App
   */
  pullToRefresh?: {
    /**
     * 是否开启窗口下拉刷新
     *
     * @default false
     */
    support?: boolean
    /**
     * 下拉刷新控件颜色，仅 style 为 "circle" 时有效，支持 HEX 颜色
     *
     * @default "#2BD009"
     *
     * @format color
     */
    color?: HEXColor
    /**
     * 下拉刷新控件样式
     *
     * "default" 下拉拖动时页面内容跟随
     *
     * "circle" 下拉拖动时仅刷新控件跟随
     *
     * @default Android 为 "circle"，iOS 为 "default"
     */
    style?: 'default' | 'circle'
    /**
     * 下拉刷新控件进入刷新状态的拉拽高度，支持以 px 为单位的逻辑像素值或百分比
     */
    height?: PxSize | PercentageSize
    /**
     * 窗口可下拉拖拽的范围，支持以 px 为单位的逻辑像素值或百分比
     */
    range?: PxSize | PercentageSize
    /**
     * 下拉刷新控件的起始位置，仅 style 为 "circle" 时有效，用于定义刷新控件下拉时的起始位置，支持以 px 为单位的逻辑像素值或百分比
     *
     * 如使用了非原生 title 且需要原生下拉刷新，一般都设置 style 为 "circle" 并将 offset 设置为自定义 title 的高度
     */
    offset?: PxSize | PercentageSize
    /**
     * 下拉可刷新状态时配置，仅 style 为 "default" 时有效
     */
    contentdown?: {
      /**
       * 下拉可刷新状态时下拉刷新控件标题内容
       */
      caption?: string
      [x: string]: any
    }
    /**
     * 释放可刷新状态时配置，仅 style 为 "default" 时有效
     */
    contentover?: {
      /**
       * 释放可刷新状态时下拉刷新控件标题内容
       */
      caption?: string
      [x: string]: any
    }
    /**
     * 正在刷新状态时配置，仅 style 为 "default" 时有效
     */
    contentrefresh?: {
      /**
       * 正在刷新状态时下拉刷新控件标题内容
       */
      caption?: string
      [x: string]: any
    }
    [x: string]: any
  }
  /**
   * 滚动条显示策略，设置为 "none" 时不显示滚动条
   *
   * @desc App
   */
  scrollIndicator?: string
  /**
   * 窗口显示的动画效果，详见 [窗口动画](https://uniapp.dcloud.net.cn/api/router#animation)
   *
   * @default "pop-in"
   *
   * @desc App
   */
  animationType?: AnimationType
  /**
   * 窗口显示动画的持续时间，单位为 ms
   *
   * @default 300
   *
   * @desc App
   */
  animationDuration?: number
  [x: string]: any
}

interface H5 {
  /**
   * 下拉刷新，详见 [下拉刷新](https://uniapp.dcloud.net.cn/collocation/pages#h5-pulltorefresh)
   */
  pullToRefresh?: {
    /**
     * 下拉刷新控件颜色，支持 HEX 颜色
     *
     * @default "#2BD009"
     */
    color?: HEXColor
    /**
     * 下拉刷新控件起始位置，支持支持单位为 px 的逻辑像素值或百分比
     *
     * @default "0px"
     */
    offset?: PxSize | PercentageSize
    [x: string]: any
  }
  [x: string]: any
}

/**
 * 设置编译到 mp-alipay 平台的特定样式，配置项参考 [MP-ALIPAY](https://uniapp.dcloud.net.cn/collocation/pages#mp-alipay) 和 <https://opendocs.alipay.com/mini/framework/app-json#window>
 *
 * 相应的类型是 MpAlipay
 *
 * @desc 支付宝小程序
 */
interface MpAlipay {
  /**
   * 是否允许向下拉拽
   *
   * @default "YES"
   */
  allowsBounceVertical?: 'YES' | 'NO'
  /**
   * 窗口的背景色，支持 HEX 颜色
   *
   * @format color
   */
  backgroundColor?: HEXColor | ThemeVar
  /**
   * 下拉露出显示背景图的底色，仅 Android 有效，iOS 下页面背景图底色会使用 backgroundColor 的值
   *
   * @format color
   */
  backgroundImageColor?: HEXColor
  /**
   * 下拉露出显示背景图的链接，支持网络地址和本地地址，尽量使用绝对地址
   */
  backgroundImageUrl?: string
  /**
   * 页面默认标题
   */
  defaultTitle?: string
  /**
   * 仅支持 Android，是否显示 WebView 滚动条
   *
   * @default "YES"
   */
  enableScrollBar?: 'YES' | 'NO'
  /**
   * 仅支持 iOS，是否支持手势返回
   *
   * @default "YES"
   */
  gestureBack?: 'YES' | 'NO'
  /**
   * 页面上拉触底时触发时距离页面底部的距离，单位为 px，详情可查看 [页面事件处理函数](https://opendocs.alipay.com/mini/framework/page-detail#%E9%A1%B5%E9%9D%A2%E4%BA%8B%E4%BB%B6%E5%A4%84%E7%90%86%E5%87%BD%E6%95%B0)
   *
   * @desc [1.19.0](https://opendocs.alipay.com/mini/framework/compatibility)，目前 iOS 在 page.json 下设置无效，只能全局设置
   */
  onReachBottomDistance?: number
  /**
   * 是否允许下拉刷新，allowsBounceVertical 值需要为 "YES"，全局配置后全局生效，但是如果单个页面配置了该参数，以页面的配置为准
   *
   * @default false
   */
  pullRefresh?: boolean
  /**
   * rpx 单位是否宽度自适应
   *
   * 当设置为 false 时，2 rpx 将恒等于 1 px，不再根据屏幕宽度进行自适应，此时 750 rpx 将不再等于 100% 宽度
   *
   * @desc [1.23.0](https://opendocs.alipay.com/mini/framework/compatibility)
   *
   * @default true
   */
  responsive?: boolean
  /**
   * 是否进入时显示导航栏的 loading
   *
   * @default "NO"
   */
  showTitleLoading?: 'YES' | 'NO'
  /**
   * 导航栏透明设置
   *
   * always 一直透明
   *
   * auto 滑动自适应
   *
   * none 不透明
   *
   * @default "none"
   */
  transparentTitle?: 'always' | 'auto' | 'none'
  /**
   * 导航栏点击穿透
   *
   * @default "NO"
   */
  titlePenetrate?: 'YES' | 'NO'
  /**
   * 导航栏图片地址，会替换当前文字标题，只支持 https 图片链接
   */
  titleImage?: string
  /**
   * 导航栏背景色，支持 HEX 颜色
   */
  titleBarColor?: HEXColor
  /**
   * 导航栏前景色
   *
   * @desc [支付宝客户端 10.5.30](https://opendocs.alipay.com/mini/framework/compatibility)
   */
  navigationBarFrontColor?: 'black' | 'white'
  [x: string]: any
}

/**
 * 设置编译到 mp-baidu 平台的特定样式，配置项参考 [MP-BAIDU](https://uniapp.dcloud.net.cn/collocation/pages.html#mp-baidu) 和 <https://smartprogram.baidu.com/docs/develop/framework/process/#window>
 *
 * 相应的类型是 MpBaidu
 *
 * @desc 百度小程序
 */
interface MpBaidu {
  /**
   * 导航栏背景颜色，支持 HEX 颜色
   *
   * @default "#000000"
   *
   * @format color
   */
  navigationBarBackgroundColor?: HEXColor | ThemeVar
  /**
   * 导航栏标题、状态栏颜色
   *
   * @default "white"
   */
  navigationBarTextStyle?: 'black' | 'white' | ThemeVar
  /**
   * 导航栏标题文字内容
   */
  navigationBarTitleText?: string
  /**
   * 导航栏样式
   *
   * "default" 默认样式
   *
   * "custom" 自定义导航栏，只保留右上角胶囊按钮
   *
   * @desc 2.10.34
   *
   * @default "default"
   */
  navigationStyle?: 'default' | 'custom'
  /**
   * 窗口的背景色，支持 HEX 颜色
   *
   * @default "#FFFFFF"
   */
  backgroundColor?: HEXColor | ThemeVar
  /**
   * 下拉 loading 的样式，仅支持 "dark" / "light"
   *
   * @default "dark"
   */
  backgroundTextStyle?: 'dark' | 'light' | ThemeVar
  /**
   * 顶部窗口的背景色，仅 iOS 支持
   *
   * @default "#FFFFFF"
   */
  backgroundColorTop?: HEXColor | ThemeVar
  /**
   * 底部窗口的背景色，仅 iOS 支持
   *
   * @default "#FFFFFF"
   */
  backgroundColorBottom?: HEXColor | ThemeVar
  /**
   * 是否开启全局的下拉刷新
   *
   * @default false
   */
  enablePullDownRefresh?: boolean
  /**
   * 页面上拉触底事件触发时距页面底部距离，单位为 px
   *
   * @default 50
   */
  onReachBottomDistance?: number
  /**
   * 小程序页面是否禁止响应字体大小的设置
   *
   * "auto" 默认响应
   *
   * "none" 不响应
   *
   * @desc 基础库版本 3.200.1
   *
   * @default "auto"
   */
  textSizeAdjust?: 'auto' | 'none'
  /**
   * 屏幕旋转设置，支持 auto / portrait / landscape
   *
   * "auto" 自动
   *
   * "portrait" 竖屏
   *
   * "landscape" 横屏
   *
   * @desc 基础库版本 3.450.8，web 化暂不支持
   *
   * @default "portrait"
   */
  pageOrientation?: 'auto' | 'portrait' | 'landscape'
  [x: string]: any
}

/**
 * 设置编译到 mp-jd 平台的特定样式，配置项参考 <https://mp-docs.jd.com/doc/dev/framework/504#heading-3>
 *
 * 相应的类型是 MpJd
 *
 * @desc 京东小程序
 */
interface MpJd {
  /**
   * 导航栏背景颜色，支持 HEX 颜色
   *
   * @default "#000000"
   *
   * @format color
   */
  navigationBarBackgroundColor?: HEXColor | ThemeVar
  /**
   * 导航栏标题、状态栏颜色
   *
   * @default "white"
   */
  navigationBarTextStyle?: 'black' | 'white' | ThemeVar
  /**
   * 导航栏标题文字内容
   */
  navigationBarTitleText?: string
  /**
   * 导航栏样式
   *
   * "default" 默认样式
   *
   * "custom" 自定义导航栏，只保留右上角胶囊按钮
   *
   * @default "default"
   */
  navigationStyle?: 'default' | 'custom'
  /**
   * 下拉窗口的背景色，不是页面的背景颜色
   *
   * @default "#FFFFFF"
   */
  backgroundColor?: HEXColor | ThemeVar
  /**
   * 下拉 loading 的样式，仅支持 "dark" / "light"
   *
   * @default "dark"
   */
  backgroundTextStyle?: 'dark' | 'light' | ThemeVar
  /**
   * 顶部窗口的背景色，仅 iOS 支持
   *
   * @default "#FFFFFF"
   */
  backgroundColorTop?: HEXColor | ThemeVar
  /**
   * 底部窗口的背景色，仅 iOS 支持
   *
   * @default "#FFFFFF"
   */
  backgroundColorBottom?: HEXColor | ThemeVar
  /**
   * 是否开启全局的下拉刷新，详见 [Page.onPullDownRefresh](https://mp-docs.jd.com/doc/dev/framework/520#heading-10)
   *
   * @default false
   */
  enablePullDownRefresh?: boolean
  [x: string]: any
}

/**
 * 设置编译到 mp-kuaishou 平台的特定样式，配置项参考 <https://mp.kuaishou.com/docs/develop/frame/config/conf_appjson.html#window>
 *
 * 相应的类型是 MpKuaishou
 *
 * @desc 快手小程序
 */
interface MpKuaishou {
  /**
   * 导航栏背景颜色，支持 HEX 颜色
   *
   * @default "#000000"
   *
   * @format color
   */
  navigationBarBackgroundColor?: HEXColor | ThemeVar
  /**
   * 导航栏标题、状态栏颜色
   *
   * @default "white"
   */
  navigationBarTextStyle?: 'black' | 'white' | ThemeVar
  /**
   * 导航栏标题文字内容
   */
  navigationBarTitleText?: string
  /**
   * 导航栏样式
   *
   * "default" 默认样式
   *
   * "custom" 自定义导航栏，只保留右上角胶囊按钮
   *
   * @default "default"
   */
  navigationStyle?: 'default' | 'custom'
  /**
   * 窗口的背景色，支持 HEX 颜色
   *
   * @default "#FFFFFF"
   */
  backgroundColor?: HEXColor | ThemeVar
  /**
   * 下拉 loading 的样式，仅支持 "dark" / "light"
   *
   * @default "dark"
   */
  backgroundTextStyle?: 'dark' | 'light' | ThemeVar
  /**
   * 顶部窗口的背景色，仅 iOS 支持
   *
   * @default "#FFFFFF"
   */
  backgroundColorTop?: HEXColor | ThemeVar
  /**
   * 底部窗口的背景色，仅 iOS 支持
   *
   * @default "#FFFFFF"
   */
  backgroundColorBottom?: HEXColor | ThemeVar
  /**
   * 是否开启全局的下拉刷新，详见 [Page.onPullDownRefresh](https://mp.kuaishou.com/docs/develop/frame/page/page_page.html#onpulldownrefresh)
   *
   * @default false
   */
  enablePullDownRefresh?: boolean
  /**
   * 页面上拉触底事件触发时距页面底部距离，单位为 px，详见 [Page.onReachBottom](https://mp.kuaishou.com/docs/develop/frame/page/page_page.html#onreachbottom)
   *
   * @default 50
   */
  onReachBottomDistance?: number
  /**
   * 屏幕旋转设置，支持 auto / portrait / landscape，详见 [响应显示区域变化](https://developers.weixin.qq.com/miniprogram/dev/framework/view/resizable.html)
   *
   * "auto" 自动
   *
   * "portrait" 竖屏
   *
   * "landscape" 横屏
   *
   * @default "portrait"
   */
  pageOrientation?: 'auto' | 'portrait' | 'landscape'
  [x: string]: any
}

/**
 * 设置编译到 mp-lark 平台的特定样式，配置项参考 <https://open.feishu.cn/document/client-docs/gadget/introduction/global-settings#a172b7dd>
 *
 * 相应的类型是 MpLark
 *
 * @desc 飞书小程序
 */
interface MpLark {
  /**
   * 导航栏背景颜色，支持 HEX 颜色
   *
   * @desc iOS, Android
   *
   * @default "#000000"
   *
   * @format color
   */
  navigationBarBackgroundColor?: HEXColor | ThemeVar
  /**
   * 导航栏标题、状态栏颜色
   *
   * @desc iOS, Android
   *
   * @default "white"
   */
  navigationBarTextStyle?: 'black' | 'white' | ThemeVar
  /**
   * 导航栏标题文字内容
   *
   * @desc iOS, Android, PC
   */
  navigationBarTitleText?: string
  /**
   * 导航栏透明设置
   *
   * "always" 一直透明
   *
   * "auto" 滑动自适应
   *
   * "none" 不透明
   *
   * @desc iOS, Android
   *
   * @default "none"
   */
  transparentTitle?: 'always' | 'auto' | 'none'
  /**
   * 导航栏样式
   *
   * "default" 默认样式
   *
   * "custom" 自定义导航栏，只保留右上角胶囊按钮
   *
   * @desc iOS, Android, PC
   *
   * @default "default"
   */
  navigationStyle?: 'default' | 'custom'
  /**
   * 窗口的背景色，支持 HEX 颜色
   *
   * @desc iOS, Android, PC(3.14.0+)
   *
   * @default "#FFFFFF"
   */
  backgroundColor?: HEXColor | ThemeVar
  /**
   * 下拉 loading 的样式，仅支持 "dark" / "light"
   *
   * @desc iOS, Android
   *
   * @default "dark"
   */
  backgroundTextStyle?: 'dark' | 'light' | ThemeVar
  /**
   * 顶部窗口的背景色
   *
   * @desc iOS
   *
   * @default "#FFFFFF"
   */
  backgroundColorTop?: HEXColor | ThemeVar
  /**
   * 底部窗口的背景色
   *
   * @desc iOS
   *
   * @default "#FFFFFF"
   */
  backgroundColorBottom?: HEXColor | ThemeVar
  /**
   * 是否开启全局的下拉刷新
   *
   * @desc iOS, Android
   *
   * @default false
   */
  enablePullDownRefresh?: boolean
  /**
   * 页面上拉触底事件触发时距页面底部距离，单位为 px
   *
   * @desc iOS, Android
   *
   * @default 50
   */
  onReachBottomDistance?: number
  /**
   * PCMode 模式下特定的窗口配置，支持的属性与通用 window 配置属性一致，仅当在 ext 内配置了 defaultPages.PCMode 时生效
   */
  PCMode?: Omit<MpLark, 'PCMode'>
  [x: string]: any
}

/**
 * 设置编译到 mp-qq 平台的特定样式，配置项参考 <https://q.qq.com/wiki/develop/miniprogram/frame/dispose.html#window>
 *
 * 相应的类型是 MpQq
 *
 * @desc QQ 小程序
 */
interface MpQq {
  /**
   * 导航栏背景颜色，支持 HEX 颜色
   *
   * @default "#000000"
   *
   * @format color
   */
  navigationBarBackgroundColor?: HEXColor | ThemeVar
  /**
   * 导航栏标题、状态栏颜色
   *
   * @default "white"
   */
  navigationBarTextStyle?: 'black' | 'white' | ThemeVar
  /**
   * 导航栏标题文字内容
   */
  navigationBarTitleText?: string
  /**
   * 导航栏样式
   *
   * "default" 默认样式
   *
   * "custom" 自定义导航栏，只保留右上角胶囊按钮
   *
   * @default "default"
   */
  navigationStyle?: 'default' | 'custom'
  /**
   * 窗口的背景色，支持 HEX 颜色
   *
   * @default "#FFFFFF"
   */
  backgroundColor?: HEXColor | ThemeVar
  /**
   * 下拉 loading 的样式，仅支持 "dark" / "light"
   *
   * @default "dark"
   */
  backgroundTextStyle?: 'dark' | 'light' | ThemeVar
  /**
   * 顶部窗口的背景色，仅 iOS 支持
   *
   * @default "#FFFFFF"
   */
  backgroundColorTop?: HEXColor | ThemeVar
  /**
   * 底部窗口的背景色，仅 iOS 支持
   *
   * @default "#FFFFFF"
   */
  backgroundColorBottom?: HEXColor | ThemeVar
  /**
   * 是否开启全局的下拉刷新，详见 [Page.onPullDownRefresh](https://q.qq.com/wiki/develop/miniprogram/frame/logic/logic_register_page.html#onPullDownRefresh)
   *
   * @default false
   */
  enablePullDownRefresh?: boolean
  /**
   * 屏幕旋转设置，支持 auto / portrait / landscape，详见 [响应显示区域变化](https://q.qq.com/wiki/develop/miniprogram/frame/view/view_section_change.html)
   *
   * "auto" 自动
   *
   * "portrait" 竖屏
   *
   * "landscape" 横屏
   *
   * @default "portrait"
   */
  pageOrientation?: 'auto' | 'portrait' | 'landscape'
  [x: string]: any
}

/**
 * 设置编译到 mp-toutiao 平台的特定样式，配置项参考 <https://developer.open-douyin.com/docs/resource/zh-CN/mini-app/develop/framework/general-configuration#window>
 *
 * 相应的类型是 MpToutiao
 *
 * @desc 抖音小程序
 */
interface MpToutiao {
  /**
   * 导航栏背景颜色，支持 HEX 颜色
   *
   * @default "#000000"
   *
   * @format color
   */
  navigationBarBackgroundColor?: HEXColor | ThemeVar
  /**
   * 导航栏标题颜色，同时影响标题颜色、右胶囊颜色、左返回箭头颜色
   *
   * @default "white"
   */
  navigationBarTextStyle?: 'black' | 'white' | ThemeVar
  /**
   * 导航栏标题文字内容
   */
  navigationBarTitleText?: string
  /**
   * 导航栏样式
   *
   * "default" 默认样式
   *
   * "custom" 自定义导航栏，只保留右上角胶囊按钮
   *
   * @default "default"
   */
  navigationStyle?: 'default' | 'custom'
  /**
   * 窗口的背景色，支持 HEX 颜色
   *
   * @default "#FFFFFF"
   */
  backgroundColor?: HEXColor | ThemeVar
  /**
   * 下拉 loading 的样式，仅支持 "dark" / "light"
   *
   * @default "dark"
   */
  backgroundTextStyle?: 'dark' | 'light' | ThemeVar
  /**
   * 顶部窗口的背景色，仅 iOS 支持
   *
   * @default 同 backgroundColor
   */
  backgroundColorTop?: HEXColor | ThemeVar
  /**
   * 底部窗口的背景色，仅 iOS 支持
   *
   * @default 同 backgroundColor
   */
  backgroundColorBottom?: HEXColor | ThemeVar
  /**
   * 是否开启全局的下拉刷新
   *
   * @default false
   */
  enablePullDownRefresh?: boolean
  /**
   * 页面上拉触底事件触发时距页面底部距离，单位为 px
   *
   * @default 50
   */
  onReachBottomDistance?: number
  /**
   * 仅在 navigationStyle 为 "default" 时生效，用来控制导航栏透明设置
   *
   * "always" 一直透明
   *
   * "auto" 滑动自适应
   *
   * "none" 不透明
   *
   * @default "none"
   */
  transparentTitle?: 'always' | 'auto' | 'none'
  /**
   * 框架骨架屏配置，仅支持配置 config 属性，优先级高于 app.json，详见 [小程序框架骨架屏](https://developer.open-douyin.com/docs/resource/zh-CN/mini-app/develop/guide/experience-optimization/list/skeleton)
   *
   * @desc 2.47.0
   */
  skeleton?: {
    /**
     * 包含超时移除及自动生成配置等
     */
    config?: {
      /**
       * 设置骨架屏超时移除时间，单位为 ms，为 0 时关闭超时移除
       *
       * @default 2000
       */
      timeout?: number
      /**
       * 骨架屏显示时的动画
       *
       * @default 'spin'
       */
      loading?: 'spin' | 'chiaroscuro' | 'shine'
      /**
       * 骨架页面中图片块配置
       *
       * @default { shape: 'rect', color: '#efefef' }
       */
      image?: {
        /**
         * 骨架页面中图片块形状
         *
         * circle 圆形
         *
         * rect 矩形
         *
         * @default "rect"
         */
        shape?: 'circle' | 'rect'
        /**
         * 骨架页面中图片块颜色，支持 HEX 颜色
         *
         * @default "#efefef"
         *
         * @format color
         */
        color?: HEXColor
        [x: string]: any
      }
      /**
       * 骨架页面中被视为按钮块的配置
       *
       * @default { color: '#efefef }
       */
      button?: {
        /**
         * 骨架页面中被视为按钮块的颜色，支持 HEX 颜色
         *
         * @default "#efefef"
         *
         * @format color
         */
        color?: HEXColor
        [x: string]: any
      }
      /**
       * 骨架屏背景色，支持 HEX 颜色
       *
       * @default "#fff"
       *
       * @format color
       */
      backgroundColor?: HEXColor
      /**
       * 默认为使用绝对定位占满全屏
       *
       * 当对自定义组件使用，作为局部加载的样式时，可设置为 "auto"，高度随内容高度撑开
       *
       * @default "fullscreen"
       */
      mode?: 'fullscreen' | 'auto'
      /**
       * CSS单位，元素绝对定位都使用 "vw" 与 "vh"
       *
       * @default "vw"
       */
      cssUnit?: 'px' | 'rem' | 'vw' | 'vh' | 'vmin' | 'vmax'
      /**
       * 生成骨架屏页面中 css 值保留的小数点位数，默认为 4
       *
       * @default 4
       */
      decimal?: number
      [x: string]: any
    }
    /**
     * 页面路径同骨架屏文件的对应关系
     */
    page?: Record<string, string>
    [x: string]: any
  }
  [x: string]: any
}

/**
 * 设置编译到 mp-weixin 平台的特定样式，配置项参考 [MP-WEIXIN](https://uniapp.dcloud.net.cn/collocation/pages#mp-weixin) 和 <https://developers.weixin.qq.com/miniprogram/dev/reference/configuration/app.html#window>
 *
 * 相应的类型是 MpWeixin
 *
 * @desc 微信小程序
 */
interface MpWeixin {
  /**
   * 导航栏背景颜色，支持 HEX 颜色
   *
   * @default "#000000"
   *
   * @format color
   */
  navigationBarBackgroundColor?: HEXColor | ThemeVar
  /**
   * 导航栏标题、状态栏颜色
   *
   * @default "white"
   */
  navigationBarTextStyle?: 'black' | 'white' | ThemeVar
  /**
   * 导航栏标题文字内容
   */
  navigationBarTitleText?: string
  /**
   * 导航栏样式
   *
   * "default" 默认样式
   *
   * "custom" 自定义导航栏，只保留右上角胶囊按钮
   *
   * @desc iOS / Android 微信客户端 6.6.0，Windows 微信客户端不支持
   *
   * @default "default"
   */
  navigationStyle?: 'default' | 'custom'
  /**
   * 在非首页、非页面栈最底层页面或非 tabbar 内页面中的导航栏展示 home 键
   *
   * @desc 微信客户端 8.0.24
   *
   * @default false
   */
  homeButton?: boolean
  /**
   * 窗口的背景色，支持 HEX 颜色
   *
   * @default "#FFFFFF"
   */
  backgroundColor?: HEXColor | ThemeVar
  /**
   * 下拉 loading 的样式，仅支持 "dark" / "light"
   *
   * @default "dark"
   */
  backgroundTextStyle?: 'dark' | 'light' | ThemeVar
  /**
   * 顶部窗口的背景色，仅 iOS 支持
   *
   * @desc 微信客户端 6.5.16
   *
   * @default "#FFFFFF"
   */
  backgroundColorTop?: HEXColor | ThemeVar
  /**
   * 底部窗口的背景色，仅 iOS 支持
   *
   * @desc 微信客户端 6.5.16
   *
   * @default "#FFFFFF"
   */
  backgroundColorBottom?: HEXColor | ThemeVar
  /**
   * 是否开启全局的下拉刷新，详见 [Page.onPullDownRefresh](https://developers.weixin.qq.com/miniprogram/dev/reference/api/Page.html#onpulldownrefresh)
   *
   * @default false
   */
  enablePullDownRefresh?: boolean
  /**
   * 页面上拉触底事件触发时距页面底部距离，单位为 px，详见 [Page.onReachBottom](https://developers.weixin.qq.com/miniprogram/dev/reference/api/Page.html#onreachbottom)
   *
   * @default 50
   */
  onReachBottomDistance?: number
  /**
   * 屏幕旋转设置，支持 auto / portrait / landscape，详见 [响应显示区域变化](https://developers.weixin.qq.com/miniprogram/dev/framework/view/resizable.html)
   *
   * "auto" 自动
   *
   * "portrait" 竖屏
   *
   * "landscape" 横屏
   *
   * @desc [2.4.0](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html) (auto) / [2.5.0](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html) (landscape)
   *
   * @default "portrait"
   */
  pageOrientation?: 'auto' | 'portrait' | 'landscape'
  /**
   * 重新启动策略配置
   *
   * "homePage" 如果从这个页面退出小程序，下次将从首页冷启动
   *
   * "homePageAndLatestPage" 如果从这个页面退出小程序，下次冷启动后立刻加载这个页面，页面的参数保持不变（不可用于 tab 页）
   *
   * @desc [2.8.0](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html)
   */
  restartStrategy?: 'homePage' | 'homePageAndLatestPage'
  /**
   * 页面初始渲染缓存配置，详见 [初始渲染缓存](https://developers.weixin.qq.com/miniprogram/dev/framework/view/initial-rendering-cache.html)
   *
   * @desc [2.11.1](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html)
   */
  initialRenderingCache?: 'static' | 'dynamic'
  /**
   * 切入系统后台时，隐藏页面内容，保护用户隐私
   *
   * @desc [2.15.0](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html)
   *
   * @default "none"
   */
  visualEffectInBackground?: 'hidden' | 'none'
  /**
   * 控制预加载下个页面的时机，详见 [控制预加载下个页面的时机](https://developers.weixin.qq.com/miniprogram/dev/framework/performance/tips/runtime_nav.html#_2-4-%E6%8E%A7%E5%88%B6%E9%A2%84%E5%8A%A0%E8%BD%BD%E4%B8%8B%E4%B8%AA%E9%A1%B5%E9%9D%A2%E7%9A%84%E6%97%B6%E6%9C%BA)
   *
   * "static" 在当前页面 onReady 触发 200ms 后触发预加载
   *
   * "auto" 渲染线程空闲时进行预加载，由基础库根据一段时间内 requestAnimationFrame 的触发频率算法判断
   *
   * "manual" 由开发者通过调用 [wx.preloadWebview](https://developers.weixin.qq.com/miniprogram/dev/api/base/performance/wx.preloadWebview.html) 触发，开发者可以在页面主要内容的 setData 结束后手动触发
   *
   * @desc [2.15.0](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html)
   *
   * @default "static"
   */
  handleWebviewPreload?: 'static' | 'manual' | 'auto'
  [x: string]: any
}

export interface GlobalStyle {
  /**
   * 导航栏背景颜色（同状态栏背景色），支持 HEX 颜色
   *
   * @desc APP 与 H5 为 #F8F8F8，小程序平台请参考相应小程序文档
   *
   * @format color
   */
  'navigationBarBackgroundColor'?: HEXColor | ThemeVar
  /**
   * 导航栏标题颜色及状态栏前景颜色，仅支持 "black" / "white"
   *
   * @default "black"
   *
   * @desc 支付宝小程序不支持，请使用 my.setNavigationBar
   */
  'navigationBarTextStyle'?: 'black' | 'white' | ThemeVar
  /**
   * 导航栏标题文字内容
   */
  'navigationBarTitleText'?: string
  /**
   * 导航栏阴影
   */
  'navigationBarShadow'?: {
    /**
     * 阴影颜色
     */
    colorType?: 'grey' | 'blue' | 'green' | 'orange' | 'red' | 'yellow'
  }
  /**
   * 导航栏样式，仅支持 "default" / "custom"
   *
   * "custom" 即取消默认的原生导航栏，详看 [使用注意](https://uniapp.dcloud.net.cn/collocation/pages#customnav)
   *
   * @default "default"
   *
   * @desc 微信小程序 7.0+、百度小程序、H5、App（2.0.3+）
   */
  'navigationStyle'?: 'default' | 'custom'
  /**
   * 下拉显示出来的窗口的背景色，支持 HEX 颜色
   *
   * @default "#ffffff"
   *
   * @desc 微信小程序
   *
   * @format color
   */
  'backgroundColor'?: HEXColor | ThemeVar
  /**
   * 下拉 loading 的样式，仅支持 "dark" / "light"
   *
   * @default "dark"
   *
   * @desc 微信小程序
   */
  'backgroundTextStyle'?: 'dark' | 'light' | ThemeVar
  /**
   * 是否开启下拉刷新，详见 [页面生命周期](https://uniapp.dcloud.net.cn/tutorial/page.html#lifecycle)
   *
   * @default false
   */
  'enablePullDownRefresh'?: boolean
  /**
   * 页面上拉触底事件触发时距页面底部距离，单位为 px，详见 [页面生命周期](https://uniapp.dcloud.net.cn/tutorial/page.html#lifecycle)
   *
   * @default 50
   */
  'onReachBottomDistance'?: number
  /**
   * 顶部窗口的背景色（bounce回弹区域）
   *
   * @default "#ffffff"
   *
   * @desc iOS
   *
   * @format color
   */
  'backgroundColorTop'?: HEXColor | ThemeVar
  /**
   * 底部窗口的背景色（bounce回弹区域）
   *
   * @default "#ffffff"
   *
   * @desc iOS
   *
   * @format color
   */
  'backgroundColorBottom'?: HEXColor | ThemeVar
  /**
   * 导航栏图片地址（替换当前文字标题）
   *
   * 支付宝小程序内必须使用 https 图片链接地址
   *
   * @desc 支付宝小程序、H5、APP
   */
  'titleImage'?: string
  /**
   * 导航栏整体（前景、背景）透明设置，仅支持 "always" / "auto" / "none
   *
   * "always" 一直透明
   *
   * "auto" 滑动自适应
   *
   * "none" 不透明
   *
   * @default "none"
   *
   * @desc 支付宝小程序、H5、APP
   */
  'transparentTitle'?: 'always' | 'auto' | 'none'
  /**
   * 导航栏点击穿透
   *
   * @default "NO"
   *
   * @desc 支付宝小程序、H5
   */
  'titlePenetrate'?: 'YES' | 'NO'
  /**
   * 横屏配置，屏幕旋转设置，仅支持 "auto" / "portrait" / "landscape"，详见 [响应显示区域变化](https://developers.weixin.qq.com/miniprogram/dev/framework/view/resizable.html)
   *
   * "auto" 自动
   *
   * "portrait" 竖屏
   *
   * "landscape" 横屏
   *
   * @default "portrait"
   *
   * @desc App 2.4.7+、微信小程序、QQ小程序
   */
  'pageOrientation'?: string
  /**
   * 窗口显示的动画效果，详见 [窗口动画](https://uniapp.dcloud.net.cn/api/router#animation)
   *
   * @default "pop-in"
   *
   * @desc App
   */
  'animationType'?: AnimationType
  /**
   * 窗口显示动画的持续时间，单位为 ms
   *
   * @default 300
   *
   * @desc App
   */
  'animationDuration'?: number
  /**
   * 设置编译到 App 平台的特定样式，配置项参考 [app-plus](https://uniapp.dcloud.net.cn/collocation/pages#app-plus)
   *
   * 相应的类型是 AppPlus
   *
   * @desc App
   */
  'app-plus'?: AppPlus
  /**
   * 设置编译到 H5 平台的特定样式，配置项参考 [H5](https://uniapp.dcloud.net.cn/collocation/pages#h5)
   *
   * 相应的类型是 H5
   *
   * @desc H5
   */
  'h5'?: H5
  /**
   * 设置编译到 mp-alipay 平台的特定样式，配置项参考 [MP-ALIPAY](https://uniapp.dcloud.net.cn/collocation/pages#mp-alipay) 和 <https://opendocs.alipay.com/mini/framework/app-json#window>
   *
   * 相应的类型是 MpAlipay
   *
   * @desc 支付宝小程序
   */
  'mp-alipay'?: MpAlipay
  /**
   * 设置编译到 mp-weixin 平台的特定样式，配置项参考 [MP-WEIXIN](https://uniapp.dcloud.net.cn/collocation/pages#mp-weixin) 和 <https://developers.weixin.qq.com/miniprogram/dev/reference/configuration/app.html#window>
   *
   * 相应的类型是 MpWeixin
   *
   * @desc 微信小程序
   */
  'mp-weixin'?: MpWeixin
  /**
   * 设置编译到 mp-baidu 平台的特定样式，配置项参考 [MP-BAIDU](https://uniapp.dcloud.net.cn/collocation/pages.html#mp-baidu) 和 <https://smartprogram.baidu.com/docs/develop/framework/process/#window>
   *
   * 相应的类型是 MpBaidu
   *
   * @desc 百度小程序
   */
  'mp-baidu'?: MpBaidu
  /**
   * 设置编译到 mp-toutiao 平台的特定样式，配置项参考 <https://developer.open-douyin.com/docs/resource/zh-CN/mini-app/develop/framework/general-configuration#window>
   *
   * 相应的类型是 MpToutiao
   *
   * @desc 抖音小程序
   */
  'mp-toutiao'?: MpToutiao
  /**
   * 设置编译到 mp-lark 平台的特定样式
   *
   * 相应的类型是 MpLark
   *
   * @desc 飞书小程序
   */
  'mp-lark'?: MpLark
  /**
   * 设置编译到 mp-qq 平台的特定样式
   *
   * 相应的类型是 MpQq
   *
   * @desc QQ 小程序
   */
  'mp-qq'?: MpQq
  /**
   * 设置编译到 mp-kuaishou 平台的特定样式
   *
   * 相应的类型是 MpKuaishou
   *
   * @desc 快手小程序
   */
  'mp-kuaishou'?: MpKuaishou
  /**
   * 设置编译到 mp-jd 平台的特定样式
   *
   * 相应的类型是 MpJd
   *
   * @desc 京东小程序
   */
  'mp-jd'?: MpJd
  /**
   * 引用小程序组件，详见 [小程序组件](https://uniapp.dcloud.net.cn/tutorial/miniprogram-subject.html#%E5%B0%8F%E7%A8%8B%E5%BA%8F%E8%87%AA%E5%AE%9A%E4%B9%89%E7%BB%84%E4%BB%B6%E6%94%AF%E6%8C%81)
   *
   * @desc App、微信小程序、支付宝小程序、百度小程序、京东小程序
   */
  'usingComponents'?: Record<string, string>
  /**
   * 同层渲染，webrtc（实时音视频）无法正常时尝试配置为 "seperated" 强制关掉同层渲染
   *
   * @desc 微信小程序
   */
  'renderingMode'?: string
  /**
   * 当存在 leftWindow 时，默认是否显示 leftWindow，详见 [topWindow](https://uniapp.dcloud.net.cn/collocation/pages.html#topwindow)
   *
   * @default true
   *
   * @desc H5
   */
  'leftWindow'?: boolean
  /**
   * 当存在 topWindow 时，默认是否显示 topWindow，详见 [topWindow](https://uniapp.dcloud.net.cn/collocation/pages.html#topwindow)
   *
   * @default true
   *
   * @desc H5
   */
  'topWindow'?: boolean
  /**
   * 当存在 rightWindow 时，默认是否显示 rightWindow，详见 [topWindow](https://uniapp.dcloud.net.cn/collocation/pages.html#topwindow)
   *
   * @default true
   *
   * @desc H5
   */
  'rightWindow'?: boolean
  /**
   * rpx 计算所支持的最大设备宽度，单位为 px
   *
   * @default 960
   *
   * @desc App（vue2 且不含 nvue）、H5（2.8.12+）
   */
  'rpxCalcMaxDeviceWidth'?: number
  /**
   * rpx 计算使用的基准设备宽度，设备实际宽度超出 rpx 计算所支持的最大设备宽度时将按基准宽度计算，单位为 px
   *
   * @default 375
   *
   * @desc App（vue2 且不含 nvue）、H5（2.8.12+）
   */
  'rpxCalcBaseDeviceWidth'?: number
  /**
   * rpx 计算特殊处理的值，始终按实际的设备宽度计算，单位为 rpx
   *
   * @default 750
   *
   * @desc App（vue2 且不含 nvue）、H5（2.8.12+）
   */
  'rpxCalcIncludeWidth'?: number
  /**
   * 是否使用动态 rpx，屏幕大小变化会重新渲染 rpx
   *
   * @default false
   *
   * @desc App-nvue（vue3 固定值为 true） 3.2.13+
   */
  'dynamicRpx'?: boolean
  /**
   * 当浏览器可见区域宽度大于 maxWidth 时两侧留白，当小于等于 maxWidth 时页面铺满，单位为 px
   *
   * 不同页面支持配置不同的 maxWidth
   *
   * maxWidth = leftWindow（可选）+ page（页面主体）+ rightWindow（可选）
   *
   * 使用时，页面内 fixed 元素需要使用 --window-left 和 --window-right 来保证布局位置正确
   *
   * @desc H5（2.9.9+）
   */
  'maxWidth'?: number
  [x: string]: any
}

export interface RouteLocationNormalized {
  path: string
  name?: string
  params: RouteParams
  query: LocationQuery
  hash: string
  fullPath: string
  meta: RouteMeta
  style?: GlobalStyle
  redirectedFrom?: RouteLocationNormalized
  [x: string]: any
}

export type RouteLocationRaw
  = | string
    | {
      path?: string
      name?: string
      params?: RouteParams
      query?: LocationQuery
      hash?: string
      replace?: boolean
      navType?: NavType // 扩展：支持指定跳转方式
      animationType?: string
      animationDuration?: number
    }

export interface RouterOptions {
  routes: RouteRecordRaw[]
}

export type NavigationGuardNext = (
  to?: RouteLocationRaw | false | true | void,
) => void

export type NavigationGuard = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext,
) => Promise<void | RouteLocationRaw | false | boolean> | void | RouteLocationRaw | false | boolean

export type NavigationHookAfter = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
) => void

export type NavType = 'push' | 'replace' | 'replaceAll' | 'pushTab' | 'back'

export type RouteBackRaw = number | RouteBackLocation

export interface Router {
  readonly currentRoute: Ref<RouteLocationNormalized>
  readonly routes: RouteRecordRaw[]
  push: (to: RouteLocationRaw) => Promise<any>
  replace: (to: RouteLocationRaw) => Promise<any>
  replaceAll: (to: RouteLocationRaw) => Promise<any>
  pushTab: (to: RouteLocationRaw) => Promise<any>
  back: (back?: RouteBackRaw) => void
  beforeEach: (guard: NavigationGuard) => () => void
  afterEach: (guard: NavigationHookAfter) => () => void
  install: (app: App) => void
}

export const START_LOCATION_NORMALIZED: RouteLocationNormalized = {
  path: '/',
  name: undefined,
  params: {},
  query: {},
  hash: '',
  fullPath: '/',
  meta: {},
  style: {},
}
