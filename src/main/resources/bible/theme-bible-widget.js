(function () {
  const payload = window.__BIBLE_PLUGIN_THEME__;
  if (!payload || !payload.settings || !payload.settings.floatEnabled) {
    return;
  }

  const settings = payload.settings;
  const edits = payload.edits || { deletedIds: [], updated: [], created: [] };
  const assetBase = resolveAssetBase();
  const builtinCsvPath = `${assetBase}/bible.csv`;
  const defaultIconUrl = `${assetBase}/login.png`;
  const publicPageUrl = `${assetBase}/theme-bible-page.html`;
  const currentPath = window.location.pathname || '/';

  if (!shouldShowOnCurrentPage(currentPath)) {
    return;
  }

  const BOOK_ABBREV = {
    '创世记': '创', '出埃及记': '出', '利未记': '利', '民数记': '民', '申命记': '申', '约书亚记': '书', '士师记': '士', '路得记': '得',
    '撒母耳记上': '撒上', '撒母耳记下': '撒下', '列王纪上': '王上', '列王纪下': '王下', '历代志上': '代上', '历代志下': '代下', '以斯拉记': '拉', '尼希米记': '尼',
    '以斯帖记': '斯', '约伯记': '伯', '诗篇': '诗', '箴言': '箴', '传道书': '传', '雅歌': '歌', '以赛亚书': '赛', '耶利米书': '耶',
    '耶利米哀歌': '哀', '以西结书': '结', '但以理书': '但', '何西阿书': '何', '约珥书': '珥', '阿摩司书': '摩', '俄巴底亚书': '俄', '约拿书': '拿',
    '弥迦书': '弥', '那鸿书': '鸿', '哈巴谷书': '哈', '西番雅书': '番', '哈该书': '该', '撒迦利亚书': '亚', '玛拉基书': '玛', '马太福音': '太',
    '马可福音': '可', '路加福音': '路', '约翰福音': '约', '使徒行传': '徒', '罗马书': '罗', '哥林多前书': '林前', '哥林多后书': '林后', '加拉太书': '加',
    '以弗所书': '弗', '腓立比书': '腓', '歌罗西书': '西', '帖撒罗尼迦前书': '帖前', '帖撒罗尼迦后书': '帖后', '提摩太前书': '提前', '提摩太后书': '提后', '提多书': '多',
    '腓利门书': '门', '希伯来书': '来', '雅各书': '雅', '彼得前书': '彼前', '彼得后书': '彼后', '约翰一书': '约一', '约翰二书': '约二', '约翰三书': '约三',
    '犹大书': '犹', '启示录': '启'
  };

  const isCompact = isPostLikePage(currentPath) || !isHome(currentPath);
  const pageSize = isCompact ? 6 : 10;
  const position = settings.floatPosition || 'right-bottom';

  const state = {
    tab: 'search',
    dataLoaded: false,
    loading: false,
    error: '',
    verses: [],
    searchKeyword: '',
    searchResults: [],
    currentCovenant: 'old',
    currentBook: '',
    currentChapter: null,
    currentPage: 1,
    showJumpInput: false,
    jumpPageValue: '',
    browseControlsCollapsed: false,
    copyPageLabel: '复制本页',
    copiedVerseId: '',
    panelOpen: false,
  };
  let copyPageTimer = 0;
  let copyVerseTimer = 0;

  const root = document.createElement('div');
  root.className = `bible-float-root ${position}${isCompact ? ' is-compact' : ''}`;
  root.innerHTML = `
    <button class="bible-float-button" type="button" aria-label="打开圣经搜索">
      ${renderIcon()}
    </button>
    <section class="bible-float-panel" aria-hidden="true">
      <div class="bible-float-header">
        <h3 class="bible-float-title">圣经</h3>
        <p class="bible-float-subtitle">支持多关键词搜索与按卷章节浏览</p>
        <div class="bible-float-search">
          <input type="text" placeholder="输入关键词，例如：约瑟 法老" />
          <button type="button">搜索</button>
        </div>
      </div>
      <div class="bible-float-tabs">
        <button class="bible-chip is-selected" data-tab="search" type="button">搜索</button>
        <button class="bible-chip" data-tab="browse" type="button">浏览</button>
      </div>
      <div class="bible-float-body"></div>
      <div class="bible-float-footer">
        <span>左右翻页，上下滚动，支持快速复制</span>
        <div class="bible-float-footer__actions">
          <a class="bible-secondary bible-page-link" href="${publicPageUrl}" target="_blank" rel="noreferrer">圣经页面</a>
          <button class="bible-primary bible-close" type="button">关闭</button>
        </div>
      </div>
    </section>
  `;
  document.body.appendChild(root);

  const button = root.querySelector('.bible-float-button');
  const panel = root.querySelector('.bible-float-panel');
  const body = root.querySelector('.bible-float-body');
  const input = root.querySelector('.bible-float-search input');
  const searchButton = root.querySelector('.bible-float-search button');
  const closeButton = root.querySelector('.bible-close');
  const tabButtons = Array.from(root.querySelectorAll('[data-tab]'));

  function parseAssetBase(pathname) {
    if (!pathname) {
      return null;
    }
    const match = pathname.match(/(\/plugins\/[^/]+\/assets)(?:\/|$)/i);
    return match && match[1] ? match[1] : null;
  }

  function toPathname(url) {
    if (!url) {
      return null;
    }
    try {
      return new URL(url, window.location.origin).pathname;
    } catch (error) {
      return null;
    }
  }

  function resolveAssetBase() {
    const currentScript = document.currentScript && document.currentScript.src ? document.currentScript.src : '';
    const matchedScript = Array.from(document.scripts || [])
      .map((script) => script.src)
      .find((src) => /\/plugins\/[^/]+\/assets\/theme-bible-widget\.js(?:\?|$)/i.test(src));
    return parseAssetBase(toPathname(currentScript))
      || parseAssetBase(toPathname(matchedScript))
      || parseAssetBase(toPathname(payload.builtinCsvPath))
      || parseAssetBase(toPathname(payload.defaultIconUrl))
      || '/plugins/bible/assets';
  }

  root.addEventListener('click', function (event) {
    event.stopPropagation();
  });

  button.addEventListener('click', async function (event) {
    event.preventDefault();
    event.stopPropagation();
    if (state.panelOpen) {
      closePanel();
      return;
    }
    openPanel();
    await ensureData();
    render();
    input.focus();
  });

  closeButton.addEventListener('click', function (event) {
    event.preventDefault();
    event.stopPropagation();
    closePanel();
  });

  tabButtons.forEach(function (tabButton) {
    tabButton.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      setTab(tabButton.getAttribute('data-tab') || 'search');
      render();
    });
  });

  searchButton.addEventListener('click', function (event) {
    event.preventDefault();
    event.stopPropagation();
    runSearch();
  });

  input.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      runSearch();
    }
  });

  body.addEventListener('click', handleBodyClick);
  body.addEventListener('keydown', handleBodyKeydown);
  document.addEventListener('keydown', handleDocumentKeydown);

  function handleBodyClick(event) {
    event.stopPropagation();
    const target = event.target instanceof Element ? event.target.closest('button') : null;
    if (!target) {
      return;
    }

    if (target.hasAttribute('data-covenant-toggle')) {
      state.currentCovenant = state.currentCovenant === 'old' ? 'new' : 'old';
      state.browseControlsCollapsed = false;
      syncCurrentSelection();
      resetPagination();
      render();
      return;
    }

    if (target.hasAttribute('data-toggle-browse-controls')) {
      state.browseControlsCollapsed = !state.browseControlsCollapsed;
      render();
      return;
    }

    if (target.hasAttribute('data-copy-page')) {
      copyCurrentPage().then(render);
      return;
    }

    if (target.hasAttribute('data-copy-verse')) {
      copyVerse(target.getAttribute('data-copy-verse') || '').then(render);
      return;
    }

    if (target.dataset.book) {
      state.currentBook = target.dataset.book;
      state.browseControlsCollapsed = false;
      const chapters = getChapters(state.currentCovenant, state.currentBook);
      state.currentChapter = chapters[0] || null;
      resetPagination();
      render();
      return;
    }

    if (target.dataset.chapter) {
      state.currentChapter = Number(target.dataset.chapter);
      state.browseControlsCollapsed = true;
      resetPagination();
      render();
      return;
    }

    if (target.dataset.page) {
      goToPage(Number(target.dataset.page));
      render();
      return;
    }

    if (target.dataset.pageNav) {
      goToPage(state.currentPage + Number(target.dataset.pageNav));
      render();
      return;
    }

    if (target.hasAttribute('data-page-jump-toggle')) {
      state.showJumpInput = !state.showJumpInput;
      state.jumpPageValue = state.showJumpInput ? String(state.currentPage) : '';
      render();
      if (state.showJumpInput) {
        focusJumpInput();
      }
      return;
    }

    if (target.hasAttribute('data-page-jump-submit')) {
      submitJumpPage();
      render();
    }
  }

  function handleDocumentKeydown(event) {
    if (!state.panelOpen) {
      return;
    }
    if (event.key === 'Escape') {
      closePanel();
      return;
    }
    if (isEditableTarget(event.target)) {
      return;
    }
    if (event.key === 'ArrowLeft') {
      if (state.currentPage > 1) {
        event.preventDefault();
        goToPage(state.currentPage - 1);
        render();
      }
      return;
    }
    if (event.key === 'ArrowRight') {
      if (state.currentPage < getTotalPages(getVisibleVerses().length)) {
        event.preventDefault();
        goToPage(state.currentPage + 1);
        render();
      }
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      scrollBodyBy(-140);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      scrollBodyBy(140);
    }
  }

  function handleBodyKeydown(event) {
    if (!(event.target instanceof HTMLInputElement)) {
      return;
    }
    if (!event.target.hasAttribute('data-page-jump-input')) {
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      state.jumpPageValue = event.target.value;
      submitJumpPage();
      render();
    }
  }

  function openPanel() {
    state.panelOpen = true;
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
  }

  function closePanel() {
    state.panelOpen = false;
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    state.showJumpInput = false;
    state.jumpPageValue = '';
  }

  function setTab(tab) {
    state.tab = tab === 'browse' ? 'browse' : 'search';
    state.showJumpInput = false;
    state.jumpPageValue = '';
    updateTabButtons();
    resetPagination();
  }

  function updateTabButtons() {
    tabButtons.forEach(function (item) {
      item.classList.toggle('is-selected', item.getAttribute('data-tab') === state.tab);
    });
  }

  function resetPagination() {
    state.currentPage = 1;
    state.showJumpInput = false;
    state.jumpPageValue = '';
  }

  function goToPage(page) {
    const totalPages = getTotalPages(getVisibleVerses().length);
    state.currentPage = Math.min(Math.max(page, 1), totalPages);
    state.showJumpInput = false;
    body.scrollTop = 0;
    scheduleResultsScrollTop();
  }

  function submitJumpPage() {
    const inputElement = body.querySelector('[data-page-jump-input]');
    const rawValue = inputElement ? inputElement.value : state.jumpPageValue;
    const page = Number(rawValue);
    if (!Number.isFinite(page)) {
      focusJumpInput();
      return;
    }
    goToPage(page);
  }

  async function ensureData() {
    if (state.dataLoaded || state.loading) {
      return;
    }

    state.loading = true;
    render();
    try {
      const baseVerses = await loadBaseVerses();
      state.verses = sortVerses(applyEdits(baseVerses, edits));
      state.dataLoaded = true;
      syncCurrentSelection();
      state.error = '';
    } catch (error) {
      state.error = error instanceof Error ? error.message : String(error);
    } finally {
      state.loading = false;
    }
  }

  async function loadBaseVerses() {
    if (settings.csvText && settings.csvText.trim()) {
      return parseCsvText(settings.csvText);
    }

    const sourceUrl = settings.csvUrl && settings.csvUrl.trim() ? settings.csvUrl.trim() : builtinCsvPath;
    const response = await fetch(sourceUrl, {
      mode: sourceUrl.startsWith('/') ? 'same-origin' : 'cors',
      credentials: sourceUrl.startsWith('/') ? 'include' : 'omit',
    });
    if (!response.ok) {
      throw new Error(`经文加载失败：HTTP ${response.status}`);
    }
    return parseCsvText(await response.text());
  }

  function runSearch() {
    const keyword = input.value.trim();
    if (!keyword) {
      state.searchKeyword = '';
      state.searchResults = [];
      setTab('browse');
      render();
      return;
    }

    state.searchKeyword = keyword;
    state.searchResults = searchVerses(state.verses, keyword);
    setTab('search');
    render();
  }

  async function copyCurrentPage() {
    const ok = await copyText(formatVersePageText(getPagedVerses()));
    state.copyPageLabel = ok ? '已复制' : '复制失败';
    if (copyPageTimer) {
      window.clearTimeout(copyPageTimer);
    }
    copyPageTimer = window.setTimeout(function () {
      state.copyPageLabel = '复制本页';
      render();
    }, 1600);
  }

  async function copyVerse(verseId) {
    const verse = getVisibleVerses().find(function (item) {
      return getVerseId(item) === verseId;
    });
    if (!verse) {
      return;
    }
    const ok = await copyText(formatVersePlainText(verse));
    state.copiedVerseId = ok ? verseId : '';
    if (copyVerseTimer) {
      window.clearTimeout(copyVerseTimer);
    }
    copyVerseTimer = window.setTimeout(function () {
      state.copiedVerseId = '';
      render();
    }, 1600);
  }

  function syncCurrentSelection() {
    const books = getOrderedBooks(state.currentCovenant);
    if (!books.length && state.currentCovenant === 'old') {
      state.currentCovenant = 'new';
    }

    const activeBooks = getOrderedBooks(state.currentCovenant);
    if (!activeBooks.length) {
      state.currentBook = '';
      state.currentChapter = null;
      return;
    }

    if (!activeBooks.includes(state.currentBook)) {
      state.currentBook = activeBooks[0];
    }

    const chapters = getChapters(state.currentCovenant, state.currentBook);
    if (!chapters.length) {
      state.currentChapter = null;
      return;
    }

    if (!chapters.includes(state.currentChapter)) {
      state.currentChapter = chapters[0];
    }
  }

  function getVisibleVerses() {
    if (state.tab === 'search') {
      return state.searchResults;
    }

    if (!state.currentBook || state.currentChapter == null) {
      return [];
    }

    return state.verses.filter(function (verse) {
      return verse.bookName === state.currentBook && verse.chapterNumber === state.currentChapter;
    });
  }

  function getPagedVerses() {
    const verses = getVisibleVerses();
    const start = (state.currentPage - 1) * pageSize;
    return verses.slice(start, start + pageSize);
  }

  function getTotalPages(totalCount) {
    return Math.max(1, Math.ceil(totalCount / pageSize));
  }

  function render() {
    if (state.loading) {
      body.innerHTML = '<div class="bible-loading">正在加载经文数据...</div>';
      return;
    }

    if (state.error) {
      body.innerHTML = `<div class="bible-error">${escapeHtml(state.error)}</div>`;
      return;
    }

    if (!state.dataLoaded) {
      body.innerHTML = '<div class="bible-empty">点击悬浮按钮后即可加载经文。</div>';
      return;
    }

    body.innerHTML = state.tab === 'search' ? renderSearch() : renderBrowse();
  }

  function renderSearch() {
    if (!state.searchKeyword) {
      return '<div class="bible-empty">输入一个或多个关键词，例如“约瑟 法老”。</div>';
    }

    if (!state.searchResults.length) {
      return '<div class="bible-empty">没有找到同时包含这些关键词的经文。</div>';
    }

    const totalCount = state.searchResults.length;
    const totalPages = getTotalPages(totalCount);
    const verses = getPagedVerses();

    return `
      <div class="bible-section">
        <div class="bible-section-head">
          <div class="bible-section-meta">搜索结果 · 共 ${totalCount} 节 · 第 ${state.currentPage}/${totalPages} 页</div>
          <div class="bible-section-actions">
            <span class="bible-section-hint">← → 翻页</span>
            <button class="bible-secondary" type="button" data-copy-page>${escapeHtml(state.copyPageLabel)}</button>
          </div>
        </div>
        <div class="bible-results">
          ${verses.map(function (verse) { return renderVerseItem(verse, state.searchKeyword); }).join('')}
        </div>
        ${renderPagination(totalCount)}
      </div>
    `;
  }

  function renderBrowse() {
    const books = getOrderedBooks(state.currentCovenant);
    const chapters = getChapters(state.currentCovenant, state.currentBook);
    const totalCount = getVisibleVerses().length;
    const totalPages = getTotalPages(totalCount);
    const verses = getPagedVerses();
    const showSelectors = !state.browseControlsCollapsed || !state.currentBook || state.currentChapter == null;

    return `
      <div class="bible-section">
        <div class="bible-browse-top">
          <button class="bible-toggle" type="button" data-covenant-toggle>
            <span>${state.currentCovenant === 'old' ? '旧约' : '新约'}</span>
            <span>切换</span>
          </button>
          ${state.currentBook ? `
            <button class="bible-toggle bible-toggle--light" type="button" data-toggle-browse-controls>
              <span>${showSelectors ? '收起卷章' : `${escapeHtml(state.currentBook)} 第 ${state.currentChapter || 0} 章`}</span>
              <span>${showSelectors ? '收起' : '更改'}</span>
            </button>
          ` : ''}
        </div>
        ${showSelectors ? `
          <div class="bible-books">
            ${books.map(function (book) {
              return `<button class="bible-book ${book === state.currentBook ? 'is-selected' : ''}" data-book="${escapeHtml(book)}" type="button">${escapeHtml(getBookAbbrev(book))}</button>`;
            }).join('')}
          </div>
        ` : ''}
        ${state.currentBook ? (showSelectors ? `
          <div class="bible-chapters">
            ${chapters.map(function (chapter) {
              return `<button class="bible-chapter ${chapter === state.currentChapter ? 'is-selected' : ''}" data-chapter="${chapter}" type="button">${chapter}</button>`;
            }).join('')}
          </div>
        ` : `
          <div class="bible-browse-summary">已收起卷章选择，点击“更改”可重新展开。</div>
        `) : ''}
        <div class="bible-section-head">
          <div class="bible-section-meta">${escapeHtml(state.currentBook || '请选择卷章')}${state.currentBook ? ` 第 ${state.currentChapter || 0} 章 · 共 ${totalCount} 节 · 第 ${state.currentPage}/${totalPages} 页` : ''}</div>
          <div class="bible-section-actions">
            <span class="bible-section-hint">← → 翻页</span>
            <button class="bible-secondary" type="button" data-copy-page ${verses.length ? '' : 'disabled'}>${escapeHtml(state.copyPageLabel)}</button>
          </div>
        </div>
        <div class="bible-results">
          ${verses.length ? verses.map(function (verse) { return renderVerseItem(verse, ''); }).join('') : '<div class="bible-empty">请选择卷名和章节查看经文。</div>'}
        </div>
        ${totalCount ? renderPagination(totalCount) : ''}
      </div>
    `;
  }

  function renderPagination(totalCount) {
    const totalPages = getTotalPages(totalCount);
    if (totalPages <= 1) {
      return '';
    }

    const items = buildPaginationItems(state.currentPage, totalPages);
    return `
      <div class="bible-pagination">
        <div class="bible-pagination__row">
          <button class="bible-page-nav" type="button" data-page-nav="-1" ${state.currentPage <= 1 ? 'disabled' : ''}>上一页</button>
          <div class="bible-pagination__pages">
            ${items.map(function (item) {
              if (typeof item === 'number') {
                return `<button class="bible-page-button ${item === state.currentPage ? 'is-active' : ''}" type="button" data-page="${item}">${item}</button>`;
              }
              if (state.showJumpInput) {
                return `
                  <span class="bible-page-jump-inline">
                    <input type="number" min="1" max="${totalPages}" value="${escapeHtml(state.jumpPageValue || String(state.currentPage))}" data-page-jump-input>
                    <button class="bible-page-jump" type="button" data-page-jump-submit>跳转</button>
                  </span>
                `;
              }
              return '<button class="bible-page-ellipsis" type="button" data-page-jump-toggle>...</button>';
            }).join('')}
          </div>
          <button class="bible-page-nav" type="button" data-page-nav="1" ${state.currentPage >= totalPages ? 'disabled' : ''}>下一页</button>
        </div>
      </div>
    `;
  }

  function buildPaginationItems(current, total) {
    if (total <= 7) {
      return Array.from({ length: total }, function (_, index) { return index + 1; });
    }

    const pages = new Set([1, total, current - 1, current, current + 1]);
    if (current <= 4) {
      pages.add(2);
      pages.add(3);
      pages.add(4);
    }
    if (current >= total - 3) {
      pages.add(total - 1);
      pages.add(total - 2);
      pages.add(total - 3);
    }

    const ordered = Array.from(pages).filter(function (page) {
      return page >= 1 && page <= total;
    }).sort(function (left, right) {
      return left - right;
    });

    const items = [];
    ordered.forEach(function (page, index) {
      const previous = ordered[index - 1];
      if (index > 0 && previous != null && page - previous > 1) {
        items.push('ellipsis');
      }
      items.push(page);
    });
    return items;
  }

  function renderVerseItem(verse, keyword) {
    const verseId = getVerseId(verse);
    return `
      <article class="bible-verse-item">
        <p class="bible-verse-text">
          <span class="bible-verse-ref">${escapeHtml(formatVerseReference(verse))}</span>
          <span>${highlightText(verse.content || '', keyword)}</span>
        </p>
        <button class="bible-copy-inline" type="button" data-copy-verse="${escapeHtml(verseId)}">${state.copiedVerseId === verseId ? '已复制' : '复制'}</button>
      </article>
    `;
  }

  function formatVerseReference(verse) {
    return `【${getBookAbbrev(verse.bookName || '')}${verse.chapterNumber || 0}:${verse.verseNumber || 0}】`;
  }

  function formatVersePlainText(verse) {
    return `${formatVerseReference(verse)}${verse.content || ''}`;
  }

  function formatVersePageText(verses) {
    return verses.map(formatVersePlainText).join('\n');
  }

  function getVerseId(verse) {
    return String(verse.id || `${verse.bookName || ''}-${verse.chapterNumber || 0}-${verse.verseNumber || 0}`);
  }

  function getBookAbbrev(bookName) {
    return BOOK_ABBREV[bookName] || bookName;
  }

  function applyEdits(baseVerses, payloadEdits) {
    const deleted = new Set(payloadEdits.deletedIds || []);
    const updated = new Map((payloadEdits.updated || []).map(function (item) { return [item.id, item]; }));
    const list = baseVerses
      .filter(function (verse) { return !deleted.has(verse.id); })
      .map(function (verse) { return updated.get(verse.id) || verse; });
    (payloadEdits.created || []).forEach(function (verse) {
      if (verse && verse.id) {
        list.push(verse);
      }
    });
    return list;
  }

  function parseCsvText(text) {
    const lines = String(text || '').replace(/\r\n/g, '\n').split('\n').filter(function (line) {
      return line.trim();
    });
    if (lines.length < 2) {
      return [];
    }
    return lines.slice(1).map(function (line, index) {
      const parts = line.replace(/\uFEFF/g, '').split(',');
      if (parts.length < 7) {
        return null;
      }
      return {
        id: 'csv-' + index,
        covenantName: (parts[0] || '').trim(),
        category: (parts[1] || '').trim(),
        bookName: (parts[2] || '').trim(),
        bookNumber: Number((parts[3] || '').trim()) || 0,
        chapterNumber: Number((parts[4] || '').trim()) || 0,
        verseNumber: Number((parts[5] || '').trim()) || 0,
        content: parts.slice(6).join(',').trim(),
      };
    }).filter(Boolean);
  }

  function tokenize(keyword) {
    return String(keyword || '').toLowerCase().trim().split(/\s+/).filter(Boolean);
  }

  function searchVerses(verses, keyword) {
    const tokens = tokenize(keyword);
    if (!tokens.length) {
      return [];
    }
    return verses.filter(function (verse) {
      const haystack = `${verse.bookName || ''} ${verse.chapterNumber || ''}:${verse.verseNumber || ''} ${verse.content || ''}`.toLowerCase();
      return tokens.every(function (token) {
        return haystack.includes(token);
      });
    });
  }

  function highlightText(text, keyword) {
    const tokens = tokenize(keyword);
    let html = escapeHtml(text);
    tokens.forEach(function (token) {
      const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      html = html.replace(new RegExp(escapedToken, 'gi'), function (match) {
        return `<mark class="bible-highlight">${match}</mark>`;
      });
    });
    return html;
  }

  function isNewCovenant(label) {
    return String(label || '').includes('新');
  }

  function getOrderedBooks(covenant) {
    const bookMap = new Map();
    state.verses.forEach(function (verse) {
      const isNew = isNewCovenant(verse.covenantName);
      if ((covenant === 'new') !== isNew) {
        return;
      }
      if (!verse.bookName) {
        return;
      }
      const current = bookMap.get(verse.bookName);
      const bookNumber = Number(verse.bookNumber) || 999;
      if (!current || bookNumber < current.bookNumber) {
        bookMap.set(verse.bookName, { bookName: verse.bookName, bookNumber: bookNumber });
      }
    });
    return Array.from(bookMap.values()).sort(function (left, right) {
      if (left.bookNumber !== right.bookNumber) {
        return left.bookNumber - right.bookNumber;
      }
      return String(left.bookName).localeCompare(String(right.bookName), 'zh-CN');
    }).map(function (item) {
      return item.bookName;
    });
  }

  function getChapters(covenant, book) {
    if (!book) {
      return [];
    }
    const chapterSet = new Set();
    state.verses.forEach(function (verse) {
      if (verse.bookName !== book) {
        return;
      }
      const isNew = isNewCovenant(verse.covenantName);
      if ((covenant === 'new') !== isNew) {
        return;
      }
      if (verse.chapterNumber) {
        chapterSet.add(verse.chapterNumber);
      }
    });
    return Array.from(chapterSet).sort(function (left, right) { return left - right; });
  }

  function sortVerses(verses) {
    return verses.slice().sort(function (left, right) {
      const leftNew = isNewCovenant(left.covenantName);
      const rightNew = isNewCovenant(right.covenantName);
      if (leftNew !== rightNew) {
        return leftNew ? 1 : -1;
      }
      const leftBook = Number(left.bookNumber) || 999;
      const rightBook = Number(right.bookNumber) || 999;
      if (leftBook !== rightBook) {
        return leftBook - rightBook;
      }
      if ((left.chapterNumber || 0) !== (right.chapterNumber || 0)) {
        return (left.chapterNumber || 0) - (right.chapterNumber || 0);
      }
      return (left.verseNumber || 0) - (right.verseNumber || 0);
    });
  }

  function shouldShowOnCurrentPage(path) {
    if (/^\/console(\/|$)/.test(path) || /^\/apis(\/|$)/.test(path)) {
      return false;
    }

    const excludes = splitLines(settings.excludePaths);
    if (excludes.some(function (rule) { return path.startsWith(rule); })) {
      return false;
    }

    const includes = splitLines(settings.includePaths);
    if (includes.some(function (rule) { return path.startsWith(rule); })) {
      return true;
    }

    const pages = settings.visiblePages || [];
    if (pages.includes('all')) return true;
    if (pages.includes('home') && isHome(path)) return true;
    if (pages.includes('post') && isPostLikePage(path)) return true;
    return false;
  }

  function isHome(path) {
    return path === '/' || /^\/page\/\d+\/?$/.test(path);
  }

  function isPostLikePage(path) {
    if (isHome(path)) return false;
    const ogType = document.querySelector('meta[property="og:type"]');
    if (ogType && /article/i.test(ogType.getAttribute('content') || '')) {
      return true;
    }
    return !!document.querySelector('article');
  }

  function splitLines(value) {
    return String(value || '').split(/\r?\n|,/).map(function (item) {
      return item.trim();
    }).filter(Boolean);
  }

  function renderIcon() {
    const iconUrl = settings.floatIconUrl && settings.floatIconUrl.trim() ? settings.floatIconUrl.trim() : defaultIconUrl;
    return `<img src="${escapeHtml(iconUrl)}" alt="圣经">`;
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function focusJumpInput() {
    window.setTimeout(function () {
      const inputElement = body.querySelector('[data-page-jump-input]');
      if (inputElement && typeof inputElement.focus === 'function') {
        inputElement.focus();
        if (typeof inputElement.select === 'function') {
          inputElement.select();
        }
      }
    }, 0);
  }

  function scrollBodyBy(offset) {
    body.scrollBy({ top: offset, behavior: 'smooth' });
  }

  function scheduleResultsScrollTop() {
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        const firstVerse = body.querySelector('.bible-verse-item');
        if (firstVerse && typeof firstVerse.scrollIntoView === 'function') {
          firstVerse.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
        const results = body.querySelector('.bible-results');
        if (results) {
          body.scrollTo({ top: Math.max(results.offsetTop - 8, 0), behavior: 'smooth' });
        }
      });
    });
  }

  async function copyText(text) {
    const value = String(text || '').trim();
    if (!value) {
      return false;
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch (error) {
    }
    try {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.setAttribute('readonly', 'true');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch (error) {
      return false;
    }
  }

  function isEditableTarget(target) {
    if (!(target instanceof HTMLElement)) {
      return false;
    }
    if (target.isContentEditable) {
      return true;
    }
    const tagName = target.tagName.toLowerCase();
    return tagName === 'input' || tagName === 'textarea' || tagName === 'select';
  }
})();
