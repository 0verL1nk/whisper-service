import { useQuery } from '@tanstack/react-query'
import {
  X, FileAudio, Loader2, Check, Copy, Download,
  CircleCheck, CircleX, CircleEllipsis, FolderCheck,
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useTranscriptionStore } from '@/stores/transcription'
import { getTaskStatus, downloadUrl } from '@/lib/api'
import type { TaskStatus, TaskResult } from '@/lib/api'
import { getExportDir, exportToFile } from '@/hooks/useExportDir'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'

function formatETA(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return ''
  if (seconds < 60) return `${Math.ceil(seconds)}秒`
  const m = Math.floor(seconds / 60)
  const s = Math.ceil(seconds % 60)
  return `${m}分${s}秒`
}

function OverallProgress({ task }: { task: TaskStatus }) {
  const isDone = task.status === 'done'
  const doneCount = task.results.filter((r) => r.status === 'done' || r.status === 'error').length
  const totalCount = task.total
  const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0

  const [eta, setEta] = useState<string>('')
  const startTimeRef = useRef(0)
  const prevDoneRef = useRef(0)

  useEffect(() => {
    if (startTimeRef.current === 0) startTimeRef.current = Date.now()
    if (isDone) return
    if (doneCount > 0 && doneCount !== prevDoneRef.current) {
      prevDoneRef.current = doneCount
      const elapsed = (Date.now() - startTimeRef.current) / 1000
      const perFile = elapsed / doneCount
      const remaining = perFile * (totalCount - doneCount)
      setEta(formatETA(remaining))
    }
  }, [isDone, doneCount, totalCount])

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          {isDone ? '转录完成' : '转录中'}
          <span className="text-muted-foreground font-normal ml-2">
            {doneCount}/{totalCount} 个文件
          </span>
        </span>
        {!isDone && eta && (
          <span className="text-xs text-muted-foreground">预计剩余 {eta}</span>
        )}
      </div>
      <Progress value={isDone ? 100 : progress} className="h-1.5" />
    </div>
  )
}

function FileItem({
  file,
  result,
  isTranscribing,
  copiedIdx,
  onCopy,
  onRemove,
}: {
  file: { id: string; file: File }
  result?: TaskResult
  isTranscribing: boolean
  copiedIdx: number | null
  onCopy: (text: string, idx: number) => void
  onRemove: () => void
}) {
  const status = result?.status ?? 'pending'
  const isDone = status === 'done'
  const isError = status === 'error'
  const isProcessing = status === 'processing'
  const progress = result?.progress ?? 0
  const text = result?.text ?? null
  const error = result?.error ?? null

  return (
    <div className="rounded-md border px-3 py-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isDone ? (
            <CircleCheck className="h-4 w-4 shrink-0 text-green-500" />
          ) : isError ? (
            <CircleX className="h-4 w-4 shrink-0 text-destructive" />
          ) : isProcessing ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
          ) : (
            <CircleEllipsis className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <FileAudio className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-sm truncate">{file.file.name}</span>
          <span className="text-xs text-muted-foreground shrink-0">
            {(file.file.size / 1024 / 1024).toFixed(1)} MB
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isProcessing && progress > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
              {progress}%
            </span>
          )}
          {!isTranscribing && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRemove}>
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {isProcessing && (
        <Progress value={progress} className="h-1" />
      )}

      {isDone && text && (
        <div className="relative">
          <Textarea
            readOnly
            value={text}
            className="min-h-[60px] max-h-[160px] resize-y text-sm bg-muted/30 pr-10"
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6"
            onClick={() => onCopy(text, Number(file.id))}
          >
            {copiedIdx === Number(file.id) ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
      )}

      {isError && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}

export function FileList() {
  const files = useTranscriptionStore((s) => s.files)
  const removeFile = useTranscriptionStore((s) => s.removeFile)
  const clearFiles = useTranscriptionStore((s) => s.clearFiles)
  const reset = useTranscriptionStore((s) => s.reset)
  const activeTaskId = useTranscriptionStore((s) => s.activeTaskId)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [dlUrl, setDlUrl] = useState<string>('#')
  const [exportMsg, setExportMsg] = useState<string | null>(null)

  const { data: task } = useQuery<TaskStatus>({
    queryKey: ['task', activeTaskId],
    queryFn: () => getTaskStatus(activeTaskId!),
    enabled: !!activeTaskId,
    refetchInterval: (q) => {
      if (!q.state.data) return 500
      return q.state.data?.status === 'done' ? false : 500
    },
  })

  const isTranscribing = !!activeTaskId && task?.status !== 'done'
  const isTaskDone = task?.status === 'done'

  if (isTaskDone && dlUrl === '#') {
    downloadUrl(activeTaskId!).then(setDlUrl)
  }

  const copyText = async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  const handleExport = async () => {
    if (!task || !isTaskDone) return
    const dir = getExportDir()
    if (dir && task.results.length > 0) {
      try {
        const content = task.results
          .map((r) => `=== ${r.filename} ===\n${r.text ?? '[错误] ' + (r.error ?? '')}`)
          .join('\n\n')
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
        const filename = `transcription_${ts}.txt`
        await exportToFile(dir, filename, content)
        setExportMsg(`已保存到 ${dir}\\${filename}`)
      } catch (e) {
        setExportMsg(`导出失败: ${e}`)
      }
    } else {
      window.open(dlUrl, '_blank')
    }
  }

  if (files.length === 0) return null

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          已选择 {files.length} 个文件
        </p>
        {!isTranscribing && !isTaskDone && (
          <Button variant="ghost" size="sm" onClick={clearFiles}>
            清空全部
          </Button>
        )}
        {isTaskDone && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1" onClick={handleExport}>
              {getExportDir() ? (
                <><FolderCheck className="h-3.5 w-3.5" />保存到文件夹</>
              ) : (
                <><Download className="h-3.5 w-3.5" />导出全部</>
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={reset}>
              新建转录
            </Button>
          </div>
        )}
      </div>

      {exportMsg && (
        <p className="text-xs text-muted-foreground">{exportMsg}</p>
      )}

      {/* Overall progress */}
      {task && <OverallProgress task={task} />}

      {/* File list */}
      <ScrollArea className="max-h-[50vh]">
        <div className="space-y-1.5 pr-1">
          {files.map((f, i) => (
            <FileItem
              key={f.id}
              file={f}
              result={task?.results[i]}
              isTranscribing={isTranscribing}
              copiedIdx={copiedIdx}
              onCopy={copyText}
              onRemove={() => removeFile(f.id)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
