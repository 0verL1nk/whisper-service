import { useState, useEffect } from 'react'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

export type UpdateStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'available'; version: string }
  | { state: 'downloading'; percent: number }
  | { state: 'ready' }
  | { state: 'error'; message: string }

export function useUpdate() {
  const [status, setStatus] = useState<UpdateStatus>({ state: 'idle' })

  const downloadAndInstall = async () => {
    try {
      setStatus({ state: 'downloading', percent: 0 })

      const update = await check()
      if (!update) {
        setStatus({ state: 'idle' })
        return
      }

      let downloaded = 0
      let contentLength = 0

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength ?? 0
            break
          case 'Progress':
            downloaded += event.data.chunkLength
            if (contentLength > 0) {
              setStatus({ state: 'downloading', percent: Math.round((downloaded / contentLength) * 100) })
            }
            break
          case 'Finished':
            setStatus({ state: 'ready' })
            break
        }
      })

      await relaunch()
    } catch (e) {
      setStatus({ state: 'error', message: String(e) })
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setStatus({ state: 'checking' })
        const update = await check()
        if (cancelled) return
        if (update) {
          setStatus({ state: 'available', version: update.version })
        } else {
          setStatus({ state: 'idle' })
        }
      } catch {
        if (!cancelled) setStatus({ state: 'idle' })
      }
    })()
    return () => { cancelled = true }
  }, [])

  const dismiss = () => {
    setStatus({ state: 'idle' })
  }

  return { status, downloadAndInstall, dismiss }
}
