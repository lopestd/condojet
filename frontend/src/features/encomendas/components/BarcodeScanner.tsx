import { BrowserMultiFormatReader } from '@zxing/browser'
import { useEffect, useRef, useState } from 'react'

export interface BarcodeScannerProps {
  onDetected: (code: string) => void
  onClose: () => void
  onError?: (message: string | null) => void
}

function parseCameraError(error: unknown): string {
  const errorName = typeof error === 'object' && error && 'name' in error ? String(error.name) : ''
  if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
    return 'Permissão de câmera negada. Libere o acesso para usar o scanner.'
  }
  if (errorName === 'NotFoundError' || errorName === 'OverconstrainedError') {
    return 'Nenhuma câmera traseira compatível foi encontrada neste dispositivo.'
  }
  return 'Não foi possível iniciar a câmera. Tente novamente.'
}

export function BarcodeScanner({ onDetected, onClose, onError }: BarcodeScannerProps): JSX.Element {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectedLockRef = useRef(false)
  const onDetectedRef = useRef(onDetected)
  const onErrorRef = useRef(onError)

  const [statusText, setStatusText] = useState('Iniciando câmera...')
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    onDetectedRef.current = onDetected
  }, [onDetected])

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  useEffect(() => {
    let cancelled = false

    function stopAllStreams(): void {
      if (controlsRef.current) {
        controlsRef.current.stop()
        controlsRef.current = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
      readerRef.current = null
    }

    async function start(): Promise<void> {
      if (!navigator.mediaDevices?.getUserMedia) {
        const message = 'Scanner indisponível neste navegador.'
        setLocalError(message)
        onErrorRef.current?.(message)
        return
      }

      try {
        setStatusText('Iniciando câmera...')
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } }
        })

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream
        setStatusText('Aponte a câmera para o código de barras ou QRCode.')

        const reader = new BrowserMultiFormatReader()
        readerRef.current = reader
        onErrorRef.current?.(null)

        const controls = await reader.decodeFromStream(stream, videoRef.current ?? undefined, (result) => {
          if (!result || detectedLockRef.current) return
          const code = result.getText().trim()
          if (!code) return

          detectedLockRef.current = true
          stopAllStreams()
          onDetectedRef.current(code)
        })

        controlsRef.current = controls
      } catch (error) {
        const message = parseCameraError(error)
        setLocalError(message)
        setStatusText('Falha ao iniciar scanner.')
        onErrorRef.current?.(message)
        stopAllStreams()
      }
    }

    void start()

    return () => {
      cancelled = true
      stopAllStreams()
    }
  }, [])

  return (
    <div className="scanner-overlay" role="dialog" aria-modal="true" aria-label="Scanner de código">
      <div className="scanner-card">
        <div className="scanner-head">
          <h4>Ler código</h4>
          <button type="button" className="button-soft small" onClick={onClose}>
            Cancelar
          </button>
        </div>

        <p className="scanner-status">{statusText}</p>

        <div className="scanner-video-wrap">
          <video ref={videoRef} className="scanner-video" muted playsInline autoPlay />
        </div>

        {localError ? <p className="error-box scanner-error">{localError}</p> : null}
      </div>
    </div>
  )
}
