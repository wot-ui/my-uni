import type { Router } from '@wot-ui/router'
import type { App, Plugin } from 'vue'
import type { ButtonOpenType } from 'wot-design-uni/components/wd-button/types'

// 在应用侧解析 Vue，防止 router 子包使用另一版本的 App 类型。
declare const app: App
declare const router: Router
app.use(router)
const plugin: Plugin = router
void plugin

// wd-button 的开放能力必须都能透传给原生 button，且仍保持枚举约束。
declare const openType: ButtonOpenType
const nativeOpenType: UniHelper.ButtonOpenType = openType
const realtimePhoneNumber: UniHelper.ButtonOpenType = 'getRealtimePhoneNumber'
// @ts-expect-error 未定义的开放能力不应被接受
const invalidOpenType: UniHelper.ButtonOpenType = 'getRealtimePhoneNumberTypo'
void nativeOpenType
void realtimePhoneNumber
void invalidOpenType
