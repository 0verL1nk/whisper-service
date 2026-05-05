import { Download, X, Loader2, AlertCircle } from 'lucide-react'
import type { UpdateStatus } from '@/hooks/useUpdate'

interface UpdateBannerProps {
  status: UpdateStatus
  onInstall: () => void
  onDismiss: () => void
}

export function UpdateBanner({ status, onInstall, onDismiss }: UpdateBannerProps) {
  if (status.state === 'idle' || status.state === 'checking') return null

  if (status.state === 'available') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border-b text-sm">
        <Download className="h-4 w-4 text-primary shrink-0" />
        <span className="flex-1">
          发现新版本 <span className="font-semibold">{status.version}</span>，点击更新
        </span>
        <button
          className="px-3 py-1 bg-primary text-primary-foreground rounded text-xs font-medium cursor-pointer hover:bg-primary/90"
          onClick={onInstall}
        >
          立即更新
        </button>
        <button className="p-0.5 hover:bg-muted rounded cursor-pointer" onClick={onDismiss}>
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  if (status.state === 'downloading') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border-b text-sm">
        <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
        <span className="flex-1">正在下载更新... {status.percent}%</span>
        <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${status.percent}%` }} />
        </div>
      </div>
    )
  }

  if (status.state === 'ready') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border-b text-sm">
        <span className="flex-1">更新已就绪，即将重启...</span>
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    )
  }

  if (status.state === 'error') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-destructive/10 border-b text-sm">
        <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
        <span className="flex-1">更新失败: {status.message}</span>
        <button className="p-0.5 hover:bg-muted rounded cursor-pointer" onClick={onDismiss}>
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return null
}
