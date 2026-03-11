import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from 'react'

import { canOpenScannerCamera, isMobileScannerAvailable } from '../utils/mobileScanner'
import { BarcodeScanner } from './BarcodeScanner'

type Props = {
  initialCode?: string
  loading: boolean
  error: string | null
  onClose: () => void
  onConfirm: (codigo: string) => Promise<void> | void
}

function extractBestAlnumToken(raw: string): string {
  const text = raw.trim()
  if (!text) return ''

  const quotedMatches = Array.from(text.matchAll(/"([^"]+)"/g)).map((match) => match[1] ?? '')
  const candidates = quotedMatches.length > 0 ? quotedMatches : [text]

  let best = ''
  for (const candidate of candidates) {
    const alnumRuns = candidate.match(/[A-Za-z0-9]+/g) ?? []
    for (const run of alnumRuns) {
      if (run.length > best.length) {
        best = run
      }
    }
  }

  if (best) return best

  const fallbackRuns = text.match(/[A-Za-z0-9]+/g) ?? []
  return fallbackRuns.sort((a, b) => b.length - a.length)[0] ?? ''
}

export function VerificarEncomendaModal({
  initialCode = '',
  loading,
  error,
  onClose,
  onConfirm
}: Props): JSX.Element {
  const [codigo, setCodigo] = useState(initialCode)
  const [localError, setLocalError] = useState<string | null>(null)
  const [scannerAvailable, setScannerAvailable] = useState<boolean>(() => isMobileScannerAvailable())
  const [scannerOpen, setScannerOpen] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const burstCountRef = useRef(0)
  const burstLastAtRef = useRef(0)
  const autoSubmitTimerRef = useRef<number | null>(null)
  const codigoRef = useRef(codigo)

  useEffect(() => {
    codigoRef.current = codigo
  }, [codigo])

  useEffect(() => {
    setCodigo(initialCode)
    setLocalError(null)
    setCameraError(null)
  }, [initialCode])

  useEffect(() => {
    function onViewportChange(): void {
      setScannerAvailable(isMobileScannerAvailable())
    }
    window.addEventListener('resize', onViewportChange)
    return () => window.removeEventListener('resize', onViewportChange)
  }, [])

  useEffect(
    () => () => {
      if (autoSubmitTimerRef.current !== null) {
        window.clearTimeout(autoSubmitTimerRef.current)
      }
    },
    []
  )

  async function submitCodigo(raw: string): Promise<void> {
    if (loading) return
    const codigoNormalizado = extractBestAlnumToken(raw)
    if (!codigoNormalizado) {
      setLocalError('Informe o QRCode/Código de Barras.')
      return
    }
    if (codigoNormalizado.length > 20) {
      setLocalError('Código inválido: máximo de 20 caracteres alfanuméricos.')
      return
    }
    setCodigo(codigoNormalizado)
    setLocalError(null)
    await onConfirm(codigoNormalizado)
  }

  function openScanner(): void {
    if (!canOpenScannerCamera()) {
      setCameraError('Scanner indisponível neste navegador. Acesse por HTTPS ou localhost e permita câmera.')
      return
    }
    setCameraError(null)
    setScannerOpen(true)
  }

  function onCodigoChange(event: ChangeEvent<HTMLInputElement>): void {
    const nextRaw = event.target.value
    const extractedPreferred = extractBestAlnumToken(nextRaw)
    const next = extractedPreferred || nextRaw.replace(/[^A-Za-z0-9]/g, '')
    setCodigo(next)
    setLocalError(null)

    const now = Date.now()
    const delta = now - burstLastAtRef.current
    burstLastAtRef.current = now
    burstCountRef.current = delta <= 35 ? burstCountRef.current + 1 : 1

    if (autoSubmitTimerRef.current !== null) {
      window.clearTimeout(autoSubmitTimerRef.current)
      autoSubmitTimerRef.current = null
    }

    if (next.length > 20) {
      setLocalError('Código inválido: máximo de 20 caracteres alfanuméricos.')
      return
    }

    const nextTrimmed = next.trim()
    if (!nextTrimmed) return

    const looksLikeWedgeBurst = burstCountRef.current >= 8 && nextTrimmed.length >= 6
    const looksLikeScannerSingleInsert = next.length - codigoRef.current.length >= 6
    if (!looksLikeWedgeBurst && !looksLikeScannerSingleInsert) return

    autoSubmitTimerRef.current = window.setTimeout(() => {
      void submitCodigo(codigoRef.current)
    }, 90)
  }

  function onCodigoKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key !== 'Enter') return
    event.preventDefault()
    void submitCodigo(codigo)
  }

  function onScannerDetected(value: string): void {
    setScannerOpen(false)
    const extracted = extractBestAlnumToken(value)
    if (!extracted) {
      setLocalError('Não foi possível identificar um código alfanumérico válido.')
      return
    }
    if (extracted.length > 20) {
      setLocalError('Código inválido: máximo de 20 caracteres alfanuméricos.')
      return
    }
    setCodigo(extracted)
    setCameraError(null)
    void submitCodigo(extracted)
  }

  return (
    <>
      <div className="modal-overlay" role="dialog" aria-modal="true">
        <div className="modal-card">
          <h3>Verificar encomenda</h3>
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault()
              void submitCodigo(codigo)
            }}
          >
            <label>
              QRCode/Código de Barras
              <div className="scanner-field">
                <input
                  value={codigo}
                  onChange={onCodigoChange}
                  onKeyDown={onCodigoKeyDown}
                  placeholder="Digite ou leia o código"
                  maxLength={20}
                  autoFocus
                  required
                />
                {scannerAvailable ? (
                  <button type="button" className="button-soft scanner-open-action" onClick={openScanner}>
                    Scan
                  </button>
                ) : null}
              </div>
            </label>
            {localError ? <p className="error-box">{localError}</p> : null}
            {error ? <p className="error-box">{error}</p> : null}
            {cameraError ? <p className="error-box scanner-field-error">{cameraError}</p> : null}
            <div className="modal-actions">
              <button
                type="button"
                className="button-soft"
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </button>
              <button type="submit" className="cta" disabled={loading}>
                {loading ? 'Verificando...' : 'Confirmar'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {scannerOpen ? (
        <BarcodeScanner
          onDetected={onScannerDetected}
          onClose={() => setScannerOpen(false)}
          onError={setCameraError}
        />
      ) : null}
    </>
  )
}
