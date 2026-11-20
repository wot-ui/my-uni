import type { App } from 'vue'
import type { LocationQuery } from '../types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, ref } from 'vue'
import { createMemoryHistory, createRouter as createVueRouter } from 'vue-router'
import { createRouter, useRoute, useRouter } from '../x'

interface RouteEvent { path: string, query: LocationQuery }
let listeners: Set<(event: RouteEvent) => void>
let pages: { route: string, options?: LocationQuery, __wxWebviewId__?: number }[]
const disposals: (() => void)[] = []
const routes = [{ path: '/pages/home', name: 'home' }, { path: '/pages/detail', name: 'detail' }]

interface NativeRoute {
  path: string
  query?: LocationQuery
  meta?: Record<string, any>
}

class FakeVueRouter {
  currentRoute = ref<NativeRoute>({ path: '/', query: {}, meta: {} })
  beforeGuards: ((to: NativeRoute, from: NativeRoute) => unknown)[] = []
  afterGuards: ((to: NativeRoute, from: NativeRoute, failure?: unknown) => void)[] = []
  installSawBridge = false

  beforeEach(guard: (to: NativeRoute, from: NativeRoute) => unknown) {
    this.beforeGuards.push(guard)
    return () => {
      const index = this.beforeGuards.indexOf(guard)
      if (index > -1)
        this.beforeGuards.splice(index, 1)
    }
  }

  afterEach(guard: (to: NativeRoute, from: NativeRoute, failure?: unknown) => void) {
    this.afterGuards.push(guard)
    return () => {
      const index = this.afterGuards.indexOf(guard)
      if (index > -1)
        this.afterGuards.splice(index, 1)
    }
  }

  getRoutes() {
    return []
  }

  resolve() {
    return {}
  }

  addRoute() {
    return () => {}
  }

  install() {
    this.installSawBridge = this.beforeGuards.length === 1
  }

  async push(to: string | NativeRoute | { path: string, query?: LocationQuery }) {
    const from = this.currentRoute.value
    const target: NativeRoute = typeof to === 'string'
      ? { path: to, query: {}, meta: {} }
      : { ...to, query: to.query as LocationQuery }

    for (const guard of [...this.beforeGuards]) {
      const result = await guard(target, from)
      if (result === false) {
        this.afterGuards.forEach(after => after(target, from, new Error('cancelled')))
        return false
      }
      if (typeof result === 'string' || (result && typeof result === 'object')) {
        return this.push(result as string | NativeRoute)
      }
    }

    this.currentRoute.value = target
    this.afterGuards.forEach(after => after(target, from))
    return true
  }
}

function setup() {
  const router = createRouter({ routes })
  const app = createApp({})
  const mixin = vi.spyOn(app, 'mixin')
  router.install(app)
  disposals.push(router.dispose)
  return { router, app, mixin }
}

function emit(path: string, query: LocationQuery = {}) {
  for (const listener of listeners)
    listener({ path, query })
}

function mockUniH5Navigation(nativeRouter: {
  push: (to: { path: string, query: Record<string, string> }) => Promise<unknown>
}) {
  vi.mocked(uni.navigateTo).mockImplementation(({ url, success, fail }: any) => {
    const [path, search = ''] = url.split('?')
    const query = Object.fromEntries(
      search.split('&').filter(Boolean).map((pair: string) => {
        const index = pair.indexOf('=')
        return index === -1 ? [pair, ''] : [pair.slice(0, index), pair.slice(index + 1)]
      }),
    )
    nativeRouter.push({ path, query }).then((result) => {
      if (result === false || result instanceof Error)
        fail?.({ errMsg: 'cancelled' })
      else
        success?.()
    }, fail)
  })
}

beforeEach(() => {
  listeners = new Set()
  pages = []
  vi.mocked(getCurrentPages).mockImplementation(() => pages as any)
  Object.assign(uni, {
    onAppRoute: vi.fn((fn: (event: RouteEvent) => void) => listeners.add(fn)),
    offAppRoute: vi.fn((fn: (event: RouteEvent) => void) => listeners.delete(fn)),
  })
  vi.mocked(uni.getSystemInfoSync).mockReturnValue({ uniPlatform: 'web' })
})

afterEach(() => {
  disposals.splice(0).forEach(dispose => dispose())
  vi.restoreAllMocks()
})

describe('uni-app x adapter', () => {
  it('uses decoded lifecycle query without assuming the encoding of public UniPage options', () => {
    pages = [{ route: 'pages/detail', options: { text: '%E4%B8%AD%E6%96%87%25%26', id: '1' } }]
    const { router, app, mixin } = setup()
    expect(mixin).not.toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/')
    router.syncRoute({ text: '中文%&', id: '1' })
    expect(router.currentRoute.value.query).toEqual({ text: '中文%&', id: '1' })
    expect(router.currentRoute.value.name).toBe('detail')
    expect(app.config.globalProperties.$Router).toBe(router)
    expect(app.config.globalProperties.$Route).toBe(router.currentRoute.value)
  })

  it('decodes serialized query once for WeChat VDOM page objects', () => {
    pages = [{
      route: 'pages/detail',
      options: { text: '%E4%B8%AD%E6%96%87%25%26', id: '1' },
      __wxWebviewId__: 60,
    }]
    const { router } = setup()
    const after = vi.fn()
    router.afterEach(after)
    router.syncRoute({ id: '1', text: '%E4%B8%AD%E6%96%87%25%26' })
    expect(router.currentRoute.value.fullPath).toBe('/pages/detail?id=1&text=%E4%B8%AD%E6%96%87%25%26')
    emit('pages/detail', { id: '1', text: '%E4%B8%AD%E6%96%87%25%26' })
    expect(after).toHaveBeenCalledOnce()
    expect(router.currentRoute.value.query).toEqual({ id: '1', text: '中文%&' })
    expect(router.currentRoute.value.fullPath).toBe('/pages/detail?id=1&text=%E4%B8%AD%E6%96%87%25%26')
  })

  it('recognizes WeChat VDOM when onAppRoute arrives before the page stack', () => {
    vi.mocked(uni.getSystemInfoSync).mockReturnValue({ uniPlatform: 'mp-weixin' })
    const { router } = setup()
    const after = vi.fn()
    router.afterEach(after)
    emit('pages/detail', { id: '1', text: '%E4%B8%AD%E6%96%87%25%26' })
    expect(router.currentRoute.value.fullPath).toBe('/pages/detail?id=1&text=%E4%B8%AD%E6%96%87%25%26')
    expect(after).toHaveBeenCalledOnce()
  })

  it('updates from successful native navigation and deduplicates equal fullPaths', () => {
    const { router } = setup()
    const after = vi.fn()
    router.afterEach(after)
    emit('pages/detail', { id: '1' })
    emit('pages/detail', { id: '1' })
    emit('pages/detail', { id: '2' })
    emit('pages/detail', { id: '1' })
    expect(after).toHaveBeenCalledTimes(3)
    expect(after.mock.calls[2][1].query).toEqual({ id: '2' })
    expect(router.currentRoute.value.query).toEqual({ id: '1' })
  })

  it('allows explicit page lifecycle sync before the success event without duplicate afterEach', () => {
    const { router } = setup()
    const after = vi.fn()
    router.afterEach(after)
    pages = [{ route: 'pages/detail', options: { id: 'early' } }]
    router.syncRoute({ id: 'early' })
    expect(router.currentRoute.value.query.id).toBe('early')
    emit('pages/detail', { id: 'early' })
    expect(after).toHaveBeenCalledTimes(1)
  })

  it('takes a snapshot of query objects and normalizes only the leading slash', () => {
    const { router } = setup()
    const query = { text: '%25', empty: '' }
    emit('/pages/detail', query)
    query.text = 'changed'
    expect(router.currentRoute.value.fullPath).toBe('/pages/detail?text=%2525&empty=')
  })

  it('does not register twice for the same app', () => {
    const { router, app } = setup()
    router.install(app)
    expect(listeners.size).toBe(1)
  })

  it('removes only its own listener and ignores already queued callbacks after disposal', () => {
    const external = vi.fn()
    listeners.add(external)
    const { router } = setup()
    const callback = [...listeners].find(fn => fn !== external)!
    router.dispose()
    router.dispose()
    callback({ path: 'pages/detail', query: {} })
    expect(router.currentRoute.value.path).toBe('/')
    expect([...listeners]).toEqual([external])
  })

  it('replaces an earlier x router on the same app without leaving a listener', () => {
    const { router, app } = setup()
    const replacement = createRouter({ routes })
    disposals.push(replacement.dispose)
    replacement.install(app)
    expect(listeners.size).toBe(1)
    emit('pages/detail')
    expect(router.currentRoute.value.path).toBe('/')
    expect(replacement.currentRoute.value.path).toBe('/pages/detail')
    expect(app.config.globalProperties.$Router).toBe(replacement)
  })

  it('cleans up and restores global descriptors when the app unmounts', () => {
    const router = createRouter({ routes })
    const app = createApp({})
    const unmount = vi.fn()
    app.unmount = unmount
    app.config.globalProperties.$Route = 'previous'
    router.install(app)
    app.unmount()
    expect(listeners.size).toBe(0)
    expect(unmount).toHaveBeenCalledOnce()
    expect(app.unmount).toBe(unmount)
    expect(app.config.globalProperties.$Route).toBe('previous')
  })

  it('fails before installing when route events are unavailable', () => {
    Object.assign(uni, { onAppRoute: undefined })
    const app = createApp({})
    expect(() => createRouter({ routes }).install(app)).toThrow('onAppRoute/offAppRoute')
    expect(app.config.globalProperties.$Router).toBeUndefined()
    expect(listeners.size).toBe(0)
  })

  it('rejects sharing one router across apps', () => {
    const { router } = setup()
    expect(() => router.install(createApp({}))).toThrow('一个应用')
    expect(listeners.size).toBe(1)
  })

  it('rolls back a failed install without keeping its callback', () => {
    const app = createApp({})
    app.provide = () => {
      throw new Error('install failure')
    }
    expect(() => createRouter({ routes }).install(app)).toThrow('install failure')
    expect(listeners.size).toBe(0)
    expect(app.config.globalProperties.$Router).toBeUndefined()
  })

  it('keeps asynchronous cancellation and redirection in the shared navigation core', async () => {
    const { router } = setup()
    const remove = router.beforeEach(async () => false)
    await expect(router.push('/pages/detail')).rejects.toThrow('NavigationCancelled')
    expect(uni.navigateTo).not.toHaveBeenCalled()
    remove()
    const guard = vi.fn(async to => to.path === '/pages/detail' ? '/pages/home' : undefined)
    router.beforeEach(guard)
    await router.push('/pages/detail')
    expect(guard).toHaveBeenCalledTimes(2)
    expect(uni.navigateTo).toHaveBeenCalledWith(expect.objectContaining({ url: '/pages/home' }))
    // API success alone does not synthesize a page lifecycle or route event.
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('injects the x router and renders reactive state through the published hook shape', async () => {
    const router = createRouter({ routes })
    let injected: ReturnType<typeof useRouter> | undefined
    const component = defineComponent({
      setup() {
        injected = useRouter()
        const route = useRoute()
        return () => h('span', route.fullPath)
      },
    })
    const app: App = createApp(component)
    const element = document.createElement('div')
    app.use(router)
    app.mount(element)
    expect(injected).toBe(router)
    emit('pages/detail', { id: '2' })
    await nextTick()
    expect(element.textContent).toBe('/pages/detail?id=2')
    app.unmount()
    expect(listeners.size).toBe(0)
  })

  it('installs the H5 vue-router bridge before Vue Router performs its initial navigation', () => {
    const { app } = setup()
    const nativeRouter = new FakeVueRouter()
    app.use(nativeRouter)

    expect(nativeRouter.installSawBridge).toBe(true)
  })

  it('runs x guards from the H5 vue-router bridge and normalizes alias paths', async () => {
    const { router, app } = setup()
    const nativeRouter = new FakeVueRouter()
    const guard = vi.fn()
    const after = vi.fn()
    router.beforeEach(guard)
    router.afterEach(after)
    app.use(nativeRouter)

    await nativeRouter.push({
      path: '/',
      query: { id: '1' },
      meta: { route: 'pages/home' },
    })

    expect(guard).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/pages/home', fullPath: '/pages/home?id=1' }),
      expect.objectContaining({ path: '/' }),
      expect.any(Function),
    )
    expect(router.currentRoute.value.path).toBe('/pages/home')
    expect(after).toHaveBeenCalledOnce()
  })

  it('preserves query values already decoded by Vue Router', async () => {
    const { router, app } = setup()
    const nativeRouter = new FakeVueRouter()
    const before = vi.fn()
    const after = vi.fn()
    router.beforeEach(before)
    router.afterEach(after)
    app.use(nativeRouter)

    await nativeRouter.push({
      path: '/pages/detail',
      query: { id: '1', text: '中文%&' },
      meta: { route: 'pages/detail' },
    })

    const expected = '/pages/detail?id=1&text=%E4%B8%AD%E6%96%87%25%26'
    expect(before).toHaveBeenCalledWith(
      expect.objectContaining({ fullPath: expected }),
      expect.any(Object),
      expect.any(Function),
    )
    expect(router.currentRoute.value.fullPath).toBe(expected)
    expect(after).toHaveBeenCalledOnce()

    emit('pages/detail', { id: '1', text: '%E4%B8%AD%E6%96%87%25%26' })
    expect(after).toHaveBeenCalledOnce()
    expect(router.currentRoute.value.query).toEqual({ id: '1', text: '中文%&' })
    expect(router.currentRoute.value.fullPath).toBe(expected)
  })

  it('restores the raw query before Uni H5 re-encodes navigation URLs', async () => {
    const { router, app } = setup()
    const nativeRouter = new FakeVueRouter()
    const before = vi.fn()
    const after = vi.fn()
    router.beforeEach(before)
    router.afterEach(after)
    app.use(nativeRouter)

    vi.mocked(uni.navigateTo).mockImplementation(({ url, success }: any) => {
      const [path, search = ''] = url.split('?')
      const query = Object.fromEntries(
        search
          .split('&')
          .filter(Boolean)
          .map((pair: string) => {
            const index = pair.indexOf('=')
            return index === -1
              ? [pair, '']
              : [pair.slice(0, index), pair.slice(index + 1)]
          }),
      )
      nativeRouter.push({
        path,
        query,
        meta: { route: path.slice(1) },
      }).then(() => success?.())
    })

    const expected = '/pages/detail?id=1&text=%E4%B8%AD%E6%96%87%25%26'
    await router.push({
      path: '/pages/detail',
      query: { id: '1', text: '中文%&' },
    })

    expect(before).toHaveBeenCalledWith(
      expect.objectContaining({ fullPath: expected }),
      expect.any(Object),
      expect.any(Function),
    )
    expect(router.currentRoute.value.fullPath).toBe(expected)
    expect(after).toHaveBeenCalledOnce()
  })

  it('runs beforeEnter and beforeResolve from the H5 vue-router bridge', async () => {
    const order: string[] = []
    const router = createRouter({
      routes: [
        { path: '/pages/home', name: 'home' },
        {
          path: '/pages/detail',
          name: 'detail',
          beforeEnter: (_to, _from, next) => {
            order.push('beforeEnter')
            next()
          },
        },
      ],
    })
    const app = createApp({})
    const nativeRouter = new FakeVueRouter()
    router.install(app)
    disposals.push(router.dispose)
    router.beforeEach((_to, _from, next) => {
      order.push('beforeEach')
      next()
    })
    router.beforeResolve((_to, _from, next) => {
      order.push('beforeResolve')
      next()
    })
    app.use(nativeRouter)

    await nativeRouter.push({ path: '/pages/detail', query: {}, meta: {} })

    expect(order).toEqual(['beforeEach', 'beforeEnter', 'beforeResolve'])
  })

  it.each(['%', '%41', '中文%&'])('preserves committed query %s when leaving and returning through history', async (text) => {
    const { router, app } = setup()
    const before = vi.fn()
    const after = vi.fn()
    router.beforeEach(before)
    router.afterEach(after)
    const nativeRouter = createVueRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: {}, meta: { route: 'pages/home' } },
        { path: '/pages/detail', component: {}, meta: { route: 'pages/detail' } },
      ],
    })
    app.use(nativeRouter)
    await nativeRouter.isReady()
    mockUniH5Navigation(nativeRouter)

    await router.push({ path: '/pages/detail', query: { text } })
    await nativeRouter.push('/')

    expect(before).toHaveBeenLastCalledWith(
      expect.objectContaining({ path: '/pages/home' }),
      expect.objectContaining({ query: { text } }),
      expect.any(Function),
    )
    expect(after).toHaveBeenLastCalledWith(
      expect.objectContaining({ path: '/pages/home' }),
      expect.objectContaining({ query: { text } }),
    )

    const returned = new Promise<void>((resolve) => {
      const remove = nativeRouter.afterEach(() => {
        remove()
        resolve()
      })
    })
    nativeRouter.back()
    await returned

    expect(before).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: { text } }),
      expect.objectContaining({ path: '/pages/home' }),
      expect.any(Function),
    )
    expect(router.currentRoute.value.query).toEqual({ text })
    expect(router.currentRoute.value.fullPath).toBe(`/pages/detail?text=${encodeURIComponent(text)}`)
  })

  it('does not apply a completed navigation query to a new literal-percent navigation', async () => {
    const { router, app } = setup()
    const nativeRouter = new FakeVueRouter()
    app.use(nativeRouter)
    mockUniH5Navigation(nativeRouter)

    await router.push({ path: '/pages/detail', query: { text: '%' } })
    await nativeRouter.push('/pages/home')
    await nativeRouter.push({ path: '/pages/detail', query: { text: '%25' } })

    expect(router.currentRoute.value.query).toEqual({ text: '%25' })
    expect(router.currentRoute.value.fullPath).toBe('/pages/detail?text=%2525')
  })

  it('keeps active navigation query records while an async guard runs longer than a minute', async () => {
    const { router, app } = setup()
    const nativeRouter = new FakeVueRouter()
    app.use(nativeRouter)
    mockUniH5Navigation(nativeRouter)
    let release: (() => void) | undefined
    router.beforeEach(() => new Promise<void>((resolve) => {
      release = resolve
    }))

    const navigation = router.push({ path: '/pages/detail', query: { text: '%' } })
    await vi.waitFor(() => expect(release).toBeTypeOf('function'))
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 60_001)
    release!()
    await navigation

    expect(router.currentRoute.value.query).toEqual({ text: '%' })
    expect(router.currentRoute.value.fullPath).toBe('/pages/detail?text=%25')
  })

  it('clears a failed native navigation query before a later direct navigation', async () => {
    const { router, app } = setup()
    const nativeRouter = new FakeVueRouter()
    app.use(nativeRouter)
    vi.mocked(uni.navigateTo).mockImplementation(({ fail }: any) => fail?.({ errMsg: 'failure' }))

    await expect(router.push({ path: '/pages/detail', query: { text: '%' } })).rejects.toThrow('failure')
    await nativeRouter.push({ path: '/pages/detail', query: { text: '%25' } })

    expect(router.currentRoute.value.query).toEqual({ text: '%25' })
  })

  it('keeps cancellation and redirect semantics when Vue Router owns the guard host', async () => {
    const { router, app } = setup()
    const nativeRouter = new FakeVueRouter()
    app.use(nativeRouter)
    const removeCancel = router.beforeEach(() => false)

    await expect(nativeRouter.push({ path: '/pages/detail', query: {}, meta: {} })).resolves.toBe(false)
    expect(router.currentRoute.value.path).toBe('/')

    removeCancel()
    let shouldRedirect = true
    router.beforeEach(() => {
      if (shouldRedirect) {
        shouldRedirect = false
        return { path: '/pages/home', query: { from: 'guard' } }
      }
    })

    await nativeRouter.push({ path: '/pages/detail', query: {}, meta: {} })
    expect(router.currentRoute.value.fullPath).toBe('/pages/home?from=guard')
  })

  it('does not duplicate afterEach when onAppRoute follows the H5 vue-router hook', () => {
    const { router, app } = setup()
    const nativeRouter = new FakeVueRouter()
    const after = vi.fn()
    router.afterEach(after)
    app.use(nativeRouter)

    nativeRouter.afterGuards.forEach(guard => guard(
      { path: '/pages/detail', query: { id: '1' }, meta: { route: 'pages/detail' } },
      { path: '/pages/home', query: {}, meta: { route: 'pages/home' } },
    ))
    emit('pages/detail', { id: '1' })

    expect(after).toHaveBeenCalledOnce()
  })

  it('runs the shared guard pipeline through a real vue-router memory history', async () => {
    const { router, app } = setup()
    const order: string[] = []
    router.beforeEach((to) => {
      order.push(`beforeEach:${to.path}`)
    })
    router.beforeResolve((to) => {
      order.push(`beforeResolve:${to.path}`)
    })
    router.afterEach((to) => {
      order.push(`afterEach:${to.path}`)
    })
    const nativeRouter = createVueRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: {}, meta: { route: 'pages/home' } },
        { path: '/pages/detail', component: {}, meta: { route: 'pages/detail' } },
      ],
    })

    app.use(nativeRouter)
    await nativeRouter.isReady()

    expect(order).toEqual([
      'beforeEach:/pages/home',
      'beforeResolve:/pages/home',
      'afterEach:/pages/home',
    ])
    expect(router.currentRoute.value.path).toBe('/pages/home')

    order.length = 0
    await nativeRouter.push('/pages/detail?id=1')

    expect(order).toEqual([
      'beforeEach:/pages/detail',
      'beforeResolve:/pages/detail',
      'afterEach:/pages/detail',
    ])
    expect(router.currentRoute.value.fullPath).toBe('/pages/detail?id=1')
    expect(nativeRouter.currentRoute.value.path).toBe('/pages/detail')
  })

  it('honors cancellation through a real vue-router navigation', async () => {
    const { router, app } = setup()
    const removeCancel = router.beforeEach(to => to.path === '/pages/detail' ? false : undefined)
    const after = vi.fn()
    router.afterEach(after)
    const nativeRouter = createVueRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: {}, meta: { route: 'pages/home' } },
        { path: '/pages/detail', component: {}, meta: { route: 'pages/detail' } },
      ],
    })

    app.use(nativeRouter)
    await nativeRouter.isReady()
    await nativeRouter.push('/pages/detail')

    expect(nativeRouter.currentRoute.value.path).toBe('/')
    expect(router.currentRoute.value.path).toBe('/pages/home')
    expect(after).toHaveBeenCalledOnce()

    removeCancel()
    await nativeRouter.push('/pages/detail')

    expect(nativeRouter.currentRoute.value.path).toBe('/pages/detail')
    expect(router.currentRoute.value.path).toBe('/pages/detail')
    expect(after).toHaveBeenCalledTimes(2)
  })

  it('preserves Vue Router query decoding for literal percent sequences', async () => {
    const { router, app } = setup()
    const nativeRouter = createVueRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: {}, meta: { route: 'pages/home' } },
        { path: '/pages/detail', component: {}, meta: { route: 'pages/detail' } },
      ],
    })

    app.use(nativeRouter)
    await nativeRouter.isReady()
    await nativeRouter.push('/pages/detail?text=%2541')

    expect(router.currentRoute.value.query.text).toBe('%41')
    expect(router.currentRoute.value.fullPath).toBe('/pages/detail?text=%2541')
  })

  it('removes H5 vue-router hooks on dispose', () => {
    const { router, app } = setup()
    const nativeRouter = new FakeVueRouter()
    const removeHistory = vi.fn()
    Object.assign(nativeRouter, { options: { history: { listen: () => removeHistory } } })
    app.use(nativeRouter)
    expect(nativeRouter.beforeGuards).toHaveLength(1)
    expect(nativeRouter.afterGuards).toHaveLength(1)

    router.dispose()

    expect(nativeRouter.beforeGuards).toHaveLength(0)
    expect(nativeRouter.afterGuards).toHaveLength(0)
    expect(removeHistory).toHaveBeenCalledOnce()
  })
})
