import { useReviewStore } from "@/stores/review-store"
import { useLintStore } from "@/stores/lint-store"
import { useChatStore } from "@/stores/chat-store"
import { useResearchStore } from "@/stores/research-store"
import { useWikiStore } from "@/stores/wiki-store"
import { saveReviewItems, saveLintItems, saveChatHistory, saveResearchTasks } from "./persist"

let reviewTimer: ReturnType<typeof setTimeout> | null = null
let lintTimer: ReturnType<typeof setTimeout> | null = null
let chatTimer: ReturnType<typeof setTimeout> | null = null
let researchTimer: ReturnType<typeof setTimeout> | null = null

export function setupAutoSave(): void {
  // Auto-save review items (debounced 1s)
  useReviewStore.subscribe((state) => {
    if (reviewTimer) clearTimeout(reviewTimer)
    reviewTimer = setTimeout(() => {
      const project = useWikiStore.getState().project
      if (project) {
        saveReviewItems(project.path, state.items).catch(() => {})
      }
    }, 1000)
  })

  // Auto-save lint items (debounced 1s)
  useLintStore.subscribe((state) => {
    const projectPath = useWikiStore.getState().project?.path
    if (lintTimer) clearTimeout(lintTimer)
    lintTimer = setTimeout(() => {
      if (projectPath) {
        saveLintItems(projectPath, state.items).catch(() => {})
      }
    }, 1000)
  })

  // Auto-save chat conversations and messages (debounced 2s, skip during streaming)
  useChatStore.subscribe((state) => {
    if (state.isStreaming) return
    if (chatTimer) clearTimeout(chatTimer)
    chatTimer = setTimeout(() => {
      const project = useWikiStore.getState().project
      if (project) {
        saveChatHistory(project.path, state.conversations, state.messages).catch(() => {})
      }
    }, 2000)
  })

  // Auto-save research tasks (debounced 2s). Synthesis streams frequent
  // token updates, so a 2s debounce keeps disk writes bounded. Persisted
  // per-project so history survives dev reloads instead of being wiped
  // by resetProjectState (the old localStorage-backed store had that bug).
  useResearchStore.subscribe((state) => {
    if (researchTimer) clearTimeout(researchTimer)
    researchTimer = setTimeout(() => {
      const project = useWikiStore.getState().project
      if (project) {
        saveResearchTasks(project.path, state.tasks).catch(() => {})
      }
    }, 2000)
  })
}
