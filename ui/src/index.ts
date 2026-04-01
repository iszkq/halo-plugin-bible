import { definePlugin } from '@halo-dev/console-shared'
import { createApp, markRaw } from 'vue'
import BibleSettingsTab from './views/BibleSettingsTab.vue'
import BibleDiagnosticsTab from './views/BibleDiagnosticsTab.vue'
import BibleToolView from './views/BibleToolView.vue'
import BibleInsertModalRoot from './components/BibleInsertModalRoot.vue'
import IconBook from './components/IconBook.vue'
import { BibleEditorExtension } from './extensions/BibleEditorExtension'
import bibleConsoleCss from './styles/bible-console.css?raw'

function ensureStyleTag(id: string, css: string) {
  if (typeof document === 'undefined' || document.getElementById(id)) {
    return
  }
  const style = document.createElement('style')
  style.id = id
  style.textContent = css
  document.head.appendChild(style)
}

if (typeof document !== 'undefined') {
  ensureStyleTag(
    'bible-plugin-global-styles',
    `
      .bible-verse-block,
      .bible-embed-card {
        max-width: 38rem;
        margin: 0.75em 0;
        border: 1px solid #e2e8f0;
        border-radius: 18px;
        background: #f8fafc;
        box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
      }

      .bible-verse-block {
        padding: 0.85em 1em;
        line-height: 1.75;
        font-size: 0.95em;
      }

      .bible-embed-card {
        padding: 0.95em 1.05em;
      }

      .bible-embed-card__header {
        margin-bottom: 0.75em;
        font-size: 0.8em;
        font-weight: 700;
        letter-spacing: 0.08em;
        color: #64748b;
      }

      .bible-embed-card__body {
        display: flex;
        flex-direction: column;
        gap: 0.55em;
      }

      .bible-embed-card__line {
        margin: 0;
        line-height: 1.8;
        color: #0f172a;
        white-space: pre-wrap;
      }

      .bible-keyword-highlight {
        border-radius: 6px;
        background: rgba(250, 204, 21, 0.32);
        color: inherit;
        padding: 0 0.15em;
      }
    `
  )
  ensureStyleTag('bible-plugin-console-styles', bibleConsoleCss)
  setTimeout(() => {
    if (!document.getElementById('bible-insert-modal-root')) {
      const root = document.createElement('div')
      root.id = 'bible-insert-modal-root'
      document.body.appendChild(root)
      createApp(BibleInsertModalRoot).mount(root)
    }
  }, 0)
}

export default definePlugin({
  routes: [
    {
      parentName: 'ToolsRoot',
      route: {
        path: '/tools/bible',
        name: 'BibleToolView',
        component: markRaw(BibleToolView),
        meta: {
          title: '圣经',
          searchable: true,
          menu: {
            name: '圣经',
            group: 'tool',
            icon: markRaw(IconBook),
            priority: 0,
          },
        },
      },
    },
  ],
  extensionPoints: {
    'default:editor:extension:create': () => [BibleEditorExtension],
    'plugin:self:tabs:create': () => [
      {
        id: 'bible-settings',
        label: '插件设置',
        component: markRaw(BibleSettingsTab),
      },
      {
        id: 'bible-diagnostics',
        label: '排查日志',
        component: markRaw(BibleDiagnosticsTab),
      },
    ],
  },
})
