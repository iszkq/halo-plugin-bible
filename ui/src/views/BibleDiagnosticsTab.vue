<template>
  <div class="bp-diagnostics">
    <section class="bp-diagnostics__hero bp-surface">
      <div>
        <p class="bp-diagnostics__eyebrow">Diagnostics</p>
        <h2>排查日志</h2>
        <p>用于确认经文来源、编辑持久化、配置文件位置和最近重载状态。</p>
      </div>

      <div class="bp-diagnostics__actions">
        <span class="bp-badge">{{ diagnostics.sourceMode || '未获取到来源' }}</span>
        <button class="bp-button bp-button--primary" type="button" :disabled="loading" @click="load">
          {{ loading ? '刷新中...' : '刷新状态' }}
        </button>
      </div>
    </section>

    <div v-if="error" class="bp-alert is-error">
      {{ error }}
    </div>

    <div class="bp-metric-grid">
      <div class="bp-metric-card">
        <span>经文总数</span>
        <strong>{{ diagnostics.verseCount || 0 }}</strong>
      </div>
      <div class="bp-metric-card">
        <span>章节总数</span>
        <strong>{{ diagnostics.chapterCount || 0 }}</strong>
      </div>
      <div class="bp-metric-card">
        <span>新增记录</span>
        <strong>{{ diagnostics.createdCount || 0 }}</strong>
      </div>
      <div class="bp-metric-card">
        <span>修改 / 删除</span>
        <strong>{{ diagnostics.updatedCount || 0 }} / {{ diagnostics.deletedCount || 0 }}</strong>
      </div>
    </div>

    <div class="bp-diagnostics__grid">
      <section class="bp-card">
        <div class="bp-card__head">
          <div>
            <h3>数据来源</h3>
            <p>当前后端实际读取的经文源以及最近重载情况。</p>
          </div>
        </div>

        <dl class="bp-list">
          <div class="bp-row">
            <dt>来源模式</dt>
            <dd>{{ diagnostics.sourceMode || '-' }}</dd>
          </div>
          <div class="bp-row">
            <dt>来源详情</dt>
            <dd>{{ diagnostics.sourceDetail || '-' }}</dd>
          </div>
          <div class="bp-row">
            <dt>最近重载</dt>
            <dd>{{ formatTimeLabel(diagnostics.lastReloadAt) }}</dd>
          </div>
          <div class="bp-row">
            <dt>最近错误</dt>
            <dd :class="{ 'is-danger': diagnostics.lastError }">{{ diagnostics.lastError || '无' }}</dd>
          </div>
        </dl>
      </section>

      <section class="bp-card">
        <div class="bp-card__head">
          <div>
            <h3>持久化文件</h3>
            <p>插件配置和经文编辑记录的落盘位置。</p>
          </div>
        </div>

        <dl class="bp-list">
          <div class="bp-row">
            <dt>配置文件</dt>
            <dd>{{ diagnostics.configPath || '-' }}</dd>
          </div>
          <div class="bp-row">
            <dt>编辑记录</dt>
            <dd>{{ diagnostics.editsPath || '-' }}</dd>
          </div>
          <div class="bp-row">
            <dt>悬浮入口</dt>
            <dd>{{ diagnostics.floatEnabled ? '已启用' : '已关闭' }}</dd>
          </div>
          <div class="bp-row">
            <dt>悬浮位置</dt>
            <dd>{{ diagnostics.floatPosition || '-' }}</dd>
          </div>
        </dl>
      </section>

      <section class="bp-card bp-card--full">
        <div class="bp-card__head">
          <div>
            <h3>显示页面与说明</h3>
            <p>快速确认悬浮入口的当前显示范围，以及当前页面状态是否正确。</p>
          </div>
        </div>

        <div class="bp-page-tags">
          <span v-if="diagnostics.visiblePages?.length" v-for="page in diagnostics.visiblePages" :key="page" class="bp-tag">
            {{ page }}
          </span>
          <span v-else class="bp-tag">未获取</span>
        </div>

        <ul class="bp-tips">
          <li>如果这里始终 404，通常是插件后端 API 未正确加载或前端请求前缀不匹配。</li>
          <li>修改经文源后，请回到“插件设置”保存一次，再来此页刷新状态。</li>
          <li>若经文编辑已保存，这里的新增/修改/删除计数会同步变化。</li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { fetchDiagnostics, type BibleDiagnostics } from '../api/bibleData'

const loading = ref(false)
const error = ref('')
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

async function load() {
  loading.value = true
  error.value = ''
  try {
    Object.assign(diagnostics, await fetchDiagnostics())
  } catch (reason: unknown) {
    error.value = reason instanceof Error ? reason.message : '运行状态加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.bp-diagnostics {
  padding: 24px;
  color: #0f172a;
}

.bp-surface,
.bp-card,
.bp-metric-card {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 24px;
  background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.06);
}

.bp-diagnostics__hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  padding: 28px 30px;
  margin-bottom: 20px;
}

.bp-diagnostics__eyebrow {
  margin: 0;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.bp-diagnostics__hero h2 {
  margin: 8px 0 0;
  font-size: 32px;
}

.bp-diagnostics__hero p {
  margin: 10px 0 0;
  color: #64748b;
  font-size: 14px;
  line-height: 1.75;
}

.bp-diagnostics__actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
}

.bp-badge,
.bp-tag {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.05);
  color: #0f172a;
  font-size: 13px;
  font-weight: 700;
}

.bp-alert {
  margin-bottom: 16px;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(239, 68, 68, 0.08);
  color: #b91c1c;
  font-size: 14px;
}

.bp-metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.bp-metric-card {
  padding: 18px 20px;
}

.bp-metric-card span {
  display: block;
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
}

.bp-metric-card strong {
  display: block;
  margin-top: 10px;
  font-size: 30px;
  line-height: 1.2;
}

.bp-diagnostics__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.bp-card {
  padding: 24px;
}

.bp-card--full {
  grid-column: 1 / -1;
}

.bp-card__head {
  margin-bottom: 18px;
}

.bp-card__head h3 {
  margin: 0;
  font-size: 22px;
}

.bp-card__head p {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 14px;
  line-height: 1.75;
}

.bp-list {
  margin: 0;
}

.bp-row {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 18px;
  padding: 14px 0;
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
}

.bp-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.bp-row dt {
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
}

.bp-row dd {
  margin: 0;
  color: #0f172a;
  font-size: 14px;
  line-height: 1.8;
  word-break: break-all;
}

.bp-row dd.is-danger {
  color: #b91c1c;
}

.bp-page-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.bp-tips {
  margin: 18px 0 0;
  padding-left: 18px;
  color: #475569;
  font-size: 14px;
  line-height: 1.9;
}

.bp-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  border: none;
  border-radius: 16px;
  padding: 0 18px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
}

.bp-button--primary {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  color: #fff;
  box-shadow: 0 16px 30px rgba(15, 23, 42, 0.18);
}

.bp-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 1080px) {
  .bp-metric-grid,
  .bp-diagnostics__grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 760px) {
  .bp-diagnostics {
    padding: 16px;
  }

  .bp-diagnostics__hero {
    flex-direction: column;
  }

  .bp-diagnostics__actions {
    align-items: stretch;
  }

  .bp-metric-grid,
  .bp-diagnostics__grid {
    grid-template-columns: 1fr;
  }

  .bp-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }
}
</style>
