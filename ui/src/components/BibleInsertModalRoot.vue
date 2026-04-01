<template>
  <div v-if="visible" class="bp-insert-mask" @click.self="closeModal">
    <div class="bp-insert-panel">
      <div class="bp-insert__header">
        <div>
          <p class="bp-insert__eyebrow">编辑器插入</p>
          <h3>插入经文</h3>
          <p>支持按卷逐步选择、分页浏览、方向键翻页和一键复制，再按需插入到文章中。</p>
        </div>
        <button class="bp-button bp-button--ghost" type="button" @click="closeModal">关闭</button>
      </div>

      <div class="bp-insert__body">
        <aside class="bp-insert__sidebar">
          <div class="bp-segment">
            <button
              class="bp-segment__item"
              :class="{ 'is-selected': tab === 'browse' }"
              type="button"
              @click="switchTab('browse')"
            >
              按卷章
            </button>
            <button
              class="bp-segment__item"
              :class="{ 'is-selected': tab === 'search' }"
              type="button"
              @click="switchTab('search')"
            >
              搜索
            </button>
          </div>

          <div v-if="tab === 'browse'" class="bp-insert__sidebar-block">
            <div class="bp-insert__browse-head">
              <div class="bp-segment bp-segment--secondary">
                <button
                  class="bp-segment__item"
                  :class="{ 'is-selected': currentCovenant === 'old' }"
                  type="button"
                  @click="switchCovenant('old')"
                >
                  旧约
                </button>
                <button
                  class="bp-segment__item"
                  :class="{ 'is-selected': currentCovenant === 'new' }"
                  type="button"
                  @click="switchCovenant('new')"
                >
                  新约
                </button>
              </div>
              <button
                v-if="selectedBook"
                class="bp-browse-toggle"
                type="button"
                @click="toggleBrowseControls"
              >
                {{ browseControlsCollapsed ? '展开卷章' : '收起卷章' }}
              </button>
            </div>

            <template v-if="!browseControlsCollapsed || selectedChapter == null">
              <div class="bp-insert__group">
                <div class="bp-insert__group-title">卷名</div>
                <div class="bp-pill-wrap">
                  <button
                    v-for="book in activeBooks"
                    :key="book"
                    class="bp-pill"
                    :class="{ 'is-selected': selectedBook === book }"
                    type="button"
                    @click="selectBook(book)"
                  >
                    {{ bookLabel(book) }}
                  </button>
                </div>
              </div>

              <div v-if="selectedBook" class="bp-insert__group">
                <div class="bp-insert__group-title">章节</div>
                <div class="bp-pill-wrap bp-pill-wrap--chapter-dropdown">
                  <button
                    v-for="chapter in activeChapters"
                    :key="chapter"
                    class="bp-pill bp-pill--chapter"
                    :class="{ 'is-selected': selectedChapter === chapter }"
                    type="button"
                    @click="selectChapter(chapter)"
                  >
                    {{ chapter }}
                  </button>
                </div>
              </div>
            </template>
            <div v-else class="bp-browse-summary">
              已选 {{ bookLabel(selectedBook) }} 第 {{ selectedChapter }} 章，点击“展开卷章”可重新选择。
            </div>
          </div>

          <div v-else class="bp-insert__sidebar-block">
            <label class="bp-search-field">
              <span>关键词</span>
              <input
                v-model="keyword"
                type="text"
                placeholder="例如：约瑟 法老"
                @keyup.enter="runSearch"
              >
            </label>
            <button class="bp-button bp-button--primary bp-button--full" type="button" @click="runSearch">
              搜索经文
            </button>

            <div v-if="searchResults.length" class="bp-insert__group">
              <div class="bp-insert__group-title">搜索筛选</div>
              <div class="bp-segment bp-segment--secondary bp-segment--filters">
                <button
                  class="bp-segment__item"
                  :class="{ 'is-selected': searchFilterCovenant === 'all' }"
                  type="button"
                  @click="setSearchFilterCovenant('all')"
                >
                  全部
                </button>
                <button
                  class="bp-segment__item"
                  :class="{ 'is-selected': searchFilterCovenant === 'old' }"
                  type="button"
                  @click="setSearchFilterCovenant('old')"
                >
                  旧约
                </button>
                <button
                  class="bp-segment__item"
                  :class="{ 'is-selected': searchFilterCovenant === 'new' }"
                  type="button"
                  @click="setSearchFilterCovenant('new')"
                >
                  新约
                </button>
              </div>
            </div>

            <div v-if="searchResults.length" class="bp-insert__group">
              <div class="bp-insert__group-title">卷名筛选</div>
              <div class="bp-pill-wrap bp-pill-wrap--chapter-dropdown">
                <button
                  class="bp-pill"
                  :class="{ 'is-selected': !searchFilterBook }"
                  type="button"
                  @click="setSearchFilterBook('')"
                >
                  全部卷
                </button>
                <button
                  v-for="book in searchBooks"
                  :key="`insert-search-book-${book}`"
                  class="bp-pill"
                  :class="{ 'is-selected': searchFilterBook === book }"
                  type="button"
                  @click="setSearchFilterBook(book)"
                >
                  {{ bookLabel(book) }}
                </button>
              </div>
            </div>
          </div>

          <div class="bp-insert__selection">
            <div class="bp-insert__selection-head">
              <div class="bp-insert__selection-meta">
                <strong>已选 {{ selectedVerses.length }} 节</strong>
                <span class="bp-insert__selection-tip">点击经文即可多选，支持跨卷跨章，按 {{ copyShortcutLabel }} 复制，按 {{ resetShortcutLabel }} 重置已选</span>
              </div>
              <div class="bp-insert__selection-actions">
                <button
                  class="bp-button bp-button--light"
                  type="button"
                  :disabled="selectedVerses.length === 0"
                  @click="copySelectedVerses"
                >
                  {{ selectedCopyLabel }}
                </button>
                <button
                  class="bp-button bp-button--light"
                  type="button"
                  :disabled="selectedVerses.length === 0"
                  @click="resetSelection"
                >
                  重置
                </button>
              </div>
            </div>

            <div v-if="selectedVerses.length" class="bp-insert__selected-list">
              <button
                v-for="verse in selectedVerses"
                :key="verse.id"
                class="bp-selected-pill"
                type="button"
                @click="removeSelected(verse.id)"
              >
                {{ verseReference(verse) }}
              </button>
            </div>
            <div v-else class="bp-state-box">
              你可以跨卷、跨章多选经文，再一次性插入正文。
            </div>
          </div>
        </aside>

        <section ref="contentSectionRef" class="bp-insert__content">
          <div class="bp-insert__content-head">
            <div class="bp-insert__content-title">
              <div class="bp-insert__content-title-row">
                <h4>{{ panelTitle }}</h4>
                <div v-if="tab === 'browse' && selectedBook && selectedChapter != null" class="bp-insert__chapter-nav">
                  <button
                    class="bp-button bp-button--light bp-button--compact"
                    type="button"
                    :disabled="!previousChapterTarget"
                    :title="previousChapterTarget ? `上一章：${bookLabel(previousChapterTarget.book)} 第 ${previousChapterTarget.chapter} 章（${previousChapterShortcutLabel}）` : '已经是整本圣经的第一章'"
                    @click="goToPreviousChapter"
                  >
                    上一章
                  </button>
                  <button
                    class="bp-button bp-button--light bp-button--compact"
                    type="button"
                    :disabled="!nextChapterTarget"
                    :title="nextChapterTarget ? `下一章：${bookLabel(nextChapterTarget.book)} 第 ${nextChapterTarget.chapter} 章（${nextChapterShortcutLabel}）` : '已经是整本圣经的最后一章'"
                    @click="goToNextChapter"
                  >
                    下一章
                  </button>
                </div>
              </div>
              <p>{{ panelDescription }}</p>
            </div>
            <div class="bp-insert__content-actions">
              <span class="bp-count">{{ pageSummary }}</span>
              <button class="bp-button bp-button--light" type="button" :disabled="!pagedVerses.length" @click="copyCurrentPage">
                {{ copyButtonLabel }}
              </button>
              <button class="bp-button bp-button--primary" type="button" :disabled="selectedVerses.length === 0" @click="confirm">
                插入 {{ selectedVerses.length }} 节
              </button>
            </div>
          </div>

          <div v-if="loading" class="bp-state-box">正在加载经文数据...</div>
          <div v-else-if="error" class="bp-state-box is-error">{{ error }}</div>
          <div v-else-if="!filteredVerses.length" class="bp-state-box">
            {{ tab === 'search' ? '请输入关键词后搜索。' : selectedBook ? '当前卷暂无可显示的经文。' : '当前暂无可显示的卷章。' }}
          </div>

          <template v-else>
            <div ref="verseTopRef"></div>
            <div class="bp-insert__verse-list">
              <div
                v-for="verse in pagedVerses"
                :key="verse.id"
                class="bp-insert__verse-row"
                :class="{ 'is-selected': isVerseSelected(verse.id), 'is-focused': focusedVerseId === verse.id }"
                :data-verse-id="verse.id"
                role="checkbox"
                :aria-checked="isVerseSelected(verse.id)"
                tabindex="0"
                @click="handleVerseActivate(verse)"
                @keydown.enter.prevent="handleVerseActivate(verse)"
                @keydown.space.prevent="handleVerseActivate(verse)"
              >
                <div
                  class="bp-insert__verse-main"
                  :class="{ 'is-selected': isVerseSelected(verse.id) }"
                >
                  <div class="bp-insert__verse-text">
                    <span class="bp-insert__verse-ref">{{ verseReference(verse) }}</span>
                    <span v-if="tab === 'search'" v-html="highlightKeyword(verse.content ?? '', keyword)"></span>
                    <span v-else>{{ verse.content }}</span>
                  </div>
                </div>
                <button v-if="tab === 'search'" class="bp-copy-mini" type="button" @click.stop="jumpToVerse(verse)">
                  跳转
                </button>
                <button v-else class="bp-copy-mini" type="button" @click.stop="copyVerse(verse)">
                  {{ copiedVerseId === verse.id ? '已复制' : '复制' }}
                </button>
              </div>
            </div>

            <div v-if="totalPages > 1" class="bp-pagination">
              <div class="bp-pagination__row">
                <button class="bp-pagination__nav" type="button" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">
                  上一页
                </button>
                <div class="bp-pagination__pages">
                  <template v-for="(item, index) in paginationItems" :key="`insert-page-${index}`">
                    <button
                      v-if="typeof item === 'number'"
                      class="bp-pagination__button"
                      :class="{ 'is-active': item === currentPage }"
                      type="button"
                      @click="goToPage(item)"
                    >
                      {{ item }}
                    </button>
                    <button v-else class="bp-pagination__ellipsis" type="button" @click="toggleJumpInput">...</button>
                  </template>
                </div>
                <button class="bp-pagination__nav" type="button" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">
                  下一页
                </button>
              </div>

              <div v-if="showJumpInput" class="bp-pagination__jump">
                <span>跳转到</span>
                <input v-model="jumpPageInput" type="number" min="1" :max="totalPages" @keyup.enter="submitJumpPage">
                <span>页</span>
                <button class="bp-button bp-button--light" type="button" @click="submitJumpPage">确定</button>
              </div>
            </div>
          </template>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import type { Editor } from '@tiptap/core'
import { loadBibleData, searchVerses, type Verse } from '../api/bibleData'
import {
  formatVerseSelectionCardHtml,
  highlightKeyword,
  isNewCovenantLabel,
  sortVersesByBibleOrder,
} from '../api/bibleOrder'
import { BIBLE_INSERT_OPEN_EVENT } from '../api/bibleInsertModalStore'
import {
  buildPaginationItems,
  copyText,
  formatBookDisplayName,
  formatVersePageText,
  formatVersePlainText,
  formatVerseReference,
  getCopyShortcutLabel,
  getNextChapterShortcutLabel,
  getPreviousChapterShortcutLabel,
  getResetShortcutLabel,
  isCopyShortcut,
  isEditableKeyboardTarget,
  isNextChapterShortcut,
  isPreviousChapterShortcut,
  isResetShortcut,
  type PaginationItem,
} from '../api/bibleUi'

const PAGE_SIZE = 18
type ChapterNavTarget = { covenant: 'old' | 'new'; book: string; chapter: number }

const visible = ref(false)
const loading = ref(false)
const error = ref('')
const tab = ref<'browse' | 'search'>('browse')
const keyword = ref('')
const verses = ref<Verse[]>([])
const searchResults = ref<Verse[]>([])
const searchFilterCovenant = ref<'all' | 'old' | 'new'>('all')
const searchFilterBook = ref('')
const currentCovenant = ref<'old' | 'new'>('old')
const selectedBook = ref('')
const selectedChapter = ref<number | null>(null)
const browseControlsCollapsed = ref(false)
const currentPage = ref(1)
const showJumpInput = ref(false)
const jumpPageInput = ref('')
const selectedMap = ref<Map<string, Verse>>(new Map())
const focusedVerseId = ref('')
const editorRef = ref<Editor | null>(null)
const contentSectionRef = ref<HTMLElement | null>(null)
const verseTopRef = ref<HTMLElement | null>(null)
const copyButtonLabel = ref('复制本页')
const copiedVerseId = ref('')
const copyShortcutLabel = getCopyShortcutLabel()
const previousChapterShortcutLabel = getPreviousChapterShortcutLabel()
const nextChapterShortcutLabel = getNextChapterShortcutLabel()
const resetShortcutLabel = getResetShortcutLabel()
const selectedCopyDefaultLabel = `复制已选（${copyShortcutLabel}）`
const selectedCopyLabel = ref(selectedCopyDefaultLabel)
let focusVerseTimer = 0

const activeBooks = computed(() => booksFor(currentCovenant.value))
const activeChapters = computed(() => chaptersFor(currentCovenant.value, selectedBook.value))
const browseBookSequence = computed(() =>
  [
    ...booksFor('old').map((book) => ({ covenant: 'old' as const, book, chapters: chaptersFor('old', book) })),
    ...booksFor('new').map((book) => ({ covenant: 'new' as const, book, chapters: chaptersFor('new', book) })),
  ].filter((item) => item.chapters.length)
)
const searchBooks = computed(() => {
  const items = searchFilterCovenant.value === 'all'
    ? searchResults.value
    : searchResults.value.filter((verse) =>
      searchFilterCovenant.value === 'new'
        ? isNewCovenantLabel(verse.covenantName)
        : !isNewCovenantLabel(verse.covenantName))

  return sortVersesByBibleOrder(items)
    .map((verse) => verse.bookName)
    .filter((book, index, list) => book && list.indexOf(book) === index)
})
const filteredVerses = computed(() => {
  const items = tab.value === 'search'
    ? searchResults.value
      .filter((verse) => (
        searchFilterCovenant.value === 'all'
        || (searchFilterCovenant.value === 'new'
          ? isNewCovenantLabel(verse.covenantName)
          : !isNewCovenantLabel(verse.covenantName))
      ))
      .filter((verse) => !searchFilterBook.value || verse.bookName === searchFilterBook.value)
    : verses.value.filter((verse) => verse.bookName === selectedBook.value && verse.chapterNumber === selectedChapter.value)

  return sortVersesByBibleOrder(items)
})
const totalPages = computed(() => Math.max(1, Math.ceil(filteredVerses.value.length / PAGE_SIZE)))
const pagedVerses = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return filteredVerses.value.slice(start, start + PAGE_SIZE)
})
const paginationItems = computed<PaginationItem[]>(() => buildPaginationItems(currentPage.value, totalPages.value))
const selectedVerses = computed(() => sortVersesByBibleOrder(Array.from(selectedMap.value.values())))
const previousChapterTarget = computed<ChapterNavTarget | null>(() => resolveAdjacentChapterTarget(-1))
const nextChapterTarget = computed<ChapterNavTarget | null>(() => resolveAdjacentChapterTarget(1))
const pageSummary = computed(() =>
  totalPages.value > 1
    ? `共 ${filteredVerses.value.length} 节 · 第 ${currentPage.value}/${totalPages.value} 页`
    : `共 ${filteredVerses.value.length} 节`
)
const panelTitle = computed(() => {
  if (tab.value === 'search') {
    return keyword.value ? `搜索结果：${keyword.value}` : '搜索结果'
  }
  if (selectedBook.value && selectedChapter.value != null) {
    return `${selectedBook.value} 第 ${selectedChapter.value} 章`
  }
  if (selectedBook.value) {
    return `${selectedBook.value} · 请选择章节`
  }
  return '按卷章浏览'
})
const panelDescription = computed(() => {
  if (tab.value === 'search') {
    return filteredVerses.value.length ? `当前结果可继续按旧约 / 新约和卷名筛选，右侧“跳转”可打开对应章节。` : '输入关键词后即可分页查看搜索结果。'
  }
  if (!selectedBook.value) {
    return '请选择要浏览的卷名。'
  }
  if (selectedChapter.value == null) {
    return '当前卷暂无可显示的章节。'
  }
  return `支持点击多选、左右翻页、上下滚动、逐节复制、复制本页和插入，并可用 ${previousChapterShortcutLabel} / ${nextChapterShortcutLabel} 快捷切换章节。`
})

function booksFor(covenant: 'old' | 'new'): string[] {
  const bookMap = new Map<string, number>()
  verses.value.forEach((verse) => {
    const isNew = isNewCovenantLabel(verse.covenantName)
    if ((covenant === 'new') !== isNew) return
    if (!verse.bookName) return
    const bookNumber = verse.bookNumber ?? 999
    const current = bookMap.get(verse.bookName)
    if (current == null || bookNumber < current) {
      bookMap.set(verse.bookName, bookNumber)
    }
  })

  return [...bookMap.entries()]
    .sort((left, right) => {
      if (left[1] !== right[1]) return left[1] - right[1]
      return left[0].localeCompare(right[0], 'zh-CN')
    })
    .map(([book]) => book)
}

function chaptersFor(covenant: 'old' | 'new', book: string): number[] {
  if (!book) return []
  const set = new Set<number>()
  verses.value.forEach((verse) => {
    if (verse.bookName !== book) return
    if (covenant === 'new' && !isNewCovenantLabel(verse.covenantName)) return
    if (covenant === 'old' && isNewCovenantLabel(verse.covenantName)) return
    if (verse.chapterNumber) set.add(verse.chapterNumber)
  })
  return [...set].sort((left, right) => left - right)
}

function ensureBrowseSelection() {
  if (!booksFor(currentCovenant.value).length && booksFor('new').length) {
    currentCovenant.value = 'new'
  }

  const books = booksFor(currentCovenant.value)
  if (!books.length) {
    selectedBook.value = ''
    selectedChapter.value = null
    return
  }

  if (!books.includes(selectedBook.value)) {
    selectedBook.value = books[0]
  }

  const chapters = chaptersFor(currentCovenant.value, selectedBook.value)
  if (!chapters.length) {
    selectedChapter.value = null
    return
  }

  if (selectedChapter.value == null || !chapters.includes(selectedChapter.value)) {
    selectedChapter.value = chapters[0]
  }
}

function normalizeSearchFilters() {
  if (!searchBooks.value.includes(searchFilterBook.value)) {
    searchFilterBook.value = ''
  }
}

function resolveAdjacentChapterTarget(direction: -1 | 1): ChapterNavTarget | null {
  if (tab.value !== 'browse' || !selectedBook.value || selectedChapter.value == null) {
    return null
  }

  const sequence = browseBookSequence.value
  const bookIndex = sequence.findIndex(
    (item) => item.book === selectedBook.value && item.covenant === currentCovenant.value
  )
  if (bookIndex < 0) {
    return null
  }

  const chapters = sequence[bookIndex].chapters
  const chapterIndex = chapters.indexOf(selectedChapter.value)
  if (chapterIndex < 0) {
    return null
  }

  if (direction < 0) {
    if (chapterIndex > 0) {
      return {
        covenant: sequence[bookIndex].covenant,
        book: sequence[bookIndex].book,
        chapter: chapters[chapterIndex - 1],
      }
    }
    for (let index = bookIndex - 1; index >= 0; index -= 1) {
      const previous = sequence[index]
      if (previous.chapters.length) {
        return {
          covenant: previous.covenant,
          book: previous.book,
          chapter: previous.chapters[previous.chapters.length - 1],
        }
      }
    }
    return null
  }

  if (chapterIndex < chapters.length - 1) {
    return {
      covenant: sequence[bookIndex].covenant,
      book: sequence[bookIndex].book,
      chapter: chapters[chapterIndex + 1],
    }
  }
  for (let index = bookIndex + 1; index < sequence.length; index += 1) {
    const next = sequence[index]
    if (next.chapters.length) {
      return {
        covenant: next.covenant,
        book: next.book,
        chapter: next.chapters[0],
      }
    }
  }
  return null
}

function resetPagination() {
  currentPage.value = 1
  showJumpInput.value = false
  jumpPageInput.value = ''
}

function bookLabel(book: string): string {
  return formatBookDisplayName(book)
}

function scrollVerseTop() {
  nextTick(() => {
    verseTopRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function scrollContentBy(offset: number) {
  contentSectionRef.value?.scrollBy({ top: offset, behavior: 'smooth' })
}

function switchTab(next: 'browse' | 'search') {
  tab.value = next
  browseControlsCollapsed.value = false
  resetPagination()
}

function switchCovenant(next: 'old' | 'new') {
  currentCovenant.value = next
  selectedBook.value = booksFor(next)[0] ?? ''
  selectedChapter.value = chaptersFor(next, selectedBook.value)[0] ?? null
  browseControlsCollapsed.value = false
  resetPagination()
}

function toggleBrowseControls() {
  browseControlsCollapsed.value = !browseControlsCollapsed.value
}

function selectBook(book: string) {
  selectedBook.value = book
  selectedChapter.value = chaptersFor(currentCovenant.value, book)[0] ?? null
  browseControlsCollapsed.value = false
  resetPagination()
}

function selectChapter(chapter: number) {
  selectedChapter.value = chapter
  browseControlsCollapsed.value = true
  resetPagination()
}

function goToChapterTarget(target: ChapterNavTarget | null) {
  if (!target) return
  tab.value = 'browse'
  currentCovenant.value = target.covenant
  selectedBook.value = target.book
  selectedChapter.value = target.chapter
  browseControlsCollapsed.value = true
  resetPagination()
  scrollVerseTop()
}

function goToPreviousChapter() {
  goToChapterTarget(previousChapterTarget.value)
}

function goToNextChapter() {
  goToChapterTarget(nextChapterTarget.value)
}

function runSearch() {
  const value = keyword.value.trim()
  if (!value) {
    searchResults.value = []
    switchTab('browse')
    return
  }
  searchResults.value = searchVerses(verses.value, value)
  searchFilterCovenant.value = 'all'
  searchFilterBook.value = ''
  switchTab('search')
}

function setSearchFilterCovenant(next: 'all' | 'old' | 'new') {
  searchFilterCovenant.value = next
  normalizeSearchFilters()
  resetPagination()
}

function setSearchFilterBook(book: string) {
  searchFilterBook.value = book
  normalizeSearchFilters()
  resetPagination()
}

function jumpToVerse(verse: Verse) {
  tab.value = 'browse'
  currentCovenant.value = isNewCovenantLabel(verse.covenantName) ? 'new' : 'old'
  selectedBook.value = verse.bookName
  selectedChapter.value = verse.chapterNumber
  browseControlsCollapsed.value = true
  const chapterVerses = sortVersesByBibleOrder(
    verses.value.filter((item) => item.bookName === verse.bookName && item.chapterNumber === verse.chapterNumber)
  )
  const targetIndex = chapterVerses.findIndex((item) => item.id === verse.id)
  currentPage.value = targetIndex >= 0 ? Math.floor(targetIndex / PAGE_SIZE) + 1 : 1
  showJumpInput.value = false
  jumpPageInput.value = ''
  ensureSelectedVerse(verse)
  focusVerse(verse.id)
}

function goToPage(page: number) {
  const nextPage = Math.min(Math.max(page, 1), totalPages.value)
  currentPage.value = nextPage
  showJumpInput.value = false
  scrollVerseTop()
}

function toggleJumpInput() {
  showJumpInput.value = !showJumpInput.value
  jumpPageInput.value = showJumpInput.value ? String(currentPage.value) : ''
}

function submitJumpPage() {
  const nextPage = Number(jumpPageInput.value)
  if (!Number.isFinite(nextPage)) return
  goToPage(nextPage)
}

function isVerseSelected(id: string): boolean {
  return selectedMap.value.has(id)
}

function ensureSelectedVerse(verse: Verse) {
  const next = new Map(selectedMap.value)
  next.set(verse.id, verse)
  selectedMap.value = next
}

function escapeSelector(value: string): string {
  if (typeof window !== 'undefined' && window.CSS && typeof window.CSS.escape === 'function') {
    return window.CSS.escape(value)
  }
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function focusVerse(verseId: string) {
  focusedVerseId.value = verseId
  nextTick(() => {
    const target = contentSectionRef.value?.querySelector(`[data-verse-id="${escapeSelector(verseId)}"]`) as HTMLElement | null
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
  if (focusVerseTimer) {
    window.clearTimeout(focusVerseTimer)
  }
  focusVerseTimer = window.setTimeout(() => {
    if (focusedVerseId.value === verseId) {
      focusedVerseId.value = ''
    }
  }, 2400)
}

function toggleSelect(verse: Verse) {
  const next = new Map(selectedMap.value)
  if (next.has(verse.id)) next.delete(verse.id)
  else next.set(verse.id, verse)
  selectedMap.value = next
}

function handleVerseActivate(verse: Verse) {
  toggleSelect(verse)
}

function removeSelected(id: string) {
  const next = new Map(selectedMap.value)
  next.delete(id)
  selectedMap.value = next
}

function resetSelection() {
  selectedMap.value = new Map()
  selectedCopyLabel.value = selectedCopyDefaultLabel
}

function verseReference(verse: Verse): string {
  return formatVerseReference(verse)
}

async function copyCurrentPage() {
  const ok = await copyText(formatVersePageText(pagedVerses.value))
  copyButtonLabel.value = ok ? '已复制' : '复制失败'
  window.setTimeout(() => {
    copyButtonLabel.value = '复制本页'
  }, 1600)
}

async function copySelectedVerses() {
  const ok = await copyText(formatVersePageText(selectedVerses.value))
  selectedCopyLabel.value = ok ? '已复制' : '复制失败'
  window.setTimeout(() => {
    selectedCopyLabel.value = selectedCopyDefaultLabel
  }, 1600)
}

async function copyVerse(verse: Verse) {
  const ok = await copyText(formatVersePlainText(verse))
  copiedVerseId.value = ok ? verse.id : ''
  window.setTimeout(() => {
    if (copiedVerseId.value === verse.id) {
      copiedVerseId.value = ''
    }
  }, 1600)
}

function confirm() {
  if (!editorRef.value || selectedVerses.value.length === 0) return
  const html = formatVerseSelectionCardHtml(selectedVerses.value)
  editorRef.value.chain().focus().insertContent(html).run()
  closeModal()
}

function resetState() {
  tab.value = 'browse'
  keyword.value = ''
  searchResults.value = []
  searchFilterCovenant.value = 'all'
  searchFilterBook.value = ''
  selectedMap.value = new Map()
  focusedVerseId.value = ''
  browseControlsCollapsed.value = false
  copyButtonLabel.value = '复制本页'
  selectedCopyLabel.value = selectedCopyDefaultLabel
  copiedVerseId.value = ''
  resetPagination()
}

function closeModal() {
  visible.value = false
  browseControlsCollapsed.value = false
  showJumpInput.value = false
  focusedVerseId.value = ''
}

async function ensureData() {
  if (verses.value.length) {
    ensureBrowseSelection()
    return
  }

  loading.value = true
  error.value = ''
  try {
    const result = await loadBibleData()
    verses.value = result.verses
    ensureBrowseSelection()
    normalizeSearchFilters()
  } catch (reason: unknown) {
    error.value = reason instanceof Error ? reason.message : '经文加载失败'
  } finally {
    loading.value = false
  }
}

function handleOpen(event: Event) {
  const customEvent = event as CustomEvent<{ editor: Editor }>
  editorRef.value = customEvent.detail?.editor ?? null
  visible.value = true
  resetState()
  ensureData()
}

function handleKeydown(event: KeyboardEvent) {
  if (!visible.value || isEditableKeyboardTarget(event.target)) {
    return
  }
  if (event.key === 'Escape') {
    closeModal()
    return
  }
  if (selectedVerses.value.length && isCopyShortcut(event)) {
    event.preventDefault()
    void copySelectedVerses()
    return
  }
  if (selectedVerses.value.length && isResetShortcut(event)) {
    event.preventDefault()
    resetSelection()
    return
  }
  if (isPreviousChapterShortcut(event) && previousChapterTarget.value) {
    event.preventDefault()
    goToPreviousChapter()
    return
  }
  if (isNextChapterShortcut(event) && nextChapterTarget.value) {
    event.preventDefault()
    goToNextChapter()
    return
  }
  if (event.key === 'ArrowLeft') {
    if (currentPage.value > 1) {
      event.preventDefault()
      goToPage(currentPage.value - 1)
    }
    return
  }
  if (event.key === 'ArrowRight') {
    if (currentPage.value < totalPages.value) {
      event.preventDefault()
      goToPage(currentPage.value + 1)
    }
    return
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    scrollContentBy(-140)
    return
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    scrollContentBy(140)
  }
}

onMounted(() => {
  window.addEventListener(BIBLE_INSERT_OPEN_EVENT, handleOpen)
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener(BIBLE_INSERT_OPEN_EVENT, handleOpen)
  window.removeEventListener('keydown', handleKeydown)
  if (focusVerseTimer) {
    window.clearTimeout(focusVerseTimer)
  }
})

watch(
  () => filteredVerses.value.length,
  () => {
    if (currentPage.value > totalPages.value) {
      currentPage.value = totalPages.value
    }
    if (!filteredVerses.value.length) {
      currentPage.value = 1
    }
  }
)
</script>

<style scoped>
.bp-insert-mask {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.58);
  backdrop-filter: blur(6px);
}

.bp-insert-panel {
  width: min(1120px, 100%);
  max-height: 82vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 28px;
  background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
  box-shadow: 0 28px 80px rgba(15, 23, 42, 0.24);
}

.bp-insert__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  padding: 24px 26px 20px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
}

.bp-insert__eyebrow {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #64748b;
}

.bp-insert__header h3 {
  margin: 8px 0 0;
  font-size: 30px;
}

.bp-insert__header p:last-child {
  margin: 10px 0 0;
  color: #64748b;
  font-size: 14px;
  line-height: 1.8;
}

.bp-insert__body {
  display: grid;
  grid-template-columns: 340px minmax(0, 1fr);
  min-height: 0;
  flex: 1;
}

.bp-insert__sidebar {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 20px;
  background: linear-gradient(180deg, #f8fbff 0%, #f6f8fc 100%);
  border-right: 1px solid rgba(226, 232, 240, 0.9);
  overflow: auto;
}

.bp-insert__sidebar > .bp-segment {
  align-self: flex-start;
}

.bp-insert__content {
  padding: 20px 22px;
  overflow: auto;
}

.bp-segment {
  display: inline-flex;
  gap: 8px;
  padding: 6px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.05);
}

.bp-segment--filters {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  width: 100%;
}

.bp-segment--secondary {
  width: fit-content;
}

.bp-segment--secondary.bp-segment--filters {
  width: 100%;
}

.bp-segment__item,
.bp-pill,
.bp-button,
.bp-selected-pill,
.bp-pagination__button,
.bp-pagination__nav,
.bp-pagination__ellipsis,
.bp-chapter-toggle {
  cursor: pointer;
}

.bp-segment__item {
  min-width: 78px;
  border: none;
  border-radius: 999px;
  background: transparent;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 700;
  color: #475569;
}

.bp-segment--filters .bp-segment__item {
  min-width: 0;
  width: 100%;
  padding: 10px 10px;
}

.bp-segment__item.is-selected {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  color: #fff;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.16);
}

.bp-insert__sidebar-block {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.bp-insert__browse-head {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 14px;
}

.bp-browse-toggle {
  border: none;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.05);
  padding: 10px 14px;
  color: #334155;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75);
}

.bp-insert__group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bp-insert__group-title {
  font-size: 13px;
  font-weight: 700;
  color: #475569;
}

.bp-pill-wrap {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
  gap: 10px;
}

.bp-pill-wrap--chapter-dropdown {
  max-height: 220px;
  overflow: auto;
}

.bp-browse-summary {
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(248, 250, 252, 0.95);
  color: #64748b;
  font-size: 13px;
  line-height: 1.8;
}

.bp-pill {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 14px;
  background: #fff;
  padding: 10px 14px;
  width: 100%;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  text-align: center;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
}

.bp-pill:hover {
  transform: translateY(-1px);
  border-color: rgba(59, 130, 246, 0.32);
}

.bp-pill.is-selected {
  border-color: rgba(15, 23, 42, 0.48);
  background: linear-gradient(180deg, #0f172a 0%, #172554 100%);
  color: #fff;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.14);
}

.bp-pill--chapter {
  min-width: 52px;
}

.bp-chapter-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 16px;
  background: #fff;
  padding: 12px 14px;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.bp-search-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bp-search-field span {
  font-size: 13px;
  font-weight: 700;
  color: #475569;
}

.bp-search-field input,
.bp-pagination__jump input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 18px;
  background: #fff;
  padding: 12px 14px;
  font-size: 14px;
  color: #0f172a;
}

.bp-insert__selection {
  padding-top: 4px;
  border-top: 1px solid rgba(226, 232, 240, 0.9);
}

.bp-insert__selection-head,
.bp-insert__content-head,
.bp-pagination__row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
}

.bp-insert__selection-head strong {
  font-size: 15px;
}

.bp-insert__selection-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.bp-insert__selection-tip {
  color: #64748b;
  font-size: 12px;
  line-height: 1.7;
  word-break: break-word;
}

.bp-insert__selection-actions,
.bp-insert__content-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.bp-insert__selection-head {
  flex-direction: column;
  align-items: stretch;
}

.bp-insert__selection-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  width: 100%;
}

.bp-insert__selection-actions .bp-button {
  width: 100%;
}

.bp-insert__selected-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.bp-selected-pill {
  border: 1px solid rgba(15, 23, 42, 0.14);
  border-radius: 999px;
  background: #fff;
  padding: 9px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.bp-insert__content-head {
  margin-bottom: 16px;
}

.bp-insert__content-title {
  min-width: 0;
}

.bp-insert__content-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.bp-insert__content-head h4 {
  margin: 0;
  font-size: 24px;
}

.bp-insert__content-head p {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 14px;
  line-height: 1.75;
}

.bp-insert__chapter-nav {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.bp-count {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.08);
  color: #1d4ed8;
  font-size: 13px;
  font-weight: 700;
}

.bp-insert__verse-list {
  display: flex;
  flex-direction: column;
  margin-top: 6px;
  border-top: 1px solid rgba(226, 232, 240, 0.9);
}

.bp-insert__verse-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  border: none;
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
  background: transparent;
  padding: 14px 0 14px 12px;
  border-left: 3px solid transparent;
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease;
}

.bp-insert__verse-row:last-child {
  border-bottom: none;
}

.bp-insert__verse-row.is-selected {
  border-bottom-color: rgba(37, 99, 235, 0.24);
  border-left-color: #1d4ed8;
}

.bp-insert__verse-row.is-selected {
  background: linear-gradient(90deg, rgba(37, 99, 235, 0.08) 0%, rgba(37, 99, 235, 0.02) 38%, transparent 100%);
}

.bp-insert__verse-row.is-focused {
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.18);
}

.bp-insert__verse-row:focus-visible {
  outline: none;
  border-radius: 14px;
  box-shadow: inset 0 0 0 2px rgba(37, 99, 235, 0.18);
}

.bp-insert__verse-main {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  flex: 1;
  min-width: 0;
  cursor: inherit;
  outline: none;
  padding: 2px 0;
}

.bp-insert__verse-text {
  color: #0f172a;
  font-size: 15px;
  line-height: 1.9;
}

.bp-insert__verse-ref {
  margin-right: 6px;
  color: #ff5c45;
  font-weight: 700;
}

.bp-copy-mini {
  flex-shrink: 0;
  align-self: flex-start;
  min-width: 60px;
  min-height: 36px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 999px;
  background: rgba(248, 250, 252, 0.96);
  cursor: pointer;
  padding: 0 14px;
  color: #475569;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.bp-pagination {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid rgba(226, 232, 240, 0.9);
}

.bp-pagination__pages {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.bp-pagination__button,
.bp-pagination__nav,
.bp-pagination__ellipsis {
  min-width: 40px;
  height: 40px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 14px;
  background: #fff;
  padding: 0 12px;
  color: #334155;
  font-size: 14px;
  font-weight: 700;
}

.bp-pagination__button.is-active {
  border-color: rgba(15, 23, 42, 0.5);
  background: linear-gradient(180deg, #0f172a 0%, #172554 100%);
  color: #fff;
}

.bp-pagination__jump {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  color: #64748b;
  font-size: 13px;
}

.bp-state-box {
  padding: 18px;
  border-radius: 18px;
  background: rgba(248, 250, 252, 0.95);
  color: #64748b;
  font-size: 14px;
  line-height: 1.75;
}


.bp-state-box.is-error {
  background: rgba(239, 68, 68, 0.08);
  color: #b91c1c;
}

.bp-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  border: none;
  border-radius: 16px;
  padding: 0 18px;
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  writing-mode: horizontal-tb;
}

.bp-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.bp-button--full {
  width: 100%;
}

.bp-button--compact {
  min-height: 38px;
  padding: 0 14px;
  border-radius: 14px;
  font-size: 13px;
}

.bp-button--primary {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  color: #fff;
  box-shadow: 0 16px 30px rgba(15, 23, 42, 0.18);
}

.bp-button--ghost {
  background: #fff;
  color: #0f172a;
  border: 1px solid rgba(148, 163, 184, 0.22);
}

.bp-button--light {
  background: rgba(15, 23, 42, 0.05);
  color: #334155;
}

:deep(.bible-keyword-highlight) {
  border-radius: 6px;
  background: rgba(250, 204, 21, 0.32);
  padding: 0 3px;
}

@media (max-width: 960px) {
  .bp-insert__body {
    grid-template-columns: 1fr;
  }

  .bp-insert__sidebar {
    border-right: none;
    border-bottom: 1px solid rgba(226, 232, 240, 0.9);
  }

  .bp-insert__header,
  .bp-insert__selection-head,
  .bp-insert__content-head,
  .bp-pagination__row {
    flex-direction: column;
    align-items: stretch;
  }

  .bp-insert__chapter-nav {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .bp-insert-mask {
    padding: 12px;
  }

  .bp-insert__header,
  .bp-insert__sidebar,
  .bp-insert__content {
    padding: 16px;
  }

  .bp-insert__selection-actions,
  .bp-insert__content-actions,
  .bp-pagination__jump {
    align-items: stretch;
  }
}
</style>
