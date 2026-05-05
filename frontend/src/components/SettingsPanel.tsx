import { FolderOpen } from 'lucide-react'
import { useState } from 'react'
import { useTranscriptionStore } from '@/stores/transcription'
import { getExportDir, setExportDir, pickExportDir } from '@/hooks/useExportDir'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const MODELS = [
  { value: 'tiny', label: 'Tiny - 最快，精度低' },
  { value: 'base', label: 'Base - 快速，精度一般' },
  { value: 'small', label: 'Small - 均衡' },
  { value: 'medium', label: 'Medium - 较好' },
  { value: 'large-v3', label: 'Large-v3 - 最佳 (推荐)' },
]

const LANGUAGES = [
  { value: '', label: '自动检测' },
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'es', label: 'Español' },
]

export function SettingsPanel() {
  const model = useTranscriptionStore((s) => s.model)
  const language = useTranscriptionStore((s) => s.language)
  const setModel = useTranscriptionStore((s) => s.setModel)
  const setLanguage = useTranscriptionStore((s) => s.setLanguage)
  const [exportDir, setExportDirState] = useState(() => getExportDir())

  const handlePickDir = async () => {
    const dir = await pickExportDir()
    if (dir) setExportDirState(dir)
  }

  const handleClearDir = () => {
    setExportDir(null)
    setExportDirState(null)
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-4 flex-wrap">
        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <Label>模型</Label>
          <Select value={model} onValueChange={(v) => v && setModel(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {MODELS.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <Label>语言</Label>
          <Select value={language} onValueChange={(v) => setLanguage(v ?? '')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Label className="shrink-0">导出到</Label>
        {exportDir ? (
          <>
            <span className="text-sm text-muted-foreground truncate flex-1">{exportDir}</span>
            <Button variant="ghost" size="sm" onClick={handlePickDir}>更改</Button>
            <Button variant="ghost" size="sm" onClick={handleClearDir}>清除</Button>
          </>
        ) : (
          <>
            <span className="text-sm text-muted-foreground flex-1">未设置（使用浏览器下载）</span>
            <Button variant="outline" size="sm" className="gap-1" onClick={handlePickDir}>
              <FolderOpen className="h-3.5 w-3.5" />
              选择目录
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
