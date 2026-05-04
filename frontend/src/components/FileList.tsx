import { X, FileAudio } from 'lucide-react'
import { useTranscriptionStore } from '@/stores/transcription'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

export function FileList() {
  const files = useTranscriptionStore((s) => s.files)
  const removeFile = useTranscriptionStore((s) => s.removeFile)
  const clearFiles = useTranscriptionStore((s) => s.clearFiles)

  if (files.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">已选择 {files.length} 个文件</p>
        <Button variant="ghost" size="sm" onClick={clearFiles}>
          清空全部
        </Button>
      </div>
      <ScrollArea className="h-48 rounded-lg border">
        <div className="p-2 space-y-1">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between gap-2 rounded-md px-3 py-2 hover:bg-muted/50"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileAudio className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm truncate">{f.file.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {(f.file.size / 1024 / 1024).toFixed(1)} MB
                </span>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeFile(f.id)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
