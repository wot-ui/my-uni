<script setup lang="ts">
definePage({
  name: 'router-advanced-protected-target',
  style: {
    navigationBarTitleText: '受保护页面',
  },
})

const router = useRouter()

function goBack() {
  router.back()
}
</script>

<template>
  <view class="min-h-screen bg-gray-100 py-3 dark:bg-[var(--wot-dark-background)]">
    <view class="mx-3 mb-3">
      <view class="rounded-3 bg-white px-5 py-6 text-center dark:bg-[var(--wot-dark-background2)]">
        <view class="mb-3 text-8">
          🔐
        </view>
        <view class="mb-2 text-5 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
          受保护页面
        </view>
        <view class="text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
          这是一个需要通过前置守卫验证才能访问的页面
        </view>
      </view>
    </view>

    <demo-block title="访问成功" transparent>
      <view class="space-y-3">
        <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            恭喜！
          </view>
          <view class="mb-3 text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
            您已成功通过前置守卫的验证，可以访问此受保护页面。
          </view>
          <view class="border border-green-200 rounded-2 bg-green-50 p-3 dark:bg-green-900/20">
            <view class="flex items-start gap-2">
              <wd-icon name="check-circle" color="#10b981" />
              <text class="text-3.5 text-green-700 dark:text-green-300">
                前置守卫验证通过
              </text>
            </view>
          </view>
        </view>

        <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            守卫工作原理
          </view>
          <view class="space-y-2">
            <view class="flex items-start gap-2">
              <text class="text-3 text-blue-600">
                1.
              </text>
              <text class="text-3.5 text-gray-700 dark:text-[var(--wot-dark-color)]">
                用户尝试访问此页面
              </text>
            </view>
            <view class="flex items-start gap-2">
              <text class="text-3 text-blue-600">
                2.
              </text>
              <text class="text-3.5 text-gray-700 dark:text-[var(--wot-dark-color)]">
                beforeEach 守卫被触发
              </text>
            </view>
            <view class="flex items-start gap-2">
              <text class="text-3 text-blue-600">
                3.
              </text>
              <text class="text-3.5 text-gray-700 dark:text-[var(--wot-dark-color)]">
                守卫显示确认对话框
              </text>
            </view>
            <view class="flex items-start gap-2">
              <text class="text-3 text-blue-600">
                4.
              </text>
              <text class="text-3.5 text-gray-700 dark:text-[var(--wot-dark-color)]">
                用户点击"继续访问"
              </text>
            </view>
            <view class="flex items-start gap-2">
              <text class="text-3 text-blue-600">
                5.
              </text>
              <text class="text-3.5 text-gray-700 dark:text-[var(--wot-dark-color)]">
                守卫调用 next() 允许导航
              </text>
            </view>
            <view class="flex items-start gap-2">
              <text class="text-3 text-blue-600">
                6.
              </text>
              <text class="text-3.5 text-gray-700 dark:text-[var(--wot-dark-color)]">
                页面成功加载
              </text>
            </view>
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
