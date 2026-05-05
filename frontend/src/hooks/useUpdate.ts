import { useState, useEffect, useCallback } from 'react'
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

  const checkForUpdate = useCallback(async () => {
    try {
      setStatus({ state: 'checking' })
      const update = await check()
      if (update) {
        setStatus({ state: 'available', version: update.version })
      } else {
        setStatus({ state: 'idle' })
      }
    } catch {
      setStatus({ state: 'idle' })
    }
  }, [])

  const downloadAndInstall = useCallback(async () => {
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
  }, [])

  useEffect(() => {
    checkForUpdate()
  }, [checkForUpdate])

  const dismiss = useCallback(() => {
    setStatus({ state: 'idle' })
  }, [])

  return { status, downloadAndInstall, dismiss }
}
