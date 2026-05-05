import { open } from '@tauri-apps/plugin-dialog'
import { saveTextFile } from '@/lib/api'

const STORAGE_KEY = 'whisper-export-dir'

export function getExportDir(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

export function setExportDir(dir: string | null): void {
  if (dir) {
    localStorage.setItem(STORAGE_KEY, dir)
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export async function pickExportDir(): Promise<string | null> {
  const selected = await open({ directory: true, title: '选择导出目录' })
  if (!selected) return null
  const dir = typeof selected === 'string' ? selected : selected[0]
  if (dir) setExportDir(dir)
  return dir
}

export async function exportToFile(dir: string, filename: string, content: string): Promise<string> {
  const sep = dir.endsWith('\\') || dir.endsWith('/') ? '' : '\\'
  const fullPath = `${dir}${sep}${filename}`
  await saveTextFile(fullPath, content)
  return fullPath
}
