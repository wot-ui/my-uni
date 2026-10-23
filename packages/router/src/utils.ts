/**
 * 解析 URL 参数
 * @param path 完整路径
 * @returns 参数对象
 */
export function getUrlParams(path: string): Record<string, string> {
  const index = path.indexOf('?')
  if (index === -1)
    return {}

  const queryStr = path.slice(index + 1)
  const params: Record<string, string> = {}

  for (const pair of queryStr.split('&')) {
    const [key, value] = pair.split('=')
    if (key) {
      // 简单解码，防止编码问题
      try {
        params[decodeURIComponent(key)] = value ? decodeURIComponent(value) : ''
      }
      catch (error) {
        console.error(error)
        params[key] = value || ''
      }
    }
  }
  return params
}

/**
 * 序列化参数并拼接到 URL
 * @param path 基础路径
 * @param query 参数对象
 * @returns 完整路径
 */
export function stringifyQuery(path: string, query: Record<string, any>): string {
  if (!query || Object.keys(query).length === 0)
    return path

  const queryStr = Object.keys(query)
    .filter(key => query[key] !== undefined && query[key] !== null)
    .map((key) => {
      const val = query[key]
      return `${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`
    })
    .join('&')

  if (!queryStr)
    return path

  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}${queryStr}`
}

/**
 * 规范化 URL (去除多余的 /)
 */
export function normalizeUrl(url: string): string {
  // 简单处理，uni-app 路径通常是相对的或绝对的 /pages/...
  return url.replace(/\/{2,}/g, '/')
}

/**
 * 判断对象是否为空
 */
export function isEmptyObject(obj: unknown): boolean {
  return !obj || Object.keys(obj as object).length === 0
}
