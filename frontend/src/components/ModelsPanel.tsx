import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Download, Trash2, CircleDot, AlertCircle } from 'lucide-react'
import { listModels, downloadModel, deleteModel } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

const MODEL_SIZES = [
  { name: 'tiny', label: 'Tiny', desc: '~75MB，最快，精度低' },
  { name: 'base', label: 'Base', desc: '~145MB，快速，精度一般' },
  { name: 'small', label: 'Small', desc: '~500MB，均衡' },
  { name: 'medium', label: 'Medium', desc: '~1.5GB，较好' },
  { name: 'large-v3', label: 'Large-v3', desc: '~3GB，最佳 (推荐)' },
]

export function ModelsPanel() {
  const qc = useQueryClient()

  const { data: models } = useQuery({
    queryKey: ['models'],
    queryFn: listModels,
    refetchInterval: (q) => {
      const data = q.state.data
      const anyDownloading = data?.some((m) => m.status === 'downloading')
      return anyDownloading ? 1500 : false
    },
  })

  const modelMap = new Map(models?.map((m) => [m.name, m]))

  const handleDownload = async (name: string) => {
    await downloadModel(name)
    qc.invalidateQueries({ queryKey: ['models'] })
  }

  const deleteMut = useMutation({
    mutationFn: deleteModel,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['models'] }),
  })

  return (
    <div className="space-y-2">
      {MODEL_SIZES.map((m) => {
        const info = modelMap.get(m.name)
        const isDownloaded = info?.downloaded
        const isDownloading = info?.status === 'downloading'
        const progress = info?.progress ?? 0
        const hasError = info?.status === 'error'

        return (
          <div key={m.name} className="rounded-lg border px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isDownloaded ? (
                  <CircleDot className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <CircleDot className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <div>
                  <div className="text-sm font-medium">{m.label}</div>
                  <div className="text-xs text-muted-foreground">{m.desc}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isDownloaded && !isDownloading && (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <Check className="h-3 w-3" /> 已下载
                  </span>
                )}
                {isDownloading && (
                  <span className="text-xs text-primary">{progress}%</span>
                )}
                {isDownloaded && !isDownloading ? (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMut.mutate(m.name)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                ) : !isDownloading && !hasError ? (
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => handleDownload(m.name)}>
                    <Download className="h-3.5 w-3.5" />
                    下载
                  </Button>
                ) : null}
              </div>
            </div>
            {isDownloading && (
              <Progress value={progress} className="h-1.5" />
            )}
            {hasError && (
              <div className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" />
                {info?.error || '下载失败'}
                <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => handleDownload(m.name)}>
                  重试
                </Button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
