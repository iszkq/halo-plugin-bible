<template>
  <button
    type="button"
    class="bible-toolbar-button inline-flex items-center justify-center rounded p-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/30"
    :title="title"
    @click.stop.prevent="openModal"
  >
    <component :is="icon" class="h-5 w-5 flex-shrink-0" />
  </button>
</template>

<script setup lang="ts">
import type { Editor } from '@tiptap/core'
import { openBibleInsertModal } from '../api/bibleInsertModalStore'

const props = defineProps<{
  editor: Editor
  icon: unknown
  title: string
}>()

function openModal() {
  openBibleInsertModal(props.editor)
}
</script>
