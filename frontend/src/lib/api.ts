const API_BASE = '/api'

export interface TranscribeResponse {
  task_id: string
  total: number
}

export interface TaskResult {
  filename: string
  text: string | null
  error: string | null
}

export interface TaskStatus {
  id: string
  status: 'processing' | 'done'
  total: number
  done: number
  results: TaskResult[]
  model: string
}

export async function startTranscribe(
  files: File[],
  model: string,
  language: string,
): Promise<TranscribeResponse> {
  const form = new FormData()
  for (const f of files) {
    form.append('files', f)
  }
  form.append('model', model)
  form.append('language', language)

  const res = await fetch(`${API_BASE}/transcribe`, { method: 'POST', body: form })
  if (!res.ok) throw new Error(`上传失败: ${res.statusText}`)
  return res.json()
}

export async function getTaskStatus(taskId: string): Promise<TaskStatus> {
  const res = await fetch(`${API_BASE}/task/${taskId}`)
  if (!res.ok) throw new Error('任务不存在')
  return res.json()
}

export function downloadUrl(taskId: string): string {
  return `${API_BASE}/download/${taskId}`
}

export async function deleteTask(taskId: string): Promise<void> {
  await fetch(`${API_BASE}/task/${taskId}`, { method: 'DELETE' })
}
