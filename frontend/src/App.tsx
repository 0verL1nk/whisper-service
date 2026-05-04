import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AudioWaveform, Loader2 } from 'lucide-react'
import { DropZone } from '@/components/DropZone'
import { FileList } from '@/components/FileList'
import { SettingsPanel } from '@/components/SettingsPanel'
import { ResultPanel } from '@/components/ResultPanel'
import { useTranscriptionStore } from '@/stores/transcription'
import { startTranscribe } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export default function App() {
  const { files, model, language, clearFiles } = useTranscriptionStore()
  const [taskIds, setTaskIds] = useState<string[]>([])

  const mutation = useMutation({
    mutationFn: () => startTranscribe(files.map((f) => f.file), model, language),
    onSuccess: (data) => {
      setTaskIds((prev) => [...prev, data.task_id])
      clearFiles()
    },
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <AudioWaveform className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Whisper 语音转文字</h1>
            <p className="text-sm text-muted-foreground">批量上传音频文件，自动识别为文本</p>
          </div>
        </div>

        <DropZone />
        <FileList />

        {files.length > 0 && (
          <>
            <SettingsPanel />
            <Button
              className="w-full"
              size="lg"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  上传中...
                </>
              ) : (
                `开始转录 (${files.length} 个文件)`
              )}
            </Button>
          </>
        )}

        {taskIds.length > 0 && (
          <>
            <Separator />
            <div className="space-y-4">
              {taskIds.map((id) => (
                <ResultPanel
                  key={id}
                  taskId={id}
                  onRemove={() => setTaskIds((prev) => prev.filter((t) => t !== id))}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
