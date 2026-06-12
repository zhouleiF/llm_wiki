import { create } from "zustand"
import { normalizeReviewTitle } from "@/lib/review-utils"

export interface ReviewOption {
  label: string
  action: string // identifier for the action
}

export interface ReviewItem {
  id: string
  type: "contradiction" | "duplicate" | "missing-page" | "confirm" | "suggestion"
  title: string
  description: string
  sourcePath?: string
  affectedPages?: string[]
  searchQueries?: string[]
  options: ReviewOption[]
  resolved: boolean
  resolvedAction?: string
  createdAt: number
}

interface ReviewState {
  items: ReviewItem[]
  addItem: (item: Omit<ReviewItem, "id" | "resolved" | "createdAt">) => void
  addItems: (items: Omit<ReviewItem, "id" | "resolved" | "createdAt">[]) => void
  setItems: (items: ReviewItem[]) => void
  resolveItem: (id: string, action: string) => void
  dismissItem: (id: string) => void
  clearResolved: () => void
}

let counter = 0

export const useReviewStore = create<ReviewState>((set) => ({
  items: [],

  addItem: (item) =>
    set((state) => ({
      items: [
        ...state.items,
        {
          ...item,
          id: `review-${++counter}`,
          resolved: false,
          createdAt: Date.now(),
        },
      ],
    })),

  addItems: (items) =>
    set((state) => {
      // De-dupe against ALL existing items (pending AND resolved) by
      // type + normalized title.  Previous logic only indexed pending
      // items, so after a user resolved/dismissed an item, a re-ingest
      // (file watcher, scheduled import, etc.) would re-add it as a
      // brand-new unresolved copy — making the list look stuck.
      const result = [...state.items]
      const keyFor = (t: string, title: string) => `${t}::${normalizeReviewTitle(title)}`

      // Index ALL items so resolved ones also block duplicates
      const existingIndex = new Map<string, number>()
      result.forEach((it, idx) => {
        existingIndex.set(keyFor(it.type, it.title), idx)
      })

      for (const incoming of items) {
        const k = keyFor(incoming.type, incoming.title)
        const existingIdx = existingIndex.get(k)

        if (existingIdx !== undefined) {
          const old = result[existingIdx]
          if (old.resolved) {
            // Already processed — skip to prevent re-adding
            continue
          }
          // Merge into existing pending item
          const mergedPages = Array.from(new Set([...(old.affectedPages ?? []), ...(incoming.affectedPages ?? [])]))
          const mergedQueries = Array.from(new Set([...(old.searchQueries ?? []), ...(incoming.searchQueries ?? [])]))
          result[existingIdx] = {
            ...old,
            description: incoming.description || old.description, // prefer newer description
            sourcePath: incoming.sourcePath ?? old.sourcePath,
            affectedPages: mergedPages.length > 0 ? mergedPages : undefined,
            searchQueries: mergedQueries.length > 0 ? mergedQueries : undefined,
          }
        } else {
          const newItem = {
            ...incoming,
            id: `review-${++counter}`,
            resolved: false,
            createdAt: Date.now(),
          }
          result.push(newItem)
          existingIndex.set(k, result.length - 1)
        }
      }

      return { items: result }
    }),

  setItems: (items) => set({ items }),

  resolveItem: (id, action) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, resolved: true, resolvedAction: action } : item
      ),
    })),

  dismissItem: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),

  clearResolved: () =>
    set((state) => ({
      items: state.items.filter((item) => !item.resolved),
    })),
}))
