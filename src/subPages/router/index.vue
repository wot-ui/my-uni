<script setup lang="ts">
const { success: showSuccess } = useGlobalToast()
const router = useRouter()
const route = useRoute()

function navigateToEssentials() {
  router.push({
    name: 'essentials',
  })
}

function navigateToAdvanced() {
  router.push({
    name: 'advanced',
  })
}

function navigateToApiReference() {
  router.push({
    name: 'api-reference',
  })
}

function copyCode(code: string) {
  uni.setClipboardData({
    data: code,
    showToast: false,
    success: () => {
      uni.hideToast()
      showSuccess({ msg: '代码已复制到剪贴板' })
    },
  })
}
</script>

<template>
  <view class="min-h-screen bg-gray-100 py-3 dark:bg-[var(--wot-dark-background)]">
    <view class="mx-3 mb-3">
      <view class="rounded-3 bg-white px-5 py-8 text-center dark:bg-[var(--wot-dark-background2)]">
        <view class="mb-3 text-10">
          🚀
        </view>
        <view class="mb-2 text-6 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
          @wot-ui/router
        </view>
        <view class="mb-2 text-3.5 text-gray-600 leading-relaxed dark:text-[var(--wot-dark-color2)]">
          轻量级 uni-app 路由管理解决方案
        </view>
        <view class="text-3 text-gray-500 dark:text-[var(--wot-dark-color2)]">
          支持编程式导航、参数传递、导航守卫等功能
        </view>
      </view>
    </view>

    <demo-block title="当前路由信息" transparent>
      <view class="rounded-3 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
        <view class="flex items-center justify-between border-b border-gray-100 py-2 last:border-b-0 dark:border-[var(--wot-dark-border)]">
          <text class="text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
            路径:
          </text>
          <text class="text-3.5 text-gray-800 font-mono dark:text-[var(--wot-dark-color)]">
            {{ route.path }}
          </text>
        </view>
        <view class="flex items-center justify-between border-b border-gray-100 py-2 last:border-b-0 dark:border-[var(--wot-dark-border)]">
          <text class="text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
            名称:
          </text>
          <text class="text-3.5 text-gray-800 font-mono dark:text-[var(--wot-dark-color)]">
            {{ route.name || '未设置' }}
          </text>
        </view>
        <view class="flex items-center justify-between border-b border-gray-100 py-2 last:border-b-0 dark:border-[var(--wot-dark-border)]">
          <text class="text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
            参数:
          </text>
          <text class="break-all text-3.5 text-gray-800 font-mono dark:text-[var(--wot-dark-color)]">
            {{ JSON.stringify(route.params) }}
          </text>
        </view>
        <view class="flex items-center justify-between py-2">
          <text class="text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
            查询:
          </text>
          <text class="break-all text-3.5 text-gray-800 font-mono dark:text-[var(--wot-dark-color)]">
            {{ JSON.stringify(route.query) }}
          </text>
        </view>
      </view>
    </demo-block>

    <demo-block title="快速开始" transparent>
      <view class="space-y-3">
        <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="mb-2 flex items-center gap-2">
            <view class="h-8 w-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              1
            </view>
            <view class="text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
              入门指南
            </view>
          </view>
          <view class="mb-3 text-3.5 text-gray-600 leading-relaxed dark:text-[var(--wot-dark-color2)]">
            学习基础导航、参数传递等核心功能
          </view>
          <view class="mb-3 flex items-center justify-between border border-gray-200 rounded-2 bg-gray-50 p-3 dark:border-[var(--wot-dark-border)] dark:bg-[var(--wot-dark-background3)]" @click="copyCode('router.push(\'/pages/index/index\')')">
            <text class="flex-1 text-3 text-gray-700 font-mono dark:text-[var(--wot-dark-color)]">
              router.push('/pages/index/index')
            </text>
            <wd-icon name="copy" size="16px" color="#666" />
          </view>
          <wd-button type="primary" block @click="navigateToEssentials">
            开始学习 →
          </wd-button>
        </view>

        <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="mb-2 flex items-center gap-2">
            <view class="h-8 w-8 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
              2
            </view>
            <view class="text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
              进阶指南
            </view>
          </view>
          <view class="mb-3 text-3.5 text-gray-600 leading-relaxed dark:text-[var(--wot-dark-color2)]">
            掌握导航守卫、权限控制等高级功能
          </view>
          <view class="mb-3 flex items-center justify-between border border-gray-200 rounded-2 bg-gray-50 p-3 dark:border-[var(--wot-dark-border)] dark:bg-[var(--wot-dark-background3)]" @click="copyCode('router.beforeEach((to, from, next) => { next() })')">
            <text class="flex-1 text-3 text-gray-700 font-mono dark:text-[var(--wot-dark-color)]">
              router.beforeEach((to, from, next) => { next() })
            </text>
            <wd-icon name="copy" size="16px" color="#666" />
          </view>
          <wd-button type="warning" block @click="navigateToAdvanced">
            深入学习 →
          </wd-button>
        </view>

        <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="mb-2 flex items-center gap-2">
            <view class="h-8 w-8 flex items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
              3
            </view>
            <view class="text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
              API 参考
            </view>
          </view>
          <view class="mb-3 text-3.5 text-gray-600 leading-relaxed dark:text-[var(--wot-dark-color2)]">
            查看完整的 API 文档和使用示例
          </view>
          <view class="mb-3 flex items-center justify-between border border-gray-200 rounded-2 bg-gray-50 p-3 dark:border-[var(--wot-dark-border)] dark:bg-[var(--wot-dark-background3)]" @click="copyCode('router.pushTab(\'/pages/index/index\')')">
            <text class="flex-1 text-3 text-gray-700 font-mono dark:text-[var(--wot-dark-color)]">
              router.pushTab('/pages/index/index')
            </text>
            <wd-icon name="copy" size="16px" color="#666" />
          </view>
          <wd-button type="success" block @click="navigateToApiReference">
            查看文档 →
          </wd-button>
        </view>
      </view>
    </demo-block>

    <demo-block title="核心功能概览" transparent>
      <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
        <view class="space-y-3">
          <view class="flex items-start gap-3">
            <view class="mt-1 text-2">
              🎯
            </view>
            <view>
              <view class="mb-1 text-3.5 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
                编程式导航
              </view>
              <view class="text-3 text-gray-600 dark:text-[var(--wot-dark-color2)]">
                支持 push、replace、back 等多种导航方法
              </view>
            </view>
          </view>

          <view class="flex items-start gap-3">
            <view class="mt-1 text-2">
              📦
            </view>
            <view>
              <view class="mb-1 text-3.5 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
                参数传递
              </view>
              <view class="text-3 text-gray-600 dark:text-[var(--wot-dark-color2)]">
                支持 params 和 query 两种参数传递方式
              </view>
            </view>
          </view>

          <view class="flex items-start gap-3">
            <view class="mt-1 text-2">
              🛡️
            </view>
            <view>
              <view class="mb-1 text-3.5 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
                导航守卫
              </view>
              <view class="text-3 text-gray-600 dark:text-[var(--wot-dark-color2)]">
                全局前置守卫和后置钩子，支持权限控制
              </view>
            </view>
          </view>

          <view class="flex items-start gap-3">
            <view class="mt-1 text-2">
              🔄
            </view>
            <view>
              <view class="mb-1 text-3.5 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
                路由替换
              </view>
              <view class="text-3 text-gray-600 dark:text-[var(--wot-dark-color2)]">
                支持 replace 和 replaceAll 方法，灵活控制页面栈
              </view>
            </view>
          </view>

          <view class="flex items-start gap-3">
            <view class="mt-1 text-2">
              📱
            </view>
            <view>
              <view class="mb-1 text-3.5 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
                TabBar 支持
              </view>
              <view class="text-3 text-gray-600 dark:text-[var(--wot-dark-color2)]">
                专门的 pushTab 方法用于跳转到 TabBar 页面
              </view>
            </view>
          </view>
        </view>
      </view>
    </demo-block>
  </view>
</template>
