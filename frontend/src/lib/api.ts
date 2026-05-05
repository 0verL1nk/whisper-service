import { invoke } from '@tauri-apps/api/core'

export interface TranscribeResponse {
  task_id: string
  total: number
}

export interface TaskResult {
  filename: string
  text: string | null
  error: string | null
  status: 'pending' | 'processing' | 'done' | 'error'
  progress: number
}

export interface TaskStatus {
  id: string
  status: 'processing' | 'done'
  total: number
  done: number
  results: TaskResult[]
  model: string
}

export interface ModelInfo {
  name: string
  downloaded: boolean
  status: 'idle' | 'downloading' | 'done' | 'error'
  progress: number
  error?: string
}

async function get(path: string): Promise<string> {
  return invoke('proxy_get', { path })
}

async function post(path: string): Promise<string> {
  return invoke('proxy_post', { path })
}

async function del(path: string): Promise<string> {
  return invoke('proxy_delete', { path })
}

let cachedPort: number | null = null

async function getBackendPort(): Promise<number> {
  if (cachedPort) return cachedPort
  cachedPort = await invoke<number>('get_backend_port')
  return cachedPort
}

export async function checkHealth(): Promise<boolean> {
  try {
    const port = await getBackendPort()
    if (!port) return false
    const res = await get('/health')
    return JSON.parse(res).status === 'ok'
  } catch {
    cachedPort = null
    return false
  }
}

export async function startTranscribe(
  files: File[],
  model: string,
  language: string,
): Promise<TranscribeResponse> {
  const port = await getBackendPort()
  const form = new FormData()
  for (const f of files) {
    form.append('files', f)
  }
  form.append('model', model)
  form.append('language', language)

  const res = await fetch(`http://127.0.0.1:${port}/api/transcribe`, { method: 'POST', body: form })
  if (!res.ok) throw new Error(`上传失败: ${res.statusText}`)
  return res.json()
}

export async function getTaskStatus(taskId: string): Promise<TaskStatus> {
  const res = await get(`/api/task/${taskId}`)
  return JSON.parse(res)
}

export async function downloadUrl(taskId: string): Promise<string> {
  const port = await getBackendPort()
  return `http://127.0.0.1:${port}/api/download/${taskId}`
}

export async function deleteTask(taskId: string): Promise<void> {
  await del(`/api/task/${taskId}`)
}

export async function listModels(): Promise<ModelInfo[]> {
  const res = await get('/api/models')
  return JSON.parse(res).models
}

export async function downloadModel(modelSize: string): Promise<void> {
  await post(`/api/models/${modelSize}/download`)
}

export async function deleteModel(modelSize: string): Promise<void> {
  await del(`/api/models/${modelSize}`)
}

export async function saveTextFile(path: string, content: string): Promise<void> {
  await invoke('save_text_file', { path, content })
}
