/// <reference types="vite/client" />

/** Halo console-shared 依赖，插件构建时由宿主提供，类型仅作占位 */
declare module '@halo-dev/richtext-editor'

declare module '*.css?raw' {
  const content: string
  export default content
}
