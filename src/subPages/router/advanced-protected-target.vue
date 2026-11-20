<script setup lang="ts">
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
          ✅
        </view>
        <view class="mb-2 text-5 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
          访问成功
        </view>
        <view class="text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
          您已通过权限验证
        </view>
      </view>
    </view>

    <demo-block title="页面说明" transparent>
      <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
        <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
          受保护的页面
        </view>
        <view class="mb-3 text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
          恭喜！您已成功访问这个受保护的页面。这说明：
        </view>
        <view class="space-y-2">
          <view class="flex items-start gap-2">
            <text class="text-3 text-green-600">
              ✓
            </text>
            <text class="text-3.5 text-gray-700 dark:text-[var(--wot-dark-color)]">
              您已经登录
            </text>
          </view>
          <view class="flex items-start gap-2">
            <text class="text-3 text-green-600">
              ✓
            </text>
            <text class="text-3.5 text-gray-700 dark:text-[var(--wot-dark-color)]">
              权限守卫验证通过
            </text>
          </view>
          <view class="flex items-start gap-2">
            <text class="text-3 text-green-600">
              ✓
            </text>
            <text class="text-3.5 text-gray-700 dark:text-[var(--wot-dark-color)]">
              导航未被拦截
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
