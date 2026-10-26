import type { LocationQuery, Router } from '@wot-ui/router'

declare const router: Router
// 保留 1.1.2 接受的所有 query 值，包括数组中的 null。
declare const legacyQuery: Record<string, string | null | (string | null)[]>
const compatibleQuery: LocationQuery = legacyQuery
router.push({ path: '/pages/detail', query: compatibleQuery })
router.push({ path: '/pages/detail', query: { filters: ['active', null] } })

// 新增的 number 和顶层 undefined 支持仍然有效。
const query: LocationQuery = { page: 0, optional: undefined, empty: null, filters: ['active', 1, null] }
router.push({ path: '/pages/detail', query })

// @ts-expect-error 不接受 boolean
router.push({ path: '/pages/detail', query: { enabled: true } })
// @ts-expect-error 不接受嵌套对象
router.push({ path: '/pages/detail', query: { filter: { id: 1 } } })
// @ts-expect-error 本次只恢复数组中的 null，不扩展为 undefined 数组
router.push({ path: '/pages/detail', query: { filters: [undefined] } })
