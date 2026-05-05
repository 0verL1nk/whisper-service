import { create } from 'zustand'

export interface FileEntry {
  id: string
  file: File
}

interface TranscriptionState {
  files: FileEntry[]
  model: string
  language: string
  activeTaskId: string | null
  setModel: (model: string) => void
  setLanguage: (language: string) => void
  addFiles: (files: File[]) => void
  removeFile: (id: string) => void
  clearFiles: () => void
  setActiveTaskId: (id: string | null) => void
  reset: () => void
}

let nextId = 0

export const useTranscriptionStore = create<TranscriptionState>((set) => ({
  files: [],
  model: 'large-v3',
  language: 'zh',
  activeTaskId: null,
  setModel: (model) => set({ model }),
  setLanguage: (language) => set({ language }),
  addFiles: (files) =>
    set((state) => ({
      files: [
        ...state.files,
        ...files.map((f) => ({ id: String(++nextId), file: f })),
      ],
    })),
  removeFile: (id) => set((state) => ({ files: state.files.filter((f) => f.id !== id) })),
  clearFiles: () => set({ files: [] }),
  setActiveTaskId: (id) => set({ activeTaskId: id }),
  reset: () => set({ files: [], activeTaskId: null }),
}))
