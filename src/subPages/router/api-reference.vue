<script setup lang="ts">
definePage({
  name: 'api-reference',
  style: {
    navigationBarTitleText: 'API 参考',
  },
})

const router = useRouter()
const route = useRoute()

const currentPath = computed(() => route.path)

function goBack() {
  router.back()
}

function demoPush() {
  router.push('/subPages/router/essentials-navigation')
}

function demoPushTab() {
  router.pushTab('/pages/index/index')
}

function demoReplace() {
  router.replace('/subPages/router/essentials-navigation')
}

function demoReplaceAll() {
  router.replaceAll('/pages/index/index')
}

function demoBack() {
  router.back()
}

function demoBackAdvanced() {
  router.push('/subPages/router/api-reference-back')
}

function copyCode(code: string) {
  uni.setClipboardData({
    data: code,
    showToast: false,
    success: () => {
      uni.hideToast()
      uni.showToast({
        title: '代码已复制',
        icon: 'success',
      })
    },
  })
}
</script>

<template>
  <view class="min-h-screen bg-gray-100 py-3 dark:bg-[var(--wot-dark-background)]">
    <view class="mx-3 mb-3">
      <view class="rounded-3 bg-white px-5 py-6 text-center dark:bg-[var(--wot-dark-background2)]">
        <view class="mb-3 text-10">
          📖
        </view>
        <view class="mb-2 text-6 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
          API 参考
        </view>
        <view class="text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
          @wot-ui/router 完整 API 文档
        </view>
      </view>
    </view>

    <demo-block title="Hooks" transparent>
      <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
        <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
          useRoute (响应式)
        </view>
        <view class="mb-3 text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
          当前路由路径 (computed): {{ currentPath }}
        </view>
        <view class="mb-3 border border-gray-200 rounded-2 bg-gray-50 p-3 dark:border-[var(--wot-dark-border)] dark:bg-[var(--wot-dark-background3)]" @click="copyCode('const route = useRoute()\nconst currentPath = computed(() => route.path)')">
          <text class="text-3 text-gray-700 font-mono dark:text-[var(--wot-dark-color)]">
            const route = useRoute()
            const currentPath = computed(() => route.path)
          </text>
        </view>
      </view>
    </demo-block>

    <demo-block title="Router 方法" transparent>
      <view class="space-y-3">
        <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            push
          </view>
          <view class="mb-3 text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
            保留当前页面，跳转到应用内的某个页面，相当于 uni.navigateTo()
          </view>
          <view class="mb-3 border border-gray-200 rounded-2 bg-gray-50 p-3 dark:border-[var(--wot-dark-border)] dark:bg-[var(--wot-dark-background3)]" @click="copyCode('router.push(target)')">
            <text class="text-3 text-gray-700 font-mono dark:text-[var(--wot-dark-color)]">
              router.push(target)
            </text>
          </view>
          <wd-button type="primary" block @click="demoPush">
            演示 push
          </wd-button>
        </view>

        <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            pushTab
          </view>
          <view class="mb-3 text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
            跳转到 tabBar 页面，并关闭其他所有非 tabBar 页面，相当于 uni.switchTab()
          </view>
          <view class="mb-3 border border-gray-200 rounded-2 bg-gray-50 p-3 dark:border-[var(--wot-dark-border)] dark:bg-[var(--wot-dark-background3)]" @click="copyCode('router.pushTab(target)')">
            <text class="text-3 text-gray-700 font-mono dark:text-[var(--wot-dark-color)]">
              router.pushTab(target)
            </text>
          </view>
          <wd-button type="success" block @click="demoPushTab">
            演示 pushTab
          </wd-button>
        </view>

        <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            replace
          </view>
          <view class="mb-3 text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
            关闭当前页面，跳转到应用内的某个页面，相当于 uni.redirectTo()
          </view>
          <view class="mb-3 border border-gray-200 rounded-2 bg-gray-50 p-3 dark:border-[var(--wot-dark-border)] dark:bg-[var(--wot-dark-background3)]" @click="copyCode('router.replace(target)')">
            <text class="text-3 text-gray-700 font-mono dark:text-[var(--wot-dark-color)]">
              router.replace(target)
            </text>
          </view>
          <wd-button type="warning" block @click="demoReplace">
            演示 replace
          </wd-button>
        </view>

        <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            replaceAll
          </view>
          <view class="mb-3 text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
            关闭所有页面，打开到应用内的某个页面，相当于 uni.reLaunch()
          </view>
          <view class="mb-3 border border-gray-200 rounded-2 bg-gray-50 p-3 dark:border-[var(--wot-dark-border)] dark:bg-[var(--wot-dark-background3)]" @click="copyCode('router.replaceAll(target)')">
            <text class="text-3 text-gray-700 font-mono dark:text-[var(--wot-dark-color)]">
              router.replaceAll(target)
            </text>
          </view>
          <wd-button type="error" block @click="demoReplaceAll">
            演示 replaceAll
          </wd-button>
        </view>

        <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            back
          </view>
          <view class="mb-3 text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
            关闭当前页面，返回上一页面或多级页面，相当于 uni.navigateBack()
          </view>
          <view class="mb-3 space-y-2">
            <view class="border border-gray-200 rounded-2 bg-gray-50 p-3 dark:border-[var(--wot-dark-border)] dark:bg-[var(--wot-dark-background3)]" @click="copyCode('router.back()')">
              <text class="text-3 text-gray-700 font-mono dark:text-[var(--wot-dark-color)]">
                router.back()
              </text>
            </view>
            <view class="border border-gray-200 rounded-2 bg-gray-50 p-3 dark:border-[var(--wot-dark-border)] dark:bg-[var(--wot-dark-background3)]" @click="copyCode('router.back({ delta: 2 })')">
              <text class="text-3 text-gray-700 font-mono dark:text-[var(--wot-dark-color)]">
                router.back({ delta: 2 })
              </text>
            </view>
          </view>
          <view class="grid grid-cols-2 gap-2">
            <wd-button type="info" @click="demoBack">
              基础 back
            </wd-button>
            <wd-button type="info" @click="demoBackAdvanced">
              高级 back
            </wd-button>
          </view>
        </view>
      </view>
    </demo-block>

    <demo-block title="导航守卫" transparent>
      <view class="space-y-3">
        <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            beforeEach
          </view>
          <view class="mb-3 text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
            全局前置守卫，在导航触发前执行
          </view>
          <view class="border border-gray-200 rounded-2 bg-gray-50 p-3 dark:border-[var(--wot-dark-border)] dark:bg-[var(--wot-dark-background3)]" @click="copyCode(&quot;router.beforeEach((to, from, next) => { next() })&quot;)">
            <text class="text-3 text-gray-700 font-mono dark:text-[var(--wot-dark-color)]">
              router.beforeEach((to, from, next) => { next() })
            </text>
          </view>
        </view>

        <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            afterEach
          </view>
          <view class="mb-3 text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
            全局后置钩子，在导航成功完成后执行
          </view>
          <view class="border border-gray-200 rounded-2 bg-gray-50 p-3 dark:border-[var(--wot-dark-border)] dark:bg-[var(--wot-dark-background3)]" @click="copyCode(&quot;router.afterEach((to, from) => { console.log(to) })&quot;)">
            <text class="text-3 text-gray-700 font-mono dark:text-[var(--wot-dark-color)]">
              router.afterEach((to, from) => { console.log(to) })
            </text>
          </view>
        </view>
      </view>
    </demo-block>

    <demo-block title="类型定义" transparent>
      <view class="space-y-3">
        <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            RouteLocationRaw
          </view>
          <view class="border border-gray-200 rounded-2 bg-gray-50 p-3 dark:border-[var(--wot-dark-border)] dark:bg-[var(--wot-dark-background3)]">
            <text class="text-3 text-gray-700 leading-relaxed font-mono dark:text-[var(--wot-dark-color)]">
              type RouteLocationRaw = string | RouteLocationPath | RouteLocationNameRaw

              interface RouteLocationPath {
              path: string
              query?: LocationQuery
              }

              interface RouteLocationNameRaw {
              name: string
              params?: RouteParams
              query?: LocationQuery
              }
            </text>
          </view>
        </view>

        <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            RouterBackRaw
          </view>
          <view class="border border-gray-200 rounded-2 bg-gray-50 p-3 dark:border-[var(--wot-dark-border)] dark:bg-[var(--wot-dark-background3)]">
            <text class="text-3 text-gray-700 leading-relaxed font-mono dark:text-[var(--wot-dark-color)]">
              type RouterBackRaw = number | RouteBackLocation

              interface RouteBackLocation {
              delta?: number
              url?: string
              animationType?: AnimationType
              animationDuration?: number
              }
            </text>
          </view>
        </view>

        <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            NavigationGuard
          </view>
          <view class="border border-gray-200 rounded-2 bg-gray-50 p-3 dark:border-[var(--wot-dark-border)] dark:bg-[var(--wot-dark-background3)]">
            <text class="text-3 text-gray-700 leading-relaxed font-mono dark:text-[var(--wot-dark-color)]">
              type NavigationGuard = (
              to: RouteLocationNormalized,
              from: RouteLocationNormalized,
              next: NavigationGuardNext
              ) => NavigationGuardReturn

              type NavigationGuardReturn = void | boolean | RouteLocationRaw
            </text>
          </view>
        </view>
      </view>
    </demo-block>

    <demo-block title="导航" transparent>
      <wd-button type="warning" block @click="goBack">
        返回上一页
      </wd-button>
    </demo-block>
  </view>
</template>
