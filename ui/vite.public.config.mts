import { fileURLToPath, URL } from 'url'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'build/public-bible-editor',
    emptyOutDir: false,
    lib: {
      entry: fileURLToPath(new URL('./src/public/bibleNoteEditor.ts', import.meta.url)),
      name: 'BibleNoteEditorKit',
      fileName: () => 'theme-bible-note-editor.js',
      formats: ['iife'],
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
})
