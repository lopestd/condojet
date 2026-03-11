import type { EncomendaListItem, Endereco } from '../types'
import { formatEnderecoLabel } from '../utils/encomendasSelectors'
import { statusChipLabel, statusClass } from '../utils/statusMapping'
import { formatDateBR } from '../../../utils/dateTime'

type Props = {
  item: EncomendaListItem
  enderecosById: Map<number, Endereco>
  canVisualizar: boolean
  canEditar: boolean
  canEntregar: boolean
  canReabrir: boolean
  canExcluir: boolean
  forgottenDaysThreshold: number
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
  forgottenDaysThreshold,
  onView,
  onEdit,
  onEntregar,
  onReabrir,
  onDelete
}: Props): JSX.Element {
  const endereco = item.endereco_label ?? (enderecosById.get(item.endereco_id) ? formatEnderecoLabel(enderecosById.get(item.endereco_id) as Endereco) : `Endereço #${item.endereco_id}`)
  const codigoRastreio = item.codigo_externo?.trim() ? item.codigo_externo : '-'
  const empresa = item.empresa_entregadora?.trim() ? item.empresa_entregadora : '-'
  const enderecoData = enderecosById.get(item.endereco_id)

  function buildMobileEnderecoResumo(value: Endereco | undefined, fallback: string): string {
    if (!value) return fallback

    if (value.tipo_condominio_slug === 'HORIZONTAL') {
      const qd = value.tipo_logradouro_nome?.trim() || '-'
      const conj = value.subtipo_logradouro_nome?.trim() || '-'
      const numero = value.numero?.trim() || '-'
      return `Qd. ${qd} | Conj. ${conj} | ${numero}`
    }

    return fallback
  }

  const enderecoResumoMobile = buildMobileEnderecoResumo(enderecoData, endereco)
  const dataEntrada = formatDateBR(item.data_recebimento)
  const dataRetirada = item.data_entrega ? formatDateBR(item.data_entrega) : '-'

  return (
    <article
      className="encomenda-card"
      aria-label={`Encomenda ${codigoRastreio}`}
      onClick={() => {
        if (canVisualizar) onView()
      }}
    >
      <div className="encomenda-card-line encomenda-card-line-top">
        <p className="encomenda-empresa">{empresa}</p>
        <span className={`status-badge ${statusClass(item.status)}`}>{statusChipLabel(item, forgottenDaysThreshold)}</span>
      </div>

      <div className="encomenda-card-line">
        <p className="encomenda-code encomenda-code-highlight">{codigoRastreio}</p>
        <p className="encomenda-tipo">{item.tipo}</p>
      </div>

      <div className="encomenda-card-line">
        <p className="encomenda-morador">{item.morador_nome ?? `Morador #${item.morador_id}`}</p>
        <p className="encomenda-endereco-resumo">{enderecoResumoMobile}</p>
      </div>

      <div className="encomenda-card-line encomenda-card-line-dates">
        <div className="encomenda-data-block">
          <span className="encomenda-data-label">Data_Entrada</span>
          <span className="encomenda-data-value">{dataEntrada}</span>
        </div>
        <div className="encomenda-data-block encomenda-data-block-right">
          <span className="encomenda-data-label">Data_Retirada</span>
          <span className="encomenda-data-value">{dataRetirada}</span>
        </div>
      </div>

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
          title={canReabrir ? 'Reverter entrega' : 'Reversão indisponível'}
          aria-label={canReabrir ? 'Reverter entrega' : 'Reversão indisponível'}
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
