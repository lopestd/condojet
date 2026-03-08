import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';

import { useAuth } from '../../auth/AuthContext';
import { backendApi, readApiError } from '../../services/httpClient';

type Endereco = {
  id: number;
  tipo_condominio_slug: 'HORIZONTAL' | 'PREDIO_CONJUNTO' | null;
  bloco?: string | null;
  andar?: string | null;
  apartamento?: string | null;
  tipo_logradouro_horizontal_id?: number | null;
  tipo_logradouro_nome?: string | null;
  subtipo_logradouro_horizontal_id?: number | null;
  subtipo_logradouro_nome?: string | null;
  numero?: string | null;
  endereco_label: string;
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

type CondominioConfiguracaoResponse = {
  tipo_condominio_slug: 'HORIZONTAL' | 'PREDIO_CONJUNTO' | null;
  parametros_enderecamento: {
    predio_rotulo_bloco: string;
    predio_rotulo_andar: string;
    predio_rotulo_apartamento: string;
    horizontal_rotulo_tipo: string;
    horizontal_rotulo_subtipo: string;
    horizontal_rotulo_numero: string;
    horizontal_hint_tipo: string;
    horizontal_hint_subtipo: string;
    horizontal_tipos_permitidos_ids: number[];
    horizontal_subtipos_permitidos_ids: number[];
  };
};

type TipoLogradouroHorizontal = {
  id: number;
  nome: string;
};

type SubtipoLogradouroHorizontal = {
  id: number;
  tipo_logradouro_horizontal_id: number;
  nome: string;
};

type EnderecosReferenciasResponse = {
  tipos_logradouro_horizontal: TipoLogradouroHorizontal[];
  subtipos_logradouro_horizontal: SubtipoLogradouroHorizontal[];
};

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_PARAMETROS_ENDERECAMENTO = {
  predio_rotulo_bloco: 'Bloco',
  predio_rotulo_andar: 'Andar',
  predio_rotulo_apartamento: 'Apartamento',
  horizontal_rotulo_tipo: 'Tipo',
  horizontal_rotulo_subtipo: 'Subtipo',
  horizontal_rotulo_numero: 'Numero',
  horizontal_hint_tipo: 'Trecho, Quadra, Etapa ou Area',
  horizontal_hint_subtipo: 'Conjunto, Chacara, Quadra ou Area Especial',
  horizontal_tipos_permitidos_ids: [] as number[],
  horizontal_subtipos_permitidos_ids: [] as number[]
};

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
  return endereco.endereco_label || `Endereço #${endereco.id}`;
}

function formatEnderecoField(value: string | null | undefined): string {
  return value && value.trim().length > 0 ? value : '-';
}

function buildEnderecoRows(
  endereco: Endereco,
  parametros: typeof DEFAULT_PARAMETROS_ENDERECAMENTO
): Array<{ label: string; value: string }> {
  if (endereco.tipo_condominio_slug === 'PREDIO_CONJUNTO') {
    const rows: Array<{ label: string; value: string }> = [
      { label: parametros.predio_rotulo_bloco, value: formatEnderecoField(endereco.bloco) }
    ];
    rows.push({ label: parametros.predio_rotulo_andar, value: formatEnderecoField(endereco.andar) });
    rows.push({ label: parametros.predio_rotulo_apartamento, value: formatEnderecoField(endereco.apartamento) });
    return rows;
  }

  const rows: Array<{ label: string; value: string }> = [
    { label: parametros.horizontal_rotulo_tipo, value: formatEnderecoField(endereco.tipo_logradouro_nome) },
    { label: parametros.horizontal_rotulo_subtipo, value: formatEnderecoField(endereco.subtipo_logradouro_nome) },
    { label: parametros.horizontal_rotulo_numero, value: formatEnderecoField(endereco.numero) }
  ];
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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ATIVO' | 'INATIVO'>('ALL');

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
  const [tipoCondominioSlug, setTipoCondominioSlug] = useState<'HORIZONTAL' | 'PREDIO_CONJUNTO' | null>(null);
  const [parametrosEnderecamento, setParametrosEnderecamento] = useState(DEFAULT_PARAMETROS_ENDERECAMENTO);
  const [tiposLogradouroHorizontal, setTiposLogradouroHorizontal] = useState<TipoLogradouroHorizontal[]>([]);
  const [subtiposLogradouroHorizontal, setSubtiposLogradouroHorizontal] = useState<SubtipoLogradouroHorizontal[]>([]);
  const [bloco, setBloco] = useState('');
  const [andar, setAndar] = useState('');
  const [apartamento, setApartamento] = useState('');
  const [tipoLogradouroHorizontalId, setTipoLogradouroHorizontalId] = useState('');
  const [subtipoLogradouroHorizontalId, setSubtipoLogradouroHorizontalId] = useState('');
  const [numero, setNumero] = useState('');

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
      const [e, m, condominioConfig, referencias] = await Promise.all([
        backendApi.get<Endereco[]>('/enderecos/v2'),
        backendApi.get<Morador[]>('/moradores'),
        backendApi.get<CondominioConfiguracaoResponse>('/configuracoes/condominio'),
        backendApi.get<EnderecosReferenciasResponse>('/configuracoes/enderecos/referencias')
      ]);
      setEnderecos(e.data);
      setMoradores(m.data);
      setTipoCondominioSlug(condominioConfig.data.tipo_condominio_slug);
      setParametrosEnderecamento(condominioConfig.data.parametros_enderecamento ?? DEFAULT_PARAMETROS_ENDERECAMENTO);
      setTiposLogradouroHorizontal(referencias.data.tipos_logradouro_horizontal ?? []);
      setSubtiposLogradouroHorizontal(referencias.data.subtipos_logradouro_horizontal ?? []);
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const filteredMoradores = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return moradores.filter((morador) => {
      const matchesStatus =
        statusFilter === 'ALL' || (statusFilter === 'ATIVO' ? morador.ativo : !morador.ativo);
      if (!matchesStatus) return false;
      if (!term) return true;
      const searchable = [
        String(morador.id),
        morador.nome,
        morador.email,
        morador.telefone,
        morador.ativo ? 'residente ativo' : 'ex-morador inativo'
      ]
        .join(' ')
        .toLowerCase();
      return searchable.includes(term);
    });
  }, [moradores, searchTerm, statusFilter]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredMoradores.length / pageSize)), [filteredMoradores.length, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const paginatedMoradores = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMoradores.slice(start, start + pageSize);
  }, [filteredMoradores, currentPage, pageSize]);

  const selectedMoradorEndereco = useMemo(
    () => enderecos.find((item) => item.id === selectedMorador?.endereco_id) ?? null,
    [enderecos, selectedMorador]
  );
  const selectedFormEndereco = useMemo(
    () => enderecos.find((item) => item.id === Number(moradorForm.enderecoId)) ?? null,
    [enderecos, moradorForm.enderecoId]
  );
  const subtiposDisponiveis = useMemo(
    () =>
      subtiposLogradouroHorizontal.filter(
        (item) =>
          item.tipo_logradouro_horizontal_id === Number(tipoLogradouroHorizontalId || '0') &&
          (
            (parametrosEnderecamento.horizontal_subtipos_permitidos_ids ?? []).length === 0 ||
            (parametrosEnderecamento.horizontal_subtipos_permitidos_ids ?? []).includes(item.id)
          )
      ),
    [subtiposLogradouroHorizontal, tipoLogradouroHorizontalId, parametrosEnderecamento.horizontal_subtipos_permitidos_ids]
  );
  const tiposDisponiveis = useMemo(
    () =>
      tiposLogradouroHorizontal.filter(
        (item) =>
          (parametrosEnderecamento.horizontal_tipos_permitidos_ids ?? []).length === 0 ||
          (parametrosEnderecamento.horizontal_tipos_permitidos_ids ?? []).includes(item.id)
      ),
    [tiposLogradouroHorizontal, parametrosEnderecamento.horizontal_tipos_permitidos_ids]
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
    setBloco('');
    setAndar('');
    setApartamento('');
    setTipoLogradouroHorizontalId('');
    setSubtipoLogradouroHorizontalId('');
    setNumero('');
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

    const payload: Record<string, unknown> = {};
    if (tipoCondominioSlug === 'PREDIO_CONJUNTO') {
      payload.bloco = bloco;
      payload.andar = andar;
      payload.apartamento = apartamento;
    } else {
      payload.tipo_logradouro_horizontal_id = Number(tipoLogradouroHorizontalId);
      payload.subtipo_logradouro_horizontal_id = Number(subtipoLogradouroHorizontalId);
      payload.numero = numero;
    }

    setCreatingAddress(true);
    try {
      const { data } = await backendApi.post<{ id: number }>('/enderecos/v2', payload);
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
    if (formMode === 'create' && showAddressCreate && !tipoCondominioSlug) {
      setError('Defina primeiro o tipo de condomínio em Configurações/Gerais.');
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

  const firstRecord = filteredMoradores.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastRecord = Math.min(filteredMoradores.length, currentPage * pageSize);

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

        <div className="list-filters">
          <label>
            Pesquisar morador
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Nome, e-mail, telefone ou ID"
            />
          </label>
          <label>
            Situação
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'ALL' | 'ATIVO' | 'INATIVO')}>
              <option value="ALL">Todos</option>
              <option value="ATIVO">Ativo</option>
              <option value="INATIVO">Inativo</option>
            </select>
          </label>
        </div>

        <div className="list-toolbar">
          <p className="table-meta">{`Exibindo ${firstRecord}-${lastRecord} de ${filteredMoradores.length}`}</p>
        </div>

        <div className="table-wrap">
          <table className="residents-table">
            <colgroup>
              <col className="col-nome" />
              <col className="col-telefone" />
              <col className="col-email" />
              <col className="col-situacao" />
              <col className="col-acoes" />
            </colgroup>
            <thead>
              <tr>
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
                  <td colSpan={5}>Nenhum morador encontrado com os filtros aplicados.</td>
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

      {showViewModal && selectedMorador ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h3>Detalhes do morador</h3>
            <div className="summary-grid">
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
                  {buildEnderecoRows(selectedMoradorEndereco, parametrosEnderecamento).map((row) => (
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
                    {buildEnderecoRows(selectedFormEndereco, parametrosEnderecamento).map((row) => (
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
                    Incluir endereço
                  </button>
                </div>
              ) : null}

              {formMode === 'create' && showAddressCreate ? (
                <div className="inline-panel">
                  <h4>Novo endereço</h4>
                  {tipoCondominioSlug === 'PREDIO_CONJUNTO' ? (
                    <div className="address-inline-3">
                      <label>
                        {parametrosEnderecamento.predio_rotulo_bloco}
                        <input value={bloco} onChange={(e) => setBloco(e.target.value)} required={showAddressCreate} />
                      </label>
                      <label>
                        {parametrosEnderecamento.predio_rotulo_andar}
                        <input value={andar} onChange={(e) => setAndar(e.target.value)} required={showAddressCreate} />
                      </label>
                      <label>
                        {parametrosEnderecamento.predio_rotulo_apartamento}
                        <input value={apartamento} onChange={(e) => setApartamento(e.target.value)} required={showAddressCreate} />
                      </label>
                    </div>
                  ) : tipoCondominioSlug === 'HORIZONTAL' ? (
                    <>
                      <div className="address-inline-3">
                        <label>
                          {parametrosEnderecamento.horizontal_rotulo_tipo}
                          <small className="field-hint">{parametrosEnderecamento.horizontal_hint_tipo}</small>
                          <select
                            value={tipoLogradouroHorizontalId}
                            onChange={(e) => {
                              setTipoLogradouroHorizontalId(e.target.value);
                              setSubtipoLogradouroHorizontalId('');
                            }}
                            required={showAddressCreate}
                          >
                            <option value="">Selecione...</option>
                            {tiposDisponiveis.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.nome}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          {parametrosEnderecamento.horizontal_rotulo_subtipo}
                          <small className="field-hint">{parametrosEnderecamento.horizontal_hint_subtipo}</small>
                          <select
                            value={subtipoLogradouroHorizontalId}
                            onChange={(e) => setSubtipoLogradouroHorizontalId(e.target.value)}
                            required={showAddressCreate}
                          >
                            <option value="">Selecione...</option>
                            {subtiposDisponiveis.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.nome}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          {parametrosEnderecamento.horizontal_rotulo_numero}
                          <input value={numero} onChange={(e) => setNumero(e.target.value)} required={showAddressCreate} />
                        </label>
                      </div>
                    </>
                  ) : (
                    <p className="info-box">Defina o tipo de condomínio em Configurações/Gerais para cadastrar endereços.</p>
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
