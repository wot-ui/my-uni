/*
 * @Author: weisheng
 * @Date: 2025-12-22 14:19:12
 * @LastEditTime: 2026-01-05 20:15:50
 * @LastEditors: weisheng
 * @Description:
 * @FilePath: /my-uni/src/router/index.ts
 * 记得注释
 */
/// <reference types="@wot-ui/router/client" />
import { pages, subPackages } from 'virtual:uni-pages'

function generateRoutes() {
  const routes = pages.map((page) => {
    const newPath = `/${page.path}`
    return { ...page, path: newPath }
  })
  if (subPackages && subPackages.length > 0) {
    subPackages.forEach((subPackage) => {
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
  routes: generateRoutes(),
})
router.beforeEach((to, from, next) => {
  console.log('🚀 beforeEach 守卫触发:', { to, from })

  if (to.name === 'advanced-beforeeach') {
    const { show: showToast } = useGlobalToast()
    showToast('beforeEach 钩子已触发！')
  }

  // 演示：基本的导航日志记录
  if (to.path && from.path) {
    console.log(`📍 导航: ${from.path} → ${to.path}`)
  }

  // 演示：对受保护页面的简单拦截
  if (to.name === 'advanced-protected') {
    const { confirm: showConfirm } = useGlobalMessage()
    console.log('🛡️ 检测到访问受保护页面')

    return new Promise<void>((resolve, reject) => {
      showConfirm({
        title: '守卫拦截演示',
        msg: '这是一个受保护的页面，需要确认后才能访问',
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

  // 演示：针对后置钩子示例页面的特殊处理
  if (to.name === 'advanced-aftereach') {
    const { show: showToast } = useGlobalToast()
    console.log('📊 进入后置钩子示例页面')
    setTimeout(() => {
      showToast('全局 afterEach 钩子已触发！')
    }, 500)
  }
})

export default router
