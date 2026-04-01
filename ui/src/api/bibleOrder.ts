export const OT_BOOK_ORDER: string[] = [
  '创世记', '出埃及记', '利未记', '民数记', '申命记', '约书亚记', '士师记', '路得记',
  '撒母耳记上', '撒母耳记下', '列王记上', '列王记下', '历代志上', '历代志下', '以斯拉记', '尼希米记',
  '以斯帖记', '约伯记', '诗篇', '箴言', '传道书', '雅歌', '以赛亚书', '耶利米书',
  '耶利米哀歌', '以西结书', '但以理书', '何西阿书', '约珥书', '阿摩司书', '俄巴底亚书', '约拿书',
  '弥迦书', '那鸿书', '哈巴谷书', '西番雅书', '哈该书', '撒迦利亚书', '玛拉基书',
]

export const NT_BOOK_ORDER: string[] = [
  '马太福音', '马可福音', '路加福音', '约翰福音', '使徒行传', '罗马书', '哥林多前书', '哥林多后书',
  '加拉太书', '以弗所书', '腓立比书', '歌罗西书', '帖撒罗尼迦前书', '帖撒罗尼迦后书', '提摩太前书',
  '提摩太后书', '提多书', '腓利门书', '希伯来书', '雅各书', '彼得前书', '彼得后书',
  '约翰一书', '约翰二书', '约翰三书', '犹大书', '启示录',
]

export const BOOK_ABBREV: Record<string, string> = {
  创世记: '创', 出埃及记: '出', 利未记: '利', 民数记: '民', 申命记: '申', 约书亚记: '书', 士师记: '士',
  路得记: '得', 撒母耳记上: '撒上', 撒母耳记下: '撒下', 列王记上: '王上', 列王记下: '王下',
  历代志上: '代上', 历代志下: '代下', 以斯拉记: '拉', 尼希米记: '尼', 以斯帖记: '斯', 约伯记: '伯',
  诗篇: '诗', 箴言: '箴', 传道书: '传', 雅歌: '歌', 以赛亚书: '赛', 耶利米书: '耶',
  耶利米哀歌: '哀', 以西结书: '结', 但以理书: '但', 何西阿书: '何', 约珥书: '珥', 阿摩司书: '摩',
  俄巴底亚书: '俄', 约拿书: '拿', 弥迦书: '弥', 那鸿书: '鸿', 哈巴谷书: '哈', 西番雅书: '番',
  哈该书: '该', 撒迦利亚书: '亚', 玛拉基书: '玛',
  马太福音: '太', 马可福音: '可', 路加福音: '路', 约翰福音: '约', 使徒行传: '徒', 罗马书: '罗',
  哥林多前书: '林前', 哥林多后书: '林后', 加拉太书: '加', 以弗所书: '弗', 腓立比书: '腓',
  歌罗西书: '西', 帖撒罗尼迦前书: '帖前', 帖撒罗尼迦后书: '帖后', 提摩太前书: '提前', 提摩太后书: '提后',
  提多书: '多', 腓利门书: '门', 希伯来书: '来', 雅各书: '雅', 彼得前书: '彼前', 彼得后书: '彼后',
  约翰一书: '约一', 约翰二书: '约二', 约翰三书: '约三', 犹大书: '犹', 启示录: '启',
}

const ORDER_INDEX = new Map([...OT_BOOK_ORDER, ...NT_BOOK_ORDER].map((book, index) => [book, index]))
const HTML_ESCAPE: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

export interface VerseLike {
  covenantName?: string
  bookName?: string
  bookNumber?: number
  chapterNumber?: number
  verseNumber?: number
  content?: string
}

export function getBookAbbrev(fullName: string): string {
  return BOOK_ABBREV[fullName] ?? fullName
}

export function isNewCovenantLabel(label?: string): boolean {
  const text = (label ?? '').trim()
  return text.includes('新') || /new/i.test(text)
}

export function getKeywordTokens(keyword: string): string[] {
  return keyword
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
}

export function matchesKeyword(content: string | undefined, keyword: string): boolean {
  const tokens = getKeywordTokens(keyword)
  if (!tokens.length) return true
  const haystack = (content ?? '').toLowerCase()
  return tokens.every((token) => haystack.includes(token))
}

export function matchVerseKeyword(
  verse: { bookName?: string; content?: string; chapterNumber?: number; verseNumber?: number },
  keyword: string
): boolean {
  const tokens = getKeywordTokens(keyword)
  if (!tokens.length) return true
  const haystack = `${verse.bookName ?? ''} ${verse.chapterNumber ?? ''}:${verse.verseNumber ?? ''} ${verse.content ?? ''}`.toLowerCase()
  return tokens.every((token) => haystack.includes(token))
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPE[char] ?? char)
}

export function highlightKeyword(text: string, keyword: string): string {
  const tokens = getKeywordTokens(keyword)
  if (!tokens.length) return escapeHtml(text)
  let html = escapeHtml(text)
  for (const token of tokens) {
    const pattern = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    html = html.replace(
      new RegExp(pattern, 'gi'),
      (match) => `<mark class="bible-keyword-highlight">${match}</mark>`
    )
  }
  return html
}

export function formatVerseLine(verse: VerseLike): string {
  const abbrev = verse.bookName ? getBookAbbrev(verse.bookName) : ''
  return `【${abbrev}${verse.chapterNumber ?? 0}:${verse.verseNumber ?? 0}】${verse.content ?? ''}`
}

export function formatVerseLineAsBlockHtml(verse: VerseLike): string {
  return `<p class="bible-verse-block">${escapeHtml(formatVerseLine(verse))}</p>`
}

export function sortVersesByBibleOrder<T extends VerseLike>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    const leftIsNew = isNewCovenantLabel(left.covenantName)
    const rightIsNew = isNewCovenantLabel(right.covenantName)
    if (leftIsNew !== rightIsNew) return leftIsNew ? 1 : -1

    const leftIndex = ORDER_INDEX.get(left.bookName ?? '') ?? (left.bookNumber ?? 999)
    const rightIndex = ORDER_INDEX.get(right.bookName ?? '') ?? (right.bookNumber ?? 999)
    if (leftIndex !== rightIndex) return leftIndex - rightIndex

    const leftChapter = left.chapterNumber ?? 0
    const rightChapter = right.chapterNumber ?? 0
    if (leftChapter !== rightChapter) return leftChapter - rightChapter

    return (left.verseNumber ?? 0) - (right.verseNumber ?? 0)
  })
}

export function formatVerseSelectionCardHtml(verses: VerseLike[]): string {
  const sorted = sortVersesByBibleOrder(verses)
  const lines = sorted
    .map((verse) => `<p class="bible-embed-card__line">${escapeHtml(formatVerseLine(verse))}</p>`)
    .join('')

  return [
    '<div class="bible-embed-card">',
    `<div class="bible-embed-card__header">经文摘录 · ${sorted.length} 节</div>`,
    `<div class="bible-embed-card__body">${lines}</div>`,
    '</div>',
    '<p></p>',
  ].join('')
}

export function sortBookChaptersByBibleOrder<T extends { covenantName: string; bookName: string; chapterNumber: number }>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    const leftIsNew = isNewCovenantLabel(left.covenantName)
    const rightIsNew = isNewCovenantLabel(right.covenantName)
    if (leftIsNew !== rightIsNew) return leftIsNew ? 1 : -1
    const leftIndex = ORDER_INDEX.get(left.bookName) ?? 999
    const rightIndex = ORDER_INDEX.get(right.bookName) ?? 999
    if (leftIndex !== rightIndex) return leftIndex - rightIndex
    return left.chapterNumber - right.chapterNumber
  })
}

export function getOrderedBookNames(
  bookChapters: { covenantName?: string; bookName?: string }[]
): { old: string[]; new: string[] } {
  const oldSet = new Set<string>()
  const newSet = new Set<string>()
  for (const item of bookChapters) {
    if (!item.bookName) continue
    if (isNewCovenantLabel(item.covenantName)) newSet.add(item.bookName)
    else oldSet.add(item.bookName)
  }
  return {
    old: OT_BOOK_ORDER.filter((book) => oldSet.has(book)),
    new: NT_BOOK_ORDER.filter((book) => newSet.has(book)),
  }
}
