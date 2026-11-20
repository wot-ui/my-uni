import { vi } from 'vitest'

declare global {
  const uni: {
    navigateTo: ReturnType<typeof vi.fn>
    redirectTo: ReturnType<typeof vi.fn>
    switchTab: ReturnType<typeof vi.fn>
    reLaunch: ReturnType<typeof vi.fn>
    navigateBack: ReturnType<typeof vi.fn>
    getSystemInfoSync: ReturnType<typeof vi.fn>
  }
  const getCurrentPages: ReturnType<typeof vi.fn>
  const resetMocks: () => void
}

interface Page {
  route: string
  $page?: {
    fullPath: string
  }
}

let mockPages: Page[] = []

const navigateToMock = vi.fn(({ url, success, _fail }: { url: string, success?: () => void, _fail?: (error: any) => void }) => {
  const path = url.split('?')[0]
  mockPages.push({ route: path, $page: { fullPath: url } })
  success?.()
})

const redirectToMock = vi.fn(({ url, success, _fail }: { url: string, success?: () => void, _fail?: (error: any) => void }) => {
  const path = url.split('?')[0]
  mockPages.push({ route: path, $page: { fullPath: url } })
  success?.()
})

const switchTabMock = vi.fn(({ url, success, _fail }: { url: string, success?: () => void, _fail?: (error: any) => void }) => {
  const path = url.split('?')[0]
  mockPages.push({ route: path, $page: { fullPath: url } })
  success?.()
})

const reLaunchMock = vi.fn(({ url, success, _fail }: { url: string, success?: () => void, _fail?: (error: any) => void }) => {
  const path = url.split('?')[0]
  mockPages = [{ route: path, $page: { fullPath: url } }]
  success?.()
})

const navigateBackMock = vi.fn(({ delta = 1, success, _fail }: { delta?: number, success?: () => void, _fail?: (error: any) => void }) => {
  mockPages = mockPages.slice(0, -delta)
  success?.()
})

const uniMock = {
  navigateTo: navigateToMock,
  redirectTo: redirectToMock,
  switchTab: switchTabMock,
  reLaunch: reLaunchMock,
  navigateBack: navigateBackMock,
  getSystemInfoSync: vi.fn(() => ({ uniPlatform: 'web' })),
}

Object.defineProperty(globalThis, 'uni', {
  value: uniMock,
  writable: true,
})

Object.defineProperty(globalThis, 'getCurrentPages', {
  value: vi.fn(() => mockPages),
  writable: true,
})

Object.defineProperty(globalThis, 'resetMocks', {
  value: () => {
    mockPages = []
    vi.clearAllMocks()
  },
  writable: true,
})
