import process from 'node:process'
/*
 * @Author: weisheng
 * @Date: 2025-12-24 14:00:37
 * @LastEditTime: 2025-12-24 17:55:10
 * @LastEditors: weisheng
 * @Description:
 * @FilePath: /my-uni/packages/router/tsdown.config.ts
 * 记得注释
 */
import { defineConfig } from 'tsdown'

const isProduction = process.env.NODE_ENV === 'production'

const shared = {
  format: ['esm', 'cjs'],
  target: 'node16.14',
  outDir: 'dist',
  dts: true,
  minify: isProduction,
} as const

export default defineConfig([
  {
    ...shared,
    entry: ['src/index.ts', 'src/x.ts'],
    clean: true,
  },
  {
    ...shared,
    entry: ['src/typed-routes.ts', 'src/vite.ts'],
    clean: false,
  },
])
