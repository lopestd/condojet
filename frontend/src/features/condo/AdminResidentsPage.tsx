import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';

import { useAuth } from '../../auth/AuthContext';
import { backendApi, readApiError } from '../../services/httpClient';

type Endereco = {
  id: number;
  tipo_endereco: string;
  quadra: string;
  conjunto?: string | null;
  lote?: string | null;
  setor_chacara?: string | null;
  numero_chacara?: string | null;
};

type Morador = {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  endereco_id: number;
  ativo: boolean;
};

type MoradorFormState = {
  nome: string;
  email: string;
  telefone1: string;
  telefone2: string;
  enderecoId: string;
  senha: string;
  ativo: boolean;
};

const DEFAULT_PAGE_SIZE = 10;

function parsePhoneList(raw: string): string[] {
  return raw
    .split(/\||,|;/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function buildPhoneStorageValue(values: string[]): string {
  return values.map((item) => item.trim()).filter(Boolean).join(' | ');
}

function formatEnderecoLabel(endereco: Endereco): string {
  const complemento = endereco.conjunto
    ? `${endereco.conjunto}/${endereco.lote}`
    : `${endereco.setor_chacara ?? '-'}${endereco.numero_chacara ? `/${endereco.numero_chacara}` : ''}`;
  return `${endereco.quadra} - ${complemento}`;
}

function formatEnderecoField(value: string | null | undefined): string {
  return value && value.trim().length > 0 ? value : '-';
}

function buildEnderecoRows(endereco: Endereco): Array<{ label: string; value: string }> {
  if (endereco.tipo_endereco === 'QUADRA_SETOR_CHACARA') {
    const rows: Array<{ label: string; value: string }> = [{ label: 'Quadra', value: formatEnderecoField(endereco.quadra) }];
    if (endereco.setor_chacara) rows.push({ label: 'Setor/Chácara', value: endereco.setor_chacara });
    if (endereco.numero_chacara) rows.push({ label: 'Número Chácara', value: endereco.numero_chacara });
    return rows;
  }

  const rows: Array<{ label: string; value: string }> = [{ label: 'Quadra', value: formatEnderecoField(endereco.quadra) }];
  if (endereco.conjunto) rows.push({ label: 'Conjunto', value: endereco.conjunto });
  if (endereco.lote) rows.push({ label: 'Lote', value: endereco.lote });
  return rows;
}

function buildInitialForm(): MoradorFormState {
  return {
    nome: '',
    email: '',
    telefone1: '',
    telefone2: '',
    enderecoId: '',
    senha: '',
    ativo: true
  };
}

export function AdminResidentsPage(): JSX.Element {
  const { user } = useAuth();
  const [enderecos, setEnderecos] = useState<Endereco[]>([]);
  const [moradores, setMoradores] = useState<Morador[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  const [selectedMorador, setSelectedMorador] = useState<Morador | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showStatusConfirmModal, setShowStatusConfirmModal] = useState(false);
  const [statusTargetMorador, setStatusTargetMorador] = useState<Morador | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [savingMorador, setSavingMorador] = useState(false);
  const [moradorForm, setMoradorForm] = useState<MoradorFormState>(buildInitialForm);
  const [showEditEnderecoSelector, setShowEditEnderecoSelector] = useState(false);

  const [showAddressCreate, setShowAddressCreate] = useState(false);
  const [creatingAddress, setCreatingAddress] = useState(false);
  const [tipoEndereco, setTipoEndereco] = useState<'QUADRA_CONJUNTO_LOTE' | 'QUADRA_SETOR_CHACARA'>('QUADRA_CONJUNTO_LOTE');
  const [quadra, setQuadra] = useState('');
  const [conjunto, setConjunto] = useState('');
  const [lote, setLote] = useState('');
  const [setorChacara, setSetorChacara] = useState('');
  const [numeroChacara, setNumeroChacara] = useState('');

  const pageSizeStorageKey = useMemo(() => {
    const identity = `${user?.role ?? 'anon'}:${user?.condominioId ?? 'global'}:${user?.nomeUsuario ?? 'anon'}`;
    return `condojet:moradores:page_size:${identity}`;
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
      const [e, m] = await Promise.all([backendApi.get<Endereco[]>('/enderecos'), backendApi.get<Morador[]>('/moradores')]);
      setEnderecos(e.data);
      setMoradores(m.data);
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(moradores.length / pageSize)), [moradores.length, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedMoradores = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return moradores.slice(start, start + pageSize);
  }, [moradores, currentPage, pageSize]);

  const selectedMoradorEndereco = useMemo(
    () => enderecos.find((item) => item.id === selectedMorador?.endereco_id) ?? null,
    [enderecos, selectedMorador]
  );
  const selectedFormEndereco = useMemo(
    () => enderecos.find((item) => item.id === Number(moradorForm.enderecoId)) ?? null,
    [enderecos, moradorForm.enderecoId]
  );

  function handlePhoneInputChange(field: 'telefone1' | 'telefone2', event: ChangeEvent<HTMLInputElement>): void {
    const masked = formatPhoneInput(event.target.value);
    setMoradorForm((previous) => ({ ...previous, [field]: masked }));
  }

  function generatePassword(size = 14): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let result = '';
    for (let i = 0; i < size; i += 1) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }

  function resetAddressForm(): void {
    setTipoEndereco('QUADRA_CONJUNTO_LOTE');
    setQuadra('');
    setConjunto('');
    setLote('');
    setSetorChacara('');
    setNumeroChacara('');
    setShowAddressCreate(false);
  }

  function openCreateModal(): void {
    setFormMode('create');
    setSelectedMorador(null);
    setMoradorForm(buildInitialForm());
    setShowEditEnderecoSelector(false);
    resetAddressForm();
    setShowAddressCreate(false);
    setShowFormModal(true);
  }

  function openEditModal(morador: Morador): void {
    setFormMode('edit');
    setSelectedMorador(morador);
    setMoradorForm({
      nome: morador.nome,
      email: morador.email,
      telefone1: parsePhoneList(morador.telefone)[0] ?? '',
      telefone2: parsePhoneList(morador.telefone)[1] ?? '',
      enderecoId: String(morador.endereco_id),
      senha: '',
      ativo: morador.ativo
    });
    setShowEditEnderecoSelector(false);
    resetAddressForm();
    setShowFormModal(true);
  }

  function openViewModal(morador: Morador): void {
    setSelectedMorador(morador);
    setShowViewModal(true);
  }

  function closeFormModal(): void {
    setShowFormModal(false);
    setSelectedMorador(null);
    setMoradorForm(buildInitialForm());
    setShowEditEnderecoSelector(false);
    resetAddressForm();
  }

  async function createEnderecoIfNeeded(): Promise<number> {
    if (!showAddressCreate) {
      return Number(moradorForm.enderecoId);
    }

    const payload: Record<string, unknown> = { tipo_endereco: tipoEndereco, quadra };
    if (tipoEndereco === 'QUADRA_CONJUNTO_LOTE') {
      payload.conjunto = conjunto;
      payload.lote = lote;
    } else {
      payload.setor_chacara = setorChacara;
      payload.numero_chacara = numeroChacara;
    }

    setCreatingAddress(true);
    try {
      const { data } = await backendApi.post<{ id: number }>('/enderecos', payload);
      return data.id;
    } finally {
      setCreatingAddress(false);
    }
  }

  async function onSaveMorador(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setFeedback(null);

    if (!moradorForm.telefone1.trim()) {
      setError('Informe o Telefone 1 (principal).');
      return;
    }
    const telefone = buildPhoneStorageValue([moradorForm.telefone1, moradorForm.telefone2]);

    if (formMode === 'create' && !showAddressCreate) {
      setError('Cadastro de endereço é obrigatório.');
      return;
    }

    if (formMode === 'edit' && !moradorForm.enderecoId && !showAddressCreate) {
      setError('Selecione um endereço para continuar.');
      return;
    }

    setSavingMorador(true);
    try {
      const enderecoId = await createEnderecoIfNeeded();

      if (formMode === 'create') {
        await backendApi.post('/moradores', {
          nome: moradorForm.nome,
          email: moradorForm.email,
          telefone,
          senha: moradorForm.senha,
          endereco_id: enderecoId
        });
        setFeedback('Morador cadastrado com sucesso.');
      } else if (selectedMorador) {
        const payload: Record<string, unknown> = {
          nome: moradorForm.nome,
          email: moradorForm.email,
          telefone,
          endereco_id: enderecoId,
          ativo: moradorForm.ativo
        };
        if (moradorForm.senha.trim()) {
          payload.senha = moradorForm.senha;
        }
        await backendApi.put(`/moradores/${selectedMorador.id}`, payload);
        setFeedback('Morador atualizado com sucesso.');
      }

      await loadAll();
      closeFormModal();
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setSavingMorador(false);
    }
  }

  function openStatusConfirmModal(morador: Morador): void {
    setStatusTargetMorador(morador);
    setShowStatusConfirmModal(true);
  }

  function closeStatusConfirmModal(): void {
    setShowStatusConfirmModal(false);
    setStatusTargetMorador(null);
  }

  async function toggleMoradorStatus(morador: Morador): Promise<void> {
    setError(null);
    setFeedback(null);
    setUpdatingStatus(true);
    try {
      await backendApi.put(`/moradores/${morador.id}`, { ativo: !morador.ativo });
      setFeedback(`Morador ${!morador.ativo ? 'ativado' : 'inativado'} com sucesso.`);
      await loadAll();
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setUpdatingStatus(false);
      closeStatusConfirmModal();
    }
  }

  const firstRecord = moradores.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastRecord = Math.min(moradores.length, currentPage * pageSize);

  return (
    <section className="page-grid condo-admin-page">
      <header className="page-header">
        <h1>Gestão de moradores</h1>
        <p>Controle de cadastro, situação e atualização de moradores.</p>
        <div className="action-group">
          <button type="button" className="button-soft" onClick={() => void loadAll()}>
            Atualizar
          </button>
          <button type="button" className="cta" onClick={openCreateModal}>
            Novo(a) morador(a)
          </button>
        </div>
      </header>

      {error ? <p className="error-box">{error}</p> : null}
      {feedback ? <p className="info-box">{feedback}</p> : null}
      {loading ? <p className="info-box">Carregando dados...</p> : null}

      <article className="card section-card">
        <h2>Moradores cadastrados</h2>

        <div className="list-toolbar">
          <p className="table-meta">{`Exibindo ${firstRecord}-${lastRecord} de ${moradores.length}`}</p>
          <label>
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
        </div>

        <div className="table-wrap">
          <table className="residents-table">
            <colgroup>
              <col className="col-id" />
              <col className="col-nome" />
              <col className="col-telefone" />
              <col className="col-email" />
              <col className="col-situacao" />
              <col className="col-acoes" />
            </colgroup>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>Telefone</th>
                <th>E-Mail</th>
                <th>Situação</th>
                <th className="actions-col">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedMoradores.map((morador) => {
                const phones = parsePhoneList(morador.telefone);
                const mainPhone = phones[0] ?? '-';
                const extraCount = Math.max(0, phones.length - 1);

                return (
                  <tr key={morador.id}>
                    <td>{morador.id}</td>
                    <td>{morador.nome}</td>
                    <td>{extraCount > 0 ? `${mainPhone} +${extraCount}` : mainPhone}</td>
                    <td>{morador.email}</td>
                    <td>{morador.ativo ? 'Residente' : 'Ex-Morador'}</td>
                    <td className="actions-cell">
                      <div className="action-group action-group-icons">
                        <button
                          type="button"
                          className="icon-action-button"
                          onClick={() => openStatusConfirmModal(morador)}
                          title={morador.ativo ? 'Inativar morador' : 'Ativar morador'}
                          aria-label={morador.ativo ? 'Inativar morador' : 'Ativar morador'}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 3v8" />
                            <path d="M7.8 5.8a8 8 0 1 0 8.4 0" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="icon-action-button"
                          onClick={() => openViewModal(morador)}
                          title="Visualizar morador"
                          aria-label="Visualizar morador"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="icon-action-button icon-action-button-primary"
                          onClick={() => openEditModal(morador)}
                          title="Editar morador"
                          aria-label="Editar morador"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M3 21h6l11-11a2.2 2.2 0 0 0-3.1-3.1L5.9 17.8 3 21Z" />
                            <path d="m14 6 4 4" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && paginatedMoradores.length === 0 ? (
                <tr>
                  <td colSpan={6}>Nenhum morador cadastrado.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="list-pagination">
          <button type="button" className="button-soft" disabled={currentPage <= 1} onClick={() => setCurrentPage((v) => Math.max(1, v - 1))}>
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
      </article>

      {showViewModal && selectedMorador ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h3>Detalhes do morador</h3>
            <div className="summary-grid">
              <div className="summary-card">
                <span>ID</span>
                <strong>{selectedMorador.id}</strong>
              </div>
              <div className="summary-card">
                <span>Situação</span>
                <strong>{selectedMorador.ativo ? 'Residente' : 'Ex-Morador'}</strong>
              </div>
              <div className="summary-card">
                <span>Nome</span>
                <strong>{selectedMorador.nome}</strong>
              </div>
              <div className="summary-card">
                <span>E-Mail</span>
                <strong>{selectedMorador.email}</strong>
              </div>
            </div>

            <div className="summary-card" style={{ marginTop: '0.7rem' }}>
              <span>Telefones</span>
              <strong>{parsePhoneList(selectedMorador.telefone).join(' | ') || '-'}</strong>
            </div>

            <div className="summary-card" style={{ marginTop: '0.7rem' }}>
              <span>Endereço</span>
              {selectedMoradorEndereco ? (
                <div className="summary-grid">
                  {buildEnderecoRows(selectedMoradorEndereco).map((row) => (
                    <div key={`view-${row.label}`} className="summary-card">
                      <span>{row.label}</span>
                      <strong>{row.value}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <strong>Endereço não encontrado.</strong>
              )}
            </div>

            <div className="modal-actions">
              <button type="button" className="button-soft" onClick={() => setShowViewModal(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showStatusConfirmModal && statusTargetMorador ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="confirm-head">
              <span className={statusTargetMorador.ativo ? 'confirm-icon warn' : 'confirm-icon success'} aria-hidden="true">
                {statusTargetMorador.ativo ? (
                  <svg viewBox="0 0 24 24">
                    <path d="M12 3v8" />
                    <path d="M7.8 5.8a8 8 0 1 0 8.4 0" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24">
                    <path d="M4 12l5 5L20 6" />
                  </svg>
                )}
              </span>
              <h3>
                {statusTargetMorador.ativo ? (
                  <span className="status-title-warn">Inativar morador</span>
                ) : (
                  <span className="status-title-success">Ativar morador</span>
                )}
              </h3>
            </div>
            <p className="modal-intro confirm-description">
              {statusTargetMorador.ativo
                ? `Confirma a ação `
                : `Confirma a ação `}
              {statusTargetMorador.ativo ? (
                <b className="status-text-warn">Inativar morador</b>
              ) : (
                <b className="status-text-success">Ativar morador</b>
              )}
              {` para ${statusTargetMorador.nome}?`}
            </p>
            <div className="modal-actions">
              <button type="button" className="button-soft" onClick={closeStatusConfirmModal} disabled={updatingStatus}>
                Cancelar
              </button>
              <button
                type="button"
                className={statusTargetMorador.ativo ? 'button-warning' : 'cta'}
                onClick={() => void toggleMoradorStatus(statusTargetMorador)}
                disabled={updatingStatus}
              >
                {updatingStatus ? 'Processando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showFormModal ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card modal-card-wide morador-modal">
            <h3>{formMode === 'create' ? 'Novo(a) morador(a)' : 'Editar morador'}</h3>
            <p className="modal-intro">Preencha os dados do morador e cadastre o endereço.</p>

            <form className="form-grid" onSubmit={(event) => void onSaveMorador(event)}>
              <label>
                Nome completo
                <input value={moradorForm.nome} onChange={(e) => setMoradorForm((v) => ({ ...v, nome: e.target.value }))} required />
              </label>
              <label>
                E-Mail
                <input
                  type="email"
                  value={moradorForm.email}
                  onChange={(e) => setMoradorForm((v) => ({ ...v, email: e.target.value }))}
                  required
                />
              </label>

              <div className="phones-inline-2">
                <label>
                  Telefone 1 (principal)
                  <input
                    value={moradorForm.telefone1}
                    onChange={(e) => handlePhoneInputChange('telefone1', e)}
                    inputMode="numeric"
                    maxLength={15}
                    placeholder="(00) 99999-8888"
                    required
                  />
                </label>
                <label>
                  Telefone 2 (opcional)
                  <input
                    value={moradorForm.telefone2}
                    onChange={(e) => handlePhoneInputChange('telefone2', e)}
                    inputMode="numeric"
                    maxLength={15}
                    placeholder="(00) 99999-8888"
                  />
                </label>
              </div>

              {formMode === 'edit' && selectedFormEndereco && !showAddressCreate ? (
                <div className="inline-panel">
                  <div className="detail-content-head">
                    <h4>Endereço atual</h4>
                    <button
                      type="button"
                      className="button-soft small address-action-button"
                      onClick={() => setShowEditEnderecoSelector((value) => !value)}
                    >
                      Alterar endereço
                    </button>
                  </div>
                  {showEditEnderecoSelector ? (
                    <label>
                      Selecione o endereço
                      <select
                        value={moradorForm.enderecoId}
                        onChange={(e) => setMoradorForm((v) => ({ ...v, enderecoId: e.target.value }))}
                        required
                      >
                        <option value="">Selecione...</option>
                        {enderecos.map((endereco) => (
                          <option key={endereco.id} value={endereco.id}>
                            {formatEnderecoLabel(endereco)}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <div className="summary-grid">
                    {buildEnderecoRows(selectedFormEndereco).map((row) => (
                      <div key={`edit-${row.label}`} className="summary-card">
                        <span>{row.label}</span>
                        <strong>{row.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {formMode === 'create' ? (
                <div className="action-group">
                  <button
                    type="button"
                    className="button-soft address-action-button"
                    onClick={() => setShowAddressCreate(true)}
                  >
                    Inluir endereço
                  </button>
                </div>
              ) : null}

              {formMode === 'create' && showAddressCreate ? (
                <div className="inline-panel">
                  <h4>Novo endereço</h4>
                  <label>
                    Tipo
                    <select
                      value={tipoEndereco}
                      onChange={(e) => setTipoEndereco(e.target.value as 'QUADRA_CONJUNTO_LOTE' | 'QUADRA_SETOR_CHACARA')}
                    >
                      <option value="QUADRA_CONJUNTO_LOTE">QUADRA_CONJUNTO_LOTE</option>
                      <option value="QUADRA_SETOR_CHACARA">QUADRA_SETOR_CHACARA</option>
                    </select>
                  </label>
                  {tipoEndereco === 'QUADRA_CONJUNTO_LOTE' ? (
                    <div className="address-inline-3">
                      <label>
                        Quadra
                        <input value={quadra} onChange={(e) => setQuadra(e.target.value)} required={showAddressCreate} />
                      </label>
                      <label>
                        Conjunto
                        <input value={conjunto} onChange={(e) => setConjunto(e.target.value)} required={showAddressCreate} />
                      </label>
                      <label>
                        Lote
                        <input value={lote} onChange={(e) => setLote(e.target.value)} required={showAddressCreate} />
                      </label>
                    </div>
                  ) : (
                    <div className="address-inline-3">
                      <label>
                        Quadra
                        <input value={quadra} onChange={(e) => setQuadra(e.target.value)} required={showAddressCreate} />
                      </label>
                      <label>
                        Setor/Chácara
                        <input value={setorChacara} onChange={(e) => setSetorChacara(e.target.value)} required={showAddressCreate} />
                      </label>
                      <label>
                        Número
                        <input value={numeroChacara} onChange={(e) => setNumeroChacara(e.target.value)} required={showAddressCreate} />
                      </label>
                    </div>
                  )}
                </div>
              ) : null}

              <label className="senha-field">
                {formMode === 'create' ? 'Senha' : 'Nova senha (opcional)'}
                <div className="input-action-wrap">
                  <input
                    type="password"
                    value={moradorForm.senha}
                    onChange={(e) => setMoradorForm((v) => ({ ...v, senha: e.target.value }))}
                    required={formMode === 'create'}
                    className="has-inline-action"
                  />
                  <button
                    type="button"
                    className="input-inline-action"
                    onClick={() => setMoradorForm((v) => ({ ...v, senha: generatePassword() }))}
                    title="Gerar senha segura automaticamente"
                  >
                    Gerar
                  </button>
                </div>
              </label>

              {formMode === 'edit' ? (
                <label className="inline-option">
                  <input
                    type="checkbox"
                    checked={moradorForm.ativo}
                    onChange={(e) => setMoradorForm((v) => ({ ...v, ativo: e.target.checked }))}
                  />
                  Morador ativo
                </label>
              ) : null}

              <div className="modal-actions">
                <button type="button" className="button-soft" onClick={closeFormModal} disabled={savingMorador || creatingAddress}>
                  Cancelar
                </button>
                <button type="submit" className="cta" disabled={savingMorador || creatingAddress}>
                  {savingMorador || creatingAddress ? 'Salvando...' : formMode === 'create' ? 'Cadastrar morador' : 'Salvar alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
