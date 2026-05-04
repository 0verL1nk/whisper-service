import { useTranscriptionStore } from '@/stores/transcription'
import { Label } from '@/components/ui/label'
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

  return (
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
  )
}
