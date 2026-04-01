import { Extension } from '@tiptap/core'
import { markRaw } from 'vue'
import IconBook from '../components/IconBook.vue'
import BibleToolboxItem from './BibleToolboxItem.vue'
import BibleToolbarButton from './BibleToolbarButton.vue'

export const BibleEditorExtension: Extension = Extension.create({
  name: 'bibleInsert',

  addOptions() {
    return {
      ...this.parent?.(),
      getToolboxItems({ editor }: { editor: import('@tiptap/core').Editor }) {
        return {
          priority: 25,
          component: markRaw(BibleToolboxItem),
          props: {
            editor,
            icon: markRaw(IconBook),
            title: '插入经文',
            description: '搜索圣经经文并插入到文章内容中',
          },
        }
      },
      getToolbarItems({ editor }: { editor: import('@tiptap/core').Editor }) {
        return {
          priority: 25,
          component: markRaw(BibleToolbarButton),
          props: {
            editor,
            icon: markRaw(IconBook),
            title: '插入经文',
          },
        }
      },
    }
  },
})
