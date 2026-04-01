(function () {
  const root = document.getElementById('bible-page-root');
  if (!root) {
    return;
  }

  const NOTES_STORAGE_KEY = 'halo-plugin-bible:verse-notes:v2';
  const HIGHLIGHT_STORAGE_KEY = 'halo-plugin-bible:verse-highlights:v1';
  const READER_PREF_STORAGE_KEY = 'halo-plugin-bible:reader-pref:v1';
  const FALLBACK_PLUGIN_IDS = ['bible', 'run.halo.bible', 'plugin-bible'];
  const API_PREFIXES = buildApiPrefixes(resolvePluginIds());
  const BUILTIN_CSV_PATHS = buildBuiltinCsvPaths(resolvePluginIds());
  const FULL_DATA_PAGE_SIZE = '50000';
  const PAGE_SIZE = 40;
  const BATCH_NOTE_EDITOR_KEY = '__batch_note__';
  const APP_SHELL_VERSION = resolveAppShellVersion();
  const VERSE_DATA_CACHE_PREFIX = 'halo-plugin-bible-data-';
  const VERSE_DATA_CACHE_NAME = `${VERSE_DATA_CACHE_PREFIX}v1`;
  const VERSE_DATA_CACHE_URL = './__bible_verses_cache__.json';
  const DEFAULT_NOTE_COLOR = '#2563eb';
  const RICH_EDITOR_STYLE_ID = 'bible-page-rich-note-editor-style';
  const RICH_EDITOR_DEFAULT_FONT_SIZE = 16;
  const RICH_EDITOR_FONT_SIZE_STEPS = [14, 16, 18, 22, 28];
  const RICH_EDITOR_FONT_SIZE_COMMANDS = {
    14: '3',
    16: '4',
    18: '5',
    22: '6',
    28: '7',
  };
  const RICH_EDITOR_DEFAULT_COLOR = '#0f172a';
  const RICH_EDITOR_COLOR_PRESETS = [
    { value: '#0f172a', label: '墨黑' },
    { value: '#2563eb', label: '天空蓝' },
    { value: '#059669', label: '松石绿' },
    { value: '#d97706', label: '琥珀橙' },
    { value: '#dc2626', label: '朱砂红' },
    { value: '#7c3aed', label: '葡萄紫' },
  ];
  const NOTE_COLOR_PRESETS = [
    { value: '#0f172a', label: '墨黑' },
    { value: '#2563eb', label: '天空蓝' },
    { value: '#059669', label: '松石绿' },
    { value: '#d97706', label: '琥珀橙' },
    { value: '#dc2626', label: '朱砂红' },
    { value: '#7c3aed', label: '葡萄紫' },
  ];
  const DEFAULT_NOTE_FONT_SIZE = 16;
  const MIN_NOTE_FONT_SIZE = 10;
  const MAX_NOTE_FONT_SIZE = 48;
  const DEFAULT_READER_FONT_SIZE = 18;
  const MIN_READER_FONT_SIZE = 15;
  const MAX_READER_FONT_SIZE = 32;
  let richEditorColorProbe = null;
  const BOOK_SHORT_NAMES = {
    创世记: '创',
    出埃及记: '出',
    利未记: '利',
    民数记: '民',
    申命记: '申',
    约书亚记: '书',
    士师记: '士',
    路得记: '得',
    撒母耳记上: '撒上',
    撒母耳记下: '撒下',
    列王纪上: '王上',
    列王纪下: '王下',
    历代志上: '代上',
    历代志下: '代下',
    以斯拉记: '拉',
    尼希米记: '尼',
    以斯帖记: '斯',
    约伯记: '伯',
    诗篇: '诗',
    箴言: '箴',
    传道书: '传',
    雅歌: '歌',
    以赛亚书: '赛',
    耶利米书: '耶',
    耶利米哀歌: '哀',
    以西结书: '结',
    但以理书: '但',
    何西阿书: '何',
    约珥书: '珥',
    阿摩司书: '摩',
    俄巴底亚书: '俄',
    约拿书: '拿',
    弥迦书: '弥',
    那鸿书: '鸿',
    哈巴谷书: '哈',
    西番雅书: '番',
    哈该书: '该',
    撒迦利亚书: '亚',
    玛拉基书: '玛',
    马太福音: '太',
    马可福音: '可',
    路加福音: '路',
    约翰福音: '约',
    使徒行传: '徒',
    罗马书: '罗',
    哥林多前书: '林前',
    哥林多后书: '林后',
    加拉太书: '加',
    以弗所书: '弗',
    腓立比书: '腓',
    歌罗西书: '西',
    帖撒罗尼迦前书: '帖前',
    帖撒罗尼迦后书: '帖后',
    提摩太前书: '提前',
    提摩太后书: '提后',
    提多书: '多',
    腓利门书: '门',
    希伯来书: '来',
    雅各书: '雅',
    彼得前书: '彼前',
    彼得后书: '彼后',
    约翰一书: '约一',
    约翰二书: '约二',
    约翰三书: '约三',
    犹大书: '犹',
    启示录: '启',
  };

  installBuiltinRichNoteEditorKit();

  function installBuiltinRichNoteEditorKit() {
    if (window.BibleNoteEditorKit && typeof window.BibleNoteEditorKit.create === 'function') {
      return;
    }

    ensureRichEditorStyle();

    class BuiltinBibleNoteEditor {
      constructor(host, options) {
        this.host = host;
        this.options = options || {};
        this.savedRange = null;
        this.host.classList.add('bne-host');
        this.host.innerHTML = renderRichEditorMarkup(this.options.placeholder || '给这节经文写一点笔记吧。');
        this.surface = this.host.querySelector('[data-bne-editor]');
        this.sizeLabel = this.host.querySelector('[data-bne-size-label]');
        this.toolbarButtons = Array.from(this.host.querySelectorAll('[data-bne-action]'));
        this.surface.innerHTML = String(this.options.content || '');
        normalizeRichEditorEmptyState(this.surface);

        this.handleToolbarPointerDown = this.handleToolbarPointerDown.bind(this);
        this.handleToolbarClick = this.handleToolbarClick.bind(this);
        this.handleSurfaceInput = this.handleSurfaceInput.bind(this);
        this.handleSurfaceSelectionChange = this.handleSurfaceSelectionChange.bind(this);
        this.handleDocumentSelectionChange = this.handleDocumentSelectionChange.bind(this);
        this.handlePaste = this.handlePaste.bind(this);

        this.host.addEventListener('pointerdown', this.handleToolbarPointerDown);
        this.host.addEventListener('click', this.handleToolbarClick);
        this.surface.addEventListener('input', this.handleSurfaceInput);
        this.surface.addEventListener('focus', this.handleSurfaceSelectionChange);
        this.surface.addEventListener('keyup', this.handleSurfaceSelectionChange);
        this.surface.addEventListener('mouseup', this.handleSurfaceSelectionChange);
        this.surface.addEventListener('touchend', this.handleSurfaceSelectionChange, { passive: true });
        this.surface.addEventListener('paste', this.handlePaste);
        document.addEventListener('selectionchange', this.handleDocumentSelectionChange);

        this.syncToolbar();
      }

      handleToolbarPointerDown(event) {
        const button = event.target instanceof Element ? event.target.closest('[data-bne-action]') : null;
        if (!button) {
          return;
        }
        if (isMobileViewport()) {
          return;
        }
        event.preventDefault();
        this.surface.focus();
        restoreRichEditorSelection(this.surface, this.savedRange);
      }

      handleToolbarClick(event) {
        const button = event.target instanceof Element ? event.target.closest('[data-bne-action]') : null;
        if (!button) {
          return;
        }
        event.preventDefault();
        const action = button.getAttribute('data-bne-action') || '';
        if (!action) {
          return;
        }
        this.runAction(action, button);
      }

      handleSurfaceInput() {
        normalizeRichEditorEmptyState(this.surface);
        this.captureSelection();
        this.syncToolbar();
        this.emitChange();
      }

      handleSurfaceSelectionChange() {
        this.captureSelection();
        this.syncToolbar();
      }

      handleDocumentSelectionChange() {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
          return;
        }
        const range = selection.getRangeAt(0);
        if (!this.surface.contains(range.commonAncestorContainer)) {
          return;
        }
        this.captureSelection();
        this.syncToolbar();
      }

      handlePaste(event) {
        const clipboard = event.clipboardData || window.clipboardData;
        if (!clipboard) {
          return;
        }
        const text = clipboard.getData('text/plain');
        if (!text) {
          return;
        }
        event.preventDefault();
        this.surface.focus();
        restoreRichEditorSelection(this.surface, this.savedRange);
        document.execCommand('insertHTML', false, escapeRichEditorHtml(text).replace(/\r\n/g, '\n').replace(/\n/g, '<br>'));
        normalizeRichEditorEmptyState(this.surface);
        this.captureSelection();
        this.syncToolbar();
        this.emitChange();
      }

      captureSelection() {
        this.savedRange = getRichEditorSelectionRange(this.surface);
      }

      emitChange() {
        if (typeof this.options.onChange === 'function') {
          this.options.onChange(this.getHTML());
        }
      }

      exec(command, value) {
        this.surface.focus();
        try {
          document.execCommand('styleWithCSS', false, true);
        } catch {
        }
        try {
          return document.execCommand(command, false, value == null ? null : value);
        } catch {
          return false;
        }
      }

      toggleBlockquote() {
        const active = richEditorHasAncestorTag(this.surface, 'BLOCKQUOTE');
        const values = active ? ['p', '<p>', 'div'] : ['blockquote', '<blockquote>'];
        values.some((value) => this.exec('formatBlock', value));
      }

      clearFormatting() {
        if (richEditorCommandState('insertUnorderedList')) {
          this.exec('insertUnorderedList');
        }
        if (richEditorCommandState('insertOrderedList')) {
          this.exec('insertOrderedList');
        }
        this.exec('removeFormat');
        if (richEditorHasAncestorTag(this.surface, 'BLOCKQUOTE')) {
          this.toggleBlockquote();
        }
      }

      applyColor(color) {
        this.exec('foreColor', color);
      }

      applyFontSize(fontSize) {
        this.exec('fontSize', RICH_EDITOR_FONT_SIZE_COMMANDS[fontSize] || RICH_EDITOR_FONT_SIZE_COMMANDS[RICH_EDITOR_DEFAULT_FONT_SIZE]);
      }

      changeFontSize(delta) {
        const current = getRichEditorCurrentFontSize(this.surface);
        const next = getNextRichEditorFontSize(current, delta);
        this.applyFontSize(next);
      }

      runAction(action, button) {
        this.surface.focus();
        restoreRichEditorSelection(this.surface, this.savedRange);

        if (action === 'undo') {
          this.exec('undo');
        } else if (action === 'redo') {
          this.exec('redo');
        } else if (action === 'bold') {
          this.exec('bold');
        } else if (action === 'italic') {
          this.exec('italic');
        } else if (action === 'underline') {
          this.exec('underline');
        } else if (action === 'bulletList') {
          this.exec('insertUnorderedList');
        } else if (action === 'orderedList') {
          this.exec('insertOrderedList');
        } else if (action === 'blockquote') {
          this.toggleBlockquote();
        } else if (action === 'clear') {
          this.clearFormatting();
        } else if (action === 'color') {
          this.applyColor(button.getAttribute('data-bne-color') || RICH_EDITOR_DEFAULT_COLOR);
        } else if (action === 'font-minus') {
          this.changeFontSize(-1);
        } else if (action === 'font-plus') {
          this.changeFontSize(1);
        }

        normalizeRichEditorEmptyState(this.surface);
        this.captureSelection();
        this.syncToolbar();
        this.emitChange();
      }

      syncToolbar() {
        const currentColor = getRichEditorCurrentColor(this.surface);
        const currentFontSize = getRichEditorCurrentFontSize(this.surface);

        if (this.sizeLabel) {
          this.sizeLabel.textContent = `${currentFontSize}px`;
        }

        this.toolbarButtons.forEach((button) => {
          const action = button.getAttribute('data-bne-action') || '';
          button.classList.remove('is-active', 'is-disabled');

          if (action === 'bold' && richEditorCommandState('bold')) {
            button.classList.add('is-active');
          }
          if (action === 'italic' && richEditorCommandState('italic')) {
            button.classList.add('is-active');
          }
          if (action === 'underline' && richEditorCommandState('underline')) {
            button.classList.add('is-active');
          }
          if (action === 'bulletList' && richEditorCommandState('insertUnorderedList')) {
            button.classList.add('is-active');
          }
          if (action === 'orderedList' && richEditorCommandState('insertOrderedList')) {
            button.classList.add('is-active');
          }
          if (action === 'blockquote' && richEditorHasAncestorTag(this.surface, 'BLOCKQUOTE')) {
            button.classList.add('is-active');
          }
          if (action === 'color') {
            const color = normalizeRichEditorColor(button.getAttribute('data-bne-color') || '');
            if (color && color === currentColor) {
              button.classList.add('is-active');
            }
          }
          if (action === 'undo' && !richEditorCommandEnabled('undo')) {
            button.classList.add('is-disabled');
          }
          if (action === 'redo' && !richEditorCommandEnabled('redo')) {
            button.classList.add('is-disabled');
          }
        });
      }

      focus() {
        this.surface.focus();
        if (!restoreRichEditorSelection(this.surface, this.savedRange)) {
          placeRichEditorCaretAtEnd(this.surface);
        }
      }

      getHTML() {
        normalizeRichEditorEmptyState(this.surface);
        return String(this.surface.innerHTML || '').trim();
      }

      destroy() {
        this.host.removeEventListener('pointerdown', this.handleToolbarPointerDown);
        this.host.removeEventListener('click', this.handleToolbarClick);
        this.surface.removeEventListener('input', this.handleSurfaceInput);
        this.surface.removeEventListener('focus', this.handleSurfaceSelectionChange);
        this.surface.removeEventListener('keyup', this.handleSurfaceSelectionChange);
        this.surface.removeEventListener('mouseup', this.handleSurfaceSelectionChange);
        this.surface.removeEventListener('touchend', this.handleSurfaceSelectionChange);
        this.surface.removeEventListener('paste', this.handlePaste);
        document.removeEventListener('selectionchange', this.handleDocumentSelectionChange);
        this.host.innerHTML = '';
      }
    }

    window.BibleNoteEditorKit = {
      create(host, options) {
        return new BuiltinBibleNoteEditor(host, options || {});
      },
    };
  }

  function ensureRichEditorStyle() {
    if (typeof document === 'undefined' || document.getElementById(RICH_EDITOR_STYLE_ID)) {
      return;
    }

    const style = document.createElement('style');
    style.id = RICH_EDITOR_STYLE_ID;
    style.textContent = `
      .bne-host{display:block;width:100%}
      .bne-shell{width:100%;border:1px solid rgba(203,213,225,.84);border-radius:24px;background:linear-gradient(180deg,rgba(255,255,255,.99) 0%,rgba(248,250,252,.98) 100%);box-shadow:0 18px 40px rgba(15,23,42,.08);overflow:hidden;touch-action:manipulation}
      .bne-shell:focus-within{border-color:rgba(37,99,235,.28);box-shadow:0 0 0 4px rgba(37,99,235,.08),0 18px 40px rgba(37,99,235,.08)}
      .bne-toolbar{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid rgba(226,232,240,.95);background:linear-gradient(180deg,rgba(255,255,255,.96) 0%,rgba(241,245,249,.96) 100%);overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;touch-action:pan-x;overscroll-behavior-x:contain}
      .bne-toolbar::-webkit-scrollbar{display:none}
      .bne-group{display:inline-flex;align-items:center;gap:6px;padding:4px;border:1px solid rgba(226,232,240,.96);border-radius:16px;background:rgba(226,232,240,.54);box-shadow:inset 0 1px 0 rgba(255,255,255,.9);flex:0 0 auto}
      .bne-button,.bne-color,.bne-size-step{appearance:none;-webkit-appearance:none;display:inline-flex;align-items:center;justify-content:center;min-width:38px;width:38px;min-height:38px;padding:0;border:none;border-radius:12px;background:linear-gradient(180deg,#fff 0%,#f8fafc 100%);color:#0f172a;box-shadow:0 1px 2px rgba(15,23,42,.06),0 8px 20px rgba(148,163,184,.12);cursor:pointer;touch-action:manipulation;transition:transform .18s ease,box-shadow .18s ease,background .18s ease,color .18s ease;flex:0 0 auto}
      .bne-button:hover,.bne-color:hover,.bne-size-step:hover{transform:translateY(-1px);box-shadow:0 10px 22px rgba(37,99,235,.12)}
      .bne-button.is-active,.bne-size-step.is-active{background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);color:#fff}
      .bne-button.is-disabled{opacity:.45;cursor:not-allowed;box-shadow:none}
      .bne-button__glyph{display:inline-flex;align-items:center;justify-content:center;min-width:18px;min-height:18px;color:currentColor;font-size:15px;line-height:1}
      .bne-button__glyph.is-bold{font-weight:800}
      .bne-button__glyph.is-italic{font-style:italic}
      .bne-button__glyph.is-underline{text-decoration:underline;text-underline-offset:2px}
      .bne-button svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      .bne-color{width:24px;min-width:24px;min-height:24px;height:24px;border-radius:999px;background:var(--bne-color,${RICH_EDITOR_DEFAULT_COLOR});box-shadow:inset 0 0 0 2px rgba(255,255,255,.96),0 0 0 1px rgba(148,163,184,.24)}
      .bne-color.is-active{transform:translateY(-1px);box-shadow:inset 0 0 0 2px rgba(255,255,255,.98),0 0 0 2px rgba(37,99,235,.24),0 8px 18px rgba(37,99,235,.14)}
      .bne-size{display:inline-flex;align-items:center;gap:6px;min-height:38px;padding:0 6px;border-radius:14px;background:rgba(255,255,255,.94);border:1px solid rgba(203,213,225,.8);flex:0 0 auto}
      .bne-size-label{min-width:48px;color:#0f172a;font-size:12px;font-weight:800;text-align:center}
      .bne-editor{min-height:188px;padding:18px 20px 20px;background:linear-gradient(180deg,#fff 0%,#fbfdff 100%);color:#0f172a;font-size:16px;line-height:1.8;outline:none;word-break:break-word;white-space:normal;touch-action:manipulation}
      .bne-editor:empty::before{content:attr(data-placeholder);color:#94a3b8;pointer-events:none}
      .bne-editor p,.bne-editor blockquote,.bne-editor ol,.bne-editor ul,.bne-editor pre{margin:0 0 10px}
      .bne-editor p:last-child,.bne-editor blockquote:last-child,.bne-editor ol:last-child,.bne-editor ul:last-child,.bne-editor pre:last-child{margin-bottom:0}
      .bne-editor ul,.bne-editor ol{padding-left:1.4em}
      .bne-editor blockquote{padding-left:14px;border-left:3px solid rgba(148,163,184,.28);color:#475569}
      .bne-editor pre{padding:10px 12px;border-radius:12px;background:rgba(15,23,42,.04);overflow:auto}
      @media (max-width:640px){.bne-shell{border-radius:22px}.bne-toolbar{gap:8px;padding:10px 10px 12px}.bne-group{gap:5px;padding:4px}.bne-button,.bne-size-step{min-width:36px;width:36px;min-height:36px}.bne-size-label{min-width:42px;font-size:11px}.bne-editor{min-height:162px;padding:16px;font-size:16px;line-height:1.75}}
    `;
    document.head.appendChild(style);
  }

  function renderRichEditorMarkup(placeholder) {
    return `
      <div class="bne-shell">
        <div class="bne-toolbar" role="toolbar" aria-label="笔记编辑工具栏">
          <div class="bne-group" role="group" aria-label="撤销与重做">
            ${renderRichEditorButton('undo', '撤销', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7 5 11l4 4"></path><path d="M5 11h8a6 6 0 1 1 0 12h-1"></path></svg>')}
            ${renderRichEditorButton('redo', '重做', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 7 4 4-4 4"></path><path d="M19 11h-8a6 6 0 1 0 0 12h1"></path></svg>')}
          </div>
          <div class="bne-group" role="group" aria-label="文字格式">
            ${renderRichEditorButton('bold', '加粗', '<span class="bne-button__glyph is-bold">B</span>')}
            ${renderRichEditorButton('italic', '斜体', '<span class="bne-button__glyph is-italic">I</span>')}
            ${renderRichEditorButton('underline', '下划线', '<span class="bne-button__glyph is-underline">U</span>')}
          </div>
          <div class="bne-group" role="group" aria-label="段落格式">
            ${renderRichEditorButton('bulletList', '无序列表', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 7h9"></path><path d="M10 12h9"></path><path d="M10 17h9"></path><circle cx="5.5" cy="7" r="1.2" fill="currentColor" stroke="none"></circle><circle cx="5.5" cy="12" r="1.2" fill="currentColor" stroke="none"></circle><circle cx="5.5" cy="17" r="1.2" fill="currentColor" stroke="none"></circle></svg>')}
            ${renderRichEditorButton('orderedList', '有序列表', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 7h9"></path><path d="M10 12h9"></path><path d="M10 17h9"></path><path d="M4.5 6.2h1.8v2.4"></path><path d="M4.3 12.2c.3-.4.9-.7 1.5-.7.9 0 1.5.5 1.5 1.2 0 1.4-2.7 1.1-2.7 3h2.8"></path><path d="M4.4 17.6c.3.4.8.6 1.4.6.9 0 1.6-.5 1.6-1.2 0-.8-.7-1.2-1.6-1.2h-.4"></path></svg>')}
            ${renderRichEditorButton('blockquote', '引用', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 9.5H7.1a2.6 2.6 0 0 0-2.6 2.6v4.8h5.6v-7.4Z"></path><path d="M19.5 9.5h-2.4a2.6 2.6 0 0 0-2.6 2.6v4.8h5.6v-7.4Z"></path></svg>')}
            ${renderRichEditorButton('clear', '清除格式', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 8-8"></path><path d="m13.5 6.5 4 4"></path><path d="m6.5 17.5 8.8-8.8a1.7 1.7 0 0 0 0-2.4l-1.6-1.6a1.7 1.7 0 0 0-2.4 0L4 12v4.5Z"></path><path d="M16 17h4"></path></svg>')}
          </div>
          <div class="bne-group" role="group" aria-label="文字颜色">
            ${RICH_EDITOR_COLOR_PRESETS.map((preset) => `
              <button class="bne-color" type="button" data-bne-action="color" data-bne-color="${preset.value}" style="--bne-color:${preset.value}" aria-label="${preset.label}" title="${preset.label}"></button>
            `).join('')}
          </div>
          <div class="bne-group" role="group" aria-label="字号">
            <div class="bne-size">
              <button class="bne-size-step" type="button" data-bne-action="font-minus" aria-label="减小字号" title="减小字号">A-</button>
              <strong class="bne-size-label" data-bne-size-label>${RICH_EDITOR_DEFAULT_FONT_SIZE}px</strong>
              <button class="bne-size-step" type="button" data-bne-action="font-plus" aria-label="增大字号" title="增大字号">A+</button>
            </div>
          </div>
        </div>
        <div class="bne-editor" contenteditable="true" spellcheck="true" data-bne-editor data-placeholder="${escapeRichEditorHtml(placeholder)}"></div>
      </div>
    `;
  }

  function renderRichEditorButton(action, title, content) {
    return `<button class="bne-button" type="button" data-bne-action="${action}" aria-label="${title}" title="${title}"><span class="bne-button__glyph">${content}</span></button>`;
  }

  function escapeRichEditorHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeRichEditorColor(value) {
    if (!document.body) {
      return String(value || '').trim().toLowerCase();
    }
    if (!(richEditorColorProbe instanceof HTMLElement) || !document.body.contains(richEditorColorProbe)) {
      richEditorColorProbe = document.createElement('span');
      richEditorColorProbe.setAttribute('aria-hidden', 'true');
      richEditorColorProbe.style.cssText = 'position:absolute;opacity:0;pointer-events:none;left:-9999px;top:-9999px;';
      document.body.appendChild(richEditorColorProbe);
    }
    richEditorColorProbe.style.color = '';
    richEditorColorProbe.style.color = String(value || '').trim();
    if (!richEditorColorProbe.style.color) {
      return '';
    }
    return window.getComputedStyle(richEditorColorProbe).color.replace(/\s+/g, '').toLowerCase();
  }

  function getRichEditorFontSizeValue(value) {
    const text = String(value || '').trim().toLowerCase();
    if (!text) {
      return 0;
    }
    const namedSizes = {
      'x-small': 12,
      small: 13,
      medium: 14,
      large: 18,
      'x-large': 22,
      'xx-large': 28,
    };
    if (namedSizes[text]) {
      return namedSizes[text];
    }
    const pxMatch = text.match(/^(\d+(?:\.\d+)?)px$/);
    if (pxMatch) {
      return Number(pxMatch[1]);
    }
    if (/^[1-7]$/.test(text)) {
      return ({ 1: 12, 2: 13, 3: 14, 4: 16, 5: 18, 6: 22, 7: 28 })[text];
    }
    return 0;
  }

  function getNearestRichEditorFontSize(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return RICH_EDITOR_DEFAULT_FONT_SIZE;
    }
    return RICH_EDITOR_FONT_SIZE_STEPS.reduce((closest, current) => {
      return Math.abs(current - numeric) < Math.abs(closest - numeric) ? current : closest;
    }, RICH_EDITOR_FONT_SIZE_STEPS[0]);
  }

  function getNextRichEditorFontSize(current, delta) {
    const currentSize = getNearestRichEditorFontSize(current);
    const index = RICH_EDITOR_FONT_SIZE_STEPS.findIndex((item) => item === currentSize);
    const nextIndex = Math.max(0, Math.min(RICH_EDITOR_FONT_SIZE_STEPS.length - 1, index + delta));
    return RICH_EDITOR_FONT_SIZE_STEPS[nextIndex];
  }

  function getRichEditorSelectionRange(surface) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }
    const range = selection.getRangeAt(0);
    if (!surface.contains(range.commonAncestorContainer)) {
      return null;
    }
    return range.cloneRange();
  }

  function restoreRichEditorSelection(surface, savedRange) {
    const selection = window.getSelection();
    if (!selection) {
      return false;
    }
    selection.removeAllRanges();
    if (savedRange) {
      try {
        if (surface.contains(savedRange.commonAncestorContainer)) {
          selection.addRange(savedRange);
          return true;
        }
      } catch {
      }
    }
    const range = document.createRange();
    range.selectNodeContents(surface);
    range.collapse(false);
    selection.addRange(range);
    return false;
  }

  function placeRichEditorCaretAtEnd(surface) {
    const selection = window.getSelection();
    if (!selection) {
      return;
    }
    const range = document.createRange();
    range.selectNodeContents(surface);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function getRichEditorSelectionNode(surface) {
    const range = getRichEditorSelectionRange(surface);
    return range ? range.startContainer : null;
  }

  function getRichEditorClosestElement(node, surface) {
    let current = node && node.nodeType === Node.ELEMENT_NODE ? node : node && node.parentElement;
    while (current && current !== surface) {
      if (current instanceof HTMLElement) {
        return current;
      }
      current = current.parentElement;
    }
    return surface instanceof HTMLElement ? surface : null;
  }

  function richEditorHasAncestorTag(surface, tagName) {
    let current = getRichEditorClosestElement(getRichEditorSelectionNode(surface), surface);
    while (current && current !== surface) {
      if (current.tagName === tagName) {
        return true;
      }
      current = current.parentElement;
    }
    return false;
  }

  function getRichEditorCurrentColor(surface) {
    let current = getRichEditorClosestElement(getRichEditorSelectionNode(surface), surface);
    while (current) {
      const color = current.style && current.style.color ? current.style.color : current.getAttribute('color');
      if (color) {
        return normalizeRichEditorColor(color);
      }
      if (current === surface) {
        break;
      }
      current = current.parentElement;
    }
    return normalizeRichEditorColor(window.getComputedStyle(surface).color || RICH_EDITOR_DEFAULT_COLOR);
  }

  function getRichEditorCurrentFontSize(surface) {
    let current = getRichEditorClosestElement(getRichEditorSelectionNode(surface), surface);
    while (current) {
      const fontSize = getRichEditorFontSizeValue(current.style && current.style.fontSize ? current.style.fontSize : current.getAttribute('size'));
      if (fontSize) {
        return getNearestRichEditorFontSize(fontSize);
      }
      if (current === surface) {
        break;
      }
      current = current.parentElement;
    }
    return getNearestRichEditorFontSize(getRichEditorFontSizeValue(window.getComputedStyle(surface).fontSize) || RICH_EDITOR_DEFAULT_FONT_SIZE);
  }

  function richEditorCommandState(command) {
    try {
      return !!document.queryCommandState(command);
    } catch {
      return false;
    }
  }

  function richEditorCommandEnabled(command) {
    try {
      return !!document.queryCommandEnabled(command);
    } catch {
      return false;
    }
  }

  function normalizeRichEditorEmptyState(surface) {
    const text = String(surface.textContent || '').replace(/\u00a0/g, ' ').trim();
    if (!text && !surface.querySelector('br, li, img, video, audio, iframe')) {
      surface.innerHTML = '';
    }
  }

  function uniqueStrings(values) {
    return Array.from(new Set(values.filter(Boolean)));
  }

  function parsePluginIdFromPath(pathname) {
    if (!pathname) {
      return null;
    }
    const assetMatch = pathname.match(/\/plugins\/([^/]+)\/(?:assets|console)(?:\/|$)/i);
    if (assetMatch && assetMatch[1]) {
      const pluginId = decodeURIComponent(assetMatch[1]);
      return pluginId === '-' ? null : pluginId;
    }
    const routeMatch = pathname.match(/\/plugins\/([^/?#]+)(?:\/|$)/i);
    if (routeMatch && routeMatch[1]) {
      const pluginId = decodeURIComponent(routeMatch[1]);
      return pluginId === '-' ? null : pluginId;
    }
    return null;
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

  function resolvePluginIds() {
    const currentScript = document.currentScript && document.currentScript.src ? document.currentScript.src : '';
    const matchedScript = Array.from(document.scripts || [])
      .map((script) => script.src)
      .find((src) => /\/plugins\/[^/]+\/assets\/theme-bible-page\.js(?:\?|$)/i.test(src));
    return uniqueStrings([
      parsePluginIdFromPath(window.location.pathname),
      parsePluginIdFromPath(toPathname(currentScript)),
      parsePluginIdFromPath(toPathname(matchedScript)),
      ...FALLBACK_PLUGIN_IDS,
    ]);
  }

  function buildApiPrefixes(pluginIds) {
    return uniqueStrings([
      ...pluginIds.flatMap((pluginId) => [
        `/apis/plugin.api.halo.run/v1alpha1/plugins/${pluginId}/bible`,
        `/apis/plugin.api.halo.run/v1alpha1/plugins/${pluginId}`,
        `/apis/api.plugin.halo.run/v1alpha1/plugins/${pluginId}/bible`,
        `/apis/api.plugin.halo.run/v1alpha1/plugins/${pluginId}`,
      ]),
    ]);
  }

  function buildBuiltinCsvPaths(pluginIds) {
    return uniqueStrings(pluginIds.map((pluginId) => `/plugins/${pluginId}/assets/bible.csv`));
  }
  const copyShortcutLabel = getCopyShortcutLabel();
  const previousChapterShortcutLabel = getPreviousChapterShortcutLabel();
  const nextChapterShortcutLabel = getNextChapterShortcutLabel();
  const resetShortcutLabel = getResetShortcutLabel();
  const defaultSelectedCopyLabel = `复制已选（${copyShortcutLabel}）`;

  function resolveAppShellVersion() {
    if (window.__BIBLE_PAGE_VERSION__) {
      return String(window.__BIBLE_PAGE_VERSION__);
    }

    try {
      const currentScript = document.currentScript;
      const src = currentScript && currentScript.src ? currentScript.src : '';
      if (src) {
        const version = new URL(src, window.location.href).searchParams.get('v');
        if (version) {
          return version;
        }
      }
    } catch {
    }

    return 'dev';
  }

  const state = {
    verses: [],
    keyword: '',
    searchKeyword: '',
    searchFilterCovenant: 'all',
    searchFilterBook: '',
    loading: true,
    error: '',
    currentView: getViewFromHash(window.location.hash),
    showSearchResults: false,
    currentCovenant: 'old',
    selectedBook: '',
    selectedChapter: null,
    browseControlsCollapsed: false,
    mobileSidebarOpen: false,
    currentPage: 1,
    showJumpInput: false,
    jumpPageValue: '',
    copyPageLabel: '复制本页',
    selectedCopyLabel: defaultSelectedCopyLabel,
    copiedVerseId: '',
    focusedVerseId: '',
    selectedMap: new Map(),
    notes: {},
    highlightedVerseIds: new Set(loadHighlightedVerseIds()),
    activeNoteKey: '',
    batchNoteDraft: '',
    readerFontSize: loadReaderFontSize(),
    mobileSelectionMenuOpen: false,
    noteMode: 'local',
    noteUsername: '',
    noteStatus: '',
    savingNoteKey: '',
    confirmedSavedNoteKey: '',
    confirmedSavedAt: '',
    noteDetailGroupId: '',
    noteToolbarStyles: {},
  };

  let copyPageTimer = 0;
  let copySelectedTimer = 0;
  let copyVerseTimer = 0;
  let noteStatusTimer = 0;
  let focusVerseTimer = 0;
  let toolbarInteractionTimer = 0;
  let activeToolbarKey = '';
  let readerTouchStart = null;
  const noteSaveTimers = new Map();
  const noteSelectionRanges = new Map();
  const noteRichEditors = new Map();

  root.addEventListener('click', handleClick);
  root.addEventListener('input', handleInput);
  root.addEventListener('change', handleChange);
  root.addEventListener('focusout', handleFocusOut, true);
  root.addEventListener('keydown', handleRootKeydown);
  root.addEventListener('pointerdown', handlePointerDown, true);
  root.addEventListener('pointerup', handlePointerRelease, true);
  root.addEventListener('pointercancel', handlePointerRelease, true);
  root.addEventListener('touchstart', handleTouchStart, { passive: true });
  root.addEventListener('touchend', handleTouchEnd, { passive: true });
  document.addEventListener('keydown', handleDocumentKeydown);
  document.addEventListener('selectionchange', handleSelectionChange);
  window.addEventListener('hashchange', handleHashChange);

  registerAppShell();
  void refreshData();

  function handleInput(event) {
    const target = event.target;
    if (target instanceof HTMLElement && target.hasAttribute('data-note-editor')) {
      handleNoteEditorInput(target);
      return;
    }

    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    if (target.hasAttribute('data-search-input')) {
      state.keyword = target.value;
      return;
    }

    if (target.hasAttribute('data-jump-input')) {
      state.jumpPageValue = target.value;
    }
  }

  function handleChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    if (target.hasAttribute('data-note-import-input')) {
      void importNotesFromFile(target);
    }
  }

  function resolveNoteToolbarKey(target) {
    if (!(target instanceof Element)) {
      return '';
    }

    return target.getAttribute('data-note-key')
      || target.getAttribute('data-note-clear')
      || target.getAttribute('data-note-size-key')
      || (target.getAttribute('data-action') === 'apply-batch-note' ? BATCH_NOTE_EDITOR_KEY : '');
  }

  function shouldPreserveNoteSelection(target) {
    if (!(target instanceof Element)) {
      return false;
    }

    return !!target.closest([
      'button[data-note-command]',
      'button[data-note-color-value]',
      'button[data-note-clear]',
      'button[data-action="note-size-step"]',
      'button[data-action="apply-batch-note"]',
    ].join(', '));
  }

  function handlePointerDown(event) {
    const source = event.target instanceof Element ? event.target : null;
    const toolbar = source ? source.closest('[data-note-toolbar-for]') : null;
    const toolbarTarget = toolbar
      ? source.closest('[data-note-key], [data-note-clear], [data-note-size-key], [data-note-color-value], [data-action="apply-batch-note"]')
      : null;
    if (toolbarTarget && root.contains(toolbarTarget)) {
      activeToolbarKey = resolveNoteToolbarKey(toolbarTarget);
      const selectionRange = getCurrentSelectionRange();
      if (activeToolbarKey && selectionRange) {
        noteSelectionRanges.set(activeToolbarKey, selectionRange);
      }
      if (toolbarInteractionTimer) {
        window.clearTimeout(toolbarInteractionTimer);
      }
      toolbarInteractionTimer = window.setTimeout(() => {
        activeToolbarKey = '';
      }, 600);

      if (shouldPreserveNoteSelection(source)) {
        event.preventDefault();
      }
    }
  }

  function handlePointerRelease() {}

  function handleSelectionChange() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const anchorNode = selection.anchorNode;
    if (!anchorNode) {
      return;
    }

    const anchorElement = anchorNode.nodeType === Node.ELEMENT_NODE ? anchorNode : anchorNode.parentElement;
    if (!(anchorElement instanceof Element)) {
      return;
    }

    const editor = anchorElement.closest('[data-note-editor]');
    if (!(editor instanceof HTMLElement) || !root.contains(editor)) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) {
      return;
    }

    const key = editor.getAttribute('data-note-editor') || '';
    if (key) {
      noteSelectionRanges.set(key, range.cloneRange());
    }
  }

  function handleFocusOut(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.hasAttribute('data-note-editor')) {
      return;
    }

    const key = target.getAttribute('data-note-editor') || '';
    if (isNoteToolbarTarget(event.relatedTarget, key) || activeToolbarKey === key) {
      return;
    }
    if (key === BATCH_NOTE_EDITOR_KEY) {
      target.innerHTML = state.batchNoteDraft || '';
      return;
    }
    const note = state.notes[key];
    target.innerHTML = note ? note.html : '';
    flushNoteSave(key);
  }

  function handleClick(event) {
    const button = event.target instanceof Element ? event.target.closest('button') : null;
    if (!button || !root.contains(button)) {
      const verseToggle = event.target instanceof Element ? event.target.closest('[data-toggle-verse]') : null;
      if (verseToggle && root.contains(verseToggle)) {
        const verseId = verseToggle.getAttribute('data-toggle-verse') || '';
        toggleVerseById(verseId);
        render();
        return;
      }

      const noteDetailTrigger = event.target instanceof Element ? event.target.closest('[data-open-note-detail]') : null;
      if (noteDetailTrigger && root.contains(noteDetailTrigger)) {
        openNoteGroupDetail(noteDetailTrigger.getAttribute('data-open-note-detail') || '');
        render();
      }
      return;
    }

    if (button.dataset.covenant) {
      selectCovenant(button.dataset.covenant === 'new' ? 'new' : 'old');
      render();
      return;
    }

    if (button.dataset.book) {
      selectBook(button.dataset.book);
      render();
      return;
    }

    if (button.dataset.chapter) {
      selectChapter(Number(button.dataset.chapter));
      render();
      return;
    }

    if (button.dataset.searchCovenant) {
      setSearchFilterCovenant(button.dataset.searchCovenant);
      render();
      return;
    }

    if (button.hasAttribute('data-search-book')) {
      setSearchFilterBook(button.getAttribute('data-search-book') || '');
      render();
      return;
    }

    if (button.dataset.page) {
      goToPage(Number(button.dataset.page));
      render();
      return;
    }

    if (button.dataset.pageNav) {
      goToPage(state.currentPage + Number(button.dataset.pageNav));
      render();
      return;
    }

    if (button.hasAttribute('data-copy-verse')) {
      void copyVerse(button.getAttribute('data-copy-verse') || '');
      return;
    }

    if (button.hasAttribute('data-jump-verse')) {
      jumpToVerse(button.getAttribute('data-jump-verse') || '');
      render();
      scheduleFocusedVerseScroll();
      return;
    }

    if (button.hasAttribute('data-note-toggle')) {
      const key = button.getAttribute('data-note-toggle') || '';
      state.activeNoteKey = key;
      render();
      focusNoteEditor(key);
      return;
    }

    if (button.hasAttribute('data-note-clear')) {
      void clearNote(button.getAttribute('data-note-clear') || '');
      return;
    }

    if (button.hasAttribute('data-note-command')) {
      applyNoteCommand(
        button.getAttribute('data-note-key') || '',
        button.getAttribute('data-note-command') || '',
        button.getAttribute('data-note-value') || ''
      );
      return;
    }

    if (button.hasAttribute('data-note-color-value')) {
      const key = button.getAttribute('data-note-key') || '';
      const color = sanitizeNoteColor(button.getAttribute('data-note-color-value')) || DEFAULT_NOTE_COLOR;
      setNoteToolbarStyle(key, { color });
      applyNoteCommand(key, 'setTextColor', color);
      return;
    }

    if (button.hasAttribute('data-open-note')) {
      openNoteFromList(button.getAttribute('data-open-note') || '');
      return;
    }

    if (button.hasAttribute('data-open-note-detail')) {
      openNoteGroupDetail(button.getAttribute('data-open-note-detail') || '');
      render();
      return;
    }

    if (button.hasAttribute('data-open-note-group')) {
      openNoteGroupFromList(button.getAttribute('data-open-note-group') || '');
      return;
    }

    if (button.hasAttribute('data-delete-note-group')) {
      void deleteNoteGroup(button.getAttribute('data-delete-note-group') || '');
      return;
    }

    if (button.hasAttribute('data-view')) {
      setCurrentView(button.getAttribute('data-view') || 'home');
      render();
      return;
    }

    if (button.hasAttribute('data-remove-selected')) {
      removeSelected(button.getAttribute('data-remove-selected') || '');
      render();
      return;
    }

    const action = button.getAttribute('data-action') || '';
    if (action === 'search') {
      runSearch();
      render();
      return;
    }
    if (action === 'clear-search') {
      clearSearch();
      render();
      return;
    }
    if (action === 'toggle-browse') {
      state.browseControlsCollapsed = !state.browseControlsCollapsed;
      render();
      return;
    }
    if (action === 'copy-page') {
      void copyCurrentPage();
      return;
    }
    if (action === 'copy-selected') {
      void copySelectedVerses();
      return;
    }
    if (action === 'open-note-from-selection') {
      openNoteFromSelection();
      return;
    }
    if (action === 'toggle-highlight-selected') {
      toggleHighlightSelected();
      return;
    }
    if (action === 'decrease-reader-font') {
      adjustReaderFontSize(-1);
      return;
    }
    if (action === 'increase-reader-font') {
      adjustReaderFontSize(1);
      return;
    }
    if (action === 'note-size-step') {
      stepNoteToolbarFontSize(
        button.getAttribute('data-note-size-key') || '',
        Number(button.getAttribute('data-note-size-step') || '0')
      );
      return;
    }
    if (action === 'hide-mobile-selection-menu') {
      state.mobileSelectionMenuOpen = false;
      render();
      return;
    }
    if (action === 'show-mobile-selection-menu') {
      if (state.selectedMap.size) {
        state.mobileSelectionMenuOpen = true;
        render();
      }
      return;
    }
    if (action === 'reset-selected') {
      resetSelection();
      render();
      return;
    }
    if (action === 'download-notes') {
      downloadNotes();
      return;
    }
    if (action === 'toggle-batch-note') {
      toggleNotePanel(BATCH_NOTE_EDITOR_KEY);
      render();
      focusNoteEditor(BATCH_NOTE_EDITOR_KEY);
      return;
    }
    if (action === 'apply-batch-note') {
      void applyBatchNoteToSelected();
      return;
    }
    if (action === 'import-notes') {
      triggerNotesImport();
      return;
    }
    if (action === 'toggle-mobile-sidebar') {
      state.mobileSidebarOpen = !state.mobileSidebarOpen;
      render();
      return;
    }
    if (action === 'close-mobile-sidebar') {
      state.mobileSidebarOpen = false;
      render();
      return;
    }
    if (action === 'back-note-list') {
      closeNoteGroupDetail();
      render();
      return;
    }
    if (action === 'close-note') {
      const key = button.getAttribute('data-note-close') || '';
      if (state.activeNoteKey === key) {
        state.activeNoteKey = '';
        render();
      }
      return;
    }
    if (action === 'save-close-note') {
      void saveNote(button.getAttribute('data-note-save') || '', true);
      return;
    }
    if (action === 'reader-previous') {
      goToReaderDirection(-1);
      render();
      return;
    }
    if (action === 'reader-next') {
      goToReaderDirection(1);
      render();
      return;
    }
    if (action === 'previous-chapter') {
      goToAdjacentChapter(-1);
      render();
      return;
    }
    if (action === 'next-chapter') {
      goToAdjacentChapter(1);
      render();
      return;
    }
    if (action === 'toggle-jump') {
      state.showJumpInput = !state.showJumpInput;
      state.jumpPageValue = state.showJumpInput ? String(state.currentPage) : '';
      render();
      if (state.showJumpInput) {
        focusJumpInput();
      }
      return;
    }
    if (action === 'submit-jump') {
      submitJumpPage();
      render();
    }
  }

  function handleRootKeydown(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.hasAttribute('data-search-input') && event.key === 'Enter') {
      event.preventDefault();
      runSearch();
      render();
      return;
    }

    if (target.hasAttribute('data-jump-input') && event.key === 'Enter') {
      event.preventDefault();
      submitJumpPage();
      render();
      return;
    }

    if (target.hasAttribute('data-toggle-verse') && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      toggleVerseById(target.getAttribute('data-toggle-verse') || '');
      render();
    }
  }

  function handleDocumentKeydown(event) {
    if (isEditableTarget(event.target)) {
      return;
    }

    if (state.currentView !== 'home') {
      return;
    }

    if (getSelectedVerses().length && isCopyShortcut(event)) {
      event.preventDefault();
      void copySelectedVerses();
      return;
    }

    if (getSelectedVerses().length && isResetShortcut(event)) {
      event.preventDefault();
      resetSelection();
      render();
      return;
    }

    if (isPreviousChapterShortcut(event)) {
      const target = getAdjacentChapterTarget(-1);
      if (target) {
        event.preventDefault();
        goToChapterTarget(target);
        render();
      }
      return;
    }

    if (isNextChapterShortcut(event)) {
      const target = getAdjacentChapterTarget(1);
      if (target) {
        event.preventDefault();
        goToChapterTarget(target);
        render();
      }
      return;
    }

    if (event.key === 'ArrowLeft' && state.currentPage > 1) {
      event.preventDefault();
      goToPage(state.currentPage - 1);
      render();
      return;
    }

    if (event.key === 'ArrowRight' && state.currentPage < getTotalPages(getFilteredVerses().length)) {
      event.preventDefault();
      goToPage(state.currentPage + 1);
      render();
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      scrollContentBy(-160);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      scrollContentBy(160);
    }
  }

  function registerAppShell() {
    updateStandaloneClass();

    if (window.matchMedia) {
      const media = window.matchMedia('(display-mode: standalone)');
      if (typeof media.addEventListener === 'function') {
        media.addEventListener('change', updateStandaloneClass);
      } else if (typeof media.addListener === 'function') {
        media.addListener(updateStandaloneClass);
      }
    }

    if ('serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.register(`./theme-bible-sw.js?v=${encodeURIComponent(APP_SHELL_VERSION)}`)
        .then((registration) => registration.update().catch(() => {}))
        .catch(() => {});
    }
  }

  function handleTouchStart(event) {
    if (!isMobileViewport() || state.currentView !== 'home' || state.showSearchResults) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const swipeSurface = target.closest('[data-reader-swipe]');
    if (!swipeSurface || !root.contains(swipeSurface) || isReaderInteractiveTarget(target)) {
      return;
    }

    const touch = event.changedTouches && event.changedTouches[0];
    if (!touch) {
      return;
    }

    readerTouchStart = {
      x: touch.clientX,
      y: touch.clientY,
    };
  }

  function handleTouchEnd(event) {
    if (!readerTouchStart || !isMobileViewport() || state.currentView !== 'home' || state.showSearchResults) {
      readerTouchStart = null;
      return;
    }

    const touch = event.changedTouches && event.changedTouches[0];
    if (!touch) {
      readerTouchStart = null;
      return;
    }

    const deltaX = touch.clientX - readerTouchStart.x;
    const deltaY = touch.clientY - readerTouchStart.y;
    readerTouchStart = null;

    if (Math.abs(deltaX) < 54 || Math.abs(deltaY) > 46) {
      return;
    }

    if (deltaX < 0) {
      goToReaderDirection(1);
      render();
      return;
    }

    goToReaderDirection(-1);
    render();
  }

  async function refreshData() {
    state.loading = true;
    state.error = '';
    render();

    try {
      const notesPromise = refreshNotes();
      const bootstrapVerses = await loadBootstrapBibleData().catch(() => []);

      if (bootstrapVerses.length) {
        applyLoadedVerses(bootstrapVerses);
        state.loading = false;
        render();
      }

      await notesPromise;
      if (bootstrapVerses.length) {
        render();
      }

      const freshVerses = await loadFreshBibleData();
      if (freshVerses.length) {
        applyLoadedVerses(freshVerses);
      } else if (!bootstrapVerses.length) {
        throw new Error('无法加载圣经数据。');
      }
    } catch (error) {
      state.error = error instanceof Error ? error.message : String(error);
    } finally {
      state.loading = false;
      render();
    }
  }

  function applyLoadedVerses(verses) {
    state.verses = sortVerses(Array.isArray(verses) ? verses : []);
    syncSelectedVerses();
    ensureBrowseSelection();
    normalizeSearchFilters();
  }

  async function loadBootstrapBibleData() {
    const cachedVerses = await readVerseDataCache();
    if (cachedVerses.length) {
      return cachedVerses;
    }

    const builtinVerses = parseCsvText(await fetchBuiltinCsv());
    if (builtinVerses.length) {
      void writeVerseDataCache(builtinVerses, 'builtin');
    }
    return builtinVerses;
  }

  async function loadFreshBibleData() {
    try {
      const verses = await fetchAllVersesFromBackend();
      if (verses.length) {
        void writeVerseDataCache(verses, 'backend');
        return verses;
      }
    } catch {
    }

    const builtinVerses = parseCsvText(await fetchBuiltinCsv());
    if (builtinVerses.length) {
      void writeVerseDataCache(builtinVerses, 'builtin');
    }
    return builtinVerses;
  }

  async function readVerseDataCache() {
    if (!('caches' in window)) {
      return [];
    }

    try {
      const cache = await window.caches.open(VERSE_DATA_CACHE_NAME);
      const response = await cache.match(VERSE_DATA_CACHE_URL, { ignoreSearch: true });
      if (!response) {
        const legacyVerses = await readLegacyVerseDataCache();
        if (legacyVerses.length) {
          void writeVerseDataCache(legacyVerses, 'migrated');
        }
        return legacyVerses;
      }

      const payload = await response.json().catch(() => null);
      const cachedVerses = Array.isArray(payload && payload.verses) ? payload.verses : [];
      return cachedVerses.map(normalizeVerseRecord).filter((item) => item && item.id);
    } catch {
      return [];
    }
  }

  async function readLegacyVerseDataCache() {
    try {
      const cacheKeys = await window.caches.keys();
      const legacyKeys = cacheKeys
        .filter((key) => key !== VERSE_DATA_CACHE_NAME && key.startsWith(VERSE_DATA_CACHE_PREFIX))
        .reverse();

      for (const key of legacyKeys) {
        const cache = await window.caches.open(key);
        const response = await cache.match(VERSE_DATA_CACHE_URL, { ignoreSearch: true });
        if (!response) {
          continue;
        }

        const payload = await response.json().catch(() => null);
        const cachedVerses = Array.isArray(payload && payload.verses) ? payload.verses : [];
        const normalized = cachedVerses.map(normalizeVerseRecord).filter((item) => item && item.id);
        if (normalized.length) {
          return normalized;
        }
      }
    } catch {
    }

    return [];
  }

  async function writeVerseDataCache(verses, source) {
    if (!('caches' in window) || !Array.isArray(verses) || !verses.length) {
      return;
    }

    try {
      const cache = await window.caches.open(VERSE_DATA_CACHE_NAME);
      const payload = JSON.stringify({
        version: APP_SHELL_VERSION,
        source: source || 'unknown',
        savedAt: new Date().toISOString(),
        verses,
      });
      await cache.put(
        VERSE_DATA_CACHE_URL,
        new Response(payload, {
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    } catch {
    }
  }

  function extractErrorMessage(text, status) {
    const fallback = text || `HTTP ${status}`;
    if (!text) {
      return fallback;
    }

    try {
      const payload = JSON.parse(text);
      if (payload && typeof payload.detail === 'string' && payload.detail.trim()) {
        return payload.detail.trim();
      }
      if (payload && typeof payload.message === 'string' && payload.message.trim()) {
        return payload.message.trim();
      }
      if (payload && typeof payload.title === 'string' && payload.title.trim()) {
        return payload.title.trim();
      }
    } catch {
    }

    return fallback;
  }

  async function requestJson(path, init) {
    let lastError = null;

    for (const prefix of API_PREFIXES) {
      const response = await fetch(`${prefix}${path}`, {
        mode: 'same-origin',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          ...(init && init.headers ? init.headers : {}),
        },
        ...(init || {}),
      }).catch((error) => {
        lastError = error instanceof Error ? error : new Error(String(error));
        return null;
      });

      if (!response) {
        continue;
      }

      if (response.ok) {
        if (response.status === 204) {
          return undefined;
        }
        return response.json();
      }

      if (response.status !== 404) {
        const text = await response.text().catch(() => '');
        throw new Error(extractErrorMessage(text, response.status));
      }

      lastError = new Error(`HTTP ${response.status}`);
    }

    throw lastError || new Error('无法加载圣经接口数据。');
  }

  async function fetchAllVersesFromBackend() {
    const allVerses = [];
    let startCursor = null;

    for (;;) {
      const params = new URLSearchParams({ pageSize: FULL_DATA_PAGE_SIZE });
      if (startCursor) {
        params.set('startCursor', startCursor);
      }

      const result = await requestJson(`/verses?${params.toString()}`);
      for (const item of result.verses || []) {
        const verse = normalizeVerseRecord(item);
        if (verse.id) {
          allVerses.push(verse);
        }
      }

      if (!result.hasMore || !result.nextCursor) {
        break;
      }
      startCursor = result.nextCursor;
    }

    return allVerses;
  }

  async function fetchBuiltinCsv() {
    for (const path of BUILTIN_CSV_PATHS) {
      const response = await fetch(path, { mode: 'same-origin', credentials: 'include' }).catch(() => null);
      if (response && response.ok) {
        return response.text();
      }
    }
    throw new Error('无法加载内置圣经数据。');
  }

  function normalizeVerseRecord(dto) {
    const bookName = String(dto && dto.bookName || '').trim();
    const chapterNumber = Number(dto && dto.chapterNumber) || 0;
    const verseNumber = Number(dto && dto.verseNumber) || 0;
    return {
      id: buildVerseNoteKey({ bookName, chapterNumber, verseNumber }),
      covenantName: String(dto && dto.covenantName || '').trim(),
      category: String(dto && dto.category || '').trim(),
      bookName,
      bookNumber: Number(dto && dto.bookNumber) || 0,
      chapterNumber,
      verseNumber,
      content: String(dto && dto.content || '').trim(),
    };
  }

  function parseCsvText(text) {
    const lines = String(text || '').replace(/\r\n/g, '\n').split('\n').filter((line) => line.trim());
    if (lines.length < 2) {
      return [];
    }

    return lines.slice(1).map((line, index) => {
      const parts = line.replace(/\uFEFF/g, '').split(',');
      if (parts.length < 7) {
        return null;
      }

      return normalizeVerseRecord({
        covenantName: (parts[0] || '').trim(),
        category: (parts[1] || '').trim(),
        bookName: (parts[2] || '').trim(),
        bookNumber: Number((parts[3] || '').trim()) || 0,
        chapterNumber: Number((parts[4] || '').trim()) || 0,
        verseNumber: Number((parts[5] || '').trim()) || 0,
        content: parts.slice(6).join(',').trim(),
      });
    }).filter(Boolean);
  }
  function booksFor(covenant) {
    const bookMap = new Map();

    state.verses.forEach((verse) => {
      if (!verse.bookName) {
        return;
      }
      const isNew = isNewCovenantLabel(verse.covenantName);
      if ((covenant === 'new') !== isNew) {
        return;
      }

      const current = bookMap.get(verse.bookName);
      const bookNumber = Number(verse.bookNumber) || 999;
      if (current == null || bookNumber < current) {
        bookMap.set(verse.bookName, bookNumber);
      }
    });

    return Array.from(bookMap.entries())
      .sort((left, right) => {
        if (left[1] !== right[1]) {
          return left[1] - right[1];
        }
        return String(left[0]).localeCompare(String(right[0]), 'zh-CN');
      })
      .map((item) => item[0]);
  }

  function chaptersFor(covenant, book) {
    if (!book) {
      return [];
    }

    const chapterSet = new Set();
    state.verses.forEach((verse) => {
      if (verse.bookName !== book) {
        return;
      }
      const isNew = isNewCovenantLabel(verse.covenantName);
      if ((covenant === 'new') !== isNew) {
        return;
      }
      if (verse.chapterNumber) {
        chapterSet.add(verse.chapterNumber);
      }
    });

    return Array.from(chapterSet).sort((left, right) => left - right);
  }

  function ensureBrowseSelection() {
    if (!booksFor(state.currentCovenant).length && booksFor('new').length) {
      state.currentCovenant = 'new';
    }

    const books = booksFor(state.currentCovenant);
    if (!books.length) {
      state.selectedBook = '';
      state.selectedChapter = null;
      return;
    }

    if (!books.includes(state.selectedBook)) {
      state.selectedBook = books[0] || '';
    }

    const chapters = chaptersFor(state.currentCovenant, state.selectedBook);
    if (!chapters.length) {
      state.selectedChapter = null;
      return;
    }
    if (!chapters.includes(state.selectedChapter)) {
      state.selectedChapter = chapters[0] || null;
    }
  }

  function getBrowseBookSequence() {
    return [
      ...booksFor('old').map((book) => ({ covenant: 'old', book, chapters: chaptersFor('old', book) })),
      ...booksFor('new').map((book) => ({ covenant: 'new', book, chapters: chaptersFor('new', book) })),
    ].filter((item) => item.chapters.length);
  }

  function getAdjacentChapterTarget(direction) {
    if (state.showSearchResults || !state.selectedBook || state.selectedChapter == null) {
      return null;
    }

    const sequence = getBrowseBookSequence();
    const bookIndex = sequence.findIndex((item) => item.book === state.selectedBook && item.covenant === state.currentCovenant);
    if (bookIndex < 0) {
      return null;
    }

    const chapters = sequence[bookIndex].chapters;
    const chapterIndex = chapters.indexOf(state.selectedChapter);
    if (chapterIndex < 0) {
      return null;
    }

    if (direction < 0) {
      if (chapterIndex > 0) {
        return {
          covenant: sequence[bookIndex].covenant,
          book: sequence[bookIndex].book,
          chapter: chapters[chapterIndex - 1],
        };
      }

      for (let index = bookIndex - 1; index >= 0; index -= 1) {
        const previous = sequence[index];
        if (previous.chapters.length) {
          return {
            covenant: previous.covenant,
            book: previous.book,
            chapter: previous.chapters[previous.chapters.length - 1],
          };
        }
      }

      return null;
    }

    if (chapterIndex < chapters.length - 1) {
      return {
        covenant: sequence[bookIndex].covenant,
        book: sequence[bookIndex].book,
        chapter: chapters[chapterIndex + 1],
      };
    }

    for (let index = bookIndex + 1; index < sequence.length; index += 1) {
      const next = sequence[index];
      if (next.chapters.length) {
        return {
          covenant: next.covenant,
          book: next.book,
          chapter: next.chapters[0],
        };
      }
    }

    return null;
  }

  function goToChapterTarget(target) {
    if (!target) {
      return;
    }
    clearSearch(false);
    state.currentCovenant = target.covenant;
    state.selectedBook = target.book;
    state.selectedChapter = target.chapter;
    state.browseControlsCollapsed = true;
    resetPagination();
    scheduleResultsScrollTop();
  }

  function goToAdjacentChapter(direction) {
    goToChapterTarget(getAdjacentChapterTarget(direction));
  }

  function resetPagination() {
    state.currentPage = 1;
    state.showJumpInput = false;
    state.jumpPageValue = '';
  }

  function setCurrentView(view) {
    state.currentView = view === 'notes' ? 'notes' : 'home';
    state.mobileSidebarOpen = false;
    state.mobileSelectionMenuOpen = false;
    state.noteDetailGroupId = '';
    syncViewHash(state.currentView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function selectCovenant(next) {
    state.currentCovenant = next;
    clearSearch(false);
    state.browseControlsCollapsed = false;
    state.mobileSelectionMenuOpen = false;

    const books = booksFor(next);
    state.selectedBook = books[0] || '';
    const chapters = chaptersFor(next, state.selectedBook);
    state.selectedChapter = chapters[0] || null;
    resetPagination();
  }

  function selectBook(book) {
    state.selectedBook = book;
    clearSearch(false);
    state.browseControlsCollapsed = false;
    state.mobileSelectionMenuOpen = false;

    const chapters = chaptersFor(state.currentCovenant, book);
    state.selectedChapter = chapters[0] || null;
    resetPagination();
  }

  function selectChapter(chapter) {
    state.selectedChapter = chapter;
    clearSearch(false);
    state.browseControlsCollapsed = true;
    state.mobileSidebarOpen = false;
    state.mobileSelectionMenuOpen = false;
    resetPagination();
  }

  function setSearchFilterCovenant(next) {
    state.searchFilterCovenant = next === 'old' || next === 'new' ? next : 'all';
    normalizeSearchFilters();
    resetPagination();
  }

  function setSearchFilterBook(book) {
    state.searchFilterBook = book || '';
    normalizeSearchFilters();
    resetPagination();
  }

  function runSearch() {
    const keyword = state.keyword.trim();
    if (!keyword) {
      clearSearch();
      return;
    }

    state.searchKeyword = keyword;
    state.searchFilterCovenant = 'all';
    state.searchFilterBook = '';
    state.showSearchResults = true;
    resetPagination();
  }

  function clearSearch(resetInput) {
    if (resetInput !== false) {
      state.keyword = '';
    }
    state.searchKeyword = '';
    state.searchFilterCovenant = 'all';
    state.searchFilterBook = '';
    state.showSearchResults = false;
    state.browseControlsCollapsed = false;
    resetPagination();
  }

  function getBaseSearchResults() {
    if (!state.searchKeyword.trim()) {
      return [];
    }
    return searchVerses(state.verses, state.searchKeyword);
  }

  function sortBookNames(names) {
    return Array.from(new Set(names)).sort((left, right) => {
      const leftVerse = state.verses.find((verse) => verse.bookName === left);
      const rightVerse = state.verses.find((verse) => verse.bookName === right);
      const leftOrder = Number(leftVerse && leftVerse.bookNumber) || 999;
      const rightOrder = Number(rightVerse && rightVerse.bookNumber) || 999;
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
      return String(left).localeCompare(String(right), 'zh-CN');
    });
  }

  function getSearchFilterBooks() {
    let verses = getBaseSearchResults();
    if (state.searchFilterCovenant !== 'all') {
      const isNew = state.searchFilterCovenant === 'new';
      verses = verses.filter((verse) => isNewCovenantLabel(verse.covenantName) === isNew);
    }
    return sortBookNames(verses.map((verse) => verse.bookName).filter(Boolean));
  }

  function normalizeSearchFilters() {
    const books = getSearchFilterBooks();
    if (!books.includes(state.searchFilterBook)) {
      state.searchFilterBook = '';
    }
  }

  function getSearchFilteredVerses() {
    let verses = getBaseSearchResults();
    if (state.searchFilterCovenant !== 'all') {
      const isNew = state.searchFilterCovenant === 'new';
      verses = verses.filter((verse) => isNewCovenantLabel(verse.covenantName) === isNew);
    }
    if (state.searchFilterBook) {
      verses = verses.filter((verse) => verse.bookName === state.searchFilterBook);
    }
    return verses;
  }

  function getFilteredVerses() {
    const items = state.showSearchResults
      ? getSearchFilteredVerses()
      : state.verses.filter((verse) => verse.bookName === state.selectedBook && verse.chapterNumber === state.selectedChapter);

    return sortVerses(items);
  }

  function getSelectedVerses() {
    return sortVerses(Array.from(state.selectedMap.values()));
  }

  function getPagedVerses() {
    const verses = getFilteredVerses();
    const start = (state.currentPage - 1) * PAGE_SIZE;
    return verses.slice(start, start + PAGE_SIZE);
  }

  function getTotalPages(totalCount) {
    return Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  }

  function goToPage(page) {
    const totalPages = getTotalPages(getFilteredVerses().length);
    state.currentPage = Math.min(Math.max(page, 1), totalPages);
    state.showJumpInput = false;
    state.jumpPageValue = '';
    scheduleResultsScrollTop();
  }

  function submitJumpPage() {
    const page = Number(state.jumpPageValue);
    if (!Number.isFinite(page)) {
      focusJumpInput();
      return;
    }
    goToPage(page);
  }

  function getChapterVersesByTarget(target) {
    if (!target || !target.book || target.chapter == null) {
      return [];
    }
    return sortVerses(state.verses.filter((verse) => verse.bookName === target.book && verse.chapterNumber === target.chapter));
  }

  function goToReaderDirection(direction) {
    if (state.currentView !== 'home') {
      return;
    }

    if (state.showSearchResults) {
      goToPage(state.currentPage + direction);
      return;
    }

    const totalPages = getTotalPages(getFilteredVerses().length);
    if (direction > 0) {
      if (state.currentPage < totalPages) {
        goToPage(state.currentPage + 1);
        return;
      }

      const nextTarget = getAdjacentChapterTarget(1);
      if (nextTarget) {
        goToChapterTarget(nextTarget);
      }
      return;
    }

    if (state.currentPage > 1) {
      goToPage(state.currentPage - 1);
      return;
    }

    const previousTarget = getAdjacentChapterTarget(-1);
    if (!previousTarget) {
      return;
    }
    goToChapterTarget(previousTarget);
    state.currentPage = getTotalPages(getChapterVersesByTarget(previousTarget).length);
    scheduleResultsScrollTop();
  }

  function canGoReaderDirection(direction) {
    if (state.currentView !== 'home') {
      return false;
    }

    if (state.showSearchResults) {
      const totalPages = getTotalPages(getFilteredVerses().length);
      return direction > 0 ? state.currentPage < totalPages : state.currentPage > 1;
    }

    const totalPages = getTotalPages(getFilteredVerses().length);
    if (direction > 0) {
      return state.currentPage < totalPages || !!getAdjacentChapterTarget(1);
    }
    return state.currentPage > 1 || !!getAdjacentChapterTarget(-1);
  }

  function toggleVerseById(verseId) {
    const verse = state.verses.find((item) => item.id === verseId);
    if (!verse) {
      return;
    }
    toggleSelect(verse);
  }

  function toggleSelect(verse) {
    const next = new Map(state.selectedMap);
    if (next.has(verse.id)) {
      next.delete(verse.id);
    } else {
      next.set(verse.id, verse);
    }
    state.selectedMap = next;
    if (isMobileViewport() && state.activeNoteKey && state.activeNoteKey !== BATCH_NOTE_EDITOR_KEY) {
      const activeStillSelected = Array.from(next.values()).some((item) => buildVerseNoteKey(item) === state.activeNoteKey);
      if (!activeStillSelected || next.size !== 1) {
        state.activeNoteKey = '';
      }
    }
    if (isMobileViewport() && state.currentView === 'home' && !state.showSearchResults) {
      state.mobileSelectionMenuOpen = next.size > 0;
    }
    if (!next.size) {
      state.mobileSelectionMenuOpen = false;
    }
    if (!next.size && state.activeNoteKey === BATCH_NOTE_EDITOR_KEY) {
      state.activeNoteKey = '';
    }
  }

  function removeSelected(id) {
    const next = new Map(state.selectedMap);
    next.delete(id);
    state.selectedMap = next;
    if (isMobileViewport() && state.activeNoteKey && state.activeNoteKey !== BATCH_NOTE_EDITOR_KEY) {
      const activeStillSelected = Array.from(next.values()).some((item) => buildVerseNoteKey(item) === state.activeNoteKey);
      if (!activeStillSelected || next.size !== 1) {
        state.activeNoteKey = '';
      }
    }
    if (isMobileViewport() && state.currentView === 'home' && !state.showSearchResults) {
      state.mobileSelectionMenuOpen = next.size > 0;
    }
    if (!next.size) {
      state.mobileSelectionMenuOpen = false;
    }
    if (!next.size && state.activeNoteKey === BATCH_NOTE_EDITOR_KEY) {
      state.activeNoteKey = '';
    }
  }

  function resetSelection() {
    state.selectedMap = new Map();
    state.mobileSelectionMenuOpen = false;
    state.selectedCopyLabel = defaultSelectedCopyLabel;
    if (state.activeNoteKey === BATCH_NOTE_EDITOR_KEY || isMobileViewport()) {
      state.activeNoteKey = '';
    }
  }

  function syncSelectedVerses() {
    if (!state.selectedMap.size) {
      return;
    }

    const next = new Map();
    state.verses.forEach((verse) => {
      if (state.selectedMap.has(verse.id)) {
        next.set(verse.id, verse);
      }
    });
    state.selectedMap = next;
  }

  function isVerseSelected(id) {
    return state.selectedMap.has(id);
  }

  function isVerseHighlighted(id) {
    return state.highlightedVerseIds.has(id);
  }

  function jumpToVerse(verseId) {
    const verse = state.verses.find((item) => item.id === verseId);
    if (!verse) {
      return;
    }

    state.currentView = 'home';
    syncViewHash('home');
    state.mobileSidebarOpen = false;
    state.mobileSelectionMenuOpen = false;
    state.currentCovenant = isNewCovenantLabel(verse.covenantName) ? 'new' : 'old';
    state.selectedBook = verse.bookName || '';
    state.selectedChapter = Number(verse.chapterNumber) || null;
    state.showSearchResults = false;
    state.browseControlsCollapsed = true;
    state.showJumpInput = false;
    state.jumpPageValue = '';

    const chapterVerses = sortVerses(state.verses.filter((item) => item.bookName === verse.bookName && item.chapterNumber === verse.chapterNumber));
    const verseIndex = chapterVerses.findIndex((item) => item.id === verse.id);
    state.currentPage = verseIndex >= 0 ? Math.floor(verseIndex / PAGE_SIZE) + 1 : 1;
    state.selectedMap = new Map(state.selectedMap).set(verse.id, verse);
    state.focusedVerseId = verse.id;

    if (focusVerseTimer) {
      window.clearTimeout(focusVerseTimer);
    }
    focusVerseTimer = window.setTimeout(() => {
      state.focusedVerseId = '';
      render();
    }, 2400);
  }

  function openNoteFromSelection() {
    const selectedVerses = getSelectedVerses();
    if (!selectedVerses.length) {
      return;
    }

    state.mobileSelectionMenuOpen = false;
    if (selectedVerses.length === 1) {
      state.activeNoteKey = buildVerseNoteKey(selectedVerses[0]);
      render();
      focusNoteEditor(state.activeNoteKey);
      return;
    }

    state.activeNoteKey = BATCH_NOTE_EDITOR_KEY;
    render();
    focusNoteEditor(BATCH_NOTE_EDITOR_KEY);
  }

  function toggleHighlightSelected() {
    const selectedVerses = getSelectedVerses();
    if (!selectedVerses.length) {
      return;
    }

    const next = new Set(state.highlightedVerseIds);
    const allHighlighted = selectedVerses.every((verse) => next.has(verse.id));
    selectedVerses.forEach((verse) => {
      if (allHighlighted) {
        next.delete(verse.id);
      } else {
        next.add(verse.id);
      }
    });

    state.highlightedVerseIds = next;
    persistHighlightedVerseIds();
    setNoteStatus(allHighlighted ? '已取消选中经文的高亮。' : `已高亮 ${selectedVerses.length} 节经文。`);
    render();
  }

  function adjustReaderFontSize(delta) {
    const next = normalizeReaderFontSize(Number(state.readerFontSize || DEFAULT_READER_FONT_SIZE) + delta);
    if (next === state.readerFontSize) {
      return;
    }
    state.readerFontSize = next;
    persistReaderFontSize(next);
    render();
  }

  function stepNoteToolbarFontSize(key, delta) {
    if (!key || !Number.isFinite(delta) || !delta) {
      return;
    }

    const next = normalizeToolbarFontSize(getNoteToolbarStyle(key).fontSize + delta);
    setNoteToolbarStyle(key, { fontSize: next });
    applyNoteCommand(key, 'setFontSize', `${next}px`);
  }

  async function refreshNotes() {
    try {
      const payload = await requestJson('/notes/me');
      if (payload && payload.authenticated) {
        state.noteMode = 'account';
        state.noteUsername = payload.username || '';
        state.notes = normalizeNoteMap(payload.notes || []);
        return;
      }
    } catch {
    }

    state.noteMode = 'local';
    state.noteUsername = '';
    state.notes = loadLocalNotes();
  }

  function buildVerseNoteKey(verse) {
    return `${String(verse.bookName || '').trim()}__${Number(verse.chapterNumber) || 0}__${Number(verse.verseNumber) || 0}`;
  }

  function getVerseNote(verse) {
    return state.notes[buildVerseNoteKey(verse)] || null;
  }

  function isNoteOpen(verse) {
    return state.activeNoteKey === buildVerseNoteKey(verse);
  }

  function isBatchNoteOpen() {
    return state.activeNoteKey === BATCH_NOTE_EDITOR_KEY;
  }

  function toggleNotePanel(key) {
    state.activeNoteKey = state.activeNoteKey === key ? '' : key;
  }
  function getNoteCount() {
    return getOrderedNoteGroups().length;
  }

  function getOrderedNotes() {
    return Object.values(state.notes).sort((left, right) => {
      const order = compareScriptureOrder(left, right);
      if (order !== 0) {
        return order;
      }

      const leftTime = Date.parse(left.updatedAt || '') || 0;
      const rightTime = Date.parse(right.updatedAt || '') || 0;
      if (leftTime !== rightTime) {
        return rightTime - leftTime;
      }
      return formatNoteReference(left).localeCompare(formatNoteReference(right), 'zh-CN');
    });
  }

  function getOrderedNoteGroups(sourceNotes) {
    const orderedNotes = Array.isArray(sourceNotes) ? sourceNotes.slice() : getOrderedNotes();
    const grouped = new Map();

    orderedNotes.forEach((note) => {
      const signature = getNoteGroupSignature(note);
      const current = grouped.get(signature) || [];
      current.push(note);
      grouped.set(signature, current);
    });

    const groupedKeys = new Set(
      Array.from(grouped.entries())
        .filter(([signature, items]) => items.length > 1 && !signature.startsWith('single:'))
        .map(([signature]) => signature)
    );

    const seen = new Set();
    return orderedNotes.reduce((result, note) => {
      const signature = getNoteGroupSignature(note);
      if (groupedKeys.has(signature)) {
        if (seen.has(signature)) {
          return result;
        }
        seen.add(signature);
        result.push(buildNoteGroup(signature, grouped.get(signature) || []));
        return result;
      }

      result.push(buildNoteGroup(`single:${note.key}`, [note]));
      return result;
    }, []);
  }

  function getNoteGroupSignature(note) {
    const batchGroupId = String(note && note.batchGroupId || '').trim();
    if (batchGroupId) {
      return `batch:${batchGroupId}`;
    }

    const updatedAt = String(note && note.updatedAt || '').trim();
    const html = String(note && note.html || '').trim();
    if (updatedAt && html) {
      return `merge:${updatedAt}::${html}`;
    }

    return `single:${note && note.key || ''}`;
  }

  function buildNoteGroup(id, notes) {
    const items = sortVerses(Array.isArray(notes) ? notes.slice() : []);
    const first = items[0] || null;
    const updatedAt = items.reduce((latest, item) => {
      const value = Date.parse(item && item.updatedAt || '') || 0;
      return value > latest ? value : latest;
    }, 0);
    const groupId = first
      ? `group:${first.key || 'note'}:${String(first.updatedAt || '').trim()}`
      : id;

    return {
      id: groupId,
      notes: items,
      noteHtml: first ? first.html || '' : '',
      updatedAt: updatedAt ? new Date(updatedAt).toISOString() : (first ? first.updatedAt || '' : ''),
      isBatch: items.length > 1,
      heading: formatNoteGroupHeading(items),
      references: items.map((item) => formatNoteReference(item)),
      verses: items.map((item) => {
        const verse = findVerseByNoteKey(item.key);
        return {
          key: item.key,
          bookName: item.bookName || '',
          chapterNumber: Number(item.chapterNumber) || 0,
          verseNumber: Number(item.verseNumber) || 0,
          reference: formatNoteReference(item),
          content: verse ? verse.content || '' : '',
        };
      }),
    };
  }

  function formatNoteGroupHeading(notes) {
    if (!Array.isArray(notes) || !notes.length) {
      return '未命名笔记';
    }
    if (notes.length === 1) {
      return formatNoteReference(notes[0]);
    }

    const sameBook = notes.every((item) => item.bookName === notes[0].bookName);
    const sameChapter = sameBook && notes.every((item) => item.chapterNumber === notes[0].chapterNumber);
    if (sameChapter) {
      const verseNumbers = notes
        .map((item) => Number(item.verseNumber) || 0)
        .filter(Boolean)
        .sort((left, right) => left - right);
      const continuous = verseNumbers.every((value, index) => index === 0 || value === verseNumbers[index - 1] + 1);
      if (continuous && verseNumbers.length > 1) {
        return `${notes[0].bookName} ${notes[0].chapterNumber}:${verseNumbers[0]}-${verseNumbers[verseNumbers.length - 1]}`;
      }
      return `${notes[0].bookName} ${notes[0].chapterNumber}:${verseNumbers.join('、')}`;
    }

    const preview = notes.slice(0, 4).map((item) => formatNoteReference(item)).join('、');
    return notes.length > 4 ? `${preview} 等 ${notes.length} 节` : preview;
  }

  function getNoteGroupById(groupId, sourceGroups) {
    const groups = Array.isArray(sourceGroups) ? sourceGroups : getOrderedNoteGroups();
    return groups.find((item) => item.id === groupId) || null;
  }

  function openNoteGroupDetail(groupId) {
    const group = getNoteGroupById(groupId);
    if (!group) {
      setNoteStatus('没有找到这条笔记。');
      return;
    }

    state.noteDetailGroupId = group.id;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeNoteGroupDetail() {
    state.noteDetailGroupId = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function extractPlainTextFromHtml(html) {
    const container = parseNoteContainer(html);
    if (!container) {
      return '';
    }

    return String(container.textContent || '')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function truncateText(text, maxLength) {
    const normalized = String(text || '').replace(/\s+/g, ' ').trim();
    const limit = Math.max(12, Number(maxLength) || 0);
    if (!normalized || !limit || normalized.length <= limit) {
      return normalized;
    }
    return `${normalized.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
  }

  function getNoteGroupScripturePreview(group) {
    if (!group || !Array.isArray(group.verses) || !group.verses.length) {
      return '原经文暂时不可用';
    }

    const previewText = group.verses
      .slice(0, 3)
      .map((verse) => `${Number(verse.verseNumber) || 0} ${String(verse.content || '').trim()}`)
      .join(' ');
    const suffix = group.verses.length > 3 ? ` 共 ${group.verses.length} 节` : '';
    return truncateText(`${previewText}${suffix}`, 138);
  }

  function getNoteGroupContentPreview(group) {
    return truncateText(extractPlainTextFromHtml(group && group.noteHtml || ''), 120) || '这条笔记还没有内容预览。';
  }

  function getNoteModeLabel() {
    if (state.noteMode === 'account' && state.noteUsername) {
      return `已登录 ${state.noteUsername}。`;
    }
    return '未登录时保存在当前浏览器，可下载备份。';
  }

  function getNoteStatusText() {
    return state.noteStatus ? escapeHtml(state.noteStatus) : '';
  }

  function getNoteToastElement() {
    if (typeof document === 'undefined') {
      return null;
    }

    let toast = document.getElementById('bp-note-toast');
    if (toast instanceof HTMLElement) {
      return toast;
    }

    toast = document.createElement('div');
    toast.id = 'bp-note-toast';
    toast.className = 'bp-note-toast';
    toast.setAttribute('aria-live', 'polite');
    toast.setAttribute('aria-atomic', 'true');
    document.body.appendChild(toast);
    return toast;
  }

  function setNoteStatus(message) {
    state.noteStatus = message || '';
    if (noteStatusTimer) {
      window.clearTimeout(noteStatusTimer);
    }

    const toast = getNoteToastElement();
    if (!toast) {
      return;
    }

    if (!state.noteStatus) {
      toast.classList.remove('is-visible', 'is-error');
      toast.textContent = '';
      return;
    }

    toast.textContent = state.noteStatus;
    toast.classList.toggle('is-error', /失败|错误/.test(state.noteStatus));
    toast.classList.add('is-visible');

    noteStatusTimer = window.setTimeout(() => {
      state.noteStatus = '';
      toast.classList.remove('is-visible', 'is-error');
      toast.textContent = '';
    }, 2200);
  }

  function handleNoteHtmlChange(key, html) {
    if (key === BATCH_NOTE_EDITOR_KEY) {
      state.batchNoteDraft = normalizeNoteHtml(html);
      return;
    }

    const verse = findVerseByNoteKey(key);
    if (!key || !verse) {
      return;
    }

    const normalizedHtml = normalizeNoteHtml(html);
    if (normalizedHtml) {
      state.notes[key] = {
        key,
        covenantName: verse.covenantName || '',
        bookName: verse.bookName || '',
        chapterNumber: Number(verse.chapterNumber) || 0,
        verseNumber: Number(verse.verseNumber) || 0,
        html: normalizedHtml,
        updatedAt: new Date().toISOString(),
      };
    } else {
      delete state.notes[key];
    }

    if (state.confirmedSavedNoteKey === key) {
      state.confirmedSavedNoteKey = '';
      state.confirmedSavedAt = '';
      updateNoteSaveMeta(key);
    }

    if (state.noteMode === 'account') {
      scheduleNoteSave(key);
      return;
    }

    persistLocalNotes();
  }

  function handleNoteEditorInput(editor) {
    const key = editor.getAttribute('data-note-editor') || '';
    handleNoteHtmlChange(key, editor.innerHTML);
  }

  function openNoteFromList(key) {
    const verse = findVerseByNoteKey(key);
    if (!verse || !verse.id) {
      setNoteStatus('没有找到这条笔记对应的经文。');
      return;
    }

    const previousSelectedMap = new Map(state.selectedMap);
    jumpToVerse(verse.id);
    state.selectedMap = isMobileViewport() ? new Map([[verse.id, verse]]) : previousSelectedMap;
    state.activeNoteKey = key;
    state.mobileSelectionMenuOpen = false;
    render();
    scheduleFocusedVerseScroll();
    focusNoteEditor(key);
  }

  function openNoteGroupFromList(groupId) {
    const group = getOrderedNoteGroups().find((item) => item.id === groupId);
    if (!group || !group.notes.length) {
      setNoteStatus('没有找到这组笔记。');
      return;
    }

    if (!group.isBatch) {
      openNoteFromList(group.notes[0].key);
      return;
    }

    const verses = group.notes
      .map((item) => findVerseByNoteKey(item.key))
      .filter((item) => item && item.id);
    const firstVerse = verses[0];
    if (!firstVerse) {
      setNoteStatus('没有找到这组笔记对应的经文。');
      return;
    }

    state.currentView = 'home';
    syncViewHash('home');
    state.mobileSidebarOpen = false;
    state.mobileSelectionMenuOpen = false;
    state.currentCovenant = isNewCovenantLabel(firstVerse.covenantName) ? 'new' : 'old';
    state.selectedBook = firstVerse.bookName || '';
    state.selectedChapter = Number(firstVerse.chapterNumber) || null;
    state.showSearchResults = false;
    state.browseControlsCollapsed = true;
    state.showJumpInput = false;
    state.jumpPageValue = '';
    state.selectedMap = new Map(verses.map((item) => [item.id, item]));
    state.batchNoteDraft = group.noteHtml || '';
    state.activeNoteKey = BATCH_NOTE_EDITOR_KEY;
    state.focusedVerseId = firstVerse.id;

    const chapterVerses = sortVerses(
      state.verses.filter((item) => item.bookName === firstVerse.bookName && item.chapterNumber === firstVerse.chapterNumber)
    );
    const verseIndex = chapterVerses.findIndex((item) => item.id === firstVerse.id);
    state.currentPage = verseIndex >= 0 ? Math.floor(verseIndex / PAGE_SIZE) + 1 : 1;

    render();
    scheduleFocusedVerseScroll();
    focusNoteEditor(BATCH_NOTE_EDITOR_KEY);
  }

  async function deleteNoteGroup(groupId) {
    const group = getOrderedNoteGroups().find((item) => item.id === groupId);
    if (!group || !group.notes.length) {
      return;
    }

    const keys = group.notes.map((item) => item.key).filter(Boolean);
    if (!keys.length) {
      return;
    }

    const previousNotes = Object.assign({}, state.notes);
    keys.forEach((key) => {
      delete state.notes[key];
    });

    if (state.noteMode === 'account') {
      try {
        for (const key of keys) {
          await requestJson('/notes/me/delete', {
            method: 'POST',
            body: JSON.stringify({ key }),
          });
        }
      } catch (error) {
        state.notes = previousNotes;
        setNoteStatus(error instanceof Error ? error.message : '删除整组笔记失败，请稍后重试。');
        render();
        return;
      }
    } else {
      persistLocalNotes();
    }

    setNoteStatus(group.isBatch ? `已删除 ${keys.length} 节经文的合并笔记。` : '已删除这条笔记。');
    if (state.noteDetailGroupId === groupId) {
      state.noteDetailGroupId = '';
    }
    render();
  }

  async function saveNote(key, closeAfter) {
    if (!key || key === BATCH_NOTE_EDITOR_KEY) {
      return;
    }

    const richEditor = getRichNoteEditorInstance(key);
    if (richEditor && typeof richEditor.getHTML === 'function') {
      handleNoteHtmlChange(key, richEditor.getHTML());
    } else {
      const editor = getNoteEditorElement(key);
      if (editor) {
        handleNoteEditorInput(editor);
      }
    }

    if (state.noteMode === 'account') {
      state.savingNoteKey = key;
      updateNoteSaveMeta(key);
      await syncNoteToAccount(key);
    } else {
      persistLocalNotes();
      state.confirmedSavedNoteKey = key;
      state.confirmedSavedAt = new Date().toISOString();
      updateNoteSaveMeta(key);
    }

    if (closeAfter) {
      state.activeNoteKey = '';
      if (isMobileViewport()) {
        resetSelection();
      }
      render();
      return;
    }

    updateNoteSaveMeta(key);
    focusNoteEditor(key);
  }

  function scheduleNoteSave(key) {
    const timer = noteSaveTimers.get(key);
    if (timer) {
      window.clearTimeout(timer);
    }
    noteSaveTimers.set(key, window.setTimeout(() => {
      noteSaveTimers.delete(key);
      void syncNoteToAccount(key);
    }, 500));
  }

  function cancelNoteSave(key) {
    const timer = noteSaveTimers.get(key);
    if (timer) {
      window.clearTimeout(timer);
      noteSaveTimers.delete(key);
    }
  }

  function flushNoteSave(key) {
    const timer = noteSaveTimers.get(key);
    if (timer) {
      window.clearTimeout(timer);
      noteSaveTimers.delete(key);
      void syncNoteToAccount(key);
    }
  }

  async function syncNoteToAccount(key) {
    if (state.noteMode !== 'account' || !key || key === BATCH_NOTE_EDITOR_KEY) {
      return false;
    }

    const note = state.notes[key];

    try {
      if (note) {
        const saved = await requestJson('/notes/me', {
          method: 'PUT',
          body: JSON.stringify(note),
        });
        state.notes[key] = normalizeNoteRecord(saved) || note;
        state.confirmedSavedNoteKey = key;
        state.confirmedSavedAt = state.notes[key] ? state.notes[key].updatedAt : new Date().toISOString();
        updateNoteSaveMeta(key);
      } else {
        await requestJson('/notes/me/delete', {
          method: 'POST',
          body: JSON.stringify({
            key,
          }),
        });
        if (state.confirmedSavedNoteKey === key) {
          state.confirmedSavedNoteKey = '';
          state.confirmedSavedAt = '';
        }
        updateNoteSaveMeta(key);
      }
      return true;
    } catch (error) {
      if (note) {
        persistLocalNotes();
      }
      setNoteStatus(error instanceof Error ? error.message : (note ? '账号笔记同步失败，已暂存到当前浏览器。' : '账号笔记删除失败，请稍后重试。'));
      return false;
    } finally {
      if (state.savingNoteKey === key) {
        state.savingNoteKey = '';
      }
      updateNoteSaveMeta(key);
    }
  }

  async function clearNote(key) {
    if (key === BATCH_NOTE_EDITOR_KEY) {
      state.batchNoteDraft = '';
      setNoteStatus('已清空批量笔记草稿。');
      render();
      focusNoteEditor(BATCH_NOTE_EDITOR_KEY);
      return;
    }

    if (!key) {
      return;
    }

    cancelNoteSave(key);
    const previousNote = state.notes[key] ? Object.assign({}, state.notes[key]) : null;
    delete state.notes[key];
    if (state.confirmedSavedNoteKey === key) {
      state.confirmedSavedNoteKey = '';
      state.confirmedSavedAt = '';
    }
    if (state.noteMode === 'account') {
      state.savingNoteKey = key;
      updateNoteSaveMeta(key);
      const deleted = await syncNoteToAccount(key);
      if (!deleted && previousNote) {
        state.notes[key] = previousNote;
      }
    } else {
      persistLocalNotes();
      setNoteStatus('已清空这节经文的笔记。');
    }
    render();
  }

  function triggerNotesImport() {
    const input = root.querySelector('[data-note-import-input]');
    if (input && typeof input.click === 'function') {
      input.click();
    }
  }

  async function importNotesFromFile(input) {
    const file = input.files && input.files[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const imported = normalizeNoteMap(parseNotesPayload(text));
      if (state.noteMode === 'account') {
        const response = await requestJson('/notes/me/import', {
          method: 'POST',
          body: JSON.stringify(Object.values(imported)),
        });
        state.notes = normalizeNoteMap(response.notes || []);
      } else {
        state.notes = Object.assign({}, state.notes, imported);
        persistLocalNotes();
      }
      setNoteStatus(`已导入 ${Object.keys(imported).length} 条笔记。`);
      render();
    } catch {
      setNoteStatus('笔记文件解析失败，请检查上传内容。');
    } finally {
      input.value = '';
    }
  }

  function downloadNotes() {
    const notes = Object.values(state.notes);
    if (!notes.length) {
      return;
    }

    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      notes,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bible-verse-notes-${payload.exportedAt.replace(/[:]/g, '-').replace(/\.\d+Z$/, '')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    setNoteStatus(`已下载 ${notes.length} 条笔记。`);
  }

  async function applyBatchNoteToSelected() {
    const selectedVerses = getSelectedVerses();
    const html = normalizeNoteHtml(state.batchNoteDraft);
    if (!selectedVerses.length) {
      setNoteStatus('请先选择要写笔记的经文。');
      return;
    }
    if (!html) {
      setNoteStatus('请先输入批量笔记内容。');
      focusNoteEditor(BATCH_NOTE_EDITOR_KEY);
      return;
    }

    const updatedAt = new Date().toISOString();
    const batchNotes = selectedVerses.map((verse) => ({
      key: buildVerseNoteKey(verse),
      covenantName: verse.covenantName || '',
      bookName: verse.bookName || '',
      chapterNumber: Number(verse.chapterNumber) || 0,
      verseNumber: Number(verse.verseNumber) || 0,
      html,
      updatedAt,
    }));

    if (state.noteMode === 'account') {
      try {
        const response = await requestJson('/notes/me/import', {
          method: 'POST',
          body: JSON.stringify(batchNotes),
        });
        state.notes = normalizeNoteMap(response.notes || []);
        setNoteStatus(`已将笔记写入 ${batchNotes.length} 节经文。`);
      } catch (error) {
        state.notes = Object.assign({}, state.notes, normalizeNoteMap(batchNotes));
        persistLocalNotes();
        setNoteStatus(error instanceof Error ? error.message : '批量笔记同步失败，已暂存到当前浏览器。');
      }
      state.batchNoteDraft = '';
      resetSelection();
      render();
      return;
    }

    state.notes = Object.assign({}, state.notes, normalizeNoteMap(batchNotes));
    persistLocalNotes();
    setNoteStatus(`已将笔记写入 ${batchNotes.length} 节经文。`);
    state.batchNoteDraft = '';
    resetSelection();
    render();
  }

  function applyNoteCommand(key, command, value) {
    const editor = getNoteEditorElement(key);
    if (!(editor instanceof HTMLElement)) {
      return;
    }

    restoreNoteSelection(key, editor);
    editor.focus();
    let handled = false;
    if (command === 'setTextColor') {
      handled = applyManualNoteCommand(command, value, editor);
    } else if (command === 'setFontSize') {
      handled = applyManualNoteCommand(command, value, editor);
    } else {
      if (command === 'foreColor') {
        try {
          document.execCommand('styleWithCSS', false, true);
        } catch {
        }
      }
      try {
        handled = document.execCommand(command, false, value || undefined);
      } catch {
        handled = false;
      }
      if (!handled) {
        handled = applyManualNoteCommand(command, value, editor);
      }
    }
    if (handled) {
      noteSelectionRanges.set(key, getCurrentSelectionRange());
    }
    handleNoteEditorInput(editor);
    activeToolbarKey = '';
  }

  function applyManualNoteCommand(command, value, editor) {
    if (!(editor instanceof HTMLElement)) {
      return false;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return false;
    }

    const range = selection.getRangeAt(0);
    if (range.collapsed || !editor.contains(range.commonAncestorContainer)) {
      return false;
    }

    const structured = applyStructuredManualNoteCommand(command, value, range, selection);
    if (structured != null) {
      return structured;
    }

    const wrapper = createManualNoteCommandWrapper(command, value);
    if (!wrapper) {
      return false;
    }

    const fragment = range.extractContents();
    if (fragmentHasBlockContent(fragment)) {
      range.insertNode(fragment);
      selection.removeAllRanges();
      selection.addRange(range);
      return false;
    }

    wrapper.appendChild(fragment);
    range.insertNode(wrapper);

    const nextRange = document.createRange();
    nextRange.selectNodeContents(wrapper);
    selection.removeAllRanges();
    selection.addRange(nextRange);
    return true;
  }

  function applyStructuredManualNoteCommand(command, value, range, selection) {
    if (!(range instanceof Range) || !selection) {
      return null;
    }

    if (command === 'removeFormat') {
      const text = range.toString();
      if (!text.trim()) {
        return false;
      }

      range.deleteContents();
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      const nextRange = document.createRange();
      nextRange.selectNodeContents(textNode);
      selection.removeAllRanges();
      selection.addRange(nextRange);
      return true;
    }

    if (command === 'insertUnorderedList' || command === 'insertOrderedList') {
      const lines = range.toString()
        .replace(/\r/g, '\n')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      if (!lines.length) {
        return false;
      }

      range.deleteContents();
      const list = document.createElement(command === 'insertOrderedList' ? 'ol' : 'ul');
      lines.forEach((line) => {
        const item = document.createElement('li');
        item.textContent = line;
        list.appendChild(item);
      });
      range.insertNode(list);
      const nextRange = document.createRange();
      nextRange.selectNodeContents(list);
      selection.removeAllRanges();
      selection.addRange(nextRange);
      return true;
    }

    if (command === 'formatBlock' && String(value || '').toLowerCase().includes('blockquote')) {
      const fragment = range.extractContents();
      const text = fragment.textContent ? fragment.textContent.replace(/\u00a0/g, ' ').trim() : '';
      if (!text && !fragment.childNodes.length) {
        return false;
      }

      const blockquote = document.createElement('blockquote');
      if (fragmentHasBlockContent(fragment)) {
        blockquote.appendChild(fragment);
      } else {
        const paragraph = document.createElement('p');
        paragraph.appendChild(fragment);
        blockquote.appendChild(paragraph);
      }

      range.insertNode(blockquote);
      const nextRange = document.createRange();
      nextRange.selectNodeContents(blockquote);
      selection.removeAllRanges();
      selection.addRange(nextRange);
      return true;
    }

    return null;
  }

  function createManualNoteCommandWrapper(command, value) {
    if (command === 'bold') {
      return document.createElement('strong');
    }
    if (command === 'italic') {
      return document.createElement('em');
    }
    if (command === 'underline') {
      return document.createElement('u');
    }
    if (command === 'foreColor' || command === 'setTextColor') {
      const color = sanitizeNoteColor(value);
      if (!color) {
        return null;
      }
      const span = document.createElement('span');
      span.style.color = color;
      return span;
    }
    if (command === 'fontSize' || command === 'setFontSize') {
      const fontSize = sanitizeNoteFontSize(command === 'fontSize' ? mapLegacyFontSize(value) || value : value);
      if (!fontSize) {
        return null;
      }
      const span = document.createElement('span');
      span.style.fontSize = fontSize;
      return span;
    }
    return null;
  }

  function canUseRichNoteEditor() {
    return !!(window.BibleNoteEditorKit && typeof window.BibleNoteEditorKit.create === 'function');
  }

  function getRichNoteEditorInstance(key) {
    return key ? noteRichEditors.get(key) || null : null;
  }

  function destroyRichNoteEditors() {
    noteRichEditors.forEach((instance) => {
      if (instance && typeof instance.destroy === 'function') {
        try {
          instance.destroy();
        } catch {
        }
      }
    });
    noteRichEditors.clear();
  }

  function mountRichNoteEditors() {
    if (!canUseRichNoteEditor()) {
      return;
    }

    root.querySelectorAll('[data-note-rich-editor]').forEach((host) => {
      if (!(host instanceof HTMLElement)) {
        return;
      }

      const key = host.getAttribute('data-note-rich-editor') || '';
      if (!key || noteRichEditors.has(key)) {
        return;
      }

      const placeholder = host.getAttribute('data-note-placeholder') || '';
      const content = key === BATCH_NOTE_EDITOR_KEY
        ? state.batchNoteDraft || ''
        : ((state.notes[key] && state.notes[key].html) || '');

      try {
        const instance = window.BibleNoteEditorKit.create(host, {
          key,
          content,
          placeholder,
          onChange(nextHtml) {
            handleNoteHtmlChange(key, nextHtml);
          },
        });

        if (instance) {
          noteRichEditors.set(key, instance);
        }
      } catch {
      }
    });
  }

  function fragmentHasBlockContent(fragment) {
    return Array.from(fragment.childNodes).some((node) => {
      return node instanceof HTMLElement
        && ['BLOCKQUOTE', 'DIV', 'LI', 'OL', 'P', 'PRE', 'UL'].includes(node.tagName);
    });
  }

  function focusNoteEditor(key) {
    if (!key) {
      return;
    }

    if (isMobileViewport()) {
      return;
    }

    window.setTimeout(() => {
      const richEditor = getRichNoteEditorInstance(key);
      if (richEditor && typeof richEditor.focus === 'function') {
        richEditor.focus();
        return;
      }

      const editor = getNoteEditorElement(key);
      if (editor && typeof editor.focus === 'function') {
        editor.focus();
      }
    }, 0);
  }

  function getNoteEditorElement(key) {
    const editor = root.querySelector(`[data-note-editor="${escapeAttribute(key)}"]`);
    return editor instanceof HTMLElement ? editor : null;
  }

  function getNoteToolbarStyle(key) {
    const current = state.noteToolbarStyles[key] || {};
    return {
      color: sanitizeNoteColor(current.color) || DEFAULT_NOTE_COLOR,
      fontSize: normalizeToolbarFontSize(current.fontSize),
    };
  }

  function setNoteToolbarStyle(key, partial) {
    if (!key) {
      return;
    }
    state.noteToolbarStyles = Object.assign({}, state.noteToolbarStyles, {
      [key]: Object.assign({}, getNoteToolbarStyle(key), partial || {}),
    });
  }

  function normalizeToolbarFontSize(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return DEFAULT_NOTE_FONT_SIZE;
    }
    return Math.max(MIN_NOTE_FONT_SIZE, Math.min(MAX_NOTE_FONT_SIZE, Math.round(number)));
  }

  function normalizeReaderFontSize(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return DEFAULT_READER_FONT_SIZE;
    }
    return Math.max(MIN_READER_FONT_SIZE, Math.min(MAX_READER_FONT_SIZE, Math.round(number)));
  }

  function restoreNoteSelection(key, editor) {
    if (!(editor instanceof HTMLElement)) {
      return;
    }

    const selection = window.getSelection();
    if (!selection) {
      return;
    }

    const savedRange = noteSelectionRanges.get(key);
    selection.removeAllRanges();

    if (savedRange) {
      try {
        if (editor.contains(savedRange.commonAncestorContainer)) {
          selection.addRange(savedRange);
          return;
        }
      } catch {
      }
    }

    const fallbackRange = document.createRange();
    fallbackRange.selectNodeContents(editor);
    fallbackRange.collapse(false);
    selection.addRange(fallbackRange);
  }

  function getCurrentSelectionRange() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }
    return selection.getRangeAt(0).cloneRange();
  }

  function isNoteToolbarTarget(target, key) {
    if (!(target instanceof Element) || !key) {
      return false;
    }
    const toolbar = target.closest('[data-note-toolbar-for]');
    return !!toolbar && root.contains(toolbar) && toolbar.getAttribute('data-note-toolbar-for') === key;
  }

  function findVerseByNoteKey(key) {
    return state.verses.find((verse) => buildVerseNoteKey(verse) === key) || null;
  }

  function parseNotesPayload(text) {
    const payload = JSON.parse(text);
    if (Array.isArray(payload)) {
      return payload;
    }
    return Array.isArray(payload && payload.notes) ? payload.notes : [];
  }

  function normalizeNoteMap(list) {
    return (Array.isArray(list) ? list : []).reduce((result, item) => {
      const note = normalizeNoteRecord(item);
      if (note) {
        result[note.key] = note;
      }
      return result;
    }, {});
  }

  function normalizeNoteRecord(item) {
    if (!item || typeof item !== 'object') {
      return null;
    }

    const bookName = String(item.bookName || '').trim();
    const chapterNumber = Number(item.chapterNumber) || 0;
    const verseNumber = Number(item.verseNumber) || 0;
    const html = normalizeNoteHtml(String(item.html || ''));
    if (!bookName || !chapterNumber || !verseNumber || !html) {
      return null;
    }

    return {
      key: buildVerseNoteKey({ bookName, chapterNumber, verseNumber }),
      covenantName: String(item.covenantName || '').trim(),
      bookName,
      chapterNumber,
      verseNumber,
      html,
      updatedAt: String(item.updatedAt || '').trim() || new Date().toISOString(),
    };
  }

  function loadLocalNotes() {
    try {
      const raw = window.localStorage.getItem(NOTES_STORAGE_KEY);
      if (!raw) {
        return {};
      }
      return normalizeNoteMap(parseNotesPayload(raw));
    } catch {
      return {};
    }
  }

  function persistLocalNotes() {
    try {
      window.localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify({
        version: 1,
        notes: Object.values(state.notes),
      }));
    } catch {
    }
  }

  function loadHighlightedVerseIds() {
    try {
      const raw = window.localStorage.getItem(HIGHLIGHT_STORAGE_KEY);
      const list = JSON.parse(raw || '[]');
      return Array.isArray(list) ? list.filter((item) => typeof item === 'string' && item.trim()) : [];
    } catch {
      return [];
    }
  }

  function persistHighlightedVerseIds() {
    try {
      window.localStorage.setItem(HIGHLIGHT_STORAGE_KEY, JSON.stringify(Array.from(state.highlightedVerseIds)));
    } catch {
    }
  }

  function loadReaderFontSize() {
    try {
      const raw = window.localStorage.getItem(READER_PREF_STORAGE_KEY);
      const payload = JSON.parse(raw || '{}');
      if (!payload || payload.fontSize == null) {
        return DEFAULT_READER_FONT_SIZE;
      }
      return normalizeReaderFontSize(payload.fontSize);
    } catch {
      return DEFAULT_READER_FONT_SIZE;
    }
  }

  function persistReaderFontSize(fontSize) {
    try {
      window.localStorage.setItem(READER_PREF_STORAGE_KEY, JSON.stringify({
        fontSize: normalizeReaderFontSize(fontSize),
      }));
    } catch {
    }
  }

  function normalizeNoteHtml(html) {
    const container = parseNoteContainer(html);
    if (!container) {
      return '';
    }

    const output = document.createElement('div');
    Array.from(container.childNodes).forEach((node) => appendSanitizedNote(node, output));
    if (!output.textContent.replace(/\u00a0/g, ' ').trim() && !output.querySelector('br, li')) {
      return '';
    }
    return output.innerHTML.trim();
  }

  function parseNoteContainer(html) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<div>${html || ''}</div>`, 'text/html');
      return doc.body.firstElementChild;
    } catch {
      return null;
    }
  }

  function appendSanitizedNote(node, parent) {
    if (node.nodeType === Node.TEXT_NODE) {
      parent.appendChild(document.createTextNode(node.textContent || ''));
      return;
    }

    if (!(node instanceof HTMLElement)) {
      return;
    }

    const tagName = ({ B: 'STRONG', I: 'EM', DIV: 'P', FONT: 'SPAN' }[node.tagName] || node.tagName);
    if (!['BLOCKQUOTE', 'BR', 'CODE', 'EM', 'LI', 'OL', 'P', 'PRE', 'S', 'SPAN', 'STRONG', 'U', 'UL'].includes(tagName)) {
      Array.from(node.childNodes).forEach((child) => appendSanitizedNote(child, parent));
      return;
    }

    if (tagName === 'SPAN') {
      const styleText = sanitizeNoteInlineStyle(node);
      if (!styleText) {
        Array.from(node.childNodes).forEach((child) => appendSanitizedNote(child, parent));
        return;
      }

      const next = document.createElement('span');
      next.setAttribute('style', styleText);
      Array.from(node.childNodes).forEach((child) => appendSanitizedNote(child, next));
      if (!next.textContent.replace(/\u00a0/g, ' ').trim() && !next.querySelector('br, li')) {
        return;
      }
      parent.appendChild(next);
      return;
    }

    const next = document.createElement(tagName.toLowerCase());
    Array.from(node.childNodes).forEach((child) => appendSanitizedNote(child, next));
    if (tagName !== 'BR' && !next.textContent.replace(/\u00a0/g, ' ').trim() && !next.querySelector('br, li')) {
      return;
    }
    parent.appendChild(next);
  }

  function sanitizeNoteInlineStyle(node) {
    const color = sanitizeNoteColor(node.style && node.style.color ? node.style.color : node.getAttribute('color'));
    const fontSize = sanitizeNoteFontSize(
      node.style && node.style.fontSize
        ? node.style.fontSize
        : mapLegacyFontSize(node.getAttribute('size'))
    );
    const styles = [];
    if (color) {
      styles.push(`color: ${color}`);
    }
    if (fontSize) {
      styles.push(`font-size: ${fontSize}`);
    }
    return styles.join('; ');
  }

  function sanitizeNoteColor(value) {
    const color = String(value || '').trim();
    if (!color) {
      return '';
    }
    if (/^#[0-9a-f]{3,8}$/i.test(color)) {
      return color;
    }
    if (/^rgba?\([\d\s.,%]+\)$/i.test(color)) {
      return color;
    }
    if (/^hsla?\([\d\s.,%]+\)$/i.test(color)) {
      return color;
    }
    if (/^[a-z]{3,20}$/i.test(color)) {
      return color.toLowerCase();
    }
    return '';
  }

  function sanitizeNoteFontSize(value) {
    const text = String(value || '').trim().toLowerCase();
    if (!text) {
      return '';
    }

    const namedSizes = {
      'x-small': '12px',
      small: '13px',
      medium: '14px',
      large: '18px',
      'x-large': '22px',
      'xx-large': '28px',
    };
    if (namedSizes[text]) {
      return namedSizes[text];
    }

    const match = text.match(/^(\d+(?:\.\d+)?)(px|rem|em|%)$/);
    if (!match) {
      return '';
    }

    const amount = Number(match[1]);
    const unit = match[2];
    if (!Number.isFinite(amount)) {
      return '';
    }

    if (unit === 'px' && (amount < 12 || amount > 32)) {
      return '';
    }
    if ((unit === 'rem' || unit === 'em') && (amount < 0.75 || amount > 2.5)) {
      return '';
    }
    if (unit === '%' && (amount < 80 || amount > 220)) {
      return '';
    }

    return `${amount}${unit}`;
  }

  function mapLegacyFontSize(value) {
    return ({
      1: '12px',
      2: '13px',
      3: '14px',
      4: '16px',
      5: '18px',
      6: '22px',
      7: '28px',
    })[String(value || '').trim()] || '';
  }

  async function copyCurrentPage() {
    const ok = await copyText(formatVersePageText(getPagedVerses()));
    state.copyPageLabel = ok ? '已复制' : '复制失败';
    render();
    if (copyPageTimer) {
      window.clearTimeout(copyPageTimer);
    }
    copyPageTimer = window.setTimeout(() => {
      state.copyPageLabel = '复制本页';
      render();
    }, 1600);
  }

  async function copySelectedVerses() {
    const ok = await copyText(formatVersePageText(getSelectedVerses()));
    state.selectedCopyLabel = ok ? '已复制' : '复制失败';
    render();
    if (copySelectedTimer) {
      window.clearTimeout(copySelectedTimer);
    }
    copySelectedTimer = window.setTimeout(() => {
      state.selectedCopyLabel = defaultSelectedCopyLabel;
      render();
    }, 1600);
  }

  function getMobileSelectedCopyLabel() {
    return state.selectedCopyLabel === defaultSelectedCopyLabel ? '复制' : state.selectedCopyLabel;
  }

  async function copyVerse(verseId) {
    const verse = state.verses.find((item) => item.id === verseId);
    if (!verse) {
      return;
    }

    const ok = await copyText(formatVersePlainText(verse));
    state.copiedVerseId = ok ? verseId : '';
    render();
    if (copyVerseTimer) {
      window.clearTimeout(copyVerseTimer);
    }
    copyVerseTimer = window.setTimeout(() => {
      state.copiedVerseId = '';
      render();
    }, 1600);
  }
  function render() {
    normalizeSearchFilters();
    const filteredVerses = getFilteredVerses();
    const pagedVerses = getPagedVerses();
    const totalPages = getTotalPages(filteredVerses.length);
    const selectedVerses = getSelectedVerses();
    const orderedNotes = getOrderedNotes();
    const noteGroups = getOrderedNoteGroups(orderedNotes);
    const previousChapterTarget = getAdjacentChapterTarget(-1);
    const nextChapterTarget = getAdjacentChapterTarget(1);

    destroyRichNoteEditors();
    root.innerHTML = `
      <div class="bp-tool">
        ${renderHero(selectedVerses, noteGroups)}
        ${state.error ? `<div class="bp-alert is-error">${escapeHtml(state.error)}</div>` : ''}
        ${renderViewSwitch(noteGroups.length)}
        ${state.currentView === 'home'
          ? renderHomeView(filteredVerses, pagedVerses, totalPages, selectedVerses, previousChapterTarget, nextChapterTarget)
          : renderNotesView(noteGroups)}
        <input class="bp-hidden-file-input" type="file" accept=".json,application/json" data-note-import-input>
      </div>
      ${renderMobileSelectionDock(selectedVerses)}
      ${renderMobileSelectionTrigger(selectedVerses)}
      ${renderMobileNav(noteGroups.length)}
      ${state.currentView === 'home' ? renderMobileSidebar() : ''}
    `;
    mountRichNoteEditors();
  }

  function renderHero(selectedVerses, noteGroups) {
    const noteCount = Array.isArray(noteGroups) ? noteGroups.length : 0;
    const mobileViewport = isMobileViewport();
    if (state.currentView === 'notes') {
      return `
        <section class="bp-tool__hero bp-surface">
          <div class="bp-tool__hero-copy">
            ${mobileViewport ? '' : '<p class="bp-tool__eyebrow">我的空间</p>'}
            <h1>我的笔记</h1>
            ${mobileViewport ? '' : '<p>集中查看当前账号或浏览器里的全部笔记，并按经文顺序回到原文继续修改。</p>'}
            ${mobileViewport ? '' : `
            <div class="bp-tool__hero-metrics">
              <span class="bp-status-pill">笔记 ${noteCount} 条</span>
              <span class="bp-status-pill">${escapeHtml(state.noteMode === 'account' ? `账号 ${state.noteUsername || '已登录'}` : '当前浏览器保存')}</span>
            </div>
            `}
          </div>
          <div class="bp-tool__hero-side">
            <div class="bp-tool__hero-buttons">
              <button class="bp-button bp-button--primary" type="button" data-action="download-notes" ${noteCount ? '' : 'disabled'}>下载笔记</button>
              <button class="bp-button bp-button--light" type="button" data-action="import-notes">上传笔记</button>
            </div>
          </div>
        </section>
      `;
    }

    return `
      <section class="bp-tool__hero bp-surface">
        <div class="bp-tool__hero-copy">
          ${mobileViewport ? '' : '<p class="bp-tool__eyebrow">前台展示</p>'}
          <h1>圣经</h1>
          ${mobileViewport ? '' : '<p>支持搜索、卷章阅读、逐节笔记和手机端翻页，笔记可在“我的笔记”中集中查看。</p>'}
          ${mobileViewport ? '' : `
          <div class="bp-tool__hero-metrics">
            <span class="bp-status-pill">已选 ${selectedVerses.length} 节</span>
            <span class="bp-status-pill">笔记 ${noteCount} 条</span>
            <span class="bp-status-pill">${escapeHtml(state.noteMode === 'account' ? '账号同步' : '本机保存')}</span>
          </div>
          `}
        </div>
        <div class="bp-tool__hero-side">
          <div class="bp-tool__search">
            <input data-search-input type="text" value="${escapeHtml(state.keyword)}" placeholder="搜索经文，例如：约瑟 法老">
            <button class="bp-button bp-button--primary" type="button" data-action="search">搜索</button>
          </div>
          <div class="bp-tool__hero-buttons">
            <button class="bp-button bp-button--light" type="button" data-action="import-notes">上传笔记</button>
            <button class="bp-button bp-button--light" type="button" data-action="download-notes" ${noteCount ? '' : 'disabled'}>下载笔记</button>
          </div>
        </div>
      </section>
    `;
  }

  function renderViewSwitch(noteCount) {
    return `
      <section class="bp-card bp-view-nav">
        <button class="bp-view-nav__item ${state.currentView === 'home' ? 'is-active' : ''}" type="button" data-view="home">首页</button>
        <button class="bp-view-nav__item ${state.currentView === 'notes' ? 'is-active' : ''}" type="button" data-view="notes">我的笔记${noteCount ? ` · ${noteCount}` : ''}</button>
      </section>
    `;
  }

  function renderHomeView(filteredVerses, pagedVerses, totalPages, selectedVerses, previousChapterTarget, nextChapterTarget) {
    const mobileViewport = isMobileViewport();
    const mobileReaderMode = mobileViewport && !state.showSearchResults;
    return `
      <section class="bp-card bp-tool__selector ${mobileReaderMode ? 'bp-desktop-only' : ''}">
        <div class="bp-tool__selector-head">
          <div class="bp-segment">
            <button class="bp-segment__item ${state.currentCovenant === 'old' ? 'is-selected' : ''}" type="button" data-covenant="old">旧约</button>
            <button class="bp-segment__item ${state.currentCovenant === 'new' ? 'is-selected' : ''}" type="button" data-covenant="new">新约</button>
          </div>

          <div class="bp-tool__selector-actions">
            <span>${state.showSearchResults ? '当前为搜索结果' : '当前为按卷章节浏览'}</span>
            ${!state.showSearchResults && state.selectedBook ? `<button class="bp-button bp-button--light" type="button" data-action="toggle-browse">${state.browseControlsCollapsed ? '展开卷章' : '收起卷章'}</button>` : ''}
            ${state.showSearchResults ? '<button class="bp-button bp-button--light" type="button" data-action="clear-search">返回卷章浏览</button>' : ''}
          </div>
        </div>

        ${renderSelectorBody()}
      </section>

      <section class="bp-card bp-tool__selection ${mobileReaderMode ? 'bp-desktop-only' : ''}">
        <div class="bp-tool__selection-head">
          <div class="bp-tool__selection-meta">
            <strong>已选 ${selectedVerses.length} 节</strong>
            <span class="bp-tool__selection-tip">点击经文即可多选，支持跨卷跨章；按 ${escapeHtml(copyShortcutLabel)} 复制，按 ${escapeHtml(resetShortcutLabel)} 重置。</span>
            <span class="bp-tool__selection-tip">${escapeHtml(getNoteModeLabel())} 当前共 ${getNoteCount()} 条。</span>
          </div>
          <div class="bp-tool__selection-actions">
            <button class="bp-button bp-button--light" type="button" data-view="notes">我的笔记</button>
            <button class="bp-button bp-button--light" type="button" data-action="toggle-batch-note" ${selectedVerses.length ? '' : 'disabled'}>${isBatchNoteOpen() ? '收起批量笔记' : '批量笔记'}</button>
            <button class="bp-button bp-button--light" type="button" data-action="copy-selected" ${selectedVerses.length ? '' : 'disabled'}>${escapeHtml(state.selectedCopyLabel)}</button>
            <button class="bp-button bp-button--light" type="button" data-action="reset-selected" ${selectedVerses.length ? '' : 'disabled'}>重置</button>
          </div>
        </div>

        ${selectedVerses.length ? `
          <div class="bp-tool__selected-list">
            ${selectedVerses.map((verse) => `<button class="bp-selected-pill" type="button" data-remove-selected="${escapeHtml(verse.id)}">${escapeHtml(formatVerseReference(verse))}</button>`).join('')}
          </div>
          ${isBatchNoteOpen() ? renderBatchNoteCard(selectedVerses) : ''}
        ` : '<div class="bp-state-box">可跨不同卷、不同章节累计选择经文，再一次性复制。</div>'}
      </section>

      <section class="bp-card bp-tool__content ${mobileViewport ? 'is-reader-mobile' : ''}" data-content-section data-reader-swipe ${mobileViewport ? `style="--bp-reader-font-size:${state.readerFontSize}px"` : ''}>
        <div class="bp-tool__content-head">
            <div class="bp-tool__content-title">
              <div class="bp-tool__content-title-row">
                <h2>${escapeHtml(getContentTitle())}</h2>
                ${mobileReaderMode ? renderMobileReaderTools() : ''}
                ${state.showSearchResults ? '<button class="bp-button bp-button--light bp-button--compact" type="button" data-action="clear-search">返回卷章浏览</button>' : ''}
                ${!mobileReaderMode && !state.showSearchResults && state.selectedBook && state.selectedChapter != null ? `
                  <div class="bp-tool__chapter-nav">
                  <button class="bp-button bp-button--light bp-button--compact" type="button" data-action="previous-chapter" ${previousChapterTarget ? '' : 'disabled'} title="${escapeHtml(previousChapterTarget ? `上一章：${previousChapterTarget.book} 第 ${previousChapterTarget.chapter} 章（${previousChapterShortcutLabel}）` : '已经是整本圣经的第一章')}">上一章</button>
                  <button class="bp-button bp-button--light bp-button--compact" type="button" data-action="next-chapter" ${nextChapterTarget ? '' : 'disabled'} title="${escapeHtml(nextChapterTarget ? `下一章：${nextChapterTarget.book} 第 ${nextChapterTarget.chapter} 章（${nextChapterShortcutLabel}）` : '已经是整本圣经的最后一章')}">下一章</button>
                </div>
              ` : ''}
            </div>
            ${mobileReaderMode ? '' : `<p>${escapeHtml(getContentDescription(filteredVerses.length))}</p>`}
          </div>
          ${mobileReaderMode ? '' : `
            <div class="bp-tool__content-actions">
              <span class="bp-count">${escapeHtml(getPageSummary(filteredVerses.length, totalPages))}</span>
              <button class="bp-button bp-button--light" type="button" data-action="copy-page" ${pagedVerses.length ? '' : 'disabled'}>${escapeHtml(state.copyPageLabel)}</button>
            </div>
          `}
        </div>

        ${mobileReaderMode ? renderMobileActiveNoteCard(selectedVerses) : ''}
        ${renderContentBody(filteredVerses, pagedVerses, totalPages)}
      </section>
    `;
  }

  function renderNotesView(noteGroups) {
    const detailGroup = state.noteDetailGroupId ? getNoteGroupById(state.noteDetailGroupId, noteGroups) : null;
    if (state.noteDetailGroupId && !detailGroup) {
      state.noteDetailGroupId = '';
    }

    if (detailGroup) {
      return renderNoteDetailView(detailGroup);
    }

    return `
      <section class="bp-card bp-tool__notes-page" data-notes-section>
        <div class="bp-tool__notes-head">
          <div class="bp-tool__selection-meta">
            <strong>我的笔记</strong>
            <span class="bp-tool__selection-tip">先看总览，点开后再看完整经文和完整笔记。</span>
          </div>
          <div class="bp-tool__notes-actions">
            <span class="bp-count">${noteGroups.length} 条</span>
          </div>
        </div>
        ${noteGroups.length ? `
          <div class="bp-note-groups">
            ${noteGroups.map((group) => renderNoteGroupCard(group)).join('')}
          </div>
        ` : '<div class="bp-state-box">还没有笔记，回到首页点开经文右侧的“笔记”即可开始记录。</div>'}
      </section>
    `;
  }

  function renderNoteGroupCard(group) {
    const jumpButton = group.isBatch
      ? `<button class="bp-button bp-button--light bp-button--compact" type="button" data-open-note-group="${escapeHtml(group.id)}">定位原文</button>`
      : `<button class="bp-button bp-button--light bp-button--compact" type="button" data-open-note="${escapeHtml(group.notes[0].key)}">定位原文</button>`;
    const scripturePreview = getNoteGroupScripturePreview(group);
    const contentPreview = getNoteGroupContentPreview(group);

    return `
      <article class="bp-note-group-card ${group.isBatch ? 'is-batch' : 'is-single'}" data-open-note-detail="${escapeHtml(group.id)}">
        <div class="bp-note-group-card__head">
          <div class="bp-note-group-card__meta">
            <span class="bp-note-group-card__eyebrow">${group.isBatch ? '多节合并笔记' : '单节笔记'}</span>
            <strong>${escapeHtml(group.heading)}</strong>
            <span>${escapeHtml(group.isBatch ? `共 ${group.notes.length} 节经文 · 最近更新 ${formatNoteTime(group.updatedAt)}` : `最近更新 ${formatNoteTime(group.updatedAt)}`)}</span>
          </div>
          <div class="bp-note-group-card__actions">
            <button class="bp-button bp-button--primary bp-button--compact" type="button" data-open-note-detail="${escapeHtml(group.id)}">查看详情</button>
            ${jumpButton}
          </div>
        </div>
        <div class="bp-note-group-card__preview">
          <div class="bp-note-group-card__preview-scripture">${escapeHtml(scripturePreview)}</div>
          <div class="bp-note-group-card__excerpt">${escapeHtml(contentPreview)}</div>
        </div>
      </article>
    `;
  }

  function renderNoteDetailView(group) {
    const openButton = group.isBatch
      ? `<button class="bp-button bp-button--light" type="button" data-open-note-group="${escapeHtml(group.id)}">回到原文</button>`
      : `<button class="bp-button bp-button--light" type="button" data-open-note="${escapeHtml(group.notes[0].key)}">回到原文</button>`;
    const deleteButton = group.isBatch
      ? `<button class="bp-button bp-button--light" type="button" data-delete-note-group="${escapeHtml(group.id)}">删除整组</button>`
      : `<button class="bp-button bp-button--light" type="button" data-note-clear="${escapeHtml(group.notes[0].key)}">删除这条</button>`;

    return `
      <section class="bp-card bp-note-detail" data-notes-section>
        <div class="bp-note-detail__topbar">
          <button class="bp-button bp-button--light bp-button--compact" type="button" data-action="back-note-list">返回列表</button>
          <span class="bp-count">${group.isBatch ? `${group.notes.length} 节经文` : '1 条笔记'}</span>
        </div>
        <div class="bp-note-detail__head">
          <span class="bp-note-group-card__eyebrow">${group.isBatch ? '多节合并笔记' : '单节笔记'}</span>
          <h2>${escapeHtml(group.heading)}</h2>
          <p>${escapeHtml(group.isBatch ? `这 ${group.notes.length} 节经文共用同一条笔记。` : '这条笔记对应单节经文。')} 最近更新 ${escapeHtml(formatNoteTime(group.updatedAt))}</p>
        </div>
        <div class="bp-note-detail__actions">
          ${openButton}
          ${deleteButton}
        </div>
        <section class="bp-note-detail__block">
          <div class="bp-note-detail__block-head">
            <strong>经文</strong>
            <span>${escapeHtml(group.references.join('、'))}</span>
          </div>
          <div class="bp-note-detail__scripture">
            ${group.verses.map((verse) => `
              <p class="bp-note-detail__verse">
                <strong>${escapeHtml(String(verse.verseNumber || 0))}</strong>
                <span>${escapeHtml(verse.content || '原经文暂时不可用')}</span>
              </p>
            `).join('')}
          </div>
        </section>
        <section class="bp-note-detail__block">
          <div class="bp-note-detail__block-head">
            <strong>笔记内容</strong>
            <span>${escapeHtml(group.isBatch ? '完整内容' : '当前内容')}</span>
          </div>
          <div class="bp-note-detail__content">${group.noteHtml || ''}</div>
        </section>
      </section>
    `;
  }

  function renderMobileNav(noteCount) {
    return `
      <nav class="bp-mobile-nav ${state.mobileSidebarOpen ? 'is-hidden' : ''}">
        <button class="bp-mobile-nav__item ${state.currentView === 'home' ? 'is-active' : ''}" type="button" data-view="home">
          <span>首页</span>
        </button>
        <button class="bp-mobile-nav__item ${state.currentView === 'notes' ? 'is-active' : ''}" type="button" data-view="notes">
          <span>我的笔记</span>
          ${noteCount ? `<strong>${noteCount}</strong>` : ''}
        </button>
      </nav>
    `;
  }

  function renderMobileSelectionDock(selectedVerses) {
    if (!isMobileViewport() || state.currentView !== 'home' || !selectedVerses.length || !state.mobileSelectionMenuOpen) {
      return '';
    }

    const allHighlighted = selectedVerses.every((verse) => isVerseHighlighted(verse.id));
    const summaryText = getMobileSelectionSummary(selectedVerses);

    return `
      <aside class="bp-mobile-selection-dock ${state.mobileSidebarOpen ? 'is-hidden' : ''}">
        <div class="bp-mobile-selection-dock__head">
          <div class="bp-mobile-selection-dock__summary">
            <strong>已选 ${selectedVerses.length} 节</strong>
            <span>${escapeHtml(summaryText)}</span>
          </div>
          <button class="bp-mobile-action-chip bp-mobile-action-chip--ghost" type="button" data-action="hide-mobile-selection-menu">收起</button>
        </div>
        <div class="bp-mobile-selection-dock__actions" role="toolbar" aria-label="已选经文操作">
          <button class="bp-mobile-action-chip bp-mobile-action-chip--primary bp-mobile-action-chip--copy ${state.selectedCopyLabel === defaultSelectedCopyLabel ? '' : 'is-active'}" type="button" data-action="copy-selected">${escapeHtml(getMobileSelectedCopyLabel())}</button>
          <button class="bp-mobile-action-chip" type="button" data-action="open-note-from-selection">${selectedVerses.length > 1 ? '批量笔记' : '笔记'}</button>
          <button class="bp-mobile-action-chip ${allHighlighted ? 'is-active' : ''}" type="button" data-action="toggle-highlight-selected">${allHighlighted ? '取消高亮' : '高亮经文'}</button>
          <div class="bp-mobile-font-stepper" aria-label="阅读字号">
            <button class="bp-mobile-font-stepper__btn" type="button" aria-label="减小经文字号" data-action="decrease-reader-font">A-</button>
            <span class="bp-mobile-font-stepper__value">${state.readerFontSize}px</span>
            <button class="bp-mobile-font-stepper__btn" type="button" aria-label="增大经文字号" data-action="increase-reader-font">A+</button>
          </div>
          <button class="bp-mobile-action-chip bp-mobile-action-chip--ghost" type="button" data-action="reset-selected">重置</button>
        </div>
      </aside>
    `;
  }

  function renderMobileSelectionTrigger(selectedVerses) {
    if (!isMobileViewport() || state.currentView !== 'home' || !selectedVerses.length || state.mobileSelectionMenuOpen || state.mobileSidebarOpen || state.activeNoteKey) {
      return '';
    }

    return `
      <button class="bp-mobile-selection-trigger" type="button" data-action="show-mobile-selection-menu">
        已选 ${selectedVerses.length} 节，点此展开
      </button>
    `;
  }

  function renderMobileReaderTools() {
    return `
      <div class="bp-mobile-reader-tools bp-mobile-only">
        <span class="bp-mobile-reader-chip">字号 ${state.readerFontSize}px</span>
        <button class="bp-mobile-reader-chip bp-mobile-reader-chip--button" type="button" data-action="toggle-mobile-sidebar">目录</button>
      </div>
    `;
  }

  function renderMobileSidebar() {
    return `
      <div class="bp-mobile-drawer ${state.mobileSidebarOpen ? 'is-open' : ''}">
        <button class="bp-mobile-drawer__mask" type="button" data-action="close-mobile-sidebar" aria-label="关闭目录"></button>
        <aside class="bp-mobile-drawer__panel">
          <div class="bp-mobile-drawer__head">
            <div>
              <strong>目录</strong>
              <p>在这里快速切换约别、卷名和章节。</p>
            </div>
            <button class="bp-button bp-button--light bp-button--compact" type="button" data-action="close-mobile-sidebar">关闭</button>
          </div>
          <div class="bp-mobile-drawer__body">
            <div class="bp-segment">
              <button class="bp-segment__item ${state.currentCovenant === 'old' ? 'is-selected' : ''}" type="button" data-covenant="old">旧约</button>
              <button class="bp-segment__item ${state.currentCovenant === 'new' ? 'is-selected' : ''}" type="button" data-covenant="new">新约</button>
            </div>
            <div class="bp-tool__group">
              <div class="bp-tool__group-title">卷名</div>
              <div class="bp-pill-wrap bp-pill-wrap--dropdown bp-pill-wrap--books-mobile">
                ${booksFor(state.currentCovenant).map((book) => `<button class="bp-pill bp-pill--book-compact ${state.selectedBook === book ? 'is-selected' : ''}" type="button" data-book="${escapeHtml(book)}" title="${escapeHtml(book)}">${escapeHtml(getBookShortName(book))}</button>`).join('')}
              </div>
            </div>
            <div class="bp-tool__group">
              <div class="bp-tool__group-title">章节</div>
              <div class="bp-pill-wrap bp-pill-wrap--dropdown bp-pill-wrap--chapters-mobile">
                ${chaptersFor(state.currentCovenant, state.selectedBook).map((chapter) => `<button class="bp-pill bp-pill--chapter ${state.selectedChapter === chapter ? 'is-selected' : ''}" type="button" data-chapter="${chapter}">${chapter}</button>`).join('')}
              </div>
            </div>
          </div>
        </aside>
      </div>
    `;
  }

  function renderSelectorBody() {
    if (state.showSearchResults) {
      const books = getSearchFilterBooks();
      return `
        <div class="bp-tool__group">
          <div class="bp-tool__group-title">搜索筛选</div>
          <div class="bp-segment bp-segment--filters">
            <button class="bp-segment__item ${state.searchFilterCovenant === 'all' ? 'is-selected' : ''}" type="button" data-search-covenant="all">全部</button>
            <button class="bp-segment__item ${state.searchFilterCovenant === 'old' ? 'is-selected' : ''}" type="button" data-search-covenant="old">旧约</button>
            <button class="bp-segment__item ${state.searchFilterCovenant === 'new' ? 'is-selected' : ''}" type="button" data-search-covenant="new">新约</button>
          </div>
        </div>
        <div class="bp-tool__group">
          <div class="bp-tool__group-title">卷名筛选</div>
          <div class="bp-pill-wrap bp-pill-wrap--dropdown">
            <button class="bp-pill ${!state.searchFilterBook ? 'is-selected' : ''}" type="button" data-search-book="">全部卷名</button>
            ${books.map((book) => `<button class="bp-pill ${state.searchFilterBook === book ? 'is-selected' : ''}" type="button" data-search-book="${escapeHtml(book)}">${escapeHtml(book)}</button>`).join('')}
          </div>
        </div>
      `;
    }

    if (state.browseControlsCollapsed && state.selectedChapter != null) {
      return `<div class="bp-tool__browse-summary">当前已定位到 ${escapeHtml(state.selectedBook)} 第 ${state.selectedChapter} 章，点击“展开卷章”可重新选择。</div>`;
    }

    return `
      <div class="bp-tool__group">
        <div class="bp-tool__group-title">卷名</div>
        <div class="bp-pill-wrap bp-pill-wrap--dropdown">
          ${booksFor(state.currentCovenant).map((book) => `<button class="bp-pill ${state.selectedBook === book ? 'is-selected' : ''}" type="button" data-book="${escapeHtml(book)}">${escapeHtml(book)}</button>`).join('')}
        </div>
      </div>

      <div class="bp-tool__group">
        <div class="bp-tool__group-title">章节</div>
        <div class="bp-pill-wrap bp-pill-wrap--dropdown">
          ${chaptersFor(state.currentCovenant, state.selectedBook).map((chapter) => `<button class="bp-pill bp-pill--chapter ${state.selectedChapter === chapter ? 'is-selected' : ''}" type="button" data-chapter="${chapter}">${chapter}</button>`).join('')}
        </div>
      </div>
    `;
  }

  function renderContentBody(filteredVerses, pagedVerses, totalPages) {
    if (state.loading) {
      return '<div class="bp-state-box">正在加载圣经数据...</div>';
    }

    if (!filteredVerses.length) {
      return `<div class="bp-state-box">${state.showSearchResults ? '当前筛选条件下没有匹配的经文。' : '请选择卷名和章节后查看经文内容。'}</div>`;
    }

    return `
      <div data-verse-top></div>
      <div class="bp-verse-list">
        ${pagedVerses.map((verse) => renderVerseRow(verse)).join('')}
      </div>
      ${isMobileViewport() && !state.showSearchResults ? renderMobileReaderFooter(pagedVerses, totalPages) : ''}
      ${renderPagination(totalPages)}
    `;
  }

  function renderVerseRow(verse) {
    const selected = isVerseSelected(verse.id);
    const highlighted = isVerseHighlighted(verse.id);
    const note = getVerseNote(verse);
    const noteKey = buildVerseNoteKey(verse);
    const compactMobileVerse = isMobileViewport() && !state.showSearchResults;
    const content = state.showSearchResults ? highlightText(verse.content || '', state.searchKeyword) : escapeHtml(verse.content || '');
    const actionButton = state.showSearchResults
      ? `<button class="bp-copy-mini" type="button" data-jump-verse="${escapeHtml(verse.id)}">跳转</button>`
      : `<button class="bp-copy-mini" type="button" data-copy-verse="${escapeHtml(verse.id)}">${state.copiedVerseId === verse.id ? '已复制' : '复制'}</button>`;

    if (compactMobileVerse) {
      return `
        <div class="bp-verse-item ${selected ? 'is-selected' : ''} ${highlighted ? 'is-highlighted' : ''} is-mobile-compact ${isNoteOpen(verse) ? 'is-note-open' : ''} ${state.focusedVerseId === verse.id ? 'is-focused' : ''}" data-verse-id="${escapeHtml(verse.id)}">
          <div class="bp-verse-line ${selected ? 'is-selected' : ''}" data-toggle-verse="${escapeHtml(verse.id)}" role="checkbox" aria-label="${escapeHtml(formatVerseReference(verse))}" aria-checked="${selected ? 'true' : 'false'}" tabindex="0">
            <div class="bp-verse-main bp-verse-main--reader ${selected ? 'is-selected' : ''}">
              <span class="bp-verse-reader-number">${escapeHtml(String(verse.verseNumber || 0))}</span>
              <span class="bp-verse-reader-body">
                <span class="bp-verse-text">${content}</span>
                ${note || highlighted ? `
                  <span class="bp-verse-ref-row bp-verse-ref-row--meta">
                    ${note ? '<span class="bp-verse-note-dot" aria-hidden="true"></span>' : ''}
                    ${highlighted ? '<span class="bp-verse-highlight-badge">已高亮</span>' : ''}
                  </span>
                ` : ''}
              </span>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="bp-verse-item ${selected ? 'is-selected' : ''} ${highlighted ? 'is-highlighted' : ''} ${isNoteOpen(verse) ? 'is-note-open' : ''} ${state.focusedVerseId === verse.id ? 'is-focused' : ''}" data-verse-id="${escapeHtml(verse.id)}">
        <div class="bp-verse-line ${selected ? 'is-selected' : ''}" data-toggle-verse="${escapeHtml(verse.id)}" role="checkbox" aria-checked="${selected ? 'true' : 'false'}" tabindex="0">
          <div class="bp-verse-main ${selected ? 'is-selected' : ''}">
            <span class="bp-verse-text-wrap">
              <span class="bp-verse-ref-row">
                <span class="bp-verse-ref">${escapeHtml(formatVerseReference(verse))}</span>
              </span>
              <span class="bp-verse-text">${content}</span>
            </span>
          </div>
          <div class="bp-verse-actions">
            <button class="bp-note-mini ${note ? 'has-note' : ''} ${isNoteOpen(verse) ? 'is-active' : ''}" type="button" data-note-toggle="${escapeHtml(noteKey)}">${note ? '笔记 *' : '笔记'}</button>
            ${actionButton}
          </div>
        </div>
        ${isNoteOpen(verse) ? renderNoteCard(verse, note) : ''}
      </div>
    `;
  }

  function renderNoteEditorSurface(key, html, placeholder, clearLabel, clearDisabled) {
    return `
      <div class="bp-note-rich-editor" data-note-rich-editor="${escapeHtml(key)}" data-note-placeholder="${escapeHtml(placeholder)}">
        <div class="bp-note-editor-shell">
          <div class="bp-note-editor" contenteditable="true" spellcheck="true" data-note-editor="${escapeHtml(key)}" data-note-placeholder="${escapeHtml(placeholder)}">${html || ''}</div>
          ${renderNoteToolbar(key, clearLabel, clearDisabled)}
        </div>
      </div>
    `;
  }

  function renderMobileActiveNoteCard(selectedVerses) {
    if (!isMobileViewport() || state.currentView !== 'home' || state.showSearchResults || !state.activeNoteKey) {
      return '';
    }

    if (state.activeNoteKey === BATCH_NOTE_EDITOR_KEY) {
      return selectedVerses.length ? renderBatchNoteCard(selectedVerses) : '';
    }

    const verse = findVerseByNoteKey(state.activeNoteKey);
    if (!verse) {
      return '';
    }

    const note = getVerseNote(verse);
    const key = buildVerseNoteKey(verse);
    return `
      <div class="bp-verse-note-card bp-tool__selection-note-card bp-verse-note-card--mobile" data-note-panel>
        <div class="bp-verse-note-card__head">
          <div class="bp-verse-note-card__meta">
            <strong>单节笔记</strong>
            <span>${escapeHtml(formatVerseReference(verse))}</span>
          </div>
          <div class="bp-note-save-actions">
            <button class="bp-button bp-button--light bp-button--compact" type="button" data-action="close-note" data-note-close="${escapeHtml(key)}">收起</button>
            <button class="bp-button bp-button--light bp-button--compact" type="button" data-note-clear="${escapeHtml(key)}" ${note ? '' : 'disabled'}>清空</button>
            <button class="bp-button bp-button--primary bp-button--compact" type="button" data-action="save-close-note" data-note-save="${escapeHtml(key)}">保存并关闭</button>
          </div>
        </div>
        ${renderNoteEditorSurface(key, note ? note.html : '', '给这节经文写一点笔记吧。', '清空', note ? '' : 'disabled')}
      </div>
    `;
  }

  function renderNoteCard(verse, note) {
    const key = buildVerseNoteKey(verse);
    const useRichEditor = canUseRichNoteEditor();
    return `
      <div class="bp-verse-note-card">
        <div class="bp-verse-note-card__head">
          <div class="bp-verse-note-card__meta">
            <strong>${escapeHtml(formatVerseReference(verse))} 笔记</strong>
            <span>${escapeHtml(state.noteMode === 'account' ? '已登录，可同步到当前账号。' : '未登录时暂存在当前浏览器。')}</span>
          </div>
        </div>
        <div class="bp-note-editor-tip">
          <span class="bp-note-editor-tip__badge">所见即所得</span>
          <span>选中文字后可直接排版，输入时会自动暂存。</span>
        </div>
        ${renderNoteEditorSurface(key, note ? note.html : '', '给这节经文写一点笔记吧。', '清空', note ? '' : 'disabled')}
        <div class="bp-verse-note-card__foot">
          <div class="bp-verse-note-card__foot-copy">
            <span class="bp-note-save-state" data-note-save-state-for="${escapeHtml(key)}">${escapeHtml(getNoteSaveStateText(key))}</span>
            <span data-note-updated-for="${escapeHtml(key)}">${note ? `最近更新：${escapeHtml(formatNoteTime(note.updatedAt))}` : '暂时还没有笔记。'}</span>
            <span>${escapeHtml(state.noteMode === 'account' ? '可在“我的笔记”里继续查看和修改。' : '可通过下载 / 上传备份笔记。')}</span>
          </div>
          <div class="bp-note-save-actions">
            ${useRichEditor ? `<button class="bp-button bp-button--light bp-button--compact" type="button" data-note-clear="${escapeHtml(key)}" ${note ? '' : 'disabled'}>清空</button>` : ''}
            <button class="bp-button bp-button--light bp-button--compact" type="button" data-action="close-note" data-note-close="${escapeHtml(key)}">收起</button>
            <button class="bp-button bp-button--primary bp-button--compact" type="button" data-action="save-close-note" data-note-save="${escapeHtml(key)}">保存并关闭</button>
          </div>
        </div>
      </div>
    `;
  }

  function getNoteSaveStateText(key) {
    if (!key) {
      return '';
    }
    if (state.savingNoteKey === key) {
      return '正在保存...';
    }
    if (state.confirmedSavedNoteKey === key && state.confirmedSavedAt) {
      return `已保存 ${formatNoteTime(state.confirmedSavedAt)}`;
    }
    return '会自动暂存，完成后点“保存并关闭”。';
  }

  function updateNoteSaveMeta(key) {
    if (!key || key === BATCH_NOTE_EDITOR_KEY) {
      return;
    }

    const saveState = getNoteSaveStateText(key);
    const note = state.notes[key];
    const updatedText = note ? `最近更新：${formatNoteTime(note.updatedAt)}` : '暂时还没有笔记。';

    root.querySelectorAll(`[data-note-save-state-for="${escapeAttribute(key)}"]`).forEach((element) => {
      if (element instanceof HTMLElement && element.textContent !== saveState) {
        element.textContent = saveState;
      }
    });

    root.querySelectorAll(`[data-note-updated-for="${escapeAttribute(key)}"]`).forEach((element) => {
      if (element instanceof HTMLElement && element.textContent !== updatedText) {
        element.textContent = updatedText;
      }
    });
  }

  function renderBatchNoteCard(selectedVerses) {
    const preview = selectedVerses
      .slice(0, 4)
      .map((verse) => formatVerseReference(verse))
      .join('、');
    const previewText = selectedVerses.length > 4
      ? `${preview} 等 ${selectedVerses.length} 节`
      : preview;
    return `
      <div class="bp-verse-note-card bp-tool__selection-note-card bp-verse-note-card--mobile" data-note-panel>
        <div class="bp-verse-note-card__head">
          <div class="bp-verse-note-card__meta">
            <strong>多节笔记</strong>
            <span>${escapeHtml(previewText)}</span>
          </div>
          <div class="bp-note-save-actions">
            <button class="bp-button bp-button--light bp-button--compact" type="button" data-action="close-note" data-note-close="${BATCH_NOTE_EDITOR_KEY}">收起</button>
            <button class="bp-button bp-button--light bp-button--compact" type="button" data-note-clear="${BATCH_NOTE_EDITOR_KEY}">清空草稿</button>
            <button class="bp-button bp-button--primary bp-button--compact" type="button" data-action="apply-batch-note">写入已选</button>
          </div>
        </div>
        ${renderNoteEditorSurface(BATCH_NOTE_EDITOR_KEY, state.batchNoteDraft || '', '为当前已选经文批量写一条笔记。', '清空草稿', '')}
      </div>
    `;
  }

  function renderNoteToolbar(key, clearLabel, clearDisabled) {
    const toolbarStyle = getNoteToolbarStyle(key);
    const activeColor = String(toolbarStyle.color || DEFAULT_NOTE_COLOR).toLowerCase();
    return `
      <div class="bp-note-toolbar" data-note-toolbar-for="${escapeHtml(key)}">
        <div class="bp-note-toolbar__scroll" role="toolbar" aria-label="笔记格式工具">
          <div class="bp-note-toolbar__section" role="group" aria-label="文字格式">
            <button class="bp-note-tool-btn bp-note-tool-btn--icon" type="button" title="加粗" aria-label="加粗" data-note-key="${escapeHtml(key)}" data-note-command="bold"><span class="bp-note-tool-btn__glyph is-strong">B</span></button>
            <button class="bp-note-tool-btn bp-note-tool-btn--icon" type="button" title="斜体" aria-label="斜体" data-note-key="${escapeHtml(key)}" data-note-command="italic"><span class="bp-note-tool-btn__glyph is-italic">I</span></button>
            <button class="bp-note-tool-btn bp-note-tool-btn--icon" type="button" title="下划线" aria-label="下划线" data-note-key="${escapeHtml(key)}" data-note-command="underline"><span class="bp-note-tool-btn__glyph is-underline">U</span></button>
          </div>
          <div class="bp-note-toolbar__section" role="group" aria-label="段落格式">
            <button class="bp-note-tool-btn bp-note-tool-btn--icon" type="button" title="无序列表" aria-label="无序列表" data-note-key="${escapeHtml(key)}" data-note-command="insertUnorderedList"><span class="bp-note-tool-btn__glyph">•</span></button>
            <button class="bp-note-tool-btn bp-note-tool-btn--icon" type="button" title="有序列表" aria-label="有序列表" data-note-key="${escapeHtml(key)}" data-note-command="insertOrderedList"><span class="bp-note-tool-btn__glyph">1.</span></button>
            <button class="bp-note-tool-btn bp-note-tool-btn--icon" type="button" title="引用" aria-label="引用" data-note-key="${escapeHtml(key)}" data-note-command="formatBlock" data-note-value="<blockquote>"><span class="bp-note-tool-btn__glyph">❝</span></button>
            <button class="bp-note-tool-btn bp-note-tool-btn--icon" type="button" title="清除格式" aria-label="清除格式" data-note-key="${escapeHtml(key)}" data-note-command="removeFormat"><span class="bp-note-tool-btn__glyph">Tx</span></button>
          </div>
        </div>
        <div class="bp-note-toolbar__controls">
          <span class="bp-note-toolbar__chip bp-note-toolbar__chip--color" title="文字颜色">
            <span class="bp-note-toolbar__chip-label">颜色</span>
            <span class="bp-note-toolbar__palette" role="group" aria-label="文字颜色预设">
              ${NOTE_COLOR_PRESETS.map((preset) => `
                <button
                  class="bp-note-color-swatch ${activeColor === preset.value.toLowerCase() ? 'is-active' : ''}"
                  type="button"
                  title="${escapeHtml(preset.label)}"
                  aria-label="${escapeHtml(preset.label)}"
                  style="--bp-note-color: ${escapeHtml(preset.value)}"
                  data-note-key="${escapeHtml(key)}"
                  data-note-color-value="${escapeHtml(preset.value)}"
                ></button>
              `).join('')}
            </span>
          </span>
          <span class="bp-note-toolbar__chip bp-note-toolbar__chip--size">
            <span class="bp-note-toolbar__chip-label">字号</span>
            <button class="bp-note-toolbar__size-step" type="button" aria-label="减小字号" data-action="note-size-step" data-note-size-key="${escapeHtml(key)}" data-note-size-step="-1">A-</button>
            <strong class="bp-note-toolbar__size-value">${toolbarStyle.fontSize}px</strong>
            <button class="bp-note-toolbar__size-step" type="button" aria-label="增大字号" data-action="note-size-step" data-note-size-key="${escapeHtml(key)}" data-note-size-step="1">A+</button>
          </span>
          <div class="bp-note-toolbar__actions">
            ${key === BATCH_NOTE_EDITOR_KEY ? '<button class="bp-note-toolbar__action bp-note-toolbar__action--primary" type="button" data-action="apply-batch-note">写入已选</button>' : ''}
            <button class="bp-note-toolbar__action bp-note-toolbar__action--danger" type="button" data-note-clear="${escapeHtml(key)}" ${clearDisabled || ''}>${escapeHtml(clearLabel)}</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderPagination(totalPages) {
    if (totalPages <= 1) {
      if (isMobileViewport() && !state.showSearchResults) {
        return '';
      }
      return '';
    }

    if (isMobileViewport() && !state.showSearchResults) {
      return '';
    }

    return `
      <div class="bp-pagination">
        <div class="bp-pagination__row">
          <button class="bp-pagination__nav" type="button" data-page-nav="-1" ${state.currentPage <= 1 ? 'disabled' : ''}>上一页</button>
          <div class="bp-pagination__pages">
            ${buildPaginationItems(state.currentPage, totalPages).map((item) => {
              if (typeof item === 'number') {
                return `<button class="bp-pagination__button ${item === state.currentPage ? 'is-active' : ''}" type="button" data-page="${item}">${item}</button>`;
              }
              return '<button class="bp-pagination__ellipsis" type="button" data-action="toggle-jump">...</button>';
            }).join('')}
          </div>
          <button class="bp-pagination__nav" type="button" data-page-nav="1" ${state.currentPage >= totalPages ? 'disabled' : ''}>下一页</button>
        </div>

        ${state.showJumpInput ? `
          <div class="bp-pagination__jump">
            <span>跳转到</span>
            <input data-jump-input type="number" min="1" max="${totalPages}" value="${escapeHtml(state.jumpPageValue || String(state.currentPage))}">
            <span>页</span>
            <button class="bp-button bp-button--light" type="button" data-action="submit-jump">前往</button>
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderMobileReaderFooter(pagedVerses, totalPages) {
    const pageRange = getCurrentPageVerseRangeText(pagedVerses);
    return `
      <div class="bp-reader-footer">
        <div class="bp-reader-footer__meta">
          <strong>${escapeHtml(`${getContentTitle()} · ${getPageSummary(getFilteredVerses().length, totalPages)}`)}</strong>
          ${pageRange ? `<span>${escapeHtml(pageRange)}</span>` : ''}
          <span>${escapeHtml(state.selectedMap.size ? `已选 ${state.selectedMap.size} 节，轻点继续加选；工具栏会自动出现。` : '轻点经文即可多选；左右滑动可翻页。')}</span>
        </div>
      </div>
    `;
  }

  function getCurrentPageVerseRangeText(pagedVerses) {
    if (!Array.isArray(pagedVerses) || !pagedVerses.length) {
      return '';
    }

    const firstVerse = Number(pagedVerses[0].verseNumber) || 0;
    const lastVerse = Number(pagedVerses[pagedVerses.length - 1].verseNumber) || 0;
    if (!firstVerse || !lastVerse) {
      return '';
    }
    if (firstVerse === lastVerse) {
      return `当前显示第 ${firstVerse} 节`;
    }
    return `当前显示第 ${firstVerse}-${lastVerse} 节`;
  }

  function getReaderDirectionLabel(direction, totalPages) {
    if (direction > 0) {
      if (state.currentPage < totalPages) {
        return '下一页';
      }

      const nextTarget = getAdjacentChapterTarget(1);
      if (!nextTarget) {
        return '下一页';
      }
      return nextTarget.book === state.selectedBook ? '下一章' : '下一卷';
    }

    if (state.currentPage > 1) {
      return '上一页';
    }

    const previousTarget = getAdjacentChapterTarget(-1);
    if (!previousTarget) {
      return '上一页';
    }
    return previousTarget.book === state.selectedBook ? '上一章' : '上一卷';
  }

  function getContentTitle() {
    if (state.showSearchResults) {
      return state.searchKeyword ? `搜索：${state.searchKeyword}` : '搜索结果';
    }
    if (!state.selectedBook || state.selectedChapter == null) {
      return '圣经内容';
    }
    return `${state.selectedBook} 第 ${state.selectedChapter} 章`;
  }

  function getContentDescription(totalCount) {
    if (state.showSearchResults) {
      return `共找到 ${totalCount} 节匹配经文，可继续按约别或卷名筛选，再通过“跳转”回到原章节。`;
    }
    if (!state.selectedBook || state.selectedChapter == null) {
      return '请选择卷名和章节开始阅读。';
    }
    if (isMobileViewport()) {
      return `本章共 ${totalCount} 节，轻点经文即可多选并唤出工具栏。`;
    }
    return `本章共 ${totalCount} 节，经文支持点击多选、复制，并可通过 ${previousChapterShortcutLabel} / ${nextChapterShortcutLabel} 快捷键切换章节。`;
  }

  function getPageSummary(totalCount, totalPages) {
    if (totalPages > 1) {
      return `共 ${totalCount} 节 · 第 ${state.currentPage}/${totalPages} 页`;
    }
    return `共 ${totalCount} 节`;
  }

  function buildPaginationItems(current, total) {
    if (total <= 7) {
      return Array.from({ length: total }, (_, index) => index + 1);
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

    const ordered = Array.from(pages).filter((page) => page >= 1 && page <= total).sort((left, right) => left - right);
    const items = [];
    ordered.forEach((page, index) => {
      const previous = ordered[index - 1];
      if (index > 0 && previous != null && page - previous > 1) {
        items.push('ellipsis');
      }
      items.push(page);
    });
    return items;
  }
  function sortVerses(verses) {
    return verses.slice().sort((left, right) => {
      return compareScriptureOrder(left, right);
    });
  }

  function compareScriptureOrder(left, right) {
    const leftIsNew = isNewCovenantLabel(left && left.covenantName);
    const rightIsNew = isNewCovenantLabel(right && right.covenantName);
    if (leftIsNew !== rightIsNew) {
      return leftIsNew ? 1 : -1;
    }

    const leftBookNumber = resolveBookOrder(left && left.bookName, left && left.bookNumber);
    const rightBookNumber = resolveBookOrder(right && right.bookName, right && right.bookNumber);
    if (leftBookNumber !== rightBookNumber) {
      return leftBookNumber - rightBookNumber;
    }

    if ((left && left.chapterNumber || 0) !== (right && right.chapterNumber || 0)) {
      return (left && left.chapterNumber || 0) - (right && right.chapterNumber || 0);
    }

    return (left && left.verseNumber || 0) - (right && right.verseNumber || 0);
  }

  function resolveBookOrder(bookName, bookNumber) {
    const explicit = Number(bookNumber);
    if (explicit) {
      return explicit;
    }

    const matched = state.verses.find((verse) => verse.bookName === bookName);
    return Number(matched && matched.bookNumber) || 999;
  }

  function searchVerses(verses, keyword) {
    const tokens = splitKeyword(keyword);
    if (!tokens.length) {
      return [];
    }

    return verses.filter((verse) => {
      const haystack = `${verse.bookName || ''} ${verse.chapterNumber || ''}:${verse.verseNumber || ''} ${verse.content || ''}`.toLowerCase();
      return tokens.every((token) => haystack.includes(token));
    });
  }

  function splitKeyword(keyword) {
    return String(keyword || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  }

  function highlightText(text, keyword) {
    const tokens = splitKeyword(keyword);
    let html = escapeHtml(text || '');
    tokens.forEach((token) => {
      const pattern = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      html = html.replace(new RegExp(pattern, 'gi'), (match) => `<mark class="bible-keyword-highlight">${match}</mark>`);
    });
    return html;
  }

  function formatVerseReference(verse) {
    return `${verse.bookName || ''} ${verse.chapterNumber || 0}:${verse.verseNumber || 0}`;
  }

  function formatNoteReference(note) {
    return `${note.bookName || ''} ${note.chapterNumber || 0}:${note.verseNumber || 0}`;
  }

  function formatVersePlainText(verse) {
    return `【${formatCompactVerseReference(verse)}】${verse.content || ''}`;
  }

  function formatVersePageText(verses) {
    return verses.map(formatVersePlainText).join('\n');
  }

  function formatNoteTime(value) {
    const date = new Date(value || '');
    if (Number.isNaN(date.getTime())) {
      return '刚刚';
    }
    return date.toLocaleString('zh-CN', { hour12: false });
  }

  function isStandaloneMode() {
    return Boolean(
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
      || window.navigator.standalone
    );
  }

  function updateStandaloneClass() {
    document.body.classList.toggle('bp-app-standalone', isStandaloneMode());
  }

  function isMobileViewport() {
    return Boolean(window.matchMedia && window.matchMedia('(max-width: 760px)').matches);
  }

  function getViewFromHash(hash) {
    return String(hash || '').replace(/^#/, '') === 'notes' ? 'notes' : 'home';
  }

  function syncViewHash(view) {
    const nextHash = view === 'notes' ? '#notes' : '#home';
    if (window.location.hash === nextHash) {
      return;
    }
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${nextHash}`);
  }

  function handleHashChange() {
    const nextView = getViewFromHash(window.location.hash);
    if (state.currentView === nextView) {
      return;
    }
    state.currentView = nextView;
    state.mobileSidebarOpen = false;
    state.noteDetailGroupId = '';
    render();
  }

  function getBookShortName(bookName) {
    const name = String(bookName || '').trim();
    return BOOK_SHORT_NAMES[name] || name;
  }

  function formatCompactVerseReference(entry) {
    const chapterNumber = Number(entry && entry.chapterNumber) || 0;
    const verseNumber = Number(entry && entry.verseNumber) || 0;
    return `${getBookShortName(entry && entry.bookName)}${chapterNumber}：${verseNumber}`;
  }

  function getMobileSelectionSummary(selectedVerses) {
    if (!Array.isArray(selectedVerses) || !selectedVerses.length) {
      return '轻点经文即可继续多选。';
    }

    const preview = selectedVerses
      .slice(0, 2)
      .map((verse) => formatCompactVerseReference(verse))
      .join('、');

    if (selectedVerses.length > 2) {
      return `${preview} 等 ${selectedVerses.length} 节，继续轻点可多选。`;
    }
    return `${preview}，继续轻点可多选。`;
  }

  function isNewCovenantLabel(label) {
    const text = String(label || '').trim();
    return text.includes('新') || text.toLowerCase().includes('new');
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttribute(value) {
    const stringValue = String(value || '');
    if (window.CSS && typeof window.CSS.escape === 'function') {
      return window.CSS.escape(stringValue);
    }
    return stringValue.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
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
    } catch {
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
    } catch {
      return false;
    }
  }

  function isCopyShortcut(event) {
    const key = String(event.key || '').toLowerCase();
    return (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && key === 'c';
  }

  function getCopyShortcutLabel() {
    if (typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform)) {
      return '⌘C';
    }
    return 'Ctrl+C';
  }

  function isResetShortcut(event) {
    const key = String(event.key || '').toLowerCase();
    return (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && key === 'x';
  }

  function getResetShortcutLabel() {
    if (typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform)) {
      return '⌘X';
    }
    return 'Ctrl+X';
  }

  function isPreviousChapterShortcut(event) {
    const key = String(event.key || '').toLowerCase();
    return !event.metaKey
      && !event.ctrlKey
      && !event.altKey
      && (key === '-' || key === '_' || key === 'subtract' || event.code === 'Minus' || event.code === 'NumpadSubtract');
  }

  function isNextChapterShortcut(event) {
    const key = String(event.key || '').toLowerCase();
    return !event.metaKey
      && !event.ctrlKey
      && !event.altKey
      && (key === '+' || key === '=' || key === 'add' || event.code === 'Equal' || event.code === 'NumpadAdd');
  }

  function getPreviousChapterShortcutLabel() {
    return '-';
  }

  function getNextChapterShortcutLabel() {
    return '+';
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

  function isReaderInteractiveTarget(target) {
    if (!(target instanceof Element)) {
      return false;
    }
    return !!target.closest('button, input, textarea, select, a, [contenteditable="true"], [data-note-panel], [data-note-editor], [data-note-toolbar-for], .bp-note-rich-editor, .bp-note-editor-shell, .bp-note-toolbar, .bp-note-toolbar__scroll, .bp-note-toolbar__controls, .bne-host, .bne-shell, .bne-toolbar, .bne-editor');
  }

  function focusJumpInput() {
    window.setTimeout(() => {
      const input = root.querySelector('[data-jump-input]');
      if (input && typeof input.focus === 'function') {
        input.focus();
        if (typeof input.select === 'function') {
          input.select();
        }
      }
    }, 0);
  }

  function scrollContentBy(offset) {
    const section = root.querySelector('[data-content-section]');
    if (section && section.scrollHeight > section.clientHeight && typeof section.scrollBy === 'function') {
      section.scrollBy({ top: offset, behavior: 'smooth' });
      return;
    }
    window.scrollBy({ top: offset, behavior: 'smooth' });
  }

  function scheduleResultsScrollTop() {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const anchor = root.querySelector('[data-verse-top]');
        if (anchor && typeof anchor.scrollIntoView === 'function') {
          anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  function scheduleFocusedVerseScroll() {
    if (!state.focusedVerseId) {
      scheduleResultsScrollTop();
      return;
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const target = root.querySelector(`[data-verse-id="${escapeAttribute(state.focusedVerseId)}"]`);
        if (target && typeof target.scrollIntoView === 'function') {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });
  }
})();

