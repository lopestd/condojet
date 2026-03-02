import type { EncomendaFilter, EncomendaSort } from '../types'

type Props = {
  searchTerm: string
  onSearchTermChange: (value: string) => void
  statusFilter: EncomendaFilter
  onStatusFilterChange: (value: EncomendaFilter) => void
  sortBy: EncomendaSort
  onSortByChange: (value: EncomendaSort) => void
  onCreate: () => void
}

const FILTERS: Array<{ value: EncomendaFilter; label: string }> = [
  { value: 'ALL', label: 'Todas' },
  { value: 'RECEBIDA', label: 'Aguardando' },
  { value: 'DISPONIVEL_RETIRADA', label: 'Notificadas' },
  { value: 'ENTREGUE', label: 'Entregues' },
  { value: 'ESQUECIDA', label: 'Esquecidas' }
]

export function EncomendasFiltersBar({
  searchTerm,
  onSearchTermChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
  onCreate
}: Props): JSX.Element {
  return (
    <section className="encomendas-controls card" aria-label="Filtros de encomendas">
      <div className="encomendas-controls-head">
        <button type="button" className="cta" onClick={onCreate}>
          Nova encomenda
        </button>
      </div>

      <div className="encomendas-search-wrap">
        <label>
          Buscar encomenda
          <input
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            placeholder="Codigo, morador, unidade ou status"
          />
        </label>
      </div>

      <div className="encomendas-filter-actions">
        <div className="encomendas-chip-filters" role="group" aria-label="Filtro por status">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={statusFilter === item.value ? 'chip-filter active' : 'chip-filter'}
              onClick={() => onStatusFilterChange(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="encomendas-sort-wrap">
          <select
            aria-label="Ordenação"
            value={sortBy}
            onChange={(event) => onSortByChange(event.target.value as EncomendaSort)}
          >
            <option value="RECENTES">Mais recentes</option>
            <option value="ANTIGAS">Mais antigas</option>
            <option value="MORADOR_AZ">Morador A-Z</option>
            <option value="MORADOR_ZA">Morador Z-A</option>
          </select>
        </div>
      </div>
    </section>
  )
}
