import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { AudioWaveform, Loader2, CircleDot, Minus, X, FolderDown, Square } from 'lucide-react'
import { FilePicker } from '@/components/DropZone'
import { FileList } from '@/components/FileList'
import { SettingsPanel } from '@/components/SettingsPanel'
import { ModelsPanel } from '@/components/ModelsPanel'
import { UpdateBanner } from '@/components/UpdateBanner'
import { useTranscriptionStore } from '@/stores/transcription'
import { useUpdate } from '@/hooks/useUpdate'
import { startTranscribe, checkHealth } from '@/lib/api'
import { Button } from '@/components/ui/button'

type Tab = 'transcribe' | 'models'

function TitleBar({ backendOnline }: { backendOnline: boolean }) {
  const handleDrag = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest('button')) return
    getCurrentWindow().startDragging()
  }

  return (
    <header
      className="flex items-center h-9 border-b bg-muted/30 select-none shrink-0"
      onMouseDown={handleDrag}
    >
      <div className="flex items-center gap-2 px-3">
        <AudioWaveform className="h-4 w-4 text-primary" />
        <span className="font-semibold text-sm">Whisper</span>
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-2">
        {backendOnline ? (
          <><CircleDot className="h-3 w-3 text-green-500" /><span>就绪</span></>
        ) : (
          <><Loader2 className="h-3 w-3 animate-spin" /><span>启动中...</span></>
        )}
      </div>
      <button className="h-full w-10 flex items-center justify-center hover:bg-muted cursor-pointer" onClick={() => getCurrentWindow().minimize()}>
        <Minus className="h-3.5 w-3.5" />
      </button>
      <button className="h-full w-10 flex items-center justify-center hover:bg-muted cursor-pointer" onClick={() => getCurrentWindow().toggleMaximize()}>
        <Square className="h-3 w-3" />
      </button>
      <button className="h-full w-10 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground cursor-pointer" onClick={() => getCurrentWindow().close()}>
        <X className="h-3.5 w-3.5" />
      </button>
    </header>
  )
}

export default function App() {
  const { files, model, language, activeTaskId, setActiveTaskId } = useTranscriptionStore()
  const { status: updateStatus, downloadAndInstall, dismiss: dismissUpdate } = useUpdate()
  const [tab, setTab] = useState<Tab>('transcribe')

  const { data: backendOnline } = useQuery({
    queryKey: ['health'],
    queryFn: checkHealth,
    refetchInterval: (q) => (q.state.data ? false : 1500),
  })

  const mutation = useMutation({
    mutationFn: () => startTranscribe(files.map((f) => f.file), model, language),
    onSuccess: (data) => {
      setActiveTaskId(data.task_id)
    },
  })

  const isTranscribing = !!activeTaskId

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <TitleBar backendOnline={!!backendOnline} />
      <UpdateBanner status={updateStatus} onInstall={downloadAndInstall} onDismiss={dismissUpdate} />

      {!backendOnline ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <AudioWaveform className="h-10 w-10 text-primary animate-pulse" />
          <div className="text-center space-y-1">
            <p className="text-sm font-medium">正在启动后端服务...</p>
            <p className="text-xs text-muted-foreground">首次启动可能需要几秒钟</p>
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <main className="flex-1 flex flex-col overflow-hidden p-4 gap-4">
          {/* Tab bar */}
          <div className="flex border-b">
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${
                tab === 'transcribe' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setTab('transcribe')}
            >
              转录
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${
                tab === 'models' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setTab('models')}
            >
              <span className="inline-flex items-center gap-1">
                <FolderDown className="h-3.5 w-3.5" />
                模型管理
              </span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {tab === 'transcribe' && (
              <div className="space-y-4">
                {!isTranscribing && <FilePicker />}
                <FileList />
                {!isTranscribing && files.length > 0 && (
                  <>
                    <SettingsPanel />
                    <Button
                      className="w-full"
                      size="lg"
                      disabled={mutation.isPending}
                      onClick={() => mutation.mutate()}
                    >
                      {mutation.isPending ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />提交中...</>
                      ) : (
                        `开始转录 (${files.length} 个文件)`
                      )}
                    </Button>
                  </>
                )}
              </div>
            )}

            {tab === 'models' && <ModelsPanel />}
          </div>
        </main>
      )}
    </div>
  )
}
