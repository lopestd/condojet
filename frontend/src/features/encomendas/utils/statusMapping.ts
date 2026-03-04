import type { EncomendaDetail, EncomendaListItem, EncomendaStatus } from '../types'
import { parseApiDate } from '../../../utils/dateTime'

const DEFAULT_FORGOTTEN_DAYS = 15

export function statusLabel(status: EncomendaStatus): string {
  if (status === 'RECEBIDA') return 'Aguardando'
  if (status === 'DISPONIVEL_RETIRADA') return 'Aguardando'
  return 'Entregue'
}

export function isNotified(item: EncomendaListItem | EncomendaDetail): boolean {
  return item.notificacao_status === 'ENVIADO'
}

export function statusClass(status: EncomendaStatus): string {
  if (status === 'RECEBIDA') return 'recebida'
  if (status === 'DISPONIVEL_RETIRADA') return 'disponivel'
  return 'entregue'
}

export function getRecebimentoDate(item: EncomendaListItem | EncomendaDetail): Date | null {
  const iso = parseApiDate(item.data_recebimento)
  if (iso) return iso
  return null
}

export function isForgotten(item: EncomendaListItem | EncomendaDetail, thresholdDays = DEFAULT_FORGOTTEN_DAYS, now = Date.now()): boolean {
  if (item.status === 'ENTREGUE') return false
  const recebidaEm = getRecebimentoDate(item)
  if (!recebidaEm) return false
  const normalizedThreshold = Math.max(1, thresholdDays)
  const thresholdMs = normalizedThreshold * 24 * 60 * 60 * 1000
  return now - recebidaEm.getTime() > thresholdMs
}

export function statusChipLabel(item: EncomendaListItem, thresholdDays = DEFAULT_FORGOTTEN_DAYS): string {
  if (isForgotten(item, thresholdDays)) return 'Esquecida'
  return statusLabel(item.status)
}

export function isOverdue(item: EncomendaListItem | EncomendaDetail, now = Date.now()): boolean {
  return isForgotten(item, DEFAULT_FORGOTTEN_DAYS, now)
}
