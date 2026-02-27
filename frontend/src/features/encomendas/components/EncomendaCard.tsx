import type { EncomendaListItem, Endereco } from '../types'
import { formatEnderecoLabel } from '../utils/encomendasSelectors'
import { statusChipLabel, statusClass } from '../utils/statusMapping'

type Props = {
  item: EncomendaListItem
  enderecosById: Map<number, Endereco>
  canVisualizar: boolean
  canEditar: boolean
  canEntregar: boolean
  canReabrir: boolean
  canExcluir: boolean
  onView: () => void
  onEdit: () => void
  onEntregar: () => void
  onReabrir: () => void
  onDelete: () => void
}

export function EncomendaCard({
  item,
  enderecosById,
  canVisualizar,
  canEditar,
  canEntregar,
  canReabrir,
  canExcluir,
  onView,
  onEdit,
  onEntregar,
  onReabrir,
  onDelete
}: Props): JSX.Element {
  const endereco = item.endereco_label ?? (enderecosById.get(item.endereco_id) ? formatEnderecoLabel(enderecosById.get(item.endereco_id) as Endereco) : `Endereco #${item.endereco_id}`)

  return (
    <article
      className="encomenda-card"
      aria-label={`Encomenda ${item.codigo_interno}`}
      onClick={() => {
        if (canVisualizar) onView()
      }}
    >
      <div className="encomenda-card-head">
        <div>
          <p className="encomenda-code">{item.codigo_interno}</p>
          <small>{item.tipo}</small>
        </div>
        <span className={`status-badge ${statusClass(item.status)}`}>{statusChipLabel(item)}</span>
      </div>

      <dl className="encomenda-card-data">
        <div>
          <dt>Morador</dt>
          <dd>{item.morador_nome ?? `Morador #${item.morador_id}`}</dd>
        </div>
        <div>
          <dt>Endereco</dt>
          <dd>{endereco}</dd>
        </div>
        <div>
          <dt>Recebimento</dt>
          <dd>{item.data_recebimento || '-'}</dd>
        </div>
      </dl>

      <div className="action-group encomenda-card-actions">
        <button
          type="button"
          className="icon-action-button icon-action-button-primary"
          onClick={(event) => {
            event.stopPropagation()
            onEdit()
          }}
          title={canEditar ? 'Editar encomenda' : 'Edição indisponível'}
          aria-label={canEditar ? 'Editar encomenda' : 'Edição indisponível'}
          disabled={!canEditar}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 21h6l11-11a2.2 2.2 0 0 0-3.1-3.1L5.9 17.8 3 21Z" />
            <path d="m14 6 4 4" />
          </svg>
        </button>
        <button
          type="button"
          className="icon-action-button icon-action-button-primary"
          onClick={(event) => {
            event.stopPropagation()
            onEntregar()
          }}
          title={canEntregar ? 'Confirmar entrega' : 'Entrega indisponível'}
          aria-label={canEntregar ? 'Confirmar entrega' : 'Entrega indisponível'}
          disabled={!canEntregar}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 7 9 18l-5-5" />
          </svg>
        </button>
        <button
          type="button"
          className="icon-action-button"
          onClick={(event) => {
            event.stopPropagation()
            onReabrir()
          }}
          title={canReabrir ? 'Reabrir encomenda' : 'Reabertura indisponível'}
          aria-label={canReabrir ? 'Reabrir encomenda' : 'Reabertura indisponível'}
          disabled={!canReabrir}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
        <button
          type="button"
          className="icon-action-button"
          onClick={(event) => {
            event.stopPropagation()
            onDelete()
          }}
          title={canExcluir ? 'Excluir encomenda' : 'Exclusão indisponível'}
          aria-label={canExcluir ? 'Excluir encomenda' : 'Exclusão indisponível'}
          disabled={!canExcluir}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M7 6l1 14h8l1-14" />
            <path d="M10 10v7" />
            <path d="M14 10v7" />
          </svg>
        </button>
      </div>
    </article>
  )
}
