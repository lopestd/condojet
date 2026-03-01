import type { EncomendaFilter, EncomendaListItem, EncomendaSort, Endereco } from '../types'
import { isOverdue } from './statusMapping'
import { parseApiDate } from '../../../utils/dateTime'

export function formatEnderecoLabel(endereco: Endereco): string {
  if (endereco.tipo_endereco === 'QUADRA_SETOR_CHACARA') {
    const comp = endereco.numero_chacara
      ? `${endereco.setor_chacara ?? '-'} / ${endereco.numero_chacara}`
      : (endereco.setor_chacara ?? '-')
    return `${endereco.quadra} - ${comp}`
  }
  const comp = endereco.lote ? `${endereco.conjunto ?? '-'} / ${endereco.lote}` : (endereco.conjunto ?? '-')
  return `${endereco.quadra} - ${comp}`
}

function searchKey(item: EncomendaListItem): string {
  return [
    String(item.id),
    item.codigo_interno,
    item.status,
    item.tipo,
    item.morador_nome ?? String(item.morador_id),
    item.endereco_label ?? String(item.endereco_id)
  ]
    .join(' ')
    .toLowerCase()
}

export function filterEncomendas(items: EncomendaListItem[], searchTerm: string, status: EncomendaFilter): EncomendaListItem[] {
  const term = searchTerm.trim().toLowerCase()
  return items.filter((item) => {
    if (status === 'ATRASADA' && !isOverdue(item)) return false
    if (status !== 'ALL' && status !== 'ATRASADA' && item.status !== status) return false
    if (!term) return true
    return searchKey(item).includes(term)
  })
}

export function sortEncomendas(items: EncomendaListItem[], sort: EncomendaSort): EncomendaListItem[] {
  const sorted = [...items]
  if (sort === 'MORADOR_AZ') {
    sorted.sort((a, b) => (a.morador_nome ?? '').localeCompare(b.morador_nome ?? '', 'pt-BR', { sensitivity: 'base' }))
    return sorted
  }
  if (sort === 'MORADOR_ZA') {
    sorted.sort((a, b) => (b.morador_nome ?? '').localeCompare(a.morador_nome ?? '', 'pt-BR', { sensitivity: 'base' }))
    return sorted
  }

  sorted.sort((a, b) => {
    const da = parseApiDate(a.data_recebimento)?.getTime() ?? 0
    const db = parseApiDate(b.data_recebimento)?.getTime() ?? 0
    if (sort === 'ANTIGAS') return da - db
    return db - da
  })
  return sorted
}

export function paginateEncomendas(items: EncomendaListItem[], page: number, pageSize: number): EncomendaListItem[] {
  const start = (page - 1) * pageSize
  return items.slice(start, start + pageSize)
}
