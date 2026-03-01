import type { EncomendaDetail, EncomendaListItem, EncomendaStatus } from '../types'
import { parseApiDate } from '../../../utils/dateTime'

const OVERDUE_DAYS = 3
const OVERDUE_MS = OVERDUE_DAYS * 24 * 60 * 60 * 1000

export function statusLabel(status: EncomendaStatus): string {
  if (status === 'RECEBIDA') return 'Aguardando'
  if (status === 'DISPONIVEL_RETIRADA') return 'Notificado'
  return 'Entregue'
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

export function isOverdue(item: EncomendaListItem | EncomendaDetail, now = Date.now()): boolean {
  if (item.status === 'ENTREGUE') return false
  const recebidaEm = getRecebimentoDate(item)
  if (!recebidaEm) return false
  return now - recebidaEm.getTime() > OVERDUE_MS
}

export function statusChipLabel(item: EncomendaListItem): string {
  if (isOverdue(item)) return 'Atrasada'
  return statusLabel(item.status)
}
