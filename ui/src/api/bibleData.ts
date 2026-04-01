import { matchVerseKeyword, sortBookChaptersByBibleOrder } from './bibleOrder'
import { getBuiltinCsvPaths, getPluginApiPrefixes } from './pluginRuntime'

export interface Verse {
  id: string
  covenantName?: string
  category?: string
  bookName?: string
  bookNumber?: number
  chapterNumber?: number
  verseNumber?: number
  content?: string
}

export interface BookChapterItem {
  covenantName: string
  bookName: string
  chapterNumber: number
}

export interface BibleSettings {
  csvUrl: string
  csvText: string
  floatEnabled: boolean
  floatPosition: string
  visiblePages: string[]
  floatIconUrl: string
  includePaths: string
  excludePaths: string
}

export interface BibleDiagnostics {
  sourceMode: string
  sourceDetail: string
  verseCount: number
  chapterCount: number
  deletedCount: number
  updatedCount: number
  createdCount: number
  editsPath: string
  configPath: string
  lastReloadAt: string
  lastError: string
  floatEnabled: boolean
  floatPosition: string
  visiblePages: string[]
}

const FULL_DATA_PAGE_SIZE = '50000'

let loadCache: { verses: Verse[]; bookChapters: BookChapterItem[] } | null = null

function normalizeSettings(input?: Partial<BibleSettings>): BibleSettings {
  return {
    csvUrl: input?.csvUrl ?? '',
    csvText: input?.csvText ?? '',
    floatEnabled: input?.floatEnabled ?? true,
    floatPosition: input?.floatPosition ?? 'right-bottom',
    visiblePages: Array.isArray(input?.visiblePages) && input.visiblePages.length ? input.visiblePages : ['home', 'post'],
    floatIconUrl: input?.floatIconUrl ?? '',
    includePaths: input?.includePaths ?? '',
    excludePaths: input?.excludePaths ?? '',
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let lastError: Error | null = null

  for (const prefix of getPluginApiPrefixes()) {
    const response = await fetch(`${prefix}${path}`, {
      mode: 'same-origin',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...(init?.headers ?? {}),
      },
      ...init,
    }).catch((error: unknown) => {
      lastError = error instanceof Error ? error : new Error(String(error))
      return null
    })

    if (!response) continue
    if (response.ok) {
      if (response.status === 204) {
        return undefined as T
      }
      return (await response.json()) as T
    }

    if (response.status !== 404) {
      const text = await response.text().catch(() => '')
      throw new Error(text || `HTTP ${response.status}`)
    }
    lastError = new Error(`HTTP ${response.status}`)
  }

  throw lastError ?? new Error('接口不可用，请确认 Halo 插件后端已正常加载')
}

async function requestVoid(path: string, init?: RequestInit): Promise<void> {
  await requestJson<void>(path, init)
}

export async function fetchSettings(): Promise<BibleSettings> {
  return normalizeSettings(await requestJson<Partial<BibleSettings>>('/settings'))
}

export async function saveSettings(settings: BibleSettings): Promise<BibleSettings> {
  const result = await requestJson<Partial<BibleSettings>>('/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  })
  clearLoadCache()
  return normalizeSettings(result)
}

export async function fetchDiagnostics(): Promise<BibleDiagnostics> {
  return await requestJson<BibleDiagnostics>('/diagnostics')
}

function dtoToVerse(dto: Partial<Verse>): Verse {
  return {
    id: dto.id ?? '',
    covenantName: dto.covenantName,
    category: dto.category,
    bookName: dto.bookName,
    bookNumber: dto.bookNumber,
    chapterNumber: dto.chapterNumber,
    verseNumber: dto.verseNumber,
    content: dto.content,
  }
}

async function fetchAllVersesFromBackend(): Promise<Verse[]> {
  const allVerses: Verse[] = []
  let startCursor: string | null = null

  for (;;) {
    const params = new URLSearchParams({ pageSize: FULL_DATA_PAGE_SIZE })
    if (startCursor) params.set('startCursor', startCursor)
    const result = await requestJson<{ verses?: Partial<Verse>[]; nextCursor?: string; hasMore?: boolean }>(
      `/verses?${params.toString()}`
    )
    for (const item of result.verses ?? []) {
      const verse = dtoToVerse(item)
      if (verse.id) allVerses.push(verse)
    }
    if (!result.hasMore || !result.nextCursor) break
    startCursor = result.nextCursor
  }

  if (!allVerses.length) {
    throw new Error('后端没有返回经文数据')
  }

  return allVerses
}

async function fetchBuiltinCsv(): Promise<string> {
  for (const path of getBuiltinCsvPaths()) {
    const response = await fetch(path, { mode: 'same-origin', credentials: 'include' }).catch(() => null)
    if (response?.ok) return await response.text()
  }
  throw new Error('无法加载内置圣经数据')
}

function parseCsvText(text: string): Verse[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter((line) => line.trim())
  if (lines.length < 2) return []
  return lines
    .slice(1)
    .map((raw, index) => {
      const parts = raw.replace(/\uFEFF/g, '').split(',')
      if (parts.length < 7) return null
      return {
        id: `csv-${index}`,
        covenantName: (parts[0] ?? '').trim(),
        category: (parts[1] ?? '').trim(),
        bookName: (parts[2] ?? '').trim(),
        bookNumber: Number((parts[3] ?? '').trim()) || 0,
        chapterNumber: Number((parts[4] ?? '').trim()) || 0,
        verseNumber: Number((parts[5] ?? '').trim()) || 0,
        content: parts.slice(6).join(',').trim(),
      } satisfies Verse
    })
    .filter((item): item is Verse => Boolean(item?.bookName))
}

async function loadFromFallbackSource(): Promise<Verse[]> {
  let settings: BibleSettings
  try {
    settings = await fetchSettings()
  } catch {
    settings = normalizeSettings()
  }
  if (settings.csvText.trim()) return parseCsvText(settings.csvText)

  if (settings.csvUrl.trim()) {
    const response = await fetch(settings.csvUrl.trim(), {
      mode: settings.csvUrl.startsWith('/') ? 'same-origin' : 'cors',
      credentials: settings.csvUrl.startsWith('/') ? 'include' : 'omit',
    })
    if (!response.ok) {
      throw new Error(`经文源加载失败：HTTP ${response.status}`)
    }
    return parseCsvText(await response.text())
  }

  return parseCsvText(await fetchBuiltinCsv())
}

export function versesToBookChapters(verses: Verse[]): BookChapterItem[] {
  const seen = new Set<string>()
  const items: BookChapterItem[] = []
  for (const verse of verses) {
    const covenantName = verse.covenantName ?? ''
    const bookName = verse.bookName ?? ''
    const chapterNumber = verse.chapterNumber ?? 0
    const key = `${covenantName}\t${bookName}\t${chapterNumber}`
    if (!bookName || !chapterNumber || seen.has(key)) continue
    seen.add(key)
    items.push({ covenantName, bookName, chapterNumber })
  }
  return sortBookChaptersByBibleOrder(items)
}

export async function loadBibleData(force = false): Promise<{ verses: Verse[]; bookChapters: BookChapterItem[] }> {
  if (!force && loadCache) return loadCache

  let verses: Verse[]
  try {
    verses = await fetchAllVersesFromBackend()
  } catch {
    verses = await loadFromFallbackSource()
  }
  loadCache = { verses, bookChapters: versesToBookChapters(verses) }
  return loadCache
}

export function clearLoadCache(): void {
  loadCache = null
}

export function getCachedData(): { verses: Verse[]; bookChapters: BookChapterItem[] } | null {
  return loadCache
}

export function searchVerses(verses: Verse[], keyword: string): Verse[] {
  return verses.filter((verse) => matchVerseKeyword(verse, keyword))
}

export async function createVerse(payload: Omit<Verse, 'id'>): Promise<Verse> {
  const result = await requestJson<Verse>('/verses', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  clearLoadCache()
  return result
}

export async function updateVerse(id: string, payload: Omit<Verse, 'id'>): Promise<Verse> {
  const result = await requestJson<Verse>(`/verses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  clearLoadCache()
  return result
}

export async function deleteVerse(id: string): Promise<void> {
  await requestVoid(`/verses/${id}`, {
    method: 'DELETE',
  })
  clearLoadCache()
}
