import { create } from 'zustand'

export interface FileEntry {
  id: string
  file: File
}

interface TranscriptionState {
  files: FileEntry[]
  model: string
  language: string
  setModel: (model: string) => void
  setLanguage: (language: string) => void
  addFiles: (files: File[]) => void
  removeFile: (id: string) => void
  clearFiles: () => void
}

let nextId = 0

export const useTranscriptionStore = create<TranscriptionState>((set) => ({
  files: [],
  model: 'large-v3',
  language: 'zh',
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
}))
