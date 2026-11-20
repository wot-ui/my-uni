<script setup lang="ts">
const router = useRouter()

function goBack() {
  router.back()
}

function demoBeforeEach() {
  router.push('/subPages/router/advanced-beforeeach')
}

function demoAfterEach() {
  router.push('/subPages/router/advanced-aftereach')
}

function demoGuardReturn() {
  router.push('/subPages/router/advanced-guard-return')
}

function demoGuardAsync() {
  router.push('/subPages/router/advanced-guard-async')
}

function demoGuardRemove() {
  router.push('/subPages/router/advanced-guard-remove')
}

function demoProtected() {
  router.push('/subPages/router/advanced-protected')
}
</script>

<template>
  <view class="min-h-screen bg-gray-100 py-3 dark:bg-[var(--wot-dark-background)]">
    <view class="mx-3 mb-3">
      <view class="rounded-3 bg-white px-5 py-6 text-center dark:bg-[var(--wot-dark-background2)]">
        <view class="mb-3 text-10">
          🛡️
        </view>
        <view class="mb-2 text-6 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
          进阶指南
        </view>
        <view class="text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
          学习导航守卫的高级用法
        </view>
      </view>
    </view>

    <demo-block title="导航守卫" transparent>
      <view class="mb-3 border border-blue-200 rounded-2 bg-blue-50 p-3 dark:bg-blue-900/20">
        <view class="mb-2 text-3.5 text-blue-700 font-bold dark:text-blue-300">
          💡 什么是导航守卫？
        </view>
        <view class="text-3 text-blue-600 leading-relaxed dark:text-blue-200">
          导航守卫主要用于通过跳转或取消的方式守卫导航。它们可以用于权限验证、页面统计、参数检查等场景。
        </view>
      </view>
      <view class="space-y-3">
        <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            前置守卫 (beforeEach)
          </view>
          <view class="mb-3 text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
            在导航触发前执行，可以拦截、重定向或放行导航
          </view>
          <view class="mb-3 border border-gray-200 rounded-2 bg-gray-50 p-3 dark:border-[var(--wot-dark-border)] dark:bg-[var(--wot-dark-background3)]">
            <text class="text-3 text-gray-700 font-mono dark:text-[var(--wot-dark-color)]">
              router.beforeEach((to, from, next) => { next() })
            </text>
          </view>
          <wd-button type="primary" block @click="demoBeforeEach">
            📊 查看演示
          </wd-button>
        </view>

        <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            后置钩子 (afterEach)
          </view>
          <view class="mb-3 text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
            在导航成功完成后执行，常用于页面统计、埋点上报
          </view>
          <view class="mb-3 border border-gray-200 rounded-2 bg-gray-50 p-3 dark:border-[var(--wot-dark-border)] dark:bg-[var(--wot-dark-background3)]">
            <text class="text-3 text-gray-700 font-mono dark:text-[var(--wot-dark-color)]">
              router.afterEach((to, from) => { console.log(to) })
            </text>
          </view>
          <wd-button type="success" block @click="demoAfterEach">
            📊 查看演示
          </wd-button>
        </view>
      </view>
    </demo-block>

    <demo-block title="守卫进阶用法" transparent>
      <view class="space-y-3">
        <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            守卫返回值
          </view>
          <view class="mb-3 text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
            演示守卫的不同返回值：无处理、返回 true、返回 false、返回重定向路径
          </view>
          <wd-button type="warning" block @click="demoGuardReturn">
            🔄 查看演示
          </wd-button>
        </view>

        <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            异步守卫
          </view>
          <view class="mb-3 text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
            演示守卫中的异步操作，如 API 调用、延迟处理等
          </view>
          <wd-button type="info" block @click="demoGuardAsync">
            ⏳ 查看演示
          </wd-button>
        </view>

        <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            守卫管理
          </view>
          <view class="mb-3 text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
            演示如何动态添加和移除路由守卫
          </view>
          <wd-button type="error" block @click="demoGuardRemove">
            🗑️ 查看演示
          </wd-button>
        </view>
      </view>
    </demo-block>

    <demo-block title="实际应用场景" transparent>
      <view class="space-y-3">
        <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            权限保护
          </view>
          <view class="mb-3 text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
            演示如何使用守卫保护需要登录才能访问的页面
          </view>
          <wd-button type="primary" block @click="demoProtected">
            🔒 查看演示
          </wd-button>
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
