<script setup lang="ts">
definePage({
  name: 'advanced-guard-return',
  style: {
    navigationBarTitleText: '守卫返回值',
  },
})

const router = useRouter()
const { confirm: showConfirm, alert: showAlert } = useGlobalMessage()

function goBack() {
  router.back()
}

type GuardMode = 'none' | 'true' | 'false' | 'redirect'

const currentGuardMode = ref<GuardMode>('none')
const guardMessage = ref('')
const redirectPath = ref('/subPages/router/essentials-navigation')
let removeGuard: (() => void) | null = null

function setGuardMode(mode: GuardMode) {
  removeGuard?.()
  currentGuardMode.value = mode
  guardMessage.value = ''

  switch (mode) {
    case 'none':
      removeGuard = router.beforeEach((_to: any, _from: any, next: any) => {
        guardMessage.value = '守卫未做任何处理，导航继续'
        next()
      })
      break
    case 'true':
      removeGuard = router.beforeEach(() => {
        guardMessage.value = '守卫返回 true，导航继续'
        return true
      })
      break
    case 'false':
      removeGuard = router.beforeEach(() => {
        guardMessage.value = '守卫返回 false，导航被取消'
        showAlert({
          title: '导航被取消',
          msg: '当前守卫模式设置为返回 false，导航已被阻止。',
          confirmButtonText: '确定',
        })
        return false
      })
      break
    case 'redirect':
      removeGuard = router.beforeEach(() => {
        guardMessage.value = `守卫返回重定向路径: ${redirectPath.value}`
        showAlert({
          title: '导航被重定向',
          msg: `当前守卫模式设置为重定向，将跳转到: ${redirectPath.value}`,
          confirmButtonText: '确定',
        })
        return redirectPath.value
      })
      break
  }
}

async function navigateToDemo() {
  try {
    await router.push('/subPages/router/essentials-navigation')
  }
  catch (error) {
    // 返回 false 是示例中的预期结果，守卫已经展示了取消提示。
    if (error instanceof Error && error.message === 'NavigationCancelled') {
      return
    }

    console.error('导航失败:', error)
    showAlert({
      title: '导航失败',
      msg: '页面跳转失败，请重试。详细原因请查看控制台。',
      confirmButtonText: '确定',
    })
  }
}

function testNavigation() {
  if (currentGuardMode.value === 'false') {
    showConfirm({
      title: '确认测试',
      msg: '当前守卫模式会取消导航，是否继续测试？',
      confirmButtonText: '继续',
      cancelButtonText: '取消',
      success: (res) => {
        if (res.action === 'confirm') {
          navigateToDemo()
        }
      },
    })
  }
  else if (currentGuardMode.value === 'redirect') {
    showConfirm({
      title: '确认测试',
      msg: `当前守卫模式会重定向到 ${redirectPath.value}，是否继续测试？`,
      confirmButtonText: '继续',
      cancelButtonText: '取消',
      success: (res) => {
        if (res.action === 'confirm') {
          navigateToDemo()
        }
      },
    })
  }
  else {
    navigateToDemo()
  }
}

onUnmounted(() => {
  removeGuard?.()
})
</script>

<template>
  <view class="min-h-screen bg-gray-100 py-3 dark:bg-[var(--wot-dark-background)]">
    <view class="mx-3 mb-3">
      <view class="rounded-3 bg-white px-5 py-6 text-center dark:bg-[var(--wot-dark-background2)]">
        <view class="mb-3 text-8">
          🔄
        </view>
        <view class="mb-2 text-5 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
          守卫返回值
        </view>
        <view class="text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
          演示守卫的不同返回值行为
        </view>
      </view>
    </view>

    <demo-block title="守卫模式选择" transparent>
      <view class="space-y-3">
        <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            选择守卫模式
          </view>
          <view class="grid grid-cols-2 gap-2">
            <wd-button
              :type="currentGuardMode === 'none' ? 'primary' : 'default'"
              size="small"
              @click="setGuardMode('none')"
            >
              无处理
            </wd-button>
            <wd-button
              :type="currentGuardMode === 'true' ? 'success' : 'default'"
              size="small"
              @click="setGuardMode('true')"
            >
              返回 true
            </wd-button>
            <wd-button
              :type="currentGuardMode === 'false' ? 'error' : 'default'"
              size="small"
              @click="setGuardMode('false')"
            >
              返回 false
            </wd-button>
            <wd-button
              :type="currentGuardMode === 'redirect' ? 'warning' : 'default'"
              size="small"
              @click="setGuardMode('redirect')"
            >
              重定向
            </wd-button>
          </view>
        </view>

        <view v-if="currentGuardMode === 'redirect'" class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            重定向路径
          </view>
          <wd-input v-model="redirectPath" placeholder="请输入重定向路径" />
        </view>
      </view>
    </demo-block>

    <demo-block title="测试导航" transparent>
      <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
        <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
          触发导航
        </view>
        <view class="mb-3 text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
          点击下方按钮测试当前守卫模式的效果
        </view>
        <wd-button type="primary" block @click="testNavigation">
          🚀 跳转到入门指南导航页
        </wd-button>
      </view>
    </demo-block>

    <demo-block title="代码说明" transparent>
      <view class="space-y-3">
        <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            无处理 (next())
          </view>
          <view class="mb-3 text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
            调用 next() 不传递参数，导航继续
          </view>
          <view class="border border-gray-200 rounded-2 bg-gray-50 p-3 dark:border-[var(--wot-dark-border)] dark:bg-[var(--wot-dark-background3)]">
            <text class="text-3 text-gray-700 font-mono dark:text-[var(--wot-dark-color)]">
              router.beforeEach((to, from, next) => { next() })
            </text>
          </view>
        </view>

        <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            返回 true
          </view>
          <view class="mb-3 text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
            返回 true，导航继续
          </view>
          <view class="border border-gray-200 rounded-2 bg-gray-50 p-3 dark:border-[var(--wot-dark-border)] dark:bg-[var(--wot-dark-background3)]">
            <text class="text-3 text-gray-700 font-mono dark:text-[var(--wot-dark-color)]">
              router.beforeEach(() => { return true })
            </text>
          </view>
        </view>

        <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            返回 false
          </view>
          <view class="mb-3 text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
            返回 false，导航被取消
          </view>
          <view class="border border-gray-200 rounded-2 bg-gray-50 p-3 dark:border-[var(--wot-dark-border)] dark:bg-[var(--wot-dark-background3)]">
            <text class="text-3 text-gray-700 font-mono dark:text-[var(--wot-dark-color)]">
              router.beforeEach(() => { return false })
            </text>
          </view>
        </view>

        <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            重定向
          </view>
          <view class="mb-3 text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
            返回路径字符串，导航被重定向
          </view>
          <view class="border border-gray-200 rounded-2 bg-gray-50 p-3 dark:border-[var(--wot-dark-border)] dark:bg-[var(--wot-dark-background3)]">
            <text class="text-3 text-gray-700 font-mono dark:text-[var(--wot-dark-color)]">
              router.beforeEach(() => { return '/login' })
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
