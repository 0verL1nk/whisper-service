import { open } from '@tauri-apps/plugin-dialog'
import { readFile } from '@tauri-apps/plugin-fs'
import { FolderOpen, Plus } from 'lucide-react'
import { useTranscriptionStore } from '@/stores/transcription'
import { Button } from '@/components/ui/button'

export function FilePicker() {
  const addFiles = useTranscriptionStore((s) => s.addFiles)

  const handlePick = async () => {
    const paths = await open({
      multiple: true,
      filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'm4a', 'flac', 'ogg', 'wma', 'aac', 'webm'] }],
    })
    if (!paths) return

    const files: File[] = []
    for (const p of paths) {
      const data = await readFile(p)
      const name = p.split(/[\\/]/).pop() || 'audio'
      files.push(new File([data], name))
    }
    addFiles(files)
  }

  return (
    <div className="flex gap-2">
      <Button onClick={handlePick} className="gap-2">
        <Plus className="h-4 w-4" />
        选择音频文件
      </Button>
      <Button variant="outline" onClick={handlePick} className="gap-2">
        <FolderOpen className="h-4 w-4" />
        选择文件夹
      </Button>
    </div>
  )
}
