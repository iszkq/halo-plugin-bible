/**
 * 全局「插入经文」弹窗状态，由独立挂载的 BibleInsertModalRoot 消费，避免工具栏下拉关闭时组件销毁导致闪退。
 */
export const BIBLE_INSERT_OPEN_EVENT = 'bible-insert-open'

export function openBibleInsertModal(editor: import('@tiptap/core').Editor): void {
  try {
    window.dispatchEvent(new CustomEvent(BIBLE_INSERT_OPEN_EVENT, { detail: { editor } }))
  } catch {
    // ignore
  }
}
