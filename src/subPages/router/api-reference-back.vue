<script setup lang="ts">
definePage({
  name: 'api-reference-back',
  style: {
    navigationBarTitleText: 'back 高级用法',
  },
})

const router = useRouter()

function goBack() {
  router.back()
}

const deltaValue = ref(1)

function backWithDelta() {
  router.back(deltaValue.value)
}

function backWithObject() {
  router.back({
    delta: deltaValue.value,
  })
}

function backWithAnimation() {
  router.back({
    delta: 1,
    animationType: 'slide-out-bottom',
    animationDuration: 300,
  })
}
</script>

<template>
  <view class="min-h-screen bg-gray-100 py-3 dark:bg-[var(--wot-dark-background)]">
    <view class="mx-3 mb-3">
      <view class="rounded-3 bg-white px-5 py-6 text-center dark:bg-[var(--wot-dark-background2)]">
        <view class="mb-3 text-8">
          ⬅️
        </view>
        <view class="mb-2 text-5 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
          back 高级用法
        </view>
        <view class="text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
          演示 router.back() 的多种用法
        </view>
      </view>
    </view>

    <demo-block title="基础用法" transparent>
      <view class="space-y-3">
        <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            返回上一页
          </view>
          <view class="mb-3 text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
            默认返回上一页，相当于 uni.navigateBack()
          </view>
          <view class="mb-3 border border-gray-200 rounded-2 bg-gray-50 p-3 dark:border-[var(--wot-dark-border)] dark:bg-[var(--wot-dark-background3)]">
            <text class="text-3 text-gray-700 font-mono dark:text-[var(--wot-dark-color)]">
              router.back()
            </text>
          </view>
          <wd-button type="primary" block @click="goBack">
            返回上一页
          </wd-button>
        </view>
      </view>
    </demo-block>

    <demo-block title="Delta 用法" transparent>
      <view class="space-y-3">
        <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            返回指定层级
          </view>
          <view class="mb-3 text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
            通过 delta 参数指定返回的页面数量
          </view>
          <view class="mb-3">
            <wd-input v-model="deltaValue" type="number" label="Delta 值" placeholder="请输入返回层级" />
          </view>
          <view class="mb-3 border border-gray-200 rounded-2 bg-gray-50 p-3 dark:border-[var(--wot-dark-border)] dark:bg-[var(--wot-dark-background3)]">
            <text class="text-3 text-gray-700 font-mono dark:text-[var(--wot-dark-color)]">
              router.back({{ deltaValue }})
            </text>
          </view>
          <wd-button type="success" block @click="backWithDelta">
            返回 {{ deltaValue }} 页
          </wd-button>
        </view>

        <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            对象形式 Delta
          </view>
          <view class="mb-3 text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
            也可以使用对象形式传递 delta
          </view>
          <view class="mb-3 border border-gray-200 rounded-2 bg-gray-50 p-3 dark:border-[var(--wot-dark-border)] dark:bg-[var(--wot-dark-background3)]">
            <text class="text-3 text-gray-700 font-mono dark:text-[var(--wot-dark-color)]">
              router.back({ delta: {{ deltaValue }} })
            </text>
          </view>
          <wd-button type="warning" block @click="backWithObject">
            对象形式返回
          </wd-button>
        </view>
      </view>
    </demo-block>

    <demo-block title="动画配置" transparent>
      <view class="space-y-3">
        <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            自定义动画
          </view>
          <view class="mb-3 text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
            可以通过 animationType 和 animationDuration 配置返回动画
          </view>
          <view class="mb-3 border border-gray-200 rounded-2 bg-gray-50 p-3 dark:border-[var(--wot-dark-border)] dark:bg-[var(--wot-dark-background3)]">
            <text class="text-3 text-gray-700 leading-relaxed font-mono dark:text-[var(--wot-dark-color)]">
              router.back({
              delta: 1,
              animationType: 'slide-out-bottom',
              animationDuration: 300
              })
            </text>
          </view>
          <wd-button type="info" block @click="backWithAnimation">
            带动画返回
          </wd-button>
        </view>
      </view>
    </demo-block>

    <demo-block title="API 说明" transparent>
      <view class="space-y-3">
        <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            RouteBackRaw 类型
          </view>
          <view class="border border-gray-200 rounded-2 bg-gray-50 p-3 dark:border-[var(--wot-dark-border)] dark:bg-[var(--wot-dark-background3)]">
            <text class="text-3 text-gray-700 leading-relaxed font-mono dark:text-[var(--wot-dark-color)]">
              type RouteBackRaw = number | RouteBackLocation

              interface RouteBackLocation {
              delta?: number
              animationType?: AnimationBackType
              animationDuration?: number
              }
            </text>
          </view>
        </view>

        <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            AnimationBackType 类型
          </view>
          <view class="border border-gray-200 rounded-2 bg-gray-50 p-3 dark:border-[var(--wot-dark-border)] dark:bg-[var(--wot-dark-background3)]">
            <text class="text-3 text-gray-700 leading-relaxed font-mono dark:text-[var(--wot-dark-color)]">
              type AnimationBackType =
              | 'auto'
              | 'none'
              | 'slide-out-right'
              | 'slide-out-left'
              | 'slide-out-top'
              | 'slide-out-bottom'
              | 'pop-out'
              | 'fade-out'
              | 'zoom-in'
              | 'zoom-fade-in'
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
