<template>
  <!-- 与其它插件一致：整行可选中、左对齐图标+文字，无额外框 -->
  <button
    type="button"
    class="bible-toolbox-item w-full flex items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700 min-h-[2.25rem]"
    :title="title"
    @click.stop.prevent="openModal"
  >
    <component :is="icon" class="h-4 w-4 flex-shrink-0 text-current" />
    <span class="flex-1 truncate">{{ title }}</span>
  </button>
</template>

<script setup lang="ts">
import type { Editor } from '@tiptap/core'
import { openBibleInsertModal } from '../api/bibleInsertModalStore'

const props = defineProps<{
  editor: Editor
  icon: unknown
  title: string
  description?: string
}>()

function openModal() {
  openBibleInsertModal(props.editor)
}
</script>
