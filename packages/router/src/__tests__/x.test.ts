import type { App } from 'vue'
import type { LocationQuery } from '../types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick } from 'vue'
import { createRouter, useRoute, useRouter } from '../x'

interface RouteEvent { path: string, query: LocationQuery }
let listeners: Set<(event: RouteEvent) => void>
let pages: { route: string, options?: LocationQuery }[]
const disposals: (() => void)[] = []
const routes = [{ path: '/pages/home', name: 'home' }, { path: '/pages/detail', name: 'detail' }]

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

beforeEach(() => {
  listeners = new Set()
  pages = []
  vi.mocked(getCurrentPages).mockImplementation(() => pages as any)
  Object.assign(uni, {
    onAppRoute: vi.fn((fn: (event: RouteEvent) => void) => listeners.add(fn)),
    offAppRoute: vi.fn((fn: (event: RouteEvent) => void) => listeners.delete(fn)),
  })
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
    const guard = vi.fn(async () => '/pages/home')
    router.beforeEach(guard)
    await router.push('/pages/detail')
    expect(guard).toHaveBeenCalledOnce()
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
})
