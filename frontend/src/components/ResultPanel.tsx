import { useQuery } from '@tanstack/react-query'
import { CircleCheck, Loader2, Copy, Check, Download, Trash2, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import type { TaskStatus } from '@/lib/api'
import { getTaskStatus, downloadUrl } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Props {
  taskId: string
  onRemove: () => void
}

export function ResultPanel({ taskId, onRemove }: Props) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [dlUrl, setDlUrl] = useState<string>('#')

  const { data: task } = useQuery<TaskStatus>({
    queryKey: ['task', taskId],
    queryFn: () => getTaskStatus(taskId),
    refetchInterval: (q) => (q.state.data?.status === 'done' ? false : 1000),
  })

  if (task?.status === 'done' && dlUrl === '#') {
    downloadUrl(taskId).then(setDlUrl)
  }

  if (!task) return null

  const isDone = task.status === 'done'
  const progress = task.total > 0 ? (task.done / task.total) * 100 : 0

  const copyText = async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  return (
    <div className="border rounded-lg divide-y">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          {isDone ? <CircleCheck className="h-4 w-4 text-green-500" /> : <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          <span className="text-sm font-medium">
            {isDone ? '转录完成' : `转录中 ${task.done}/${task.total}`}
          </span>
        </div>
        <div className="flex gap-1">
          {isDone && (
            <Button variant="outline" size="sm" className="gap-1" render={<a href={dlUrl} download />}>
              <Download className="h-3.5 w-3.5" />
              导出
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {!isDone && <Progress value={progress} className="h-1 rounded-none" />}
      <div className="divide-y">
        {task.results.map((r, i) => (
          <div key={i} className="px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{r.filename}</span>
              {r.text && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyText(r.text!, i)}>
                  {copiedIdx === i ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                </Button>
              )}
            </div>
            {r.error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{r.error}</AlertDescription>
              </Alert>
            ) : r.text ? (
              <Textarea readOnly value={r.text} className="min-h-[60px] resize-y text-sm bg-muted/30" />
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                处理中...
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
