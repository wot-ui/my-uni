import fsp from 'node:fs/promises'
import { fileURLToPath, URL } from 'node:url'
import UnoCSS from '@unocss/vite'
import viteCompression from 'vite-plugin-compression'
import { defineConfig } from 'vitepress'

import llmstxt from 'vitepress-plugin-llms'

// https://vitepress.dev/reference/site-config
function copyDemoPlugin() {
  return {
    name: 'copy-demo-to-vitepress-dist',
    apply: 'build',
    async closeBundle() {
      const srcRoot = fileURLToPath(new URL('../../dist/build/h5', import.meta.url))
      const destRoot = fileURLToPath(new URL('./dist/demo', import.meta.url))
      await fsp.rm(destRoot, { recursive: true, force: true })
      await fsp.mkdir(destRoot, { recursive: true })
      await fsp.cp(srcRoot, destRoot, { recursive: true })
    },
  }
}

function copyChangelogPlugin() {
  return {
    name: 'copy-changelog-to-guide',
    async configResolved() {
      const src = fileURLToPath(new URL('../../CHANGELOG.md', import.meta.url))
      const guideDir = fileURLToPath(new URL('../guide', import.meta.url))
      const dest = fileURLToPath(new URL('../guide/changelog.md', import.meta.url))
      await fsp.mkdir(guideDir, { recursive: true })
      await fsp.copyFile(src, dest)
    },
    async buildStart() {
      const src = fileURLToPath(new URL('../../CHANGELOG.md', import.meta.url))
      const guideDir = fileURLToPath(new URL('../guide', import.meta.url))
      const dest = fileURLToPath(new URL('../guide/changelog.md', import.meta.url))
      await fsp.mkdir(guideDir, { recursive: true })
      await fsp.copyFile(src, dest)
    },
  }
}

export default defineConfig({
  vite: {
    plugins: [
      ...llmstxt({
        domain: import.meta.env?.VITE_WEB_SITE_BASE_URL,
      }) as any,
      UnoCSS(),
      viteCompression({
        verbose: true,
        disable: false,
        threshold: 10240,
        algorithm: 'gzip',
        ext: '.gz',
      }),
      copyDemoPlugin(),
      copyChangelogPlugin(),
    ],
    server: {
      host: '0.0.0.0',
      port: 5174,
    },
    resolve: {
      alias: [
        {
          find: /^.*\/VPSidebar\.vue$/,
          replacement: fileURLToPath(
            new URL('./theme/components/VPSidebar.vue', import.meta.url),
          ),
        },
        {
          find: /^.*\/VPContent\.vue$/,
          replacement: fileURLToPath(
            new URL('./theme/components/VPContent.vue', import.meta.url),
          ),
        },
        {
          find: /^.*\/VPDoc\.vue$/,
          replacement: fileURLToPath(
            new URL('./theme/components/VPDoc.vue', import.meta.url),
          ),
        },
        {
          find: /^.*\/VPLocalNav\.vue$/,
          replacement: fileURLToPath(
            new URL('./theme/components/VPLocalNav.vue', import.meta.url),
          ),
        },
        {
          find: /^.*\/VPNavBar\.vue$/,
          replacement: fileURLToPath(
            new URL('./theme/components/VPNavBar.vue', import.meta.url),
          ),
        },
      ],
    },

  },
  srcExclude: ['test_docs/**'],
  title: 'My Uni',
  description: '🛹 专为 uni-app 开发的摸鱼插件库，包含路由、CI/CD 等插件，助你轻松摸鱼！',
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'algolia-site-verification', content: '8080794D00986996' }],
    ['script', {}, `
var _hmt = _hmt || [];
(function() {
  var hm = document.createElement("script");
  hm.src = "https://hm.baidu.com/hm.js?6598c335941704a886a664e29951f096";
  var s = document.getElementsByTagName("script")[0];
  s.parentNode.insertBefore(hm, s);
})();
    `],
  ],
  themeConfig: {
    logo: '/logo.svg',
    lastUpdated: {
      text: '最后更新',
    },
    editLink: {
      pattern: 'https://github.com/wot-ui/my-uni/docs/edit/main/:path',
      text: '为此页提供修改建议',
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/wot-ui/my-uni' },
      { icon: { svg: '<svg t="1758594913114" class="icon" viewBox="0 0 1316 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="5329" width="200" height="200"><path d="M643.181714 247.698286l154.916572-123.172572L643.181714 0.256 643.072 0l-154.660571 124.269714 154.660571 123.245715 0.109714 0.182857z m0 388.461714h0.109715l399.579428-315.245714-108.361143-87.04-291.218285 229.888h-0.146286l-0.109714 0.146285L351.817143 234.093714l-108.251429 87.04 399.433143 315.136 0.146286-0.146285z m-0.146285 215.552l0.146285-0.146286 534.893715-422.034285 108.397714 87.04-243.309714 192L643.145143 1024 10.422857 525.056 0 516.754286l108.251429-86.893715L643.035429 851.748571z" fill="#1E80FF" p-id="5330"></path></svg>' }, link: 'https://juejin.cn/user/26044011388510/posts' },
    ],
    search: {
      provider: 'algolia',
      options: {
        appId: '72AU0TP7ER',
        apiKey: 'e9cb5ba76696a34dc172d20ac69c8267',
        indexName: 'my_uni_wot_ui_cn_72au0tp7er_pages',
      },
    },
    footer: {
      message: `Released under the MIT License.`,
      copyright: 'Copyright © 2025-present Wot UI Team and contributors',
    },
    nav: [
      { text: '首页', link: '/' },
      { text: '更新日志', link: '/guide/changelog' },
      { text: '🥤一杯咖啡', link: 'https://wot-ui.cn/reward/reward' },
      { text: 'Wot UI', link: 'https://wot-ui.cn/' },
      { text: 'Wot Starter  ', link: 'https://starter.wot-ui.cn/' },
      { text: '关于作者', link: 'https://blog.wot-ui.cn/about' },
    ],
    sidebar: [
      {
        text: '快速开始',
        items: [
          { text: '介绍', link: '/guide/introduction' },
          { text: '更新日志', link: '/guide/changelog' },
          {
            text: '路由',
            collapsed: false,
            items: [
              { text: '介绍', link: '/guide/router/introduction' },
              { text: '安装', link: '/guide/router/installation' },
              { text: '快速上手', link: '/guide/router/quick-use' },
              { text: '基础用法', link: '/guide/router/usage' },
              { text: 'API 参考', link: '/guide/router/api' },
              { text: '常见问题', link: '/guide/router/common-problems' },
            ],
          },
        ],
      },
    ],
  },
})
