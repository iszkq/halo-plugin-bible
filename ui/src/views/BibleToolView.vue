<template>
  <div class="bp-tool">
    <section class="bp-tool__hero bp-surface">
      <div class="bp-tool__hero-copy">
        <p class="bp-tool__eyebrow">后台工具</p>
        <h1>圣经</h1>
        <p>
          顶部支持多关键词模糊搜索；下方保留旧约 / 新约 → 卷名 → 章名浏览。经文编辑统一从右上角“编辑经文”进入。
        </p>
      </div>

      <div class="bp-tool__hero-actions">
        <div class="bp-tool__search">
          <input
            v-model="keyword"
            type="text"
            placeholder="搜索经文，例如：约瑟 法老"
            @keyup.enter="runSearch"
          >
          <button class="bp-button bp-button--primary" type="button" @click="runSearch">搜索</button>
        </div>

        <div class="bp-tool__hero-buttons">
          <a class="bp-button bp-button--light bp-button--link" :href="publicPageUrl" target="_blank" rel="noreferrer">
            前台圣经页
          </a>
          <button class="bp-button bp-button--ghost" type="button" @click="openEditor">
            编辑经文
          </button>
        </div>
      </div>
    </section>

    <div v-if="error" class="bp-alert is-error">
      {{ error }}
    </div>

    <section class="bp-card bp-tool__selector">
      <div class="bp-tool__selector-head">
        <div class="bp-segment">
          <button
            class="bp-segment__item"
            :class="{ 'is-selected': currentCovenant === 'old' }"
            type="button"
            @click="selectCovenant('old')"
          >
            旧约
          </button>
          <button
            class="bp-segment__item"
            :class="{ 'is-selected': currentCovenant === 'new' }"
            type="button"
            @click="selectCovenant('new')"
          >
            新约
          </button>
        </div>

        <div class="bp-tool__selector-actions">
          <span>{{ showSearchResults ? '当前为搜索结果' : '当前为按卷章节浏览' }}</span>
          <button
            v-if="selectedBook && !showSearchResults"
            class="bp-button bp-button--light"
            type="button"
            @click="toggleBrowseControls"
          >
            {{ browseControlsCollapsed ? '展开卷章' : '收起卷章' }}
          </button>
          <button
            v-if="showSearchResults"
            class="bp-button bp-button--light"
            type="button"
            @click="clearSearch"
          >
            返回卷章浏览
          </button>
        </div>
      </div>

      <template v-if="showSearchResults">
        <div class="bp-tool__group">
          <div class="bp-tool__group-title">搜索筛选</div>
          <div class="bp-segment bp-segment--filters">
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

        <div class="bp-tool__group">
          <div class="bp-tool__group-title">卷名筛选</div>
          <div class="bp-pill-wrap bp-pill-wrap--dropdown">
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
              :key="`search-book-${book}`"
              class="bp-pill"
              :class="{ 'is-selected': searchFilterBook === book }"
              type="button"
              @click="setSearchFilterBook(book)"
            >
              {{ bookLabel(book) }}
            </button>
          </div>
        </div>
      </template>
      <template v-else-if="!browseControlsCollapsed || selectedChapter == null">
        <div class="bp-tool__group">
          <div class="bp-tool__group-title">卷名</div>
          <div class="bp-pill-wrap bp-pill-wrap--dropdown">
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

        <div class="bp-tool__group">
          <div class="bp-tool__group-title">章节</div>
          <div class="bp-pill-wrap bp-pill-wrap--dropdown">
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
      <div v-else class="bp-tool__browse-summary">
        已选 {{ bookLabel(selectedBook) }} 第 {{ selectedChapter }} 章，点击“展开卷章”可重新选择。
      </div>
    </section>

    <section class="bp-card bp-tool__selection">
      <div class="bp-tool__selection-head">
        <div class="bp-tool__selection-meta">
          <strong>已选 {{ selectedVerses.length }} 节</strong>
          <span class="bp-tool__selection-tip">点击经文即可多选，支持跨卷跨章，按 {{ copyShortcutLabel }} 复制，按 {{ resetShortcutLabel }} 重置已选。</span>
        </div>
        <div class="bp-tool__selection-actions">
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

      <div v-if="selectedVerses.length" class="bp-tool__selected-list">
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
        可跨不同卷、不同章节累计勾选经文，再一次性复制。
      </div>
    </section>

    <section ref="contentSectionRef" class="bp-card bp-tool__content">
      <div class="bp-tool__content-head">
        <div class="bp-tool__content-title">
          <div class="bp-tool__content-title-row">
            <h2>{{ contentTitle }}</h2>
            <div v-if="!showSearchResults && selectedBook && selectedChapter != null" class="bp-tool__chapter-nav">
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
          <p>{{ contentDescription }}</p>
        </div>
        <div class="bp-tool__content-actions">
          <span class="bp-count">{{ pageSummary }}</span>
          <button class="bp-button bp-button--light" type="button" :disabled="!pagedVerses.length" @click="copyCurrentPage">
            {{ copyButtonLabel }}
          </button>
        </div>
      </div>

      <div v-if="loading" class="bp-state-box">正在加载经文数据...</div>
      <div v-else-if="!filteredVerses.length" class="bp-state-box">
        {{ showSearchResults ? '没有找到同时包含这些关键词的经文。' : '请选择卷名和章节查看内容。' }}
      </div>

      <template v-else>
        <div ref="verseTopRef"></div>
        <div class="bp-verse-list">
          <div
            v-for="verse in pagedVerses"
            :key="verse.id"
            class="bp-verse-line"
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
              class="bp-verse-main"
              :class="{ 'is-selected': isVerseSelected(verse.id) }"
            >
              <span class="bp-verse-text-wrap">
                <span class="bp-verse-ref">{{ verseReference(verse) }}</span>
                <span
                  v-if="showSearchResults"
                  class="bp-verse-text"
                  v-html="highlightKeyword(verse.content ?? '', searchKeyword)"
                ></span>
                <span v-else class="bp-verse-text">{{ verse.content }}</span>
              </span>
            </div>
            <button v-if="showSearchResults" class="bp-copy-mini" type="button" @click.stop="jumpToVerse(verse)">
              跳转
            </button>
            <button v-else class="bp-copy-mini" type="button" @click.stop="copyVerse(verse)">
              {{ copiedVerseId === verse.id ? '已复制' : '复制' }}
            </button>
          </div>
        </div>

        <div v-if="totalPages > 1" class="bp-pagination">
          <div class="bp-pagination__row">
            <button
              class="bp-pagination__nav"
              type="button"
              :disabled="currentPage <= 1"
              @click="goToPage(currentPage - 1)"
            >
              上一页
            </button>

            <div class="bp-pagination__pages">
              <template v-for="(item, index) in paginationItems" :key="`page-${index}`">
                <button
                  v-if="typeof item === 'number'"
                  class="bp-pagination__button"
                  :class="{ 'is-active': item === currentPage }"
                  type="button"
                  @click="goToPage(item)"
                >
                  {{ item }}
                </button>
                <button
                  v-else
                  class="bp-pagination__ellipsis"
                  type="button"
                  @click="toggleJumpInput"
                >
                  ...
                </button>
              </template>
            </div>

            <button
              class="bp-pagination__nav"
              type="button"
              :disabled="currentPage >= totalPages"
              @click="goToPage(currentPage + 1)"
            >
              下一页
            </button>
          </div>

          <div v-if="showJumpInput" class="bp-pagination__jump">
            <span>跳转到</span>
            <input
              v-model="jumpPageInput"
              type="number"
              min="1"
              :max="totalPages"
              @keyup.enter="submitJumpPage"
            >
            <span>页</span>
            <button class="bp-button bp-button--light" type="button" @click="submitJumpPage">确定</button>
          </div>
        </div>
      </template>
    </section>

    <div v-if="editorVisible" class="bp-editor-mask" @click.self="closeEditor">
      <div class="bp-editor">
        <div class="bp-editor__header">
          <div>
            <p class="bp-editor__eyebrow">经文编辑器</p>
            <h3>经文编辑</h3>
            <p>在这里按卷 → 章 → 节选择并编辑，不再在每节经文旁边显示编辑入口。</p>
          </div>
          <button class="bp-button bp-button--ghost" type="button" @click="closeEditor">关闭</button>
        </div>

        <div class="bp-editor__selectors">
          <div class="bp-segment">
            <button
              class="bp-segment__item"
              :class="{ 'is-selected': editCovenant === 'old' }"
              type="button"
              @click="switchEditCovenant('old')"
            >
              旧约
            </button>
            <button
              class="bp-segment__item"
              :class="{ 'is-selected': editCovenant === 'new' }"
              type="button"
              @click="switchEditCovenant('new')"
            >
              新约
            </button>
          </div>

          <label class="bp-editor__select-field">
            <span>卷名</span>
            <select v-model="editBook" @change="handleEditBookChange">
              <option v-for="book in editBooks" :key="book" :value="book">{{ book }}</option>
            </select>
          </label>

          <label class="bp-editor__select-field">
            <span>章数</span>
            <select v-model.number="editChapter" @change="handleEditChapterChange">
              <option v-for="chapter in editChapters" :key="chapter" :value="chapter">{{ chapter }}</option>
            </select>
          </label>
        </div>

        <div class="bp-editor__layout">
          <aside class="bp-editor__sidebar">
            <div class="bp-editor__sidebar-head">
              <strong>{{ editBook || '当前卷' }} 第 {{ editChapter || 1 }} 章</strong>
              <button class="bp-button bp-button--light" type="button" @click="resetEditorForm">
                新建本章经文
              </button>
            </div>

            <div class="bp-editor__verse-picks">
              <button
                v-for="verse in editableVerseList"
                :key="verse.id"
                class="bp-editor__pick"
                :class="{ 'is-selected': selectedEditVerseId === verse.id }"
                type="button"
                @click="pickEditableVerse(verse.id)"
              >
                <span class="bp-editor__pick-ref">第 {{ verse.verseNumber }} 节</span>
                <span class="bp-editor__pick-text">{{ verse.content }}</span>
              </button>

              <div v-if="!editableVerseList.length" class="bp-state-box">
                当前章节还没有可编辑经文记录。
              </div>
            </div>
          </aside>

          <form class="bp-editor__form" @submit.prevent="submitVerse">
            <div class="bp-editor__meta-card">
              <div class="bp-editor__meta-row">
                <span>约别</span>
                <strong>{{ editCovenant === 'new' ? '新约' : '旧约' }}</strong>
              </div>
              <div class="bp-editor__meta-row">
                <span>卷名</span>
                <strong>{{ editBook || '未选择' }}</strong>
              </div>
              <div class="bp-editor__meta-row">
                <span>章节</span>
                <strong>第 {{ editChapter || 1 }} 章</strong>
              </div>
            </div>

            <div class="bp-editor__field-grid">
              <label class="bp-editor__field">
                <span>节数</span>
                <input v-model.number="form.verseNumber" type="number" min="1">
              </label>

              <label class="bp-editor__field">
                <span>卷序</span>
                <input v-model.number="form.bookNumber" type="number" min="1">
              </label>
            </div>

            <label class="bp-editor__field">
              <span>经文内容</span>
              <textarea v-model="form.content"
                rows="12"
                placeholder="请输入经文内容"></textarea>
            </label>

            <div v-if="editorNotice" class="bp-alert" :class="editorNoticeType === 'error' ? 'is-error' : 'is-success'">
              {{ editorNotice }}
            </div>

            <div class="bp-editor__footer">
              <button class="bp-button bp-button--primary" type="submit" :disabled="saving">
                {{ saving ? '保存中...' : form.id ? '保存修改' : '新增经文' }}
              </button>
              <button class="bp-button bp-button--ghost" type="button" :disabled="saving" @click="resetEditorForm">
                重置
              </button>
              <button
                v-if="form.id"
                class="bp-button bp-button--danger"
                type="button"
                :disabled="saving"
                @click="removeVerse"
              >
                删除
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { clearLoadCache, createVerse, deleteVerse, loadBibleData, searchVerses, updateVerse, type Verse } from '../api/bibleData'
import { getOrderedBookNames, highlightKeyword, isNewCovenantLabel, sortVersesByBibleOrder } from '../api/bibleOrder'
import {
  PUBLIC_BIBLE_PAGE_PATH,
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

const PAGE_SIZE = 40
type ChapterNavTarget = { covenant: 'old' | 'new'; book: string; chapter: number }

const verses = ref<Verse[]>([])
const keyword = ref('')
const searchKeyword = ref('')
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const showSearchResults = ref(false)
const searchFilterCovenant = ref<'all' | 'old' | 'new'>('all')
const searchFilterBook = ref('')

const currentCovenant = ref<'old' | 'new'>('old')
const selectedBook = ref('')
const selectedChapter = ref<number | null>(null)
const browseControlsCollapsed = ref(false)

const currentPage = ref(1)
const showJumpInput = ref(false)
const jumpPageInput = ref('')
const copyButtonLabel = ref('复制本页')
const copyShortcutLabel = getCopyShortcutLabel()
const previousChapterShortcutLabel = getPreviousChapterShortcutLabel()
const nextChapterShortcutLabel = getNextChapterShortcutLabel()
const resetShortcutLabel = getResetShortcutLabel()
const selectedCopyDefaultLabel = `复制已选（${copyShortcutLabel}）`
const selectedCopyLabel = ref(selectedCopyDefaultLabel)
const copiedVerseId = ref('')
const focusedVerseId = ref('')
const contentSectionRef = ref<HTMLElement | null>(null)
const verseTopRef = ref<HTMLElement | null>(null)
const selectedMap = ref<Map<string, Verse>>(new Map())
const publicPageUrl = PUBLIC_BIBLE_PAGE_PATH
let focusVerseTimer = 0

const editorVisible = ref(false)
const editorNotice = ref('')
const editorNoticeType = ref<'success' | 'error'>('success')
const editCovenant = ref<'old' | 'new'>('old')
const editBook = ref('')
const editChapter = ref(1)
const selectedEditVerseId = ref('')

const form = reactive<Verse>({
  id: '',
  covenantName: '旧约',
  category: '',
  bookName: '',
  bookNumber: 1,
  chapterNumber: 1,
  verseNumber: 1,
  content: '',
})
const orderedBooks = computed(() => getOrderedBookNames(verses.value))
const activeBooks = computed(() => (currentCovenant.value === 'old' ? orderedBooks.value.old : orderedBooks.value.new))
const activeChapters = computed(() => chaptersFor(currentCovenant.value, selectedBook.value))
const editBooks = computed(() => (editCovenant.value === 'old' ? orderedBooks.value.old : orderedBooks.value.new))
const editChapters = computed(() => {
  const chapters = chaptersFor(editCovenant.value, editBook.value)
  return chapters.length ? chapters : [1]
})
const editableVerseList = computed(() =>
  sortVersesByBibleOrder(
    verses.value.filter((verse) => verse.bookName === editBook.value && verse.chapterNumber === editChapter.value)
  )
)

const baseSearchResults = computed(() =>
  searchKeyword.value.trim() ? searchVerses(verses.value, searchKeyword.value) : []
)
const searchBooks = computed(() => {
  const items = searchFilterCovenant.value === 'all'
    ? baseSearchResults.value
    : baseSearchResults.value.filter((verse) =>
      searchFilterCovenant.value === 'new'
        ? isNewCovenantLabel(verse.covenantName)
        : !isNewCovenantLabel(verse.covenantName))

  return sortVersesByBibleOrder(items)
    .map((verse) => verse.bookName)
    .filter((book, index, list) => book && list.indexOf(book) === index)
})
const filteredVerses = computed(() => {
  const items = showSearchResults.value
    ? baseSearchResults.value
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
const browseBookSequence = computed(() =>
  [
    ...orderedBooks.value.old.map((book) => ({ covenant: 'old' as const, book, chapters: chaptersFor('old', book) })),
    ...orderedBooks.value.new.map((book) => ({ covenant: 'new' as const, book, chapters: chaptersFor('new', book) })),
  ].filter((item) => item.chapters.length)
)
const previousChapterTarget = computed<ChapterNavTarget | null>(() => resolveAdjacentChapterTarget(-1))
const nextChapterTarget = computed<ChapterNavTarget | null>(() => resolveAdjacentChapterTarget(1))
const pageSummary = computed(() =>
  totalPages.value > 1
    ? `共 ${filteredVerses.value.length} 节 · 第 ${currentPage.value}/${totalPages.value} 页`
    : `共 ${filteredVerses.value.length} 节`
)

const contentTitle = computed(() => {
  if (showSearchResults.value) {
    return searchKeyword.value ? `搜索结果：${searchKeyword.value}` : '搜索结果'
  }
  if (!selectedBook.value || selectedChapter.value == null) {
    return '经文内容'
  }
  return `${selectedBook.value} 第 ${selectedChapter.value} 章`
})

const contentDescription = computed(() => {
  if (showSearchResults.value) {
    if (!searchKeyword.value.trim()) {
      return '请输入关键词后再搜索。'
    }
    return `已找到 ${filteredVerses.value.length} 节匹配经文，可继续按旧约 / 新约和卷名筛选，右侧“跳转”可打开对应章节。`
  }
  if (!selectedBook.value || selectedChapter.value == null) {
    return '请选择卷名和章节查看经文。'
  }
  return `当前章节共 ${filteredVerses.value.length} 节，每页显示 ${PAGE_SIZE} 节，支持点击多选、跨章复制、左右翻页，以及 ${previousChapterShortcutLabel} / ${nextChapterShortcutLabel} 快捷切换章节。`
})

function booksFor(covenant: 'old' | 'new'): string[] {
  return covenant === 'old' ? orderedBooks.value.old : orderedBooks.value.new
}

function chaptersFor(covenant: 'old' | 'new', book: string): number[] {
  if (!book) return []
  const chapterSet = new Set<number>()
  verses.value.forEach((verse) => {
    if (verse.bookName !== book) return
    if (covenant === 'new' && !isNewCovenantLabel(verse.covenantName)) return
    if (covenant === 'old' && isNewCovenantLabel(verse.covenantName)) return
    if (verse.chapterNumber) chapterSet.add(verse.chapterNumber)
  })
  return [...chapterSet].sort((left, right) => left - right)
}

function resolveBookMeta(book: string, covenant: 'old' | 'new') {
  const existing = verses.value.find((verse) => verse.bookName === book)
  return {
    bookNumber: existing?.bookNumber ?? 1,
    category: existing?.category ?? '',
    covenantName: existing?.covenantName ?? (covenant === 'new' ? '新约' : '旧约'),
  }
}

function nextVerseNumber(): number {
  const lastVerse = editableVerseList.value[editableVerseList.value.length - 1]
  return Math.max(1, (lastVerse?.verseNumber ?? 0) + 1)
}

function ensureBrowseSelection() {
  if (!booksFor(currentCovenant.value).length && booksFor('new').length) {
    currentCovenant.value = 'new'
  }

  const books = booksFor(currentCovenant.value)
  if (!books.includes(selectedBook.value)) {
    selectedBook.value = books[0] ?? ''
  }

  const chapters = chaptersFor(currentCovenant.value, selectedBook.value)
  if (!chapters.includes(selectedChapter.value ?? -1)) {
    selectedChapter.value = chapters[0] ?? null
  }
}

function normalizeSearchFilters() {
  if (!searchBooks.value.includes(searchFilterBook.value)) {
    searchFilterBook.value = ''
  }
}

function resolveAdjacentChapterTarget(direction: -1 | 1): ChapterNavTarget | null {
  if (showSearchResults.value || !selectedBook.value || selectedChapter.value == null) {
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

function goToChapterTarget(target: ChapterNavTarget | null) {
  if (!target) return
  clearSearch(false)
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

function syncSelectedVerses() {
  if (!selectedMap.value.size) return
  const latestMap = new Map<string, Verse>()
  for (const verse of verses.value) {
    if (selectedMap.value.has(verse.id)) {
      latestMap.set(verse.id, verse)
    }
  }
  selectedMap.value = latestMap
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

function verseReference(verse: Verse): string {
  return formatVerseReference(verse)
}

function selectCovenant(next: 'old' | 'new') {
  currentCovenant.value = next
  clearSearch(false)
  browseControlsCollapsed.value = false

  const books = booksFor(next)
  selectedBook.value = books[0] ?? ''
  const chapters = chaptersFor(next, selectedBook.value)
  selectedChapter.value = chapters[0] ?? null
  resetPagination()
}

function toggleBrowseControls() {
  browseControlsCollapsed.value = !browseControlsCollapsed.value
}

function selectBook(book: string) {
  selectedBook.value = book
  clearSearch(false)
  browseControlsCollapsed.value = false

  const chapters = chaptersFor(currentCovenant.value, book)
  selectedChapter.value = chapters[0] ?? null
  resetPagination()
}
function selectChapter(chapter: number) {
  selectedChapter.value = chapter
  clearSearch(false)
  browseControlsCollapsed.value = true
  resetPagination()
}

function runSearch() {
  const nextKeyword = keyword.value.trim()
  if (!nextKeyword) {
    clearSearch()
    return
  }

  searchKeyword.value = nextKeyword
  searchFilterCovenant.value = 'all'
  searchFilterBook.value = ''
  showSearchResults.value = true
  resetPagination()
}

function clearSearch(resetInput = true) {
  if (resetInput) {
    keyword.value = ''
  }
  searchKeyword.value = ''
  searchFilterCovenant.value = 'all'
  searchFilterBook.value = ''
  showSearchResults.value = false
  browseControlsCollapsed.value = false
  resetPagination()
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
  currentCovenant.value = isNewCovenantLabel(verse.covenantName) ? 'new' : 'old'
  selectedBook.value = verse.bookName
  selectedChapter.value = verse.chapterNumber
  showSearchResults.value = false
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

function openEditor() {
  editorVisible.value = true
  editorNotice.value = ''
  editCovenant.value = currentCovenant.value
  editBook.value = selectedBook.value || booksFor(editCovenant.value)[0] || ''
  editChapter.value = selectedChapter.value ?? chaptersFor(editCovenant.value, editBook.value)[0] ?? 1
  resetEditorForm()
}

function closeEditor() {
  editorVisible.value = false
  editorNotice.value = ''
}

function switchEditCovenant(next: 'old' | 'new') {
  editCovenant.value = next
  editBook.value = booksFor(next)[0] ?? ''
  editChapter.value = chaptersFor(next, editBook.value)[0] ?? 1
  resetEditorForm()
}

function handleEditBookChange() {
  editChapter.value = chaptersFor(editCovenant.value, editBook.value)[0] ?? 1
  resetEditorForm()
}

function handleEditChapterChange() {
  resetEditorForm()
}

function fillForm(verse?: Verse) {
  const meta = resolveBookMeta(editBook.value, editCovenant.value)
  form.id = verse?.id ?? ''
  form.covenantName = verse?.covenantName ?? meta.covenantName
  form.category = verse?.category ?? meta.category
  form.bookName = verse?.bookName ?? editBook.value
  form.bookNumber = verse?.bookNumber ?? meta.bookNumber
  form.chapterNumber = verse?.chapterNumber ?? editChapter.value
  form.verseNumber = verse?.verseNumber ?? nextVerseNumber()
  form.content = verse?.content ?? ''
}

function resetEditorForm() {
  selectedEditVerseId.value = ''
  fillForm()
}

function pickEditableVerse(id: string) {
  selectedEditVerseId.value = id
  const verse = editableVerseList.value.find((item) => item.id === id)
  fillForm(verse)
}

async function refreshData() {
  loading.value = true
  error.value = ''

  try {
    const result = await loadBibleData(true)
    verses.value = result.verses
    syncSelectedVerses()
    ensureBrowseSelection()
    normalizeSearchFilters()
    if (showSearchResults.value && !searchKeyword.value.trim()) {
      showSearchResults.value = false
    }
  } catch (reason: unknown) {
    error.value = reason instanceof Error ? reason.message : '经文加载失败'
  } finally {
    loading.value = false
  }
}

async function submitVerse() {
  saving.value = true
  editorNotice.value = ''

  try {
    const payload = {
      covenantName: editCovenant.value === 'new' ? '新约' : '旧约',
      category: form.category ?? '',
      bookName: editBook.value,
      bookNumber: form.bookNumber,
      chapterNumber: editChapter.value,
      verseNumber: form.verseNumber,
      content: form.content,
    }

    if (form.id) {
      await updateVerse(form.id, payload)
      editorNotice.value = '经文修改已保存。'
    } else {
      const created = await createVerse(payload)
      selectedEditVerseId.value = created.id
      editorNotice.value = '经文已新增。'
    }

    editorNoticeType.value = 'success'
    clearLoadCache()
    await refreshData()

    if (selectedEditVerseId.value) {
      pickEditableVerse(selectedEditVerseId.value)
    } else {
      resetEditorForm()
    }
  } catch (reason: unknown) {
    editorNoticeType.value = 'error'
    editorNotice.value = reason instanceof Error ? reason.message : '保存失败'
  } finally {
    saving.value = false
  }
}

async function removeVerse() {
  if (!form.id) return
  if (!window.confirm('确定删除这条经文吗？')) return

  saving.value = true
  editorNotice.value = ''
  try {
    await deleteVerse(form.id)
    editorNoticeType.value = 'success'
    editorNotice.value = '经文已删除。'
    clearLoadCache()
    await refreshData()
    resetEditorForm()
  } catch (reason: unknown) {
    editorNoticeType.value = 'error'
    editorNotice.value = reason instanceof Error ? reason.message : '删除失败'
  } finally {
    saving.value = false
  }
}

function handlePageKeydown(event: KeyboardEvent) {
  if (isEditableKeyboardTarget(event.target)) {
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
    window.scrollBy({ top: -160, behavior: 'smooth' })
    return
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    window.scrollBy({ top: 160, behavior: 'smooth' })
  }
}

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

watch([editBook, editChapter], () => {
  if (!editorVisible.value) return
  if (selectedEditVerseId.value && !editableVerseList.value.some((item) => item.id === selectedEditVerseId.value)) {
    selectedEditVerseId.value = ''
  }
  if (!selectedEditVerseId.value) {
    fillForm()
  }
})

onMounted(() => {
  refreshData()
  window.addEventListener('keydown', handlePageKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handlePageKeydown)
  if (focusVerseTimer) {
    window.clearTimeout(focusVerseTimer)
  }
})
</script>

<style scoped>
.bp-tool {
  padding: 24px;
  color: #0f172a;
}

.bp-surface,
.bp-card,
.bp-editor {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 26px;
  background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.06);
}

.bp-tool__hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(420px, 560px);
  align-items: center;
  gap: 26px;
  padding: 28px 30px;
}

.bp-tool__eyebrow,
.bp-editor__eyebrow {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #64748b;
}

.bp-tool__hero-copy h1,
.bp-editor__header h3 {
  margin: 8px 0 0;
  font-size: 32px;
  line-height: 1.15;
}

.bp-tool__hero-copy p:last-child,
.bp-editor__header p:last-child {
  margin: 12px 0 0;
  font-size: 14px;
  line-height: 1.8;
  color: #64748b;
}

.bp-tool__hero-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.bp-tool__hero-buttons {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.bp-tool__search {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  width: min(100%, 560px);
  gap: 10px;
  padding: 10px;
  border-radius: 20px;
  background: rgba(248, 250, 252, 0.95);
  border: 1px solid rgba(148, 163, 184, 0.16);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75);
}

.bp-tool__search input {
  width: 100%;
  min-width: 0;
  border: none;
  background: transparent;
  padding: 0 4px;
  font-size: 14px;
  color: #0f172a;
}

.bp-tool__search input:focus {
  outline: none;
}

.bp-tool__search > .bp-button {
  flex-shrink: 0;
}

.bp-alert {
  margin-top: 16px;
  padding: 14px 16px;
  border-radius: 18px;
  font-size: 14px;
  line-height: 1.7;
}

.bp-alert.is-error {
  background: rgba(239, 68, 68, 0.08);
  color: #b91c1c;
}

.bp-alert.is-success {
  background: rgba(22, 163, 74, 0.08);
  color: #15803d;
}

.bp-tool__selector,
.bp-tool__selection,
.bp-tool__content {
  margin-top: 20px;
  padding: 24px;
}

.bp-tool__selector-head,
.bp-tool__selection-head,
.bp-tool__content-head,
.bp-editor__header,
.bp-editor__sidebar-head,
.bp-editor__footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.bp-tool__selector-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  color: #64748b;
  font-size: 13px;
}

.bp-tool__selection-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.bp-tool__selection-meta strong {
  font-size: 15px;
}

.bp-tool__selection-tip {
  color: #64748b;
  font-size: 12px;
  line-height: 1.6;
}

.bp-tool__selection-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.bp-tool__selected-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
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
  grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
  width: min(100%, 420px);
}

.bp-segment__item,
.bp-pill,
.bp-button,
.bp-editor__pick,
.bp-pagination__button,
.bp-pagination__nav,
.bp-pagination__ellipsis {
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
}

.bp-segment__item.is-selected {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  color: #fff;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.16);
}

.bp-tool__group + .bp-tool__group {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid rgba(226, 232, 240, 0.9);
}

.bp-tool__group-title {
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 700;
  color: #475569;
}

.bp-pill-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.bp-pill-wrap--dropdown {
  max-height: 240px;
  overflow: auto;
}

.bp-tool__browse-summary {
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
  background: #f8fafc;
  padding: 10px 14px;
  color: #334155;
  font-size: 14px;
  font-weight: 600;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease, color 0.18s ease;
}

.bp-pill:hover {
  transform: translateY(-1px);
  border-color: rgba(59, 130, 246, 0.32);
}

.bp-pill.is-selected {
  border-color: rgba(15, 23, 42, 0.5);
  background: linear-gradient(180deg, #0f172a 0%, #172554 100%);
  color: #fff;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.14);
}

.bp-pill--chapter {
  min-width: 52px;
}

.bp-tool__content-head h2 {
  margin: 0;
  font-size: 28px;
}

.bp-tool__content-title {
  min-width: 0;
}

.bp-tool__content-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.bp-tool__content-head p {
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 1.75;
  color: #64748b;
}

.bp-tool__chapter-nav {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.bp-tool__content-actions {
  display: flex;
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
  white-space: nowrap;
}

.bp-state-box {
  padding: 18px;
  border-radius: 18px;
  background: rgba(248, 250, 252, 0.95);
  color: #64748b;
  font-size: 14px;
}

.bp-verse-list {
  display: flex;
  flex-direction: column;
  margin-top: 18px;
  border-top: 1px solid rgba(226, 232, 240, 0.9);
}

.bp-verse-line {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  margin: 0;
  border: none;
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
  padding: 18px 2px 18px 0;
  background: transparent;
  color: #1e293b;
  font-size: 17px;
  line-height: 2;
  text-align: left;
  white-space: pre-wrap;
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease;
}

.bp-verse-line:last-child {
  border-bottom: none;
}

.bp-verse-line.is-selected {
  border-bottom-color: rgba(37, 99, 235, 0.24);
  background: linear-gradient(90deg, rgba(37, 99, 235, 0.08) 0%, rgba(37, 99, 235, 0.02) 38%, transparent 100%);
}

.bp-verse-line.is-focused {
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.18);
}

.bp-verse-line:focus-visible {
  outline: none;
  border-radius: 16px;
  box-shadow: inset 0 0 0 2px rgba(37, 99, 235, 0.18);
}

.bp-verse-main {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  flex: 1;
  min-width: 0;
  cursor: inherit;
  outline: none;
  padding: 2px 0 2px 14px;
  border-left: 3px solid transparent;
}

.bp-verse-main.is-selected {
  border-color: #1d4ed8;
}

.bp-verse-text-wrap {
  flex: 1;
  min-width: 0;
}

.bp-verse-ref {
  margin-right: 4px;
  color: #ff5c45;
  font-weight: 700;
}

.bp-verse-text {
  color: inherit;
}
.bp-copy-mini {
  flex-shrink: 0;
  align-self: flex-start;
  min-width: 64px;
  min-height: 38px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 999px;
  background: rgba(248, 250, 252, 0.96);
  cursor: pointer;
  padding: 0 14px;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
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

.bp-pagination {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid rgba(226, 232, 240, 0.9);
}

.bp-pagination__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
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
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.14);
}

.bp-pagination__button:disabled,
.bp-pagination__nav:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.bp-pagination__jump {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  color: #64748b;
  font-size: 13px;
}

.bp-pagination__jump input {
  width: 86px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 14px;
  background: #fff;
  padding: 10px 12px;
  font-size: 14px;
  color: #0f172a;
}

.bp-editor-mask {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.52);
  backdrop-filter: blur(6px);
}

.bp-editor {
  width: min(1180px, 100%);
  max-height: 88vh;
  overflow: auto;
  padding: 26px;
}

.bp-editor__selectors {
  display: grid;
  grid-template-columns: auto repeat(2, minmax(180px, 220px));
  gap: 14px;
  align-items: end;
  margin-top: 18px;
}

.bp-editor__select-field,
.bp-editor__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bp-editor__select-field span,
.bp-editor__field span {
  font-size: 13px;
  font-weight: 700;
  color: #475569;
}

.bp-editor__select-field select,
.bp-editor__field input,
.bp-editor__field textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 18px;
  background: #fff;
  padding: 12px 14px;
  font-size: 14px;
  color: #0f172a;
}

.bp-editor__field textarea {
  min-height: 240px;
  resize: vertical;
  line-height: 1.85;
}

.bp-editor__layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 20px;
  margin-top: 20px;
}

.bp-editor__sidebar,
.bp-editor__meta-card {
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 22px;
  background: linear-gradient(180deg, #f8fbff 0%, #f6f8fc 100%);
}

.bp-editor__sidebar {
  padding: 18px;
}

.bp-editor__sidebar-head strong {
  font-size: 15px;
}

.bp-editor__verse-picks {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
}

.bp-editor__pick {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 16px;
  background: #fff;
  padding: 14px;
  text-align: left;
}

.bp-editor__pick.is-selected {
  border-color: rgba(15, 23, 42, 0.45);
  background: linear-gradient(180deg, #0f172a 0%, #172554 100%);
}

.bp-editor__pick-ref {
  font-size: 12px;
  font-weight: 700;
  color: #1d4ed8;
}

.bp-editor__pick-text {
  font-size: 13px;
  line-height: 1.7;
  color: #334155;
  display: -webkit-box;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.bp-editor__pick.is-selected .bp-editor__pick-ref,
.bp-editor__pick.is-selected .bp-editor__pick-text {
  color: #fff;
}
.bp-editor__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.bp-editor__meta-card {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  padding: 18px;
}

.bp-editor__meta-row span {
  display: block;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.bp-editor__meta-row strong {
  display: block;
  margin-top: 8px;
  font-size: 15px;
}

.bp-editor__field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
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
  transition: transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease, border-color 0.18s ease;
}

.bp-button:hover:not(:disabled),
.bp-pagination__button:hover:not(:disabled),
.bp-pagination__nav:hover:not(:disabled),
.bp-pagination__ellipsis:hover:not(:disabled) {
  transform: translateY(-1px);
}

.bp-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

.bp-button--link {
  text-decoration: none;
}

.bp-button--danger {
  background: rgba(239, 68, 68, 0.08);
  color: #b91c1c;
}

.bp-button--compact {
  min-height: 38px;
  padding: 0 14px;
  border-radius: 14px;
  font-size: 13px;
}

:deep(.bible-keyword-highlight) {
  border-radius: 6px;
  background: rgba(250, 204, 21, 0.32);
  padding: 0 3px;
}

@media (max-width: 1100px) {
  .bp-tool__hero,
  .bp-tool__selector-head,
  .bp-tool__selection-head,
  .bp-tool__content-head,
  .bp-editor__header,
  .bp-editor__sidebar-head,
  .bp-editor__footer {
    flex-direction: column;
    align-items: stretch;
  }

  .bp-tool__search input {
    width: 100%;
  }

  .bp-tool__chapter-nav {
    width: 100%;
  }

  .bp-editor__selectors,
  .bp-editor__layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .bp-tool {
    padding: 16px;
  }

  .bp-tool__hero-actions,
  .bp-tool__hero-buttons,
  .bp-editor__meta-card,
  .bp-editor__field-grid {
    flex-direction: column;
    grid-template-columns: 1fr;
  }

  .bp-pagination__row,
  .bp-pagination__jump {
    align-items: stretch;
  }

  .bp-pagination__pages {
    justify-content: flex-start;
  }
}
</style>

