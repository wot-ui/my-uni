<script setup lang="ts">
const router = useRouter()
const { alert: showAlert, confirm: showConfirm } = useGlobalMessage()

function goBack() {
  router.back()
}

const asyncGuardLogs = ref<string[]>([])
const isLoading = ref(false)

function addLog(message: string) {
  const log = `[${new Date().toLocaleTimeString()}] ${message}`
  asyncGuardLogs.value.unshift(log)
}

function setupAsyncGuard() {
  return router.beforeEach(async (to: any, from: any, next: any) => {
    addLog(`守卫触发: 从 ${from.path} 到 ${to.path}`)
    isLoading.value = true

    try {
      addLog('开始异步操作...')
      await new Promise(resolve => setTimeout(resolve, 1500))
      addLog('异步操作完成')
      showAlert({
        title: '验证成功',
        msg: '权限验证通过，可以继续导航。',
        confirmButtonText: '确定',
      })
      next()
    }
    catch (error) {
      addLog(`异步操作失败: ${error}`)
      showAlert({
        title: '验证失败',
        msg: '权限验证失败，导航已被阻止。',
        confirmButtonText: '确定',
      })
      next(false)
    }
    finally {
      isLoading.value = false
    }
  })
}

let removeGuard: (() => void) | null = null

function enableAsyncGuard() {
  removeGuard?.()
  asyncGuardLogs.value = []
  removeGuard = setupAsyncGuard()
  addLog('异步守卫已启用')
  showAlert({
    title: '守卫已启用',
    msg: '异步守卫已成功启用，现在导航时会进行权限验证。',
    confirmButtonText: '确定',
  })
}

function disableAsyncGuard() {
  removeGuard?.()
  removeGuard = null
  addLog('异步守卫已禁用')
  showAlert({
    title: '守卫已禁用',
    msg: '异步守卫已禁用，导航将不再进行权限验证。',
    confirmButtonText: '确定',
  })
}

function testAsyncNavigation() {
  showConfirm({
    title: '确认测试',
    msg: '将触发异步守卫进行权限验证（约1.5秒），是否继续？',
    confirmButtonText: '继续',
    cancelButtonText: '取消',
    success: (res) => {
      if (res.action === 'confirm') {
        router.push('/subPages/router/essentials-navigation')
      }
    },
  })
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
          ⏳
        </view>
        <view class="mb-2 text-5 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
          异步守卫
        </view>
        <view class="text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
          演示守卫中的异步操作
        </view>
      </view>
    </view>

    <demo-block title="守卫说明" transparent>
      <view class="space-y-3">
        <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            异步守卫
          </view>
          <view class="mb-3 text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
            守卫函数可以是异步的，支持 async/await 语法
          </view>
          <view class="border border-gray-200 rounded-2 bg-gray-50 p-3 dark:border-[var(--wot-dark-border)] dark:bg-[var(--wot-dark-background3)]">
            <text class="text-3 text-gray-700 leading-relaxed font-mono dark:text-[var(--wot-dark-color)]">
              router.beforeEach(async (to, from, next) => {
              const result = await checkPermission()
              if (result) {
              next()
              } else {
              next('/login')
              }
              })
            </text>
          </view>
        </view>

        <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            应用场景
          </view>
          <view class="mb-3 text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
            异步守卫常用于以下场景：
          </view>
          <view class="space-y-2">
            <view class="flex items-start gap-2">
              <text class="text-3 text-blue-600">
                •
              </text>
              <text class="text-3.5 text-gray-700 dark:text-[var(--wot-dark-color)]">
                权限验证（调用 API 检查用户权限）
              </text>
            </view>
            <view class="flex items-start gap-2">
              <text class="text-3 text-blue-600">
                •
              </text>
              <text class="text-3.5 text-gray-700 dark:text-[var(--wot-dark-color)]">
                数据预加载（在进入页面前加载数据）
              </text>
            </view>
            <view class="flex items-start gap-2">
              <text class="text-3 text-blue-600">
                •
              </text>
              <text class="text-3.5 text-gray-700 dark:text-[var(--wot-dark-color)]">
                Token 刷新（检查并刷新过期 token）
              </text>
            </view>
            <view class="flex items-start gap-2">
              <text class="text-3 text-blue-600">
                •
              </text>
              <text class="text-3.5 text-gray-700 dark:text-[var(--wot-dark-color)]">
                多条件验证（组合多个异步检查）
              </text>
            </view>
          </view>
        </view>
      </view>
    </demo-block>

    <demo-block title="守卫控制" transparent>
      <view class="space-y-3">
        <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            启用/禁用异步守卫
          </view>
          <view class="grid grid-cols-2 gap-2">
            <wd-button type="primary" @click="enableAsyncGuard">
              ✅ 启用守卫
            </wd-button>
            <wd-button type="error" @click="disableAsyncGuard">
              ❌ 禁用守卫
            </wd-button>
          </view>
        </view>

        <view v-if="isLoading" class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="flex items-center justify-center gap-2">
            <wd-loading type="ring" />
            <text class="text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
              异步操作中...
            </text>
          </view>
        </view>
      </view>
    </demo-block>

    <demo-block title="操作日志" transparent>
      <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
        <view class="mb-3 flex items-center justify-between">
          <view class="text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            守卫日志
          </view>
          <wd-button size="small" type="info" @click="asyncGuardLogs = []">
            清空日志
          </wd-button>
        </view>
        <view class="max-h-80 overflow-y-auto rounded-2 bg-gray-50 p-3 dark:bg-[var(--wot-dark-background3)]">
          <view v-if="asyncGuardLogs.length === 0" class="text-3.5 text-gray-500 dark:text-[var(--wot-dark-color2)]">
            暂无日志，请先启用守卫并触发导航
          </view>
          <view v-else class="space-y-1">
            <view v-for="(log, index) in asyncGuardLogs" :key="index" class="text-3 text-gray-700 dark:text-[var(--wot-dark-color)]">
              {{ log }}
            </view>
          </view>
        </view>
      </view>
    </demo-block>

    <demo-block title="测试导航" transparent>
      <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
        <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
          触发导航
        </view>
        <view class="mb-3 text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
          点击下方按钮测试异步守卫的效果
        </view>
        <wd-button type="primary" block @click="testAsyncNavigation">
          🚀 跳转到入门指南导航页
        </wd-button>
      </view>
    </demo-block>

    <demo-block title="导航" transparent>
      <wd-button type="warning" block @click="goBack">
        返回上一页
      </wd-button>
    </demo-block>
  </view>
</template>
