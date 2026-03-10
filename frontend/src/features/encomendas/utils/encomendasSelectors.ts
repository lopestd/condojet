import type { EncomendaFilter, EncomendaListItem, EncomendaSort, Endereco } from '../types'
import { isForgotten } from './statusMapping'
import { parseApiDate } from '../../../utils/dateTime'

export function formatEnderecoLabel(endereco: Endereco): string {
  if (endereco.endereco_label && endereco.endereco_label.trim()) {
    return endereco.endereco_label
  }

  if (endereco.tipo_condominio_slug === 'PREDIO_CONJUNTO') {
    const bloco = endereco.bloco ?? '-'
    const andar = endereco.andar ?? '-'
    const apartamento = endereco.apartamento ?? '-'
    return `${bloco} / ${andar} / ${apartamento}`
  }

  if (endereco.tipo_condominio_slug === 'HORIZONTAL') {
    const tipoValor = endereco.tipo_logradouro_nome ?? '-'
    const subtipoValor = endereco.subtipo_logradouro_nome ?? '-'
    const numeroValor = endereco.numero ?? '-'
    return `${tipoValor} / ${subtipoValor} / ${numeroValor}`
  }

  if (endereco.tipo_endereco === 'QUADRA_SETOR_CHACARA') {
    const comp = endereco.numero_chacara
      ? `${endereco.setor_chacara ?? '-'} / ${endereco.numero_chacara}`
      : (endereco.setor_chacara ?? '-')
    return `${endereco.quadra ?? '-'} - ${comp}`
  }
  const comp = endereco.lote ? `${endereco.conjunto ?? '-'} / ${endereco.lote}` : (endereco.conjunto ?? '-')
  return `${endereco.quadra ?? '-'} - ${comp}`
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

export function filterEncomendas(
  items: EncomendaListItem[],
  searchTerm: string,
  status: EncomendaFilter,
  forgottenDaysThreshold: number
): EncomendaListItem[] {
  const term = searchTerm.trim().toLowerCase()
  return items.filter((item) => {
    if (status === 'ESQUECIDA' && !isForgotten(item, forgottenDaysThreshold)) return false
    if (status === 'RECEBIDA' && item.status !== 'RECEBIDA' && item.status !== 'DISPONIVEL_RETIRADA') return false
    if (status !== 'ALL' && status !== 'ESQUECIDA' && status !== 'RECEBIDA' && item.status !== status) return false
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
