import { useCallback, useState } from 'react'
import { Upload, FileAudio } from 'lucide-react'
import { useTranscriptionStore } from '@/stores/transcription'

const ACCEPTED = '.mp3,.wav,.m4a,.flac,.ogg,.wma,.aac,.webm'

export function DropZone() {
  const addFiles = useTranscriptionStore((s) => s.addFiles)
  const [dragging, setDragging] = useState(false)

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return
      addFiles(Array.from(fileList))
    },
    [addFiles],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles],
  )

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
        dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
      }`}
      onClick={() => document.getElementById('file-input')?.click()}
    >
      <input
        id="file-input"
        type="file"
        multiple
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        {dragging ? (
          <FileAudio className="h-10 w-10 text-primary" />
        ) : (
          <Upload className="h-10 w-10" />
        )}
        <p className="text-lg font-medium">
          {dragging ? '松开以上传文件' : '拖拽音频文件到此处，或点击选择'}
        </p>
        <p className="text-sm">支持 MP3、WAV、M4A、FLAC、OGG 等格式</p>
      </div>
    </div>
  )
}
