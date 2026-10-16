import type { RouteTypePagesConfig } from '@wot-ui/router/typed-routes'
import { generateRouteTypes, writeRouteTypes } from '@wot-ui/router/typed-routes'

const config: RouteTypePagesConfig = { pages: [{ path: 'pages/home', name: 'home' }] }
const declaration: string = generateRouteTypes(config, { strict: true })
writeRouteTypes(config, { dts: 'src/typed-router.d.ts' })
void declaration
