<template>
  <div class="bp-settings">
    <section class="bp-hero bp-surface">
      <div class="bp-hero__content">
        <p class="bp-hero__eyebrow">Bible Plugin</p>
        <h2>插件设置</h2>
        <p class="bp-hero__text">
          这里只保留经文源、前台悬浮入口和运行状态。经文浏览与编辑已迁移到系统 → 工具 → 圣经。
        </p>
      </div>

      <div class="bp-hero__meta">
        <span class="bp-tag">{{ sourceSummary }}</span>
        <span class="bp-tag">{{ form.floatEnabled ? '悬浮入口已开启' : '悬浮入口已关闭' }}</span>
        <span class="bp-tag">{{ visiblePagesSummary }}</span>
      </div>
    </section>

    <div v-if="loadError" class="bp-alert is-error">
      <strong>加载失败：</strong>{{ loadError }}
    </div>

    <div v-if="message" class="bp-alert" :class="messageType === 'error' ? 'is-error' : 'is-success'">
      {{ message }}
    </div>

    <div class="bp-settings__layout">
      <div class="bp-settings__main">
        <section class="bp-card">
          <div class="bp-card__head">
            <div>
              <h3>经文源设置</h3>
              <p>优先读取远程 CSV；如未填写，则读取下方内嵌文本；都为空时回退到插件内置经文。</p>
            </div>
            <span class="bp-badge">{{ sourceSummary }}</span>
          </div>

          <div class="bp-field-grid">
            <label class="bp-field">
              <span class="bp-field__label">CSV 文件地址</span>
              <span class="bp-field__hint">适合托管在 CDN、GitHub Raw 或站点静态资源目录。</span>
              <input
                v-model="form.csvUrl"
                class="bp-input"
                type="url"
                placeholder="https://example.com/bible.csv"
              >
            </label>

            <label class="bp-field bp-field--full">
              <span class="bp-field__label">内嵌 CSV 文本</span>
              <span class="bp-field__hint">支持直接粘贴完整 CSV（表头：约名,大类,卷名,卷数,章数,节数,内容）。</span>
              <textarea
                v-model="form.csvText"
                class="bp-textarea"
                rows="10"
                placeholder="可直接粘贴完整 CSV 文本"
              />
            </label>
          </div>
        </section>

        <section class="bp-card">
          <div class="bp-card__head">
            <div>
              <h3>前台悬浮入口</h3>
              <p>控制主题页面中的圣经悬浮图标，支持位置、图标地址、显示页面和路径规则。</p>
            </div>
          </div>

          <div class="bp-switch-panel">
            <div>
              <strong>启用悬浮图标</strong>
              <p>关闭后，前台不会再展示圣经悬浮入口，但后台工具页和编辑器插入功能仍然可用。</p>
            </div>
            <button
              class="bp-switch"
              :class="{ 'is-on': form.floatEnabled }"
              type="button"
              @click="form.floatEnabled = !form.floatEnabled"
            >
              <span class="bp-switch__thumb" />
            </button>
          </div>

          <div class="bp-field-grid">
            <label class="bp-field">
              <span class="bp-field__label">悬浮位置</span>
              <span class="bp-field__hint">建议默认右下角，最稳妥，也最符合常见阅读习惯。</span>
              <select v-model="form.floatPosition" class="bp-input">
                <option value="right-bottom">右下角</option>
                <option value="left-bottom">左下角</option>
                <option value="right-center">右侧居中</option>
                <option value="left-center">左侧居中</option>
              </select>
            </label>

            <label class="bp-field">
              <span class="bp-field__label">图标地址</span>
              <span class="bp-field__hint">留空则使用插件默认 Logo。</span>
              <input
                v-model="form.floatIconUrl"
                class="bp-input"
                type="text"
                placeholder="/plugins/bible/assets/login.png"
              >
            </label>

            <div class="bp-field bp-field--full">
              <span class="bp-field__label">显示页面</span>
              <span class="bp-field__hint">可以只选首页、文章页，也可以直接选择所有页面。</span>
              <div class="bp-chip-grid">
                <button
                  v-for="option in pageOptions"
                  :key="option.value"
                  class="bp-choice"
                  :class="{ 'is-selected': form.visiblePages.includes(option.value) }"
                  type="button"
                  @click="togglePage(option.value)"
                >
                  <span class="bp-choice__title">{{ option.label }}</span>
                  <span class="bp-choice__desc">{{ option.description }}</span>
                </button>
              </div>
            </div>

            <label class="bp-field">
              <span class="bp-field__label">强制包含路径</span>
              <span class="bp-field__hint">每行一个路径前缀，例如专题页、归档页等。</span>
              <textarea
                v-model="form.includePaths"
                class="bp-textarea"
                rows="5"
                placeholder="/archives/&#10;/special/"
              />
            </label>

            <label class="bp-field">
              <span class="bp-field__label">排除路径</span>
              <span class="bp-field__hint">每行一个路径前缀，用于屏蔽不想显示悬浮入口的页面。</span>
              <textarea
                v-model="form.excludePaths"
                class="bp-textarea"
                rows="5"
                placeholder="/tags/&#10;/about/"
              />
            </label>
          </div>
        </section>
      </div>

      <aside class="bp-settings__aside">
        <section class="bp-card bp-card--sticky">
          <div class="bp-card__head">
            <div>
              <h3>运行状态</h3>
              <p>用于快速确认当前读取来源、持久化位置和最近重载时间。</p>
            </div>
            <button class="bp-button bp-button--ghost" type="button" :disabled="loading" @click="refreshDiagnostics">
              {{ loading ? '刷新中...' : '刷新状态' }}
            </button>
          </div>

          <div v-if="diagnosticsError" class="bp-inline-alert is-error">
            {{ diagnosticsError }}
          </div>

          <dl class="bp-stats">
            <div class="bp-stat">
              <dt>经文来源</dt>
              <dd>{{ diagnostics.sourceMode || '未获取' }}</dd>
            </div>
            <div class="bp-stat">
              <dt>经文总数</dt>
              <dd>{{ diagnostics.verseCount || 0 }}</dd>
            </div>
            <div class="bp-stat">
              <dt>章节总数</dt>
              <dd>{{ diagnostics.chapterCount || 0 }}</dd>
            </div>
            <div class="bp-stat">
              <dt>最近重载</dt>
              <dd>{{ formatTimeLabel(diagnostics.lastReloadAt) }}</dd>
            </div>
          </dl>

          <div class="bp-info-list">
            <div class="bp-info-row">
              <span>配置文件</span>
              <strong>{{ diagnostics.configPath || '未生成' }}</strong>
            </div>
            <div class="bp-info-row">
              <span>编辑记录</span>
              <strong>{{ diagnostics.editsPath || '未生成' }}</strong>
            </div>
            <div class="bp-info-row">
              <span>显示页面</span>
              <strong>{{ diagnostics.visiblePages?.length ? diagnostics.visiblePages.join('、') : '未获取' }}</strong>
            </div>
            <div class="bp-info-row">
              <span>最近错误</span>
              <strong :class="{ 'is-danger': diagnostics.lastError }">{{ diagnostics.lastError || '无' }}</strong>
            </div>
          </div>
        </section>

        <section class="bp-card">
          <div class="bp-card__head">
            <div>
              <h3>使用说明</h3>
              <p>保存后立即生效，无需手动重启 Halo。</p>
            </div>
          </div>

          <ul class="bp-tips">
            <li>经文浏览和编辑请前往系统 → 工具 → 圣经。</li>
            <li>编辑器插入经文会自动支持多关键词搜索和多节选择。</li>
            <li>若你修改了经文源，建议保存后再点一次“刷新状态”确认已重载。</li>
          </ul>
        </section>
      </aside>
    </div>

    <div class="bp-action-bar bp-surface">
      <div class="bp-action-bar__meta">
        <strong>{{ dirty ? '有未保存的修改' : '当前配置已同步' }}</strong>
        <span>{{ lastSavedText }}</span>
      </div>

      <div class="bp-action-bar__buttons">
        <button class="bp-button bp-button--ghost" type="button" :disabled="saving || !dirty" @click="resetForm">
          撤销修改
        </button>
        <button class="bp-button bp-button--secondary" type="button" :disabled="saving || loading" @click="loadAll">
          重新读取
        </button>
        <button class="bp-button bp-button--primary" type="button" :disabled="saving" @click="submit">
          {{ saving ? '保存中...' : '保存设置' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { fetchDiagnostics, fetchSettings, saveSettings, type BibleDiagnostics, type BibleSettings } from '../api/bibleData'

const pageOptions = [
  { label: '首页', value: 'home', description: '仅在首页显示悬浮图标。' },
  { label: '文章页', value: 'post', description: '仅在文章详情页显示。' },
  { label: '所有页面', value: 'all', description: '在绝大多数主题页面显示。' },
]

const saving = ref(false)
const loading = ref(false)
const loadError = ref('')
const diagnosticsError = ref('')
const message = ref('')
const messageType = ref<'success' | 'error'>('success')
const loadedSnapshot = ref('')
const lastSavedAt = ref('')

const diagnostics = reactive<BibleDiagnostics>({
  sourceMode: '',
  sourceDetail: '',
  verseCount: 0,
  chapterCount: 0,
  deletedCount: 0,
  updatedCount: 0,
  createdCount: 0,
  editsPath: '',
  configPath: '',
  lastReloadAt: '',
  lastError: '',
  floatEnabled: true,
  floatPosition: '',
  visiblePages: [],
})

const form = reactive<BibleSettings>({
  csvUrl: '',
  csvText: '',
  floatEnabled: true,
  floatPosition: 'right-bottom',
  visiblePages: ['home', 'post'],
  floatIconUrl: '',
  includePaths: '',
  excludePaths: '',
})

const dirty = computed(() => snapshotForm() !== loadedSnapshot.value)

const sourceSummary = computed(() => {
  if (form.csvUrl.trim()) return '当前优先使用远程 CSV'
  if (form.csvText.trim()) return '当前优先使用内嵌 CSV'
  if (diagnostics.sourceMode) return `当前来源：${diagnostics.sourceMode}`
  return '当前使用内置经文数据'
})

const visiblePagesSummary = computed(() => {
  if (form.visiblePages.includes('all')) return '显示范围：所有页面'
  if (!form.visiblePages.length) return '显示范围：默认页面'
  const labelMap = new Map(pageOptions.map((item) => [item.value, item.label]))
  return `显示范围：${form.visiblePages.map((value) => labelMap.get(value) ?? value).join('、')}`
})

const lastSavedText = computed(() => {
  if (lastSavedAt.value) return `最近保存：${formatTimeLabel(lastSavedAt.value)}`
  if (diagnostics.lastReloadAt) return `最近重载：${formatTimeLabel(diagnostics.lastReloadAt)}`
  return '尚未获取到最近保存记录'
})

function normalizeSettings(input?: Partial<BibleSettings>): BibleSettings {
  return {
    csvUrl: input?.csvUrl ?? '',
    csvText: input?.csvText ?? '',
    floatEnabled: input?.floatEnabled ?? true,
    floatPosition: input?.floatPosition ?? 'right-bottom',
    visiblePages: Array.isArray(input?.visiblePages) && input.visiblePages.length ? [...input.visiblePages] : ['home', 'post'],
    floatIconUrl: input?.floatIconUrl ?? '',
    includePaths: input?.includePaths ?? '',
    excludePaths: input?.excludePaths ?? '',
  }
}

function assignForm(settings: BibleSettings) {
  const normalized = normalizeSettings(settings)
  form.csvUrl = normalized.csvUrl
  form.csvText = normalized.csvText
  form.floatEnabled = normalized.floatEnabled
  form.floatPosition = normalized.floatPosition
  form.visiblePages = [...normalized.visiblePages]
  form.floatIconUrl = normalized.floatIconUrl
  form.includePaths = normalized.includePaths
  form.excludePaths = normalized.excludePaths
}

function snapshotForm(): string {
  return JSON.stringify(normalizeSettings(form))
}

function togglePage(value: string) {
  if (value === 'all') {
    form.visiblePages = form.visiblePages.includes('all') ? ['home', 'post'] : ['all']
    return
  }

  const next = form.visiblePages.filter((item) => item !== 'all')
  if (next.includes(value)) {
    form.visiblePages = next.filter((item) => item !== value)
    return
  }

  form.visiblePages = [...next, value]
}

function resetForm() {
  message.value = ''
  assignForm(JSON.parse(loadedSnapshot.value || '{}') as BibleSettings)
}

function formatTimeLabel(value?: string): string {
  if (!value) return '未获取'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

async function refreshDiagnostics() {
  diagnosticsError.value = ''
  try {
    Object.assign(diagnostics, await fetchDiagnostics())
  } catch (error: unknown) {
    diagnosticsError.value = error instanceof Error ? error.message : '运行状态加载失败'
  }
}

async function loadAll() {
  loading.value = true
  loadError.value = ''
  message.value = ''

  try {
    const settings = await fetchSettings()
    assignForm(settings)
    loadedSnapshot.value = snapshotForm()
  } catch (error: unknown) {
    loadError.value = error instanceof Error ? error.message : '设置加载失败'
  }

  await refreshDiagnostics()
  loading.value = false
}

async function submit() {
  saving.value = true
  message.value = ''

  try {
    const saved = await saveSettings({
      ...normalizeSettings(form),
      visiblePages: form.visiblePages.length ? [...form.visiblePages] : ['home', 'post'],
    })

    assignForm(saved)
    loadedSnapshot.value = snapshotForm()
    lastSavedAt.value = new Date().toISOString()
    messageType.value = 'success'
    message.value = '设置已保存，并已重新载入经文配置。'
    await refreshDiagnostics()
  } catch (error: unknown) {
    messageType.value = 'error'
    message.value = error instanceof Error ? error.message : '保存失败'
  } finally {
    saving.value = false
  }
}

onMounted(loadAll)
</script>

<style scoped>
.bp-settings {
  padding: 24px;
  color: #0f172a;
}

.bp-surface,
.bp-card {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 24px;
  background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.06);
}

.bp-hero {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 28px 30px;
  margin-bottom: 20px;
}

.bp-hero__content h2 {
  margin: 8px 0 0;
  font-size: 32px;
  line-height: 1.15;
  letter-spacing: -0.02em;
}

.bp-hero__eyebrow {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #64748b;
}

.bp-hero__text {
  max-width: 760px;
  margin: 12px 0 0;
  font-size: 15px;
  line-height: 1.8;
  color: #475569;
}

.bp-hero__meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

.bp-tag,
.bp-badge {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.05);
  color: #0f172a;
  font-size: 13px;
  font-weight: 600;
}

.bp-badge {
  background: rgba(59, 130, 246, 0.08);
  color: #1d4ed8;
}

.bp-alert,
.bp-inline-alert {
  margin-bottom: 16px;
  padding: 14px 16px;
  border-radius: 18px;
  font-size: 14px;
  line-height: 1.7;
}

.bp-inline-alert {
  margin-bottom: 14px;
}

.bp-alert.is-success {
  background: rgba(22, 163, 74, 0.08);
  color: #15803d;
}

.bp-alert.is-error,
.bp-inline-alert.is-error {
  background: rgba(239, 68, 68, 0.08);
  color: #b91c1c;
}

.bp-settings__layout {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(320px, 0.9fr);
  gap: 20px;
}

.bp-settings__main,
.bp-settings__aside {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.bp-card {
  padding: 24px;
}

.bp-card--sticky {
  position: static;
}

.bp-card__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}

.bp-card__head h3 {
  margin: 0;
  font-size: 22px;
  line-height: 1.2;
}

.bp-card__head p {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 14px;
  line-height: 1.75;
}

.bp-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.bp-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bp-field--full {
  grid-column: 1 / -1;
}

.bp-field__label {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
}

.bp-field__hint {
  font-size: 13px;
  line-height: 1.6;
  color: #64748b;
}

.bp-input,
.bp-textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(148, 163, 184, 0.26);
  border-radius: 18px;
  background: #fff;
  padding: 13px 15px;
  font-size: 14px;
  color: #0f172a;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}

.bp-textarea {
  min-height: 148px;
  resize: vertical;
  line-height: 1.75;
}

.bp-input:focus,
.bp-textarea:focus {
  outline: none;
  border-color: rgba(37, 99, 235, 0.45);
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.08);
  background: #fff;
}

.bp-switch-panel {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  padding: 18px 20px;
  margin-bottom: 20px;
  border-radius: 20px;
  background: linear-gradient(180deg, #f8fbff 0%, #f5f7fb 100%);
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.bp-switch-panel strong {
  display: block;
  font-size: 15px;
}

.bp-switch-panel p {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.7;
}

.bp-switch {
  position: relative;
  flex-shrink: 0;
  width: 58px;
  height: 34px;
  border: none;
  border-radius: 999px;
  background: #dbe4ee;
  padding: 0;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.bp-switch.is-on {
  background: #0f172a;
}

.bp-switch__thumb {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.18);
  transition: transform 0.2s ease;
}

.bp-switch.is-on .bp-switch__thumb {
  transform: translateX(24px);
}

.bp-chip-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.bp-choice {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 18px;
  background: #fff;
  padding: 16px;
  cursor: pointer;
  text-align: left;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
}

.bp-choice:hover {
  transform: translateY(-1px);
  border-color: rgba(59, 130, 246, 0.35);
}

.bp-choice.is-selected {
  border-color: rgba(15, 23, 42, 0.48);
  background: linear-gradient(180deg, #0f172a 0%, #172554 100%);
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.14);
}

.bp-choice__title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.bp-choice__desc {
  font-size: 12px;
  line-height: 1.65;
  color: #64748b;
}

.bp-choice.is-selected .bp-choice__title,
.bp-choice.is-selected .bp-choice__desc {
  color: #fff;
}

.bp-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}

.bp-stat {
  padding: 16px;
  border-radius: 18px;
  background: linear-gradient(180deg, #f8fbff 0%, #f5f7fb 100%);
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.bp-stat dt {
  margin: 0;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
}

.bp-stat dd {
  margin: 8px 0 0;
  color: #0f172a;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
}

.bp-info-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}

.bp-info-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 0;
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
}

.bp-info-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.bp-info-row span {
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
}

.bp-info-row strong {
  color: #0f172a;
  font-size: 13px;
  line-height: 1.75;
  word-break: break-all;
}

.bp-info-row strong.is-danger {
  color: #b91c1c;
}

.bp-tips {
  margin: 0;
  padding-left: 18px;
  color: #475569;
  line-height: 1.9;
  font-size: 14px;
}

.bp-action-bar {
  position: sticky;
  bottom: 16px;
  z-index: 3;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-top: 20px;
  padding: 18px 22px;
}

.bp-action-bar__meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bp-action-bar__meta strong {
  font-size: 15px;
}

.bp-action-bar__meta span {
  color: #64748b;
  font-size: 13px;
}

.bp-action-bar__buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.bp-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  border-radius: 16px;
  border: none;
  padding: 0 18px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease, border-color 0.18s ease;
}

.bp-button:hover:not(:disabled) {
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

.bp-button--secondary {
  background: rgba(37, 99, 235, 0.08);
  color: #1d4ed8;
}

.bp-button--ghost {
  background: #fff;
  color: #0f172a;
  border: 1px solid rgba(148, 163, 184, 0.22);
}

@media (max-width: 1180px) {
  .bp-settings__layout {
    grid-template-columns: 1fr;
  }

  .bp-card--sticky {
    position: static;
  }
}

@media (max-width: 900px) {
  .bp-settings {
    padding: 16px;
  }

  .bp-hero,
  .bp-card__head,
  .bp-action-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .bp-hero__meta {
    align-items: flex-start;
    flex-direction: row;
    flex-wrap: wrap;
  }

  .bp-field-grid,
  .bp-chip-grid,
  .bp-stats {
    grid-template-columns: 1fr;
  }
}
</style>
