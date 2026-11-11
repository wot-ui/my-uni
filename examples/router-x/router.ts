import { createRouter } from '@wot-ui/router/x'
import { reactive } from 'vue'

export const state = reactive({ trace: [] as string[], result: '', onLoadRoute: '', afterSyncRoute: '' })
export const router = createRouter({
  routes: [
    { path: '/pages/home/index', name: 'home' },
    { path: '/pages/tab/index', name: 'tab' },
    { path: '/pages/detail/index', name: 'detail' },
    { path: '/sub/target', name: 'target' },
  ],
})

export function record(stage: string) {
  const entry = `${stage}:${router.currentRoute.value.fullPath}`
  state.trace.push(entry)
  console.log('[router-x]', entry)
}

router.beforeEach(async (to) => {
  record(`before:${to.fullPath}`)
  if (to.query.cancel === '1')
    return false
  if (to.query.redirect === '1')
    return { path: '/sub/target', query: { from: 'guard' } }
  if (to.query.wait === '1')
    await new Promise(resolve => setTimeout(resolve, 30))
})
router.afterEach(() => record('after'))

export async function navigate(action: () => Promise<unknown>) {
  state.result = ''
  try {
    await action()
    state.result = 'success'
  }
  catch (error) {
    state.result = (error as Error).message
  }
}
