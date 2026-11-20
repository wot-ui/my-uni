<script setup lang="ts">
const router = useRouter()
const route = useRoute()

const { success: showSuccess, warning: showWarning } = useGlobalToast()

const userId = ref('eduardo')
const searchKeyword = ref('vue')
const userName = ref('小星星')
const userLabel = ref('小熊熊')

function pushByString() {
  router.push('/subPages/router/essentials-navigation')
  showSuccess({ msg: '使用字符串路径跳转' })
}

function pushByPath() {
  router.push({ path: '/subPages/router/essentials-navigation' })
  showSuccess({ msg: '使用path对象跳转' })
}

function pushByName() {
  router.push({ name: 'essentials-navigation' })
  showSuccess({ msg: '使用name跳转' })
}

function pushWithParams() {
  if (!userId.value) {
    showWarning({ msg: '请输入用户ID' })
    return
  }
  router.push({ name: 'essentials-params', params: { username: userId.value } })
  showSuccess({ msg: `传递参数: ${userId.value}` })
}

function pushWithQuery() {
  if (!searchKeyword.value) {
    showWarning({ msg: '请输入搜索关键词' })
    return
  }
  router.push({ path: '/subPages/router/essentials-params', query: { username: searchKeyword.value } })
  showSuccess({ msg: `传递查询参数: ${searchKeyword.value}` })
}

function pushWithObjectParams() {
  const user = {
    name: userName.value,
    label: userLabel.value,
  }
  router.push({
    name: 'essentials-params',
    params: { user: JSON.stringify(user) },
  })
  showSuccess({ msg: '传递对象参数(params)' })
}

function pushWithObjectQuery() {
  const user = {
    name: userName.value,
    label: userLabel.value,
  }
  router.push({
    path: '/subPages/router/essentials-params',
    query: { user: JSON.stringify(user) },
  })
  showSuccess({ msg: '传递对象参数(query)' })
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
      <view class="rounded-3 bg-white px-5 py-6 text-center dark:bg-[var(--wot-dark-background2)]">
        <view class="mb-3 text-10">
          📚
        </view>
        <view class="mb-2 text-6 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
          入门指南
        </view>
        <view class="text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
          学习路由的基础用法
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

    <demo-block title="编程式导航" transparent>
      <view class="space-y-3">
        <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            基础用法
          </view>
          <view class="mb-3 flex items-center justify-between border border-gray-200 rounded-2 bg-gray-50 p-3 dark:border-[var(--wot-dark-border)] dark:bg-[var(--wot-dark-background3)]" @click="copyCode('router.push(\'/user\')')">
            <text class="flex-1 text-3 text-gray-700 font-mono dark:text-[var(--wot-dark-color)]">
              router.push('/user')
            </text>
            <wd-icon name="copy" size="16px" color="#666" />
          </view>
          <view class="grid grid-cols-1 gap-2">
            <wd-button type="primary" size="small" @click="pushByString">
              字符串路径跳转
            </wd-button>
            <wd-button type="success" size="small" @click="pushByPath">
              对象路径跳转
            </wd-button>
            <wd-button type="warning" size="small" @click="pushByName">
              命名路由跳转
            </wd-button>
          </view>
        </view>
      </view>
    </demo-block>

    <demo-block title="路由参数" transparent>
      <view class="mb-3 border border-orange-200 rounded-2 bg-orange-50 p-3 dark:bg-orange-900/20">
        <view class="mb-2 text-3.5 text-orange-700 font-bold dark:text-orange-300">
          ⚠️ 重要提示
        </view>
        <view class="text-3 text-orange-600 leading-relaxed dark:text-orange-200">
          在 @wot-ui/router 中，params 和 query 参数都会以查询字符串形式放在 URL 中，两者在实际效果上并无区别。这种 API 设计主要是为了与 vue-router 保持一致。
        </view>
      </view>
      <view class="space-y-3">
        <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            params 参数
          </view>
          <view class="mb-3 text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
            注意：name 和 params 搭配使用，与 query 效果相同
          </view>
          <view class="mb-3">
            <wd-input v-model="userId" placeholder="请输入用户名" />
          </view>
          <view class="mb-3 flex items-center justify-between border border-gray-200 rounded-2 bg-gray-50 p-3 dark:border-[var(--wot-dark-border)] dark:bg-[var(--wot-dark-background3)]" @click="copyCode('router.push({ name: \'user\', params: { username: \'eduardo\' } })')">
            <text class="flex-1 text-3 text-gray-700 font-mono dark:text-[var(--wot-dark-color)]">
              router.push({ name: 'user', params: { username: 'eduardo' } })
            </text>
            <wd-icon name="copy" size="16px" color="#666" />
          </view>
          <wd-button type="primary" block @click="pushWithParams">
            传递 params 参数
          </wd-button>
        </view>

        <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            query 参数
          </view>
          <view class="mb-3 text-3.5 text-gray-600 dark:text-[var(--wot-dark-color2)]">
            注意：path 可以与 query 一起使用，与 params 效果相同
          </view>
          <view class="mb-3">
            <wd-input v-model="searchKeyword" placeholder="请输入搜索关键词" />
          </view>
          <view class="mb-3 flex items-center justify-between border border-gray-200 rounded-2 bg-gray-50 p-3 dark:border-[var(--wot-dark-border)] dark:bg-[var(--wot-dark-background3)]" @click="copyCode('router.push({ path: \'/user\', query: { username: \'eduardo\' } })')">
            <text class="flex-1 text-3 text-gray-700 font-mono dark:text-[var(--wot-dark-color)]">
              router.push({ path: '/user', query: { username: 'eduardo' } })
            </text>
            <wd-icon name="copy" size="16px" color="#666" />
          </view>
          <wd-button type="success" block @click="pushWithQuery">
            传递 query 参数
          </wd-button>
        </view>

        <view class="rounded-2 bg-white p-4 dark:bg-[var(--wot-dark-background2)]">
          <view class="mb-3 text-4 text-gray-800 font-bold dark:text-[var(--wot-dark-color)]">
            传递对象参数
          </view>
          <view class="mb-3 text-3.5 text-gray-600 leading-relaxed dark:text-[var(--wot-dark-color2)]">
            URL有长度限制，复杂对象需要使用 JSON.stringify 转换成字符串传递
          </view>
          <view class="grid grid-cols-2 mb-3 gap-2">
            <wd-input v-model="userName" placeholder="姓名" />
            <wd-input v-model="userLabel" placeholder="标签" />
          </view>
          <view class="grid grid-cols-2 gap-2">
            <wd-button type="primary" size="small" @click="pushWithObjectParams">
              对象 params
            </wd-button>
            <wd-button type="success" size="small" @click="pushWithObjectQuery">
              对象 query
            </wd-button>
          </view>
        </view>
      </view>
    </demo-block>
  </view>
</template>
