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

export default defineConfig({
  entry: ['src/index.ts', 'src/typed-routes.ts'],
  format: ['esm', 'cjs'],
  target: 'node16.14',
  outDir: 'dist',
  clean: true,
  dts: true,
  minify: isProduction,
})
