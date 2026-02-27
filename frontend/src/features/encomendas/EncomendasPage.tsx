import { FormEvent, useEffect, useMemo, useState } from 'react'

import { useAuth } from '../../auth/AuthContext'
import { backendApi, readApiError } from '../../services/httpClient'
import { EncomendaCard } from './components/EncomendaCard'
import { EncomendaDetailsTimeline } from './components/EncomendaDetailsTimeline'
import { EncomendasEmptyState } from './components/EncomendasEmptyState'
import { EncomendasFiltersBar } from './components/EncomendasFiltersBar'
import { NewEncomendaWizardModal } from './components/NewEncomendaWizardModal'
import type {
  EncomendaDetail,
  EncomendaFilter,
  EncomendaFormState,
  EncomendaListItem,
  EncomendaSort,
  EncomendaStatus,
  Endereco,
  Morador
} from './types'
import { filterEncomendas, paginateEncomendas, sortEncomendas } from './utils/encomendasSelectors'
import { statusClass, statusLabel } from './utils/statusMapping'

const DEFAULT_PAGE_SIZE = 10
const MOBILE_BREAKPOINT = 900

function buildInitialFormState(): EncomendaFormState {
  return {
    tipo: 'PACOTE',
    morador_id: '',
    endereco_id: '',
    codigo_externo: '',
    descricao: '',
    empresa_entregadora: ''
  }
}

function getEnderecoParts(endereco: Endereco | undefined): {
  quadra: string
  secondLabel: string
  secondValue: string
  thirdLabel: string
  thirdValue: string
} {
  if (!endereco) {
    return {
      quadra: '-',
      secondLabel: 'Conjunto',
      secondValue: '-',
      thirdLabel: 'Lote',
      thirdValue: '-'
    }
  }
  if (endereco.tipo_endereco === 'QUADRA_SETOR_CHACARA') {
    return {
      quadra: endereco.quadra || '-',
      secondLabel: 'Setor/Chácara',
      secondValue: endereco.setor_chacara || '-',
      thirdLabel: 'Número Chácara',
      thirdValue: endereco.numero_chacara || '-'
    }
  }
  return {
    quadra: endereco.quadra || '-',
    secondLabel: 'Conjunto',
    secondValue: endereco.conjunto || '-',
    thirdLabel: 'Lote',
    thirdValue: endereco.lote || '-'
  }
}

function formatDateBR(value?: string | null): string {
  if (!value) return '-'
  const raw = value.trim()
  if (!raw) return '-'
  const simpleDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw)
  if (simpleDate) {
    return `${simpleDate[3]}/${simpleDate[2]}/${simpleDate[1]}`
  }
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('pt-BR')
}

export function EncomendasPage(): JSX.Element {
  const { user } = useAuth()

  const [items, setItems] = useState<EncomendaListItem[]>([])
  const [moradores, setMoradores] = useState<Morador[]>([])
  const [enderecos, setEnderecos] = useState<Endereco[]>([])

  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [rawSearchTerm, setRawSearchTerm] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<EncomendaFilter>('ALL')
  const [sortBy, setSortBy] = useState<EncomendaSort>('RECENTES')
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window === 'undefined' ? 1280 : window.innerWidth
  )

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [showFormModal, setShowFormModal] = useState(false)
  const [savingForm, setSavingForm] = useState(false)
  const [form, setForm] = useState<EncomendaFormState>(buildInitialFormState)
  const [selectedEncomendaId, setSelectedEncomendaId] = useState<number | null>(null)

  const [showViewModal, setShowViewModal] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState<EncomendaDetail | null>(null)

  const [showEntregarModal, setShowEntregarModal] = useState(false)
  const [entregaNome, setEntregaNome] = useState('')
  const [savingEntrega, setSavingEntrega] = useState(false)

  const [showReabrirModal, setShowReabrirModal] = useState(false)
  const [motivoReabertura, setMotivoReabertura] = useState('')
  const [savingReabertura, setSavingReabertura] = useState(false)
  const [showExcluirModal, setShowExcluirModal] = useState(false)
  const [savingExclusao, setSavingExclusao] = useState(false)

  const pageSizeStorageKey = useMemo(() => {
    const identity = `${user?.role ?? 'anon'}:${user?.condominioId ?? 'global'}:${user?.nomeUsuario ?? 'anon'}`
    return `condojet:encomendas:page_size:${identity}`
  }, [user?.role, user?.condominioId, user?.nomeUsuario])

  useEffect(() => {
    const handle = window.setTimeout(() => setSearchTerm(rawSearchTerm), 250)
    return () => window.clearTimeout(handle)
  }, [rawSearchTerm])

  useEffect(() => {
    function onResize(): void {
      setViewportWidth(window.innerWidth)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    const raw = window.localStorage.getItem(pageSizeStorageKey)
    if (!raw) return
    const parsed = Number(raw)
    if ([10, 25, 50, 100].includes(parsed)) {
      setPageSize(parsed)
    }
  }, [pageSizeStorageKey])

  async function loadAll(): Promise<void> {
    setLoading(true)
    setError(null)
    try {
      const [encomendasResponse, moradoresResponse, enderecosResponse] = await Promise.all([
        backendApi.get<EncomendaListItem[]>('/encomendas'),
        backendApi.get<Morador[]>('/moradores'),
        backendApi.get<Endereco[]>('/enderecos')
      ])
      setItems(encomendasResponse.data)
      setMoradores(moradoresResponse.data)
      setEnderecos(enderecosResponse.data)
    } catch (err) {
      setError(readApiError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAll()
  }, [])

  const enderecosById = useMemo(() => {
    const map = new Map<number, Endereco>()
    enderecos.forEach((endereco) => map.set(endereco.id, endereco))
    return map
  }, [enderecos])

  const filteredAndSortedItems = useMemo(() => {
    const filtered = filterEncomendas(items, searchTerm, statusFilter)
    return sortEncomendas(filtered, sortBy)
  }, [items, searchTerm, statusFilter, sortBy])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredAndSortedItems.length / pageSize)), [filteredAndSortedItems.length, pageSize])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, sortBy, pageSize])

  const paginatedItems = useMemo(
    () => paginateEncomendas(filteredAndSortedItems, currentPage, pageSize),
    [filteredAndSortedItems, currentPage, pageSize]
  )

  const canReabrir = (item: EncomendaListItem): boolean => user?.role === 'ADMIN' && item.status === 'ENTREGUE'
  const canEntregar = (item: EncomendaListItem): boolean =>
    (user?.role === 'ADMIN' || user?.role === 'PORTEIRO') &&
    (item.status === 'RECEBIDA' || item.status === 'DISPONIVEL_RETIRADA')
  const canEditar = (item: EncomendaListItem): boolean =>
    (user?.role === 'ADMIN' || user?.role === 'PORTEIRO') &&
    (item.status === 'RECEBIDA' || item.status === 'DISPONIVEL_RETIRADA')
  const canVisualizar = (_item: EncomendaListItem): boolean => user?.role === 'ADMIN' || user?.role === 'PORTEIRO'
  const canExcluir = (item: EncomendaListItem): boolean => user?.role === 'ADMIN' && item.status !== 'ENTREGUE'

  async function loadDetail(encomendaId: number): Promise<EncomendaDetail | null> {
    setDetailLoading(true)
    setError(null)
    try {
      const { data } = await backendApi.get<EncomendaDetail>(`/encomendas/${encomendaId}`)
      setDetail(data)
      return data
    } catch (err) {
      setError(readApiError(err))
      return null
    } finally {
      setDetailLoading(false)
    }
  }

  function openCreateModal(): void {
    setError(null)
    setFeedback(null)
    setFormMode('create')
    setSelectedEncomendaId(null)
    setForm(buildInitialFormState())
    setShowFormModal(true)
  }

  async function openEditModal(item: EncomendaListItem): Promise<void> {
    setError(null)
    setFeedback(null)
    setFormMode('edit')
    setSelectedEncomendaId(item.id)
    const loadedDetail = await loadDetail(item.id)
    if (!loadedDetail) return

    setForm({
      tipo: loadedDetail.tipo,
      morador_id: String(loadedDetail.morador_id),
      endereco_id: String(loadedDetail.endereco_id),
      codigo_externo: loadedDetail.codigo_externo ?? '',
      descricao: loadedDetail.descricao ?? '',
      empresa_entregadora: loadedDetail.empresa_entregadora ?? ''
    })
    setShowFormModal(true)
  }

  function closeFormModal(): void {
    setShowFormModal(false)
    setSavingForm(false)
    setSelectedEncomendaId(null)
    setForm(buildInitialFormState())
  }

  async function onSaveForm(event: FormEvent): Promise<void> {
    event.preventDefault()
    setError(null)
    setFeedback(null)

    if (!form.codigo_externo.trim() || !form.empresa_entregadora.trim()) {
      setError('Código de Rastreio e Empresa responsável são obrigatórios para registrar a encomenda.')
      return
    }

    setSavingForm(true)
    try {
      const payload = {
        tipo: form.tipo,
        morador_id: Number(form.morador_id),
        endereco_id: Number(form.endereco_id),
        codigo_externo: form.codigo_externo.trim() || undefined,
        descricao: form.descricao.trim() || undefined,
        empresa_entregadora: form.empresa_entregadora.trim() || undefined
      }

      if (formMode === 'create') {
        await backendApi.post('/encomendas', payload)
        setFeedback('Encomenda registrada com sucesso.')
      } else if (selectedEncomendaId) {
        await backendApi.put(`/encomendas/${selectedEncomendaId}`, payload)
        setFeedback('Encomenda atualizada com sucesso.')
      }

      await loadAll()
      closeFormModal()
    } catch (err) {
      setError(readApiError(err))
    } finally {
      setSavingForm(false)
    }
  }

  async function openViewModal(item: EncomendaListItem): Promise<void> {
    setError(null)
    setFeedback(null)
    const loadedDetail = await loadDetail(item.id)
    if (!loadedDetail) return
    setShowViewModal(true)
  }

  function openEntregarModal(item: EncomendaListItem): void {
    setSelectedEncomendaId(item.id)
    setEntregaNome('')
    setShowEntregarModal(true)
  }

  async function onConfirmEntrega(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!selectedEncomendaId) return
    setSavingEntrega(true)
    setError(null)
    setFeedback(null)
    try {
      await backendApi.put(`/encomendas/${selectedEncomendaId}/entregar`, { retirado_por_nome: entregaNome })
      setFeedback('Encomenda entregue com sucesso.')
      setShowEntregarModal(false)
      setSelectedEncomendaId(null)
      setEntregaNome('')
      await loadAll()
    } catch (err) {
      setError(readApiError(err))
    } finally {
      setSavingEntrega(false)
    }
  }

  function openReabrirModal(item: EncomendaListItem): void {
    setSelectedEncomendaId(item.id)
    setMotivoReabertura('')
    setShowReabrirModal(true)
  }

  async function onConfirmReabrir(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!selectedEncomendaId) return
    setSavingReabertura(true)
    setError(null)
    setFeedback(null)
    try {
      await backendApi.put(`/encomendas/${selectedEncomendaId}/reabrir`, { motivo_reabertura: motivoReabertura })
      setFeedback('Encomenda reaberta com sucesso.')
      setShowReabrirModal(false)
      setSelectedEncomendaId(null)
      setMotivoReabertura('')
      await loadAll()
    } catch (err) {
      setError(readApiError(err))
    } finally {
      setSavingReabertura(false)
    }
  }

  function openExcluirModal(item: EncomendaListItem): void {
    setSelectedEncomendaId(item.id)
    setShowExcluirModal(true)
  }

  async function onConfirmExcluir(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!selectedEncomendaId) return
    setSavingExclusao(true)
    setError(null)
    setFeedback(null)
    try {
      await backendApi.delete(`/encomendas/${selectedEncomendaId}`)
      setFeedback('Encomenda excluída com sucesso.')
      setShowExcluirModal(false)
      setSelectedEncomendaId(null)
      await loadAll()
    } catch (err) {
      setError(readApiError(err))
    } finally {
      setSavingExclusao(false)
    }
  }

  const hasFilters = Boolean(searchTerm || statusFilter !== 'ALL')
  const isMobileView = viewportWidth < MOBILE_BREAKPOINT

  return (
    <section className="page-grid operation-page encomendas-page">
      {error ? <p className="error-box">{error}</p> : null}
      {feedback ? <p className="info-box">{feedback}</p> : null}

      <EncomendasFiltersBar
        searchTerm={rawSearchTerm}
        onSearchTermChange={setRawSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        onCreate={openCreateModal}
      />

      <article className="card section-card">
        {loading ? (
          <div className="encomendas-skeleton-grid" aria-hidden="true">
            <div className="encomendas-skeleton-card" />
            <div className="encomendas-skeleton-card" />
            <div className="encomendas-skeleton-card" />
          </div>
        ) : null}

        {!loading && filteredAndSortedItems.length === 0 ? <EncomendasEmptyState hasFilters={hasFilters} onCreate={openCreateModal} /> : null}

        {!loading && filteredAndSortedItems.length > 0 && isMobileView ? (
          <section className="encomendas-cards-grid">
            {paginatedItems.map((item) => (
              <EncomendaCard
                key={item.id}
                item={item}
                enderecosById={enderecosById}
                canVisualizar={canVisualizar(item)}
                canEditar={canEditar(item)}
                canEntregar={canEntregar(item)}
                canReabrir={canReabrir(item)}
                canExcluir={canExcluir(item)}
                onView={() => void openViewModal(item)}
                onEdit={() => void openEditModal(item)}
                onEntregar={() => openEntregarModal(item)}
                onReabrir={() => openReabrirModal(item)}
                onDelete={() => openExcluirModal(item)}
              />
            ))}
          </section>
        ) : null}

        {!loading && filteredAndSortedItems.length > 0 && !isMobileView ? (
          <div className="table-wrap">
            <table className="operation-table">
              <thead>
                <tr>
                  <th>Data Rec</th>
                  <th>Morador</th>
                  <th>Endereco</th>
                  <th>Tipo</th>
                  <th>Data Entrega</th>
                  <th>Status</th>
                  <th className="actions-col">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((item) => (
                  <tr
                    key={item.id}
                    className={canVisualizar(item) ? 'row-openable' : undefined}
                    onClick={() => {
                      if (canVisualizar(item)) void openViewModal(item)
                    }}
                  >
                    <td>{formatDateBR(item.data_recebimento)}</td>
                    <td>{item.morador_nome ?? `Morador #${item.morador_id}`}</td>
                    <td>
                      {(() => {
                        const endereco = enderecosById.get(item.endereco_id)
                        const parts = getEnderecoParts(endereco)
                        return (
                          <div className="address-stack">
                            <p><strong>Quadra:</strong> {parts.quadra}</p>
                            <p><strong>{parts.secondLabel}:</strong> {parts.secondValue}</p>
                            <p><strong>{parts.thirdLabel}:</strong> {parts.thirdValue}</p>
                          </div>
                        )
                      })()}
                    </td>
                    <td>
                      <div className="morador-stack">
                        <span>{item.tipo}</span>
                        <span className="rastreio-pill">{item.codigo_externo || '-'}</span>
                      </div>
                    </td>
                    <td>{item.data_entrega ? formatDateBR(item.data_entrega) : '-'}</td>
                    <td>
                      <span className={`status-badge ${statusClass(item.status)}`}>{statusLabel(item.status)}</span>
                    </td>
                    <td className="actions-cell">
                      <div className="action-group action-group-icons operation-actions">
                        <button
                          type="button"
                          className="icon-action-button icon-action-button-primary"
                          onClick={(event) => {
                            event.stopPropagation()
                            void openEditModal(item)
                          }}
                          title={canEditar(item) ? 'Editar encomenda' : 'Edição indisponível'}
                          aria-label={canEditar(item) ? 'Editar encomenda' : 'Edição indisponível'}
                          disabled={!canEditar(item)}
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
                            openEntregarModal(item)
                          }}
                          title={canEntregar(item) ? 'Confirmar entrega' : 'Entrega indisponível'}
                          aria-label={canEntregar(item) ? 'Confirmar entrega' : 'Entrega indisponível'}
                          disabled={!canEntregar(item)}
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
                            openReabrirModal(item)
                          }}
                          title={canReabrir(item) ? 'Reabrir encomenda' : 'Reabertura indisponível'}
                          aria-label={canReabrir(item) ? 'Reabrir encomenda' : 'Reabertura indisponível'}
                          disabled={!canReabrir(item)}
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
                            openExcluirModal(item)
                          }}
                          title={canExcluir(item) ? 'Excluir encomenda' : 'Exclusão indisponível'}
                          aria-label={canExcluir(item) ? 'Excluir encomenda' : 'Exclusão indisponível'}
                          disabled={!canExcluir(item)}
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {filteredAndSortedItems.length > 0 ? (
          <div className="list-pagination">
            <label className="pagination-page-size">
              Registros por pagina
              <select
                value={pageSize}
                onChange={(event) => {
                  const nextSize = Number(event.target.value)
                  setPageSize(nextSize)
                  setCurrentPage(1)
                  window.localStorage.setItem(pageSizeStorageKey, String(nextSize))
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>

            <div className="pagination-nav">
              <button
                type="button"
                className="button-soft"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
              >
                Anterior
              </button>
              <span>{`Pagina ${currentPage} de ${totalPages}`}</span>
              <button
                type="button"
                className="button-soft"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))}
              >
                Proxima
              </button>
            </div>
          </div>
        ) : null}
      </article>

      {showFormModal ? (
        <NewEncomendaWizardModal
          mode={formMode}
          form={form}
          setForm={setForm}
          moradores={moradores}
          enderecos={enderecos}
          loading={savingForm}
          onClose={closeFormModal}
          onSubmit={onSaveForm}
        />
      ) : null}

      {showViewModal ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card morador-modal encomenda-detalhe-modal">
            <h3>Detalhes da encomenda</h3>
            {detailLoading ? <p className="info-box">Carregando detalhes...</p> : null}
            {detail ? (
              <div className="detail-content">
                <div className="summary-grid">
                  <div className="summary-card">
                    <span>Código de Rastreio</span>
                    <strong>{detail.codigo_externo || '-'}</strong>
                  </div>
                  <div className="summary-card">
                    <span>Status</span>
                    <strong>{statusLabel(detail.status)}</strong>
                  </div>
                  <div className="summary-card">
                    <span>Tipo</span>
                    <strong>{detail.tipo}</strong>
                  </div>
                  <div className="summary-card">
                    <span>Morador</span>
                    <strong>{detail.morador_nome ?? `Morador #${detail.morador_id}`}</strong>
                  </div>
                </div>

                <div className="encomenda-detalhe-grid">
                  <div className="modal-data operation-modal-data">
                    <p><strong>Empresa responsável:</strong> {detail.empresa_entregadora || '-'}</p>
                    <p><strong>Descrição:</strong> {detail.descricao || '-'}</p>
                    <p><strong>Recebimento:</strong> {detail.data_recebimento || '-'} {detail.hora_recebimento || ''}</p>
                    <p><strong>Data de entrega:</strong> {detail.data_entrega || '-'}</p>
                    <p><strong>Retirado por:</strong> {detail.retirado_por_nome || '-'}</p>
                    <p><strong>Motivo de reabertura:</strong> {detail.motivo_reabertura || '-'}</p>
                  </div>
                  <section className="encomenda-timeline-panel">
                    <h4>Linha do tempo</h4>
                    <EncomendaDetailsTimeline detail={detail} />
                  </section>
                </div>
              </div>
            ) : null}
            <div className="modal-actions">
              <button type="button" className="button-soft" onClick={() => setShowViewModal(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showEntregarModal ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h3>Confirmar entrega</h3>
            <form className="form-grid" onSubmit={(event) => void onConfirmEntrega(event)}>
              <label>
                Retirado por
                <input value={entregaNome} onChange={(event) => setEntregaNome(event.target.value)} required />
              </label>
              <div className="modal-actions">
                <button
                  type="button"
                  className="button-soft"
                  onClick={() => {
                    setShowEntregarModal(false)
                    setEntregaNome('')
                    setSelectedEncomendaId(null)
                  }}
                  disabled={savingEntrega}
                >
                  Cancelar
                </button>
                <button type="submit" className="cta" disabled={savingEntrega}>
                  {savingEntrega ? 'Processando...' : 'Confirmar entrega'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showReabrirModal ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h3>Reabrir encomenda</h3>
            <form className="form-grid" onSubmit={(event) => void onConfirmReabrir(event)}>
              <label>
                Motivo da reabertura
                <textarea value={motivoReabertura} onChange={(event) => setMotivoReabertura(event.target.value)} rows={3} required />
              </label>
              <div className="modal-actions">
                <button
                  type="button"
                  className="button-soft"
                  onClick={() => {
                    setShowReabrirModal(false)
                    setMotivoReabertura('')
                    setSelectedEncomendaId(null)
                  }}
                  disabled={savingReabertura}
                >
                  Cancelar
                </button>
                <button type="submit" className="button-warning" disabled={savingReabertura}>
                  {savingReabertura ? 'Processando...' : 'Confirmar reabertura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showExcluirModal ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h3>Excluir encomenda</h3>
            <form className="form-grid" onSubmit={(event) => void onConfirmExcluir(event)}>
              <p className="status-text-warn">
                Esta ação removerá a encomenda permanentemente. Deseja continuar?
              </p>
              <div className="modal-actions">
                <button
                  type="button"
                  className="button-soft"
                  onClick={() => {
                    setShowExcluirModal(false)
                    setSelectedEncomendaId(null)
                  }}
                  disabled={savingExclusao}
                >
                  Cancelar
                </button>
                <button type="submit" className="button-warning" disabled={savingExclusao}>
                  {savingExclusao ? 'Excluindo...' : 'Confirmar exclusão'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  )
}
