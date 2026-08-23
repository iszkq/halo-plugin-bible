import { fileURLToPath, URL } from 'url'
import { viteConfig } from '@halo-dev/ui-plugin-bundler-kit/vite'
import Icons from 'unplugin-icons/vite'

export default viteConfig({
  // Keep the legacy IIFE provider for broad Halo 2.x compatibility. The
  // stable filenames also avoid manifest/hash resource lookup failures.
  format: 'iife',
  vite: {
    plugins: [Icons({ compiler: 'vue3' })],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      outDir: 'build/dist',
      rollupOptions: {
        output: {
          entryFileNames: 'main.js',
          assetFileNames: 'style.css',
        },
      },
    },
  },
})
