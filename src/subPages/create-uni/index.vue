<script setup lang="ts">
const { success: showSuccess } = useGlobalToast()
// 核心优势
const advantages = ref([
  {
    icon: '🚀',
    title: '简单易用',
    desc: '一行命令即可创建项目，无需手动配置开发环境',
  },
  {
    icon: '🔧',
    title: '功能强大',
    desc: '内置多种实用工具和插件，支持一键集成 WotUI',
  },
  {
    icon: '🔄',
    title: '持续更新',
    desc: '由 uni-helper 团队积极维护，及时跟进最新技术栈',
  },
  {
    icon: '👥',
    title: '社区活跃',
    desc: 'GitHub 获得众多 star，活跃的开发者社区',
  },
  {
    icon: '🌐',
    title: '网络稳定',
    desc: '解决官方 CLI 网络不稳定问题，支持国内环境',
  },
  {
    icon: '⚡️',
    title: '开发效率',
    desc: '提升开发效率 100%，快速搭建现代化项目',
  },
])

// 解决的问题
const problems = ref([
  {
    problem: '网络问题',
    desc: 'degit 命令只支持 GitHub，国内网络不稳定',
  },
  {
    problem: '维护问题',
    desc: '官方模板维护不够积极，版本往往落后',
  },
  {
    problem: '工程化问题',
    desc: '项目配置过于基础，缺少现代工程化支持',
  },
  {
    problem: '集成问题',
    desc: '需要手动集成组件库，配置过程繁琐',
  },
])

// WotUI 快速创建
const wotQuickStart = ref({
  title: '快速创建 WotUI 项目',
  command: 'pnpm create uni@latest -t wot-starter <你的项目名称>',
  desc: '一键创建集成了 WotUI 的完整项目',
  features: [
    '✅ TypeScript 项目',
    '✅ 集成 Pinia 状态管理',
    '✅ 自动配置 WotUI 组件库',
    '✅ 添加 ESLint 支持',
  ],
})

// 其他使用方式
const quickMethods = ref([
  {
    title: 'GUI 模式',
    command: 'pnpm create uni --gui',
    desc: '使用图形界面创建项目',
  },
  {
    title: '环境信息',
    command: 'npx @create-uni/info@latest',
    desc: '获取当前项目环境信息',
  },
])

// 复制命令到剪贴板
function copyCommand(command: string) {
  uni.setClipboardData({
    data: command,
    showToast: false,
    success: () => {
      uni.hideToast()
      showSuccess({
        msg: `${command}已成功复制到剪贴板`,
      })
    },
  })
}

function handleNavigate(url: string) {
  // #ifdef H5
  window.open(url, '_blank')
  // #endif
  // #ifndef H5
  copyCommand(url)
  // #endif
}
</script>

<template>
  <view class="min-h-screen bg-gray-100 py-3 dark:bg-[var(--wot-dark-background)]">
    <!-- 头部介绍 -->
    <view class="mx-3 mb-3">
      <view class="rounded-3 bg-white px-5 py-8 text-center dark:bg-[var(--wot-dark-background2)]">
        <view class="mb-3 text-10">
          🌱
        </view>
        <view class="mb-2 text-6 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
          CreateUni 脚手架
        </view>
        <view class="mb-2 text-3.5 text-gray-600 leading-relaxed dark:text-[var(--wot-dark-color2)]">
          由 uni-helper 团队开发的轻量级脚手架工具
        </view>
        <view class="text-3 text-gray-500 dark:text-[var(--wot-dark-color2)]">
          提升开发效率 100%，告别繁琐配置，一键集成 WotUI 组件库
        </view>
      </view>
    </view>

    <!-- 为什么选择 create-uni -->
    <demo-block title="为什么选择 create-uni？" transparent>
      <view class="mb-3 rounded-3 bg-white p-3 dark:bg-[var(--wot-dark-background2)]">
        <text class="text-3.5 text-gray-700 leading-relaxed dark:text-[var(--wot-dark-color)]">
          在使用 uni-app 官方 CLI 工具时，我们经常会遇到以下问题：
        </text>
      </view>
      <view class="mb-3">
        <view
          v-for="item in problems"
          :key="item.problem"
          class="mb-2 rounded-3 bg-white p-3 dark:bg-[var(--wot-dark-background2)]"
        >
          <view class="mb-1 text-3.5 text-red-600 font-bold dark:text-red-400">
            ❌ {{ item.problem }}
          </view>
          <view class="text-3 text-gray-600 leading-snug dark:text-[var(--wot-dark-color2)]">
            {{ item.desc }}
          </view>
        </view>
      </view>
      <view class="rounded-3 bg-white p-3 dark:bg-[var(--wot-dark-background2)]">
        <text class="text-3.5 text-green-600 font-bold dark:text-green-400">
          ✅ 而 create-uni 的出现，完美解决了这些问题！
        </text>
      </view>
    </demo-block>

    <!-- 核心优势 -->
    <demo-block title="核心优势" transparent>
      <view class="grid grid-cols-2 gap-3">
        <view
          v-for="advantage in advantages"
          :key="advantage.title"
          class="rounded-2 bg-white p-4 text-center dark:bg-[var(--wot-dark-background2)]"
        >
          <view class="mb-2 text-6">
            {{ advantage.icon }}
          </view>
          <view class="mb-1 text-3.5 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            {{ advantage.title }}
          </view>
          <view class="text-3 text-gray-600 leading-snug dark:text-[var(--wot-dark-color2)]">
            {{ advantage.desc }}
          </view>
        </view>
      </view>
    </demo-block>

    <!-- 快速创建 WotUI 项目 -->
    <demo-block title="快速创建 WotUI 项目" transparent>
      <view class="rounded-3 bg-white p-5 dark:bg-[var(--wot-dark-background2)]">
        <view class="mb-3 flex items-center">
          <view class="mr-2 text-7">
            🎨
          </view>
          <view class="text-4.5 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            {{ wotQuickStart.title }}
          </view>
        </view>
        <view class="mb-3 text-3.5 text-gray-600 leading-relaxed dark:text-[var(--wot-dark-color2)]">
          {{ wotQuickStart.desc }}
        </view>
        <view class="mb-3 flex items-center justify-between border border-gray-200 rounded-2 bg-gray-50 p-3 dark:border-[var(--wot-dark-border)] dark:bg-[var(--wot-dark-background3)]" @click="copyCommand(wotQuickStart.command)">
          <text class="flex-1 break-all text-3 text-gray-700 font-mono dark:text-[var(--wot-dark-color)]">
            {{ wotQuickStart.command }}
          </text>
          <wd-icon name="copy" size="16px" color="#666" />
        </view>
        <view>
          <view class="mb-2 text-3.5 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            这个命令会：
          </view>
          <view
            v-for="feature in wotQuickStart.features"
            :key="feature"
            class="mb-1 text-3 text-gray-600 leading-snug dark:text-[var(--wot-dark-color2)]"
          >
            {{ feature }}
          </view>
        </view>
      </view>
    </demo-block>

    <!-- 其他使用方式 -->
    <demo-block title="其他使用方式" transparent>
      <view
        v-for="method in quickMethods"
        :key="method.title"
        class="mb-3 rounded-2 bg-white p-4 last:mb-0 dark:bg-[var(--wot-dark-background2)]"
      >
        <view class="mb-2 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
          {{ method.title }}
        </view>
        <view class="mb-2 text-3.5 text-gray-600 leading-relaxed dark:text-[var(--wot-dark-color2)]">
          {{ method.desc }}
        </view>
        <view class="flex items-center justify-between border border-gray-200 rounded-2 bg-gray-50 p-2 dark:border-[var(--wot-dark-border)] dark:bg-[var(--wot-dark-background3)]" @click="copyCommand(method.command)">
          <text class="flex-1 break-all text-3 text-gray-700 font-mono dark:text-[var(--wot-dark-color)]">
            {{ method.command }}
          </text>
          <wd-icon name="copy" size="16px" color="#666" />
        </view>
      </view>
    </demo-block>

    <!-- 相关链接 -->
    <demo-block title="相关链接" transparent>
      <wd-cell-group border custom-class="rounded-2! overflow-hidden">
        <wd-cell title="📦 NPM 包" value="create uni" is-link @click="handleNavigate('https://www.npmjs.com/package/create-uni')" />
        <wd-cell title="🐙 GitHub 仓库" value="create uni" is-link @click="handleNavigate('https://github.com/uni-helper/create-uni')" />
        <wd-cell title="🎨 Wot UI" value="UI 组件库" is-link @click="handleNavigate('https://wot-ui.cn/')" />
        <wd-cell title="🛠️ Uni Helper" value="先进工具集合" is-link @click="handleNavigate('https://github.com/uni-helper')" />
        <wd-cell title="💝 赞助CreateUni" value="支持开发者" is-link @click="handleNavigate('https://github.com/uni-helper/create-uni')" />
      </wd-cell-group>
    </demo-block>
  </view>
</template>
