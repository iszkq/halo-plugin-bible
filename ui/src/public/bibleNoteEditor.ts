type NoteEditorOptions = {
  content?: string
  key?: string
  onChange?: (html: string) => void
  placeholder?: string
}

type NoteEditorInstance = {
  destroy: () => void
  focus: () => void
  getHTML: () => string
}

type WindowWithBibleNoteEditor = Window & typeof globalThis & {
  BibleNoteEditorKit?: {
    create: (host: HTMLElement, options?: NoteEditorOptions) => NoteEditorInstance
  }
}

const STYLE_ID = 'bible-note-editor-kit-styles'
const DEFAULT_FONT_SIZE = 16
const FONT_SIZE_STEPS = [14, 16, 18, 22, 28]
const FONT_SIZE_COMMANDS: Record<number, string> = {
  14: '3',
  16: '4',
  18: '5',
  22: '6',
  28: '7',
}
const DEFAULT_COLOR = '#0f172a'
const COLOR_PRESETS = [
  { value: '#0f172a', label: '墨黑' },
  { value: '#2563eb', label: '天空蓝' },
  { value: '#059669', label: '松石绿' },
  { value: '#d97706', label: '琥珀橙' },
  { value: '#dc2626', label: '朱砂红' },
  { value: '#7c3aed', label: '葡萄紫' },
]

let colorProbeElement: HTMLElement | null = null

function isTouchViewport(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  if (window.matchMedia) {
    return window.matchMedia('(max-width: 760px)').matches || window.matchMedia('(pointer: coarse)').matches
  }

  return window.innerWidth <= 760
}

const editorStyles = `
  .bne-host {
    display: block;
    width: 100%;
  }

  .bne-shell {
    width: 100%;
    border: 1px solid rgba(203, 213, 225, 0.84);
    border-radius: 24px;
    background: linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(248,250,252,0.98) 100%);
    box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
    overflow: hidden;
    touch-action: manipulation;
  }

  .bne-shell:focus-within {
    border-color: rgba(37, 99, 235, 0.28);
    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.08), 0 18px 40px rgba(37, 99, 235, 0.08);
  }

  .bne-toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border-bottom: 1px solid rgba(226, 232, 240, 0.95);
    background: linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(241,245,249,0.96) 100%);
    overflow-x: auto;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-x;
    overscroll-behavior-x: contain;
  }

  .bne-toolbar::-webkit-scrollbar {
    display: none;
  }

  .bne-group {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px;
    border: 1px solid rgba(226, 232, 240, 0.96);
    border-radius: 16px;
    background: rgba(226, 232, 240, 0.54);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
    flex: 0 0 auto;
  }

  .bne-button,
  .bne-color,
  .bne-size-step {
    appearance: none;
    -webkit-appearance: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 38px;
    width: 38px;
    min-height: 38px;
    padding: 0;
    border: none;
    border-radius: 12px;
    background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
    color: #0f172a;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06), 0 8px 20px rgba(148, 163, 184, 0.12);
    cursor: pointer;
    touch-action: manipulation;
    transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, color 0.18s ease;
    flex: 0 0 auto;
  }

  .bne-button:hover,
  .bne-color:hover,
  .bne-size-step:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 22px rgba(37, 99, 235, 0.12);
  }

  .bne-button.is-active,
  .bne-size-step.is-active {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    color: #ffffff;
  }

  .bne-button.is-disabled {
    opacity: 0.45;
    cursor: not-allowed;
    box-shadow: none;
  }

  .bne-button__glyph {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    color: currentColor;
    font-size: 15px;
    line-height: 1;
    font-weight: 800;
  }

  .bne-button__glyph.is-italic {
    font-style: italic;
  }

  .bne-button__glyph.is-underline {
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .bne-color {
    width: 24px;
    min-width: 24px;
    min-height: 24px;
    height: 24px;
    border-radius: 999px;
    background: var(--bne-color, ${DEFAULT_COLOR});
    box-shadow: inset 0 0 0 2px rgba(255,255,255,0.96), 0 0 0 1px rgba(148,163,184,0.24);
  }

  .bne-color.is-active {
    transform: translateY(-1px);
    box-shadow: inset 0 0 0 2px rgba(255,255,255,0.98), 0 0 0 2px rgba(37,99,235,0.24), 0 8px 18px rgba(37,99,235,0.14);
  }

  .bne-size {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 38px;
    padding: 0 6px;
    border-radius: 14px;
    background: rgba(255,255,255,0.94);
    border: 1px solid rgba(203,213,225,0.8);
    flex: 0 0 auto;
  }

  .bne-size-label {
    min-width: 48px;
    color: #0f172a;
    font-size: 12px;
    font-weight: 800;
    text-align: center;
  }

  .bne-editor {
    min-height: 188px;
    padding: 18px 20px 20px;
    background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
    color: #0f172a;
    font-size: 16px;
    line-height: 1.8;
    outline: none;
    word-break: break-word;
    white-space: normal;
    touch-action: manipulation;
  }

  .bne-editor:empty::before {
    content: attr(data-placeholder);
    color: #94a3b8;
    pointer-events: none;
  }

  .bne-editor p,
  .bne-editor blockquote,
  .bne-editor ol,
  .bne-editor ul,
  .bne-editor pre {
    margin: 0 0 10px;
  }

  .bne-editor p:last-child,
  .bne-editor blockquote:last-child,
  .bne-editor ol:last-child,
  .bne-editor ul:last-child,
  .bne-editor pre:last-child {
    margin-bottom: 0;
  }

  .bne-editor ul,
  .bne-editor ol {
    padding-left: 1.4em;
  }

  .bne-editor blockquote {
    padding-left: 14px;
    border-left: 3px solid rgba(148, 163, 184, 0.28);
    color: #475569;
  }

  .bne-editor pre {
    padding: 10px 12px;
    border-radius: 12px;
    background: rgba(15, 23, 42, 0.04);
    overflow: auto;
  }

  @media (max-width: 640px) {
    .bne-shell {
      border-radius: 22px;
    }

    .bne-toolbar {
      gap: 8px;
      padding: 10px 10px 12px;
    }

    .bne-group {
      gap: 5px;
      padding: 4px;
    }

    .bne-button,
    .bne-size-step {
      min-width: 36px;
      width: 36px;
      min-height: 36px;
    }

    .bne-size-label {
      min-width: 42px;
      font-size: 11px;
    }

    .bne-editor {
      min-height: 162px;
      padding: 16px;
      font-size: 16px;
      line-height: 1.75;
    }
  }
`

function ensureStyleTag(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) {
    return
  }

  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = editorStyles
  document.head.appendChild(style)
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderButton(action: string, title: string, glyph: string, glyphClass = ''): string {
  return `
    <button class="bne-button" type="button" data-bne-action="${action}" aria-label="${title}" title="${title}">
      <span class="bne-button__glyph ${glyphClass}">${glyph}</span>
    </button>
  `
}

function renderToolbarMarkup(placeholder: string): string {
  return `
    <div class="bne-shell">
      <div class="bne-toolbar" role="toolbar" aria-label="笔记编辑工具栏">
        <div class="bne-group" role="group" aria-label="撤销与重做">
          ${renderButton('undo', '撤销', '↺')}
          ${renderButton('redo', '重做', '↻')}
        </div>
        <div class="bne-group" role="group" aria-label="文字格式">
          ${renderButton('bold', '加粗', 'B')}
          ${renderButton('italic', '斜体', 'I', 'is-italic')}
          ${renderButton('underline', '下划线', 'U', 'is-underline')}
        </div>
        <div class="bne-group" role="group" aria-label="段落格式">
          ${renderButton('bulletList', '无序列表', '•')}
          ${renderButton('orderedList', '有序列表', '1.')}
          ${renderButton('blockquote', '引用', '❝')}
          ${renderButton('clear', '清除格式', 'Tx')}
        </div>
        <div class="bne-group" role="group" aria-label="文字颜色">
          ${COLOR_PRESETS.map((preset) => `
            <button
              class="bne-color"
              type="button"
              data-bne-action="color"
              data-bne-color="${preset.value}"
              style="--bne-color:${preset.value}"
              aria-label="${preset.label}"
              title="${preset.label}"
            ></button>
          `).join('')}
        </div>
        <div class="bne-group" role="group" aria-label="字号">
          <div class="bne-size">
            <button class="bne-size-step" type="button" data-bne-action="font-minus" aria-label="减小字号" title="减小字号">A-</button>
            <strong class="bne-size-label" data-bne-size-label>${DEFAULT_FONT_SIZE}px</strong>
            <button class="bne-size-step" type="button" data-bne-action="font-plus" aria-label="增大字号" title="增大字号">A+</button>
          </div>
        </div>
      </div>
      <div class="bne-editor" contenteditable="true" spellcheck="true" data-bne-editor data-placeholder="${escapeHtml(placeholder)}"></div>
    </div>
  `
}

function getColorProbeElement(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null
  }

  if (colorProbeElement && document.body && document.body.contains(colorProbeElement)) {
    return colorProbeElement
  }

  colorProbeElement = document.createElement('span')
  colorProbeElement.setAttribute('aria-hidden', 'true')
  colorProbeElement.style.cssText = 'position:absolute;opacity:0;pointer-events:none;left:-9999px;top:-9999px;'
  document.body.appendChild(colorProbeElement)
  return colorProbeElement
}

function normalizeColorValue(value: string): string {
  const probe = getColorProbeElement()
  if (!probe) {
    return String(value || '').trim().toLowerCase()
  }

  probe.style.color = ''
  probe.style.color = String(value || '').trim()
  if (!probe.style.color) {
    return ''
  }

  return window.getComputedStyle(probe).color.replace(/\s+/g, '').toLowerCase()
}

function parseFontSizeValue(value: unknown): number {
  const text = String(value ?? '').trim().toLowerCase()
  if (!text) {
    return 0
  }

  const namedSizes: Record<string, number> = {
    'x-small': 12,
    small: 13,
    medium: 14,
    large: 18,
    'x-large': 22,
    'xx-large': 28,
  }
  if (namedSizes[text]) {
    return namedSizes[text]
  }

  const pxMatch = text.match(/^(\d+(?:\.\d+)?)px$/)
  if (pxMatch) {
    return Number(pxMatch[1])
  }

  if (/^[1-7]$/.test(text)) {
    return ({ 1: 12, 2: 13, 3: 14, 4: 16, 5: 18, 6: 22, 7: 28 } as Record<string, number>)[text] || 0
  }

  return 0
}

function getNearestFontSize(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_FONT_SIZE
  }

  return FONT_SIZE_STEPS.reduce((closest, current) => {
    return Math.abs(current - value) < Math.abs(closest - value) ? current : closest
  }, FONT_SIZE_STEPS[0])
}

function getNextFontSize(current: number, delta: -1 | 1): number {
  const currentSize = getNearestFontSize(current)
  const index = FONT_SIZE_STEPS.findIndex((item) => item === currentSize)
  const nextIndex = Math.max(0, Math.min(FONT_SIZE_STEPS.length - 1, index + delta))
  return FONT_SIZE_STEPS[nextIndex]
}

function getSelectionRangeWithin(root: HTMLElement): Range | null {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) {
    return null
  }

  const range = selection.getRangeAt(0)
  if (!root.contains(range.commonAncestorContainer)) {
    return null
  }

  return range.cloneRange()
}

function restoreSelectionRange(root: HTMLElement, savedRange: Range | null): boolean {
  const selection = window.getSelection()
  if (!selection) {
    return false
  }

  selection.removeAllRanges()
  if (savedRange) {
    try {
      if (root.contains(savedRange.commonAncestorContainer)) {
        selection.addRange(savedRange)
        return true
      }
    } catch {
    }
  }

  const fallback = document.createRange()
  fallback.selectNodeContents(root)
  fallback.collapse(false)
  selection.addRange(fallback)
  return false
}

function placeCaretAtEnd(root: HTMLElement): void {
  const selection = window.getSelection()
  if (!selection) {
    return
  }

  const range = document.createRange()
  range.selectNodeContents(root)
  range.collapse(false)
  selection.removeAllRanges()
  selection.addRange(range)
}

function getClosestSelectionElement(root: HTMLElement): HTMLElement | null {
  const range = getSelectionRangeWithin(root)
  if (!range) {
    return root
  }

  let current: Node | null = range.startContainer
  while (current && current !== root) {
    if (current instanceof HTMLElement) {
      return current
    }
    current = current.parentNode
  }

  return root
}

function hasAncestorTag(root: HTMLElement, tagName: string): boolean {
  let current = getClosestSelectionElement(root)
  while (current && current !== root) {
    if (current.tagName === tagName) {
      return true
    }
    current = current.parentElement
  }
  return false
}

function getCurrentTextColor(root: HTMLElement): string {
  let current = getClosestSelectionElement(root)
  while (current) {
    const color = current.style?.color || current.getAttribute('color') || ''
    if (color) {
      return normalizeColorValue(color)
    }
    if (current === root) {
      break
    }
    current = current.parentElement
  }

  return normalizeColorValue(window.getComputedStyle(root).color || DEFAULT_COLOR)
}

function getCurrentFontSize(root: HTMLElement): number {
  let current = getClosestSelectionElement(root)
  while (current) {
    const fontSize = parseFontSizeValue(current.style?.fontSize || current.getAttribute('size') || '')
    if (fontSize) {
      return getNearestFontSize(fontSize)
    }
    if (current === root) {
      break
    }
    current = current.parentElement
  }

  return getNearestFontSize(parseFontSizeValue(window.getComputedStyle(root).fontSize) || DEFAULT_FONT_SIZE)
}

function isCommandActive(command: string): boolean {
  try {
    return !!document.queryCommandState(command)
  } catch {
    return false
  }
}

function isCommandEnabled(command: string): boolean {
  try {
    return !!document.queryCommandEnabled(command)
  } catch {
    return false
  }
}

function normalizeEmptyEditor(surface: HTMLElement): void {
  const text = String(surface.textContent || '').replace(/\u00a0/g, ' ').trim()
  if (!text && !surface.querySelector('br, li, img, video, audio, iframe')) {
    surface.innerHTML = ''
  }
}

class BibleNoteEditor implements NoteEditorInstance {
  private readonly host: HTMLElement
  private readonly options: NoteEditorOptions
  private readonly surface: HTMLElement
  private readonly sizeLabel: HTMLElement | null
  private readonly toolbarButtons: HTMLElement[]
  private savedRange: Range | null = null

  constructor(host: HTMLElement, options: NoteEditorOptions = {}) {
    ensureStyleTag()

    this.host = host
    this.options = options
    this.host.classList.add('bne-host')
    this.host.innerHTML = renderToolbarMarkup(options.placeholder || '给这节经文写一点笔记吧。')
    this.surface = this.host.querySelector('[data-bne-editor]') as HTMLElement
    this.sizeLabel = this.host.querySelector('[data-bne-size-label]')
    this.toolbarButtons = Array.from(this.host.querySelectorAll<HTMLElement>('[data-bne-action]'))
    this.surface.innerHTML = String(options.content || '')
    normalizeEmptyEditor(this.surface)

    this.host.addEventListener('pointerdown', this.handleToolbarPointerDown)
    this.host.addEventListener('click', this.handleToolbarClick)
    this.surface.addEventListener('input', this.handleSurfaceInput)
    this.surface.addEventListener('focus', this.handleSurfaceSelectionChange)
    this.surface.addEventListener('keyup', this.handleSurfaceSelectionChange)
    this.surface.addEventListener('mouseup', this.handleSurfaceSelectionChange)
    this.surface.addEventListener('touchend', this.handleSurfaceSelectionChange, { passive: true })
    this.surface.addEventListener('paste', this.handlePaste)
    document.addEventListener('selectionchange', this.handleDocumentSelectionChange)

    this.syncToolbar()
  }

  private readonly handleToolbarPointerDown = (event: Event): void => {
    const target = event.target instanceof Element ? event.target.closest('[data-bne-action]') : null
    if (!target) {
      return
    }

    if (isTouchViewport()) {
      return
    }

    event.preventDefault()
    this.surface.focus()
    restoreSelectionRange(this.surface, this.savedRange)
  }

  private readonly handleToolbarClick = (event: Event): void => {
    const button = event.target instanceof Element ? event.target.closest('[data-bne-action]') as HTMLElement | null : null
    if (!button) {
      return
    }

    event.preventDefault()
    const action = button.getAttribute('data-bne-action') || ''
    if (!action) {
      return
    }

    this.runAction(action, button)
  }

  private readonly handleSurfaceInput = (): void => {
    normalizeEmptyEditor(this.surface)
    this.captureSelection()
    this.syncToolbar()
    this.emitChange()
  }

  private readonly handleSurfaceSelectionChange = (): void => {
    this.captureSelection()
    this.syncToolbar()
  }

  private readonly handleDocumentSelectionChange = (): void => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      return
    }

    const range = selection.getRangeAt(0)
    if (!this.surface.contains(range.commonAncestorContainer)) {
      return
    }

    this.captureSelection()
    this.syncToolbar()
  }

  private readonly handlePaste = (event: ClipboardEvent): void => {
    const text = event.clipboardData?.getData('text/plain') || ''
    if (!text) {
      return
    }

    event.preventDefault()
    this.surface.focus()
    restoreSelectionRange(this.surface, this.savedRange)
    document.execCommand('insertHTML', false, escapeHtml(text).replace(/\r\n/g, '\n').replace(/\n/g, '<br>'))
    normalizeEmptyEditor(this.surface)
    this.captureSelection()
    this.syncToolbar()
    this.emitChange()
  }

  private captureSelection(): void {
    this.savedRange = getSelectionRangeWithin(this.surface)
  }

  private emitChange(): void {
    this.options.onChange?.(this.getHTML())
  }

  private exec(command: string, value?: string): boolean {
    this.surface.focus()
    try {
      document.execCommand('styleWithCSS', false, 'true')
    } catch {
    }

    try {
      return document.execCommand(command, false, value || null)
    } catch {
      return false
    }
  }

  private toggleBlockquote(): void {
    const active = hasAncestorTag(this.surface, 'BLOCKQUOTE')
    const values = active ? ['p', '<p>', 'div'] : ['blockquote', '<blockquote>']
    values.some((value) => this.exec('formatBlock', value))
  }

  private clearFormatting(): void {
    if (isCommandActive('insertUnorderedList')) {
      this.exec('insertUnorderedList')
    }
    if (isCommandActive('insertOrderedList')) {
      this.exec('insertOrderedList')
    }
    this.exec('removeFormat')
    if (hasAncestorTag(this.surface, 'BLOCKQUOTE')) {
      this.toggleBlockquote()
    }
  }

  private applyColor(color: string): void {
    this.exec('foreColor', color)
  }

  private applyFontSize(fontSize: number): void {
    this.exec('fontSize', FONT_SIZE_COMMANDS[fontSize] || FONT_SIZE_COMMANDS[DEFAULT_FONT_SIZE])
  }

  private changeFontSize(delta: -1 | 1): void {
    const nextFontSize = getNextFontSize(getCurrentFontSize(this.surface), delta)
    this.applyFontSize(nextFontSize)
  }

  private runAction(action: string, button: HTMLElement): void {
    this.surface.focus()
    restoreSelectionRange(this.surface, this.savedRange)

    if (action === 'undo') {
      this.exec('undo')
    } else if (action === 'redo') {
      this.exec('redo')
    } else if (action === 'bold') {
      this.exec('bold')
    } else if (action === 'italic') {
      this.exec('italic')
    } else if (action === 'underline') {
      this.exec('underline')
    } else if (action === 'bulletList') {
      this.exec('insertUnorderedList')
    } else if (action === 'orderedList') {
      this.exec('insertOrderedList')
    } else if (action === 'blockquote') {
      this.toggleBlockquote()
    } else if (action === 'clear') {
      this.clearFormatting()
    } else if (action === 'color') {
      this.applyColor(button.getAttribute('data-bne-color') || DEFAULT_COLOR)
    } else if (action === 'font-minus') {
      this.changeFontSize(-1)
    } else if (action === 'font-plus') {
      this.changeFontSize(1)
    }

    normalizeEmptyEditor(this.surface)
    this.captureSelection()
    this.syncToolbar()
    this.emitChange()
  }

  private syncToolbar(): void {
    const currentColor = getCurrentTextColor(this.surface)
    const currentFontSize = getCurrentFontSize(this.surface)

    if (this.sizeLabel) {
      this.sizeLabel.textContent = `${currentFontSize}px`
    }

    this.toolbarButtons.forEach((button) => {
      const action = button.getAttribute('data-bne-action') || ''
      button.classList.remove('is-active', 'is-disabled')

      if (action === 'bold' && isCommandActive('bold')) {
        button.classList.add('is-active')
      }
      if (action === 'italic' && isCommandActive('italic')) {
        button.classList.add('is-active')
      }
      if (action === 'underline' && isCommandActive('underline')) {
        button.classList.add('is-active')
      }
      if (action === 'bulletList' && isCommandActive('insertUnorderedList')) {
        button.classList.add('is-active')
      }
      if (action === 'orderedList' && isCommandActive('insertOrderedList')) {
        button.classList.add('is-active')
      }
      if (action === 'blockquote' && hasAncestorTag(this.surface, 'BLOCKQUOTE')) {
        button.classList.add('is-active')
      }
      if (action === 'color') {
        const color = normalizeColorValue(button.getAttribute('data-bne-color') || '')
        if (color && color === currentColor) {
          button.classList.add('is-active')
        }
      }
      if (action === 'undo' && !isCommandEnabled('undo')) {
        button.classList.add('is-disabled')
      }
      if (action === 'redo' && !isCommandEnabled('redo')) {
        button.classList.add('is-disabled')
      }
    })
  }

  focus(): void {
    this.surface.focus()
    if (!restoreSelectionRange(this.surface, this.savedRange)) {
      placeCaretAtEnd(this.surface)
    }
  }

  getHTML(): string {
    normalizeEmptyEditor(this.surface)
    return String(this.surface.innerHTML || '').trim()
  }

  destroy(): void {
    this.host.removeEventListener('pointerdown', this.handleToolbarPointerDown)
    this.host.removeEventListener('click', this.handleToolbarClick)
    this.surface.removeEventListener('input', this.handleSurfaceInput)
    this.surface.removeEventListener('focus', this.handleSurfaceSelectionChange)
    this.surface.removeEventListener('keyup', this.handleSurfaceSelectionChange)
    this.surface.removeEventListener('mouseup', this.handleSurfaceSelectionChange)
    this.surface.removeEventListener('touchend', this.handleSurfaceSelectionChange)
    this.surface.removeEventListener('paste', this.handlePaste)
    document.removeEventListener('selectionchange', this.handleDocumentSelectionChange)
    this.host.innerHTML = ''
  }
}

function create(host: HTMLElement, options: NoteEditorOptions = {}): NoteEditorInstance {
  return new BibleNoteEditor(host, options)
}

;(window as WindowWithBibleNoteEditor).BibleNoteEditorKit = {
  create,
}

export { create }
