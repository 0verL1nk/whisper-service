import { useQuery } from '@tanstack/react-query'
import { Download, Copy, Check, Loader2, AlertCircle, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { TaskStatus } from '@/lib/api'
import { getTaskStatus, downloadUrl, deleteTask } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Props {
  taskId: string
  onRemove: () => void
}

export function ResultPanel({ taskId, onRemove }: Props) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  const { data: task, isLoading } = useQuery<TaskStatus>({
    queryKey: ['task', taskId],
    queryFn: () => getTaskStatus(taskId),
    refetchInterval: (q) => (q.state.data?.status === 'done' ? false : 1000),
  })

  if (isLoading || !task) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>加载中...</span>
        </CardContent>
      </Card>
    )
  }

  const isDone = task.status === 'done'
  const progress = task.total > 0 ? (task.done / task.total) * 100 : 0

  const copyText = async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">转录结果</CardTitle>
            <Badge variant={isDone ? 'default' : 'secondary'}>
              {isDone ? '完成' : `${task.done}/${task.total}`}
            </Badge>
          </div>
          <div className="flex gap-1">
            {isDone && (
              <Button variant="outline" size="sm" render={<a href={downloadUrl(taskId)} download />}>
                <Download className="h-4 w-4 mr-1" />
                下载全部
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={async () => {
                await deleteTask(taskId)
                onRemove()
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isDone && <Progress value={progress} className="h-2" />}
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-3">
            {task.results.map((r, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{r.filename}</span>
                  {r.text && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyText(r.text!, i)}>
                      {copiedIdx === i ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  )}
                </div>
                {r.error ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{r.error}</AlertDescription>
                  </Alert>
                ) : r.text ? (
                  <Textarea readOnly value={r.text} className="min-h-[80px] resize-y text-sm" />
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    转录中...
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
