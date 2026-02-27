import { FormEvent, useEffect, useMemo, useState } from 'react';

import { useAuth } from '../../auth/AuthContext';
import { backendApi, readApiError } from '../../services/httpClient';

type EncomendaStatus = 'RECEBIDA' | 'DISPONIVEL_RETIRADA' | 'ENTREGUE';
type EncomendaTipo = 'PACOTE' | 'ENVELOPE' | 'CAIXA';

type EncomendaListItem = {
  id: number;
  condominio_id: number;
  codigo_interno: string;
  status: EncomendaStatus;
  tipo: EncomendaTipo;
  morador_id: number;
  morador_nome?: string | null;
  endereco_id: number;
  endereco_label?: string | null;
};

type EncomendaDetail = EncomendaListItem & {
  codigo_externo?: string | null;
  descricao?: string | null;
  empresa_entregadora?: string | null;
  data_recebimento?: string | null;
  hora_recebimento?: string | null;
  data_entrega?: string | null;
  entregue_por_usuario_id?: number | null;
  retirado_por_nome?: string | null;
  motivo_reabertura?: string | null;
  reaberto_por_usuario_id?: number | null;
  reaberto_em?: string | null;
};

type Morador = {
  id: number;
  nome: string;
  endereco_id: number;
};

type Endereco = {
  id: number;
  tipo_endereco: string;
  quadra: string;
  conjunto?: string | null;
  lote?: string | null;
  setor_chacara?: string | null;
  numero_chacara?: string | null;
};

type EncomendaFormState = {
  tipo: EncomendaTipo;
  morador_id: string;
  endereco_id: string;
  codigo_externo: string;
  descricao: string;
  empresa_entregadora: string;
};

const DEFAULT_PAGE_SIZE = 10;

function buildInitialFormState(): EncomendaFormState {
  return {
    tipo: 'PACOTE',
    morador_id: '',
    endereco_id: '',
    codigo_externo: '',
    descricao: '',
    empresa_entregadora: ''
  };
}

function formatEnderecoLabel(endereco: Endereco): string {
  if (endereco.tipo_endereco === 'QUADRA_SETOR_CHACARA') {
    const comp = endereco.numero_chacara ? `${endereco.setor_chacara ?? '-'} / ${endereco.numero_chacara}` : (endereco.setor_chacara ?? '-');
    return `${endereco.quadra} - ${comp}`;
  }
  const comp = endereco.lote ? `${endereco.conjunto ?? '-'} / ${endereco.lote}` : (endereco.conjunto ?? '-');
  return `${endereco.quadra} - ${comp}`;
}

function statusLabel(status: EncomendaStatus): string {
  if (status === 'RECEBIDA') return 'Recebida';
  if (status === 'DISPONIVEL_RETIRADA') return 'Disponível para retirada';
  return 'Entregue';
}

function statusClass(status: EncomendaStatus): string {
  if (status === 'RECEBIDA') return 'recebida';
  if (status === 'DISPONIVEL_RETIRADA') return 'disponivel';
  return 'entregue';
}

export function OperationPage(): JSX.Element {
  const { user } = useAuth();

  const [items, setItems] = useState<EncomendaListItem[]>([]);
  const [moradores, setMoradores] = useState<Morador[]>([]);
  const [enderecos, setEnderecos] = useState<Endereco[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | EncomendaStatus>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [showFormModal, setShowFormModal] = useState(false);
  const [savingForm, setSavingForm] = useState(false);
  const [form, setForm] = useState<EncomendaFormState>(buildInitialFormState);
  const [selectedEncomendaId, setSelectedEncomendaId] = useState<number | null>(null);

  const [showViewModal, setShowViewModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<EncomendaDetail | null>(null);

  const [showEntregarModal, setShowEntregarModal] = useState(false);
  const [entregaNome, setEntregaNome] = useState('');
  const [savingEntrega, setSavingEntrega] = useState(false);

  const [showReabrirModal, setShowReabrirModal] = useState(false);
  const [motivoReabertura, setMotivoReabertura] = useState('');
  const [savingReabertura, setSavingReabertura] = useState(false);

  const pageSizeStorageKey = useMemo(() => {
    const identity = `${user?.role ?? 'anon'}:${user?.condominioId ?? 'global'}:${user?.nomeUsuario ?? 'anon'}`;
    return `condojet:operacao:page_size:${identity}`;
  }, [user?.role, user?.condominioId, user?.nomeUsuario]);

  useEffect(() => {
    const raw = window.localStorage.getItem(pageSizeStorageKey);
    if (!raw) return;
    const parsed = Number(raw);
    if ([10, 25, 50, 100].includes(parsed)) {
      setPageSize(parsed);
    }
  }, [pageSizeStorageKey]);

  async function loadAll(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const [encomendasResponse, moradoresResponse, enderecosResponse] = await Promise.all([
        backendApi.get<EncomendaListItem[]>('/encomendas'),
        backendApi.get<Morador[]>('/moradores'),
        backendApi.get<Endereco[]>('/enderecos')
      ]);
      setItems(encomendasResponse.data);
      setMoradores(moradoresResponse.data);
      setEnderecos(enderecosResponse.data);
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const enderecosById = useMemo(() => {
    const map = new Map<number, Endereco>();
    enderecos.forEach((endereco) => map.set(endereco.id, endereco));
    return map;
  }, [enderecos]);

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (!term) return true;

      const searchable = [
        String(item.id),
        item.codigo_interno,
        item.status,
        item.tipo,
        item.morador_nome ?? String(item.morador_id),
        item.endereco_label ?? String(item.endereco_id)
      ]
        .join(' ')
        .toLowerCase();
      return searchable.includes(term);
    });
  }, [items, searchTerm, statusFilter]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredItems.length / pageSize)), [filteredItems.length, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const firstRecord = filteredItems.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastRecord = Math.min(filteredItems.length, currentPage * pageSize);
  const totalRecebidas = useMemo(() => items.filter((item) => item.status === 'RECEBIDA').length, [items]);
  const totalDisponiveis = useMemo(
    () => items.filter((item) => item.status === 'DISPONIVEL_RETIRADA').length,
    [items]
  );
  const totalEntregues = useMemo(() => items.filter((item) => item.status === 'ENTREGUE').length, [items]);

  const canReabrir = (item: EncomendaListItem): boolean => user?.role === 'ADMIN' && item.status === 'ENTREGUE';
  const canEntregar = (item: EncomendaListItem): boolean =>
    (user?.role === 'ADMIN' || user?.role === 'PORTEIRO') &&
    (item.status === 'RECEBIDA' || item.status === 'DISPONIVEL_RETIRADA');
  const canEditar = (item: EncomendaListItem): boolean =>
    (user?.role === 'ADMIN' || user?.role === 'PORTEIRO') && (item.status === 'RECEBIDA' || item.status === 'DISPONIVEL_RETIRADA');
  const canVisualizar = (_item: EncomendaListItem): boolean => user?.role === 'ADMIN' || user?.role === 'PORTEIRO';

  async function loadDetail(encomendaId: number): Promise<EncomendaDetail | null> {
    setDetailLoading(true);
    setError(null);
    try {
      const { data } = await backendApi.get<EncomendaDetail>(`/encomendas/${encomendaId}`);
      setDetail(data);
      return data;
    } catch (err) {
      setError(readApiError(err));
      return null;
    } finally {
      setDetailLoading(false);
    }
  }

  function onMoradorChange(nextMoradorId: string): void {
    setForm((previous) => {
      const morador = moradores.find((item) => item.id === Number(nextMoradorId));
      return {
        ...previous,
        morador_id: nextMoradorId,
        endereco_id: morador ? String(morador.endereco_id) : previous.endereco_id
      };
    });
  }

  function openCreateModal(): void {
    setError(null);
    setFeedback(null);
    setFormMode('create');
    setSelectedEncomendaId(null);
    setForm(buildInitialFormState());
    setShowFormModal(true);
  }

  async function openEditModal(item: EncomendaListItem): Promise<void> {
    setError(null);
    setFeedback(null);
    setFormMode('edit');
    setSelectedEncomendaId(item.id);
    const loadedDetail = await loadDetail(item.id);
    if (!loadedDetail) return;

    setForm({
      tipo: loadedDetail.tipo,
      morador_id: String(loadedDetail.morador_id),
      endereco_id: String(loadedDetail.endereco_id),
      codigo_externo: loadedDetail.codigo_externo ?? '',
      descricao: loadedDetail.descricao ?? '',
      empresa_entregadora: loadedDetail.empresa_entregadora ?? ''
    });
    setShowFormModal(true);
  }

  function closeFormModal(): void {
    setShowFormModal(false);
    setSavingForm(false);
    setSelectedEncomendaId(null);
    setForm(buildInitialFormState());
  }

  async function onSaveForm(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setFeedback(null);

    setSavingForm(true);
    try {
      const payload = {
        tipo: form.tipo,
        morador_id: Number(form.morador_id),
        endereco_id: Number(form.endereco_id),
        codigo_externo: form.codigo_externo.trim() || undefined,
        descricao: form.descricao.trim() || undefined,
        empresa_entregadora: form.empresa_entregadora.trim() || undefined
      };

      if (formMode === 'create') {
        await backendApi.post('/encomendas', payload);
        setFeedback('Encomenda registrada com sucesso.');
      } else if (selectedEncomendaId) {
        await backendApi.put(`/encomendas/${selectedEncomendaId}`, payload);
        setFeedback('Encomenda atualizada com sucesso.');
      }

      await loadAll();
      closeFormModal();
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setSavingForm(false);
    }
  }

  async function openViewModal(item: EncomendaListItem): Promise<void> {
    setError(null);
    setFeedback(null);
    const loadedDetail = await loadDetail(item.id);
    if (!loadedDetail) return;
    setShowViewModal(true);
  }

  function openEntregarModal(item: EncomendaListItem): void {
    setSelectedEncomendaId(item.id);
    setEntregaNome('');
    setShowEntregarModal(true);
  }

  async function onConfirmEntrega(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!selectedEncomendaId) return;
    setSavingEntrega(true);
    setError(null);
    setFeedback(null);
    try {
      await backendApi.put(`/encomendas/${selectedEncomendaId}/entregar`, { retirado_por_nome: entregaNome });
      setFeedback('Encomenda entregue com sucesso.');
      setShowEntregarModal(false);
      setSelectedEncomendaId(null);
      setEntregaNome('');
      await loadAll();
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setSavingEntrega(false);
    }
  }

  function openReabrirModal(item: EncomendaListItem): void {
    setSelectedEncomendaId(item.id);
    setMotivoReabertura('');
    setShowReabrirModal(true);
  }

  async function onConfirmReabrir(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!selectedEncomendaId) return;
    setSavingReabertura(true);
    setError(null);
    setFeedback(null);
    try {
      await backendApi.put(`/encomendas/${selectedEncomendaId}/reabrir`, { motivo_reabertura: motivoReabertura });
      setFeedback('Encomenda reaberta com sucesso.');
      setShowReabrirModal(false);
      setSelectedEncomendaId(null);
      setMotivoReabertura('');
      await loadAll();
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setSavingReabertura(false);
    }
  }

  return (
    <section className="page-grid operation-page encomendas-page">
      <header className="page-header">
        <div>
          <h1>Encomendas</h1>
          <p>Central operacional para recebimento, acompanhamento, entrega e reabertura de encomendas.</p>
        </div>
        <div className="action-group">
          <button type="button" className="button-soft" onClick={() => void loadAll()}>
            Atualizar
          </button>
          <button type="button" className="cta" onClick={openCreateModal}>
            Nova encomenda
          </button>
        </div>
      </header>

      {error ? <p className="error-box">{error}</p> : null}
      {feedback ? <p className="info-box">{feedback}</p> : null}
      {loading ? <p className="info-box">Carregando dados...</p> : null}

      <section className="global-kpis">
        <article className="kpi-card">
          <span>Recebidas</span>
          <strong>{totalRecebidas}</strong>
        </article>
        <article className="kpi-card">
          <span>Disponiveis para retirada</span>
          <strong>{totalDisponiveis}</strong>
        </article>
        <article className="kpi-card">
          <span>Entregues</span>
          <strong>{totalEntregues}</strong>
        </article>
      </section>

      <article className="card section-card">
        <h2>Fila de encomendas</h2>

        <div className="list-filters">
          <label>
            Buscar encomenda
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Codigo, status, tipo, morador, endereco ou ID"
            />
          </label>
          <label>
            Status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'ALL' | EncomendaStatus)}>
              <option value="ALL">Todos</option>
              <option value="RECEBIDA">Recebida</option>
              <option value="DISPONIVEL_RETIRADA">Disponível para retirada</option>
              <option value="ENTREGUE">Entregue</option>
            </select>
          </label>
        </div>

        <div className="list-toolbar">
          <p className="table-meta">{`Exibindo ${firstRecord}-${lastRecord} de ${filteredItems.length}`}</p>
        </div>

        <div className="table-wrap">
          <table className="operation-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Código interno</th>
                <th>Status</th>
                <th>Tipo</th>
                <th>Morador</th>
                <th>Endereço</th>
                <th className="actions-col">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.codigo_interno}</td>
                  <td>
                    <span className={`status-badge ${statusClass(item.status)}`}>{statusLabel(item.status)}</span>
                  </td>
                  <td>{item.tipo}</td>
                  <td>{item.morador_nome ?? `Morador #${item.morador_id}`}</td>
                  <td>
                    {item.endereco_label ?? (enderecosById.get(item.endereco_id) ? formatEnderecoLabel(enderecosById.get(item.endereco_id) as Endereco) : `Endereço #${item.endereco_id}`)}
                  </td>
                  <td className="actions-cell">
                    <div className="action-group action-group-icons operation-actions">
                      {canVisualizar(item) ? (
                        <button type="button" className="button-soft small" onClick={() => void openViewModal(item)}>
                          Ver
                        </button>
                      ) : null}
                      {canEditar(item) ? (
                        <button type="button" className="button-soft small" onClick={() => void openEditModal(item)}>
                          Editar
                        </button>
                      ) : null}
                      {canEntregar(item) ? (
                        <button type="button" className="cta small" onClick={() => openEntregarModal(item)}>
                          Entregar
                        </button>
                      ) : null}
                      {canReabrir(item) ? (
                        <button type="button" className="button-warning" onClick={() => openReabrirModal(item)}>
                          Reverter
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={7}>Nenhuma encomenda encontrada com os filtros aplicados.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="list-pagination">
          <label className="pagination-page-size">
            Registros por página
            <select
              value={pageSize}
              onChange={(event) => {
                const nextSize = Number(event.target.value);
                setPageSize(nextSize);
                setCurrentPage(1);
                window.localStorage.setItem(pageSizeStorageKey, String(nextSize));
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
              onClick={() => setCurrentPage((v) => Math.max(1, v - 1))}
            >
              Anterior
            </button>
            <span>{`Página ${currentPage} de ${totalPages}`}</span>
            <button
              type="button"
              className="button-soft"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((v) => Math.min(totalPages, v + 1))}
            >
              Próxima
            </button>
          </div>
        </div>
      </article>

      {showFormModal ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card morador-modal">
            <h3>{formMode === 'create' ? 'Nova encomenda' : 'Editar encomenda'}</h3>
            <form className="form-grid" onSubmit={(event) => void onSaveForm(event)}>
              <label>
                Tipo
                <select value={form.tipo} onChange={(event) => setForm((prev) => ({ ...prev, tipo: event.target.value as EncomendaTipo }))}>
                  <option value="PACOTE">PACOTE</option>
                  <option value="ENVELOPE">ENVELOPE</option>
                  <option value="CAIXA">CAIXA</option>
                </select>
              </label>

              <label>
                Morador
                <select value={form.morador_id} onChange={(event) => onMoradorChange(event.target.value)} required>
                  <option value="">Selecione</option>
                  {moradores.map((morador) => (
                    <option key={morador.id} value={morador.id}>
                      {`#${morador.id} - ${morador.nome}`}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Endereço
                <select
                  value={form.endereco_id}
                  onChange={(event) => setForm((prev) => ({ ...prev, endereco_id: event.target.value }))}
                  required
                >
                  <option value="">Selecione</option>
                  {enderecos.map((endereco) => (
                    <option key={endereco.id} value={endereco.id}>
                      {`#${endereco.id} - ${formatEnderecoLabel(endereco)}`}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Código externo
                <input
                  value={form.codigo_externo}
                  onChange={(event) => setForm((prev) => ({ ...prev, codigo_externo: event.target.value }))}
                />
              </label>

              <label>
                Empresa entregadora
                <input
                  value={form.empresa_entregadora}
                  onChange={(event) => setForm((prev) => ({ ...prev, empresa_entregadora: event.target.value }))}
                />
              </label>

              <label>
                Descrição
                <textarea value={form.descricao} onChange={(event) => setForm((prev) => ({ ...prev, descricao: event.target.value }))} rows={3} />
              </label>

              <div className="modal-actions">
                <button type="button" className="button-soft" onClick={closeFormModal} disabled={savingForm}>
                  Cancelar
                </button>
                <button type="submit" className="cta" disabled={savingForm}>
                  {savingForm ? 'Salvando...' : formMode === 'create' ? 'Cadastrar encomenda' : 'Salvar alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showViewModal ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card morador-modal">
            <h3>Detalhes da encomenda</h3>
            {detailLoading ? <p className="info-box">Carregando detalhes...</p> : null}
            {detail ? (
              <div className="detail-content">
                <div className="summary-grid">
                  <div className="summary-card">
                    <span>ID</span>
                    <strong>{detail.id}</strong>
                  </div>
                  <div className="summary-card">
                    <span>Código interno</span>
                    <strong>{detail.codigo_interno}</strong>
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
                  <div className="summary-card">
                    <span>Endereço</span>
                    <strong>{detail.endereco_label ?? `Endereço #${detail.endereco_id}`}</strong>
                  </div>
                </div>

                <div className="modal-data operation-modal-data">
                  <p><strong>Código externo:</strong> {detail.codigo_externo || '-'}</p>
                  <p><strong>Empresa entregadora:</strong> {detail.empresa_entregadora || '-'}</p>
                  <p><strong>Descrição:</strong> {detail.descricao || '-'}</p>
                  <p><strong>Recebimento:</strong> {detail.data_recebimento || '-'} {detail.hora_recebimento || ''}</p>
                  <p><strong>Data de entrega:</strong> {detail.data_entrega || '-'}</p>
                  <p><strong>Retirado por:</strong> {detail.retirado_por_nome || '-'}</p>
                  <p><strong>Motivo de reabertura:</strong> {detail.motivo_reabertura || '-'}</p>
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
                    setShowEntregarModal(false);
                    setEntregaNome('');
                    setSelectedEncomendaId(null);
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
            <h3>Reverter para disponível</h3>
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
                    setShowReabrirModal(false);
                    setMotivoReabertura('');
                    setSelectedEncomendaId(null);
                  }}
                  disabled={savingReabertura}
                >
                  Cancelar
                </button>
                <button type="submit" className="button-warning" disabled={savingReabertura}>
                  {savingReabertura ? 'Processando...' : 'Confirmar reversão'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
