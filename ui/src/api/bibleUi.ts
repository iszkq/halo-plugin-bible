import { getBookAbbrev } from './bibleOrder'

const BOOK_LABEL_OVERRIDES: Record<string, string> = {
  '\u5217\u738b\u7EAA\u4E0A': '\u738B\u4E0A',
  '\u5217\u738B\u7EAA\u4E0B': '\u738B\u4E0B',
}

export const PUBLIC_BIBLE_PAGE_PATH = '/plugins/bible/assets/theme-bible-page.html'

export interface VerseLike {
  bookName?: string
  chapterNumber?: number
  verseNumber?: number
  content?: string
}

export type PaginationItem = number | 'ellipsis'

export function buildPaginationItems(current: number, total: number): PaginationItem[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }

  const pages = new Set<number>([1, total, current - 1, current, current + 1])
  if (current <= 4) {
    pages.add(2)
    pages.add(3)
    pages.add(4)
  }
  if (current >= total - 3) {
    pages.add(total - 1)
    pages.add(total - 2)
    pages.add(total - 3)
  }

  const ordered = [...pages].filter((page) => page >= 1 && page <= total).sort((left, right) => left - right)
  const items: PaginationItem[] = []

  ordered.forEach((page, index) => {
    const previous = ordered[index - 1]
    if (index > 0 && previous != null && page - previous > 1) {
      items.push('ellipsis')
    }
    items.push(page)
  })

  return items
}

export function formatBookDisplayName(bookName: string): string {
  return BOOK_LABEL_OVERRIDES[bookName] ?? getBookAbbrev(bookName) ?? bookName
}

export function formatVerseReference(verse: VerseLike): string {
  return `\u3010${formatBookDisplayName(verse.bookName || '')}${verse.chapterNumber ?? 0}:${verse.verseNumber ?? 0}\u3011`
}

export function formatVersePlainText(verse: VerseLike): string {
  return `${formatVerseReference(verse)}${verse.content ?? ''}`
}

export function formatVersePageText(verses: VerseLike[]): string {
  return verses.map(formatVersePlainText).join('\n')
}

export async function copyText(text: string): Promise<boolean> {
  const value = text.trim()
  if (!value) return false

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return true
    }
  } catch {
  }

  try {
    const textarea = document.createElement('textarea')
    textarea.value = value
    textarea.setAttribute('readonly', 'true')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}

export function isCopyShortcut(event: KeyboardEvent): boolean {
  const key = event.key.toLowerCase()
  return (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && key === 'c'
}

export function getCopyShortcutLabel(): string {
  if (typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform)) {
    return '⌘C'
  }
  return 'Ctrl+C'
}

export function isResetShortcut(event: KeyboardEvent): boolean {
  const key = event.key.toLowerCase()
  return (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && key === 'x'
}

export function getResetShortcutLabel(): string {
  if (typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform)) {
    return '⌘X'
  }
  return 'Ctrl+X'
}

export function isPreviousChapterShortcut(event: KeyboardEvent): boolean {
  const key = event.key.toLowerCase()
  return !event.metaKey
    && !event.ctrlKey
    && !event.altKey
    && (
      key === '-'
      || key === '_'
      || key === 'subtract'
      || event.code === 'Minus'
      || event.code === 'NumpadSubtract'
    )
}

export function isNextChapterShortcut(event: KeyboardEvent): boolean {
  const key = event.key.toLowerCase()
  return !event.metaKey
    && !event.ctrlKey
    && !event.altKey
    && (
      key === '+'
      || key === '='
      || key === 'add'
      || key === '＋'
      || event.code === 'Equal'
      || event.code === 'NumpadAdd'
    )
}

export function getPreviousChapterShortcutLabel(): string {
  return '-'
}

export function getNextChapterShortcutLabel(): string {
  return '+'
}

export function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  if (target.isContentEditable) {
    return true
  }

  const tagName = target.tagName.toLowerCase()
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select'
}
