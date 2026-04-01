const DEFAULT_PLUGIN_IDS = ['bible', 'run.halo.bible', 'plugin-bible'] as const

const API_BASES = [
  '/apis/plugin.api.halo.run/v1alpha1/plugins',
  '/apis/api.plugin.halo.run/v1alpha1/plugins',
] as const

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const value of values) {
    const normalized = value?.trim()
    if (!normalized || seen.has(normalized)) {
      continue
    }
    seen.add(normalized)
    result.push(normalized)
  }

  return result
}

function parsePluginIdFromPath(pathname?: string | null): string | null {
  if (!pathname) {
    return null
  }

  const assetMatch = pathname.match(/\/plugins\/([^/]+)\/(?:assets|console)(?:\/|$)/i)
  if (assetMatch?.[1]) {
    const pluginId = decodeURIComponent(assetMatch[1])
    return pluginId === '-' ? null : pluginId
  }

  const routeMatch = pathname.match(/\/plugins\/([^/?#]+)(?:\/|$)/i)
  if (routeMatch?.[1]) {
    const pluginId = decodeURIComponent(routeMatch[1])
    return pluginId === '-' ? null : pluginId
  }

  return null
}

function toPathname(url?: string | null): string | null {
  if (!url) {
    return null
  }

  try {
    return new URL(
      url,
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
    ).pathname
  } catch {
    return null
  }
}

function getModulePluginId(): string | null {
  return parsePluginIdFromPath(toPathname(import.meta.url))
}

function getLocationPluginId(): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  return parsePluginIdFromPath(window.location.pathname)
}

function getDomPluginIds(): string[] {
  if (typeof document === 'undefined') {
    return []
  }

  const assetUrls = [
    ...Array.from(document.querySelectorAll<HTMLScriptElement>('script[src]')).map((item) => item.src),
    ...Array.from(document.querySelectorAll<HTMLLinkElement>('link[href]')).map((item) => item.href),
  ]

  return uniqueStrings(assetUrls.map((url) => parsePluginIdFromPath(toPathname(url))))
}

export function getPluginIdCandidates(): string[] {
  return uniqueStrings([
    getModulePluginId(),
    getLocationPluginId(),
    ...getDomPluginIds(),
    ...DEFAULT_PLUGIN_IDS,
  ])
}

export function getPluginApiPrefixes(): string[] {
  return uniqueStrings(
    API_BASES.flatMap((base) =>
      getPluginIdCandidates().flatMap((pluginId) => [`${base}/${pluginId}/bible`, `${base}/${pluginId}`])
    )
  )
}

export function getPluginAssetBases(): string[] {
  return uniqueStrings(getPluginIdCandidates().map((pluginId) => `/plugins/${pluginId}/assets`))
}

export function getPluginAssetPath(filename: string): string {
  const assetBase = getPluginAssetBases()[0] ?? '/plugins/bible/assets'
  return `${assetBase}/${filename.replace(/^\/+/, '')}`
}

export function getBuiltinCsvPaths(): string[] {
  return uniqueStrings(getPluginAssetBases().map((assetBase) => `${assetBase}/bible.csv`))
}
