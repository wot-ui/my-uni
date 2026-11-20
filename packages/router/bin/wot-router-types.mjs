#!/usr/bin/env node
import { watch } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import process from 'node:process'
import { readPagesJson, resolvePagesJsonFile, resolveRouteTypesDts, writeRouteTypes } from '../dist/typed-routes.mjs'

const help = `用法: wot-router-types [选项]

从 uni-app / uni-app x 的 pages.json 生成 @wot-ui/router 路径与名称声明。

选项:
  --pages <file>   pages.json 路径，默认自动查找 src/pages.json 或 pages.json
  --dts <file>     声明输出路径，默认 src/typed-router.d.ts 或 typed-router.d.ts
  --platform <name> 条件编译目标，默认读取 UNI_PLATFORM
  --strict         生成严格模式声明
  --watch          监听 pages.json 变化并重新生成
  --cwd <dir>      工作目录，默认当前目录
  -h, --help       显示帮助
`

function fail(message) {
  console.error(`[@wot-ui/router] ${message}`)
  process.exitCode = 1
}

function parseArgs(argv) {
  const options = { strict: false, watch: false }
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]
    if (arg === '-h' || arg === '--help') {
      options.help = true
    }
    else if (arg === '--strict') {
      options.strict = true
    }
    else if (arg === '--watch') {
      options.watch = true
    }
    else if (arg === '--pages' || arg === '--dts' || arg === '--cwd' || arg === '--platform') {
      const value = argv[++index]
      if (!value || value.startsWith('--'))
        throw new Error(`${arg} 缺少参数值。`)
      options[arg.slice(2)] = value
    }
    else {
      throw new Error(`未知参数：${arg}`)
    }
  }
  return options
}

function countRoutes(config) {
  const paths = new Set()
  const names = new Set()
  const collect = (page, root = '') => {
    const joinPath = value => value.replace(/^\/+|\/+$/g, '')
    const segments = [root, page.path].map(joinPath).filter(Boolean)
    paths.add(`/${segments.join('/')}`)
    if (page.aliasPath)
      paths.add(page.aliasPath)
    if (page.name)
      names.add(page.name)
  }
  config.pages?.forEach(page => collect(page))
  config.subPackages?.forEach(pkg => pkg.pages.forEach(page => collect(page, pkg.root)))
  return { paths: paths.size, names: names.size }
}

function main() {
  let options
  try {
    options = parseArgs(process.argv.slice(2))
  }
  catch (error) {
    fail(error.message)
    return
  }
  if (options.help) {
    console.log(help)
    return
  }

  const cwd = resolve(options.cwd || process.cwd())
  let pagesJson
  let dts
  try {
    pagesJson = resolvePagesJsonFile(cwd, options.pages)
    dts = resolveRouteTypesDts(cwd, pagesJson, options.dts)
  }
  catch (error) {
    fail(error.message)
    return
  }

  const generate = () => {
    const config = readPagesJson(pagesJson, { platform: options.platform })
    writeRouteTypes(config, { dts, strict: options.strict })
    const counts = countRoutes(config)
    console.log(`[@wot-ui/router] ${relative(cwd, pagesJson) || pagesJson} -> ${relative(cwd, dts) || dts}（${counts.paths} 个路径，${counts.names} 个名称）`)
  }

  try {
    generate()
  }
  catch (error) {
    fail(error.message)
    return
  }

  if (!options.watch)
    return

  let timer
  console.log(`[@wot-ui/router] 正在监听 ${relative(cwd, pagesJson) || pagesJson}`)
  const watcher = watch(dirname(pagesJson), (_event, filename) => {
    if (filename && resolve(dirname(pagesJson), filename.toString()) !== pagesJson)
      return
    clearTimeout(timer)
    timer = setTimeout(() => {
      try {
        generate()
      }
      catch (error) {
        console.error(`[@wot-ui/router] 生成失败：${error.message}`)
      }
    }, 60)
  })
  watcher.on('error', (error) => {
    clearTimeout(timer)
    fail(`监听失败：${error.message}`)
    watcher.close()
  })
}

main()
