declare namespace WotRouterPages {
  interface PageRoute {
    path: string
    name?: string
    type?: string
    style?: Record<string, unknown>
    layout?: string
    aliasPath?: string
    [key: string]: unknown
  }

  interface SubPackage {
    root: string
    pages: PageRoute[]
    [key: string]: unknown
  }
}

declare module 'virtual:uni-pages' {
  export const pages: WotRouterPages.PageRoute[]
  export const subPackages: WotRouterPages.SubPackage[]
}

declare module 'virtual:wot-pages' {
  export const pages: WotRouterPages.PageRoute[]
  export const subPackages: WotRouterPages.SubPackage[]
}
