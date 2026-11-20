import uniPages, { pages, subPackages } from 'virtual:uni-pages'
import wotPages, { pages as wotRoutes, subPackages as wotSubPackages } from 'virtual:wot-pages'
import '@wot-ui/router/client'

const uniDefault: (typeof import('virtual:uni-pages'))['default'] = uniPages
const wotDefault: (typeof import('virtual:wot-pages'))['default'] = wotPages
const uniConfig: typeof uniDefault = { pages, subPackages }
const wotConfig: typeof wotDefault = { pages: wotRoutes, subPackages: wotSubPackages }

const uniPath: string = uniConfig.pages[0].path
const wotRoot: string = wotConfig.subPackages[0].root

export { uniDefault, uniPath, wotDefault, wotRoot }
