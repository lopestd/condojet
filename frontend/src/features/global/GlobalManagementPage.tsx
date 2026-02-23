import { ChangeEvent, Dispatch, FormEvent, SetStateAction, useEffect, useMemo, useState } from 'react';

import { backendApi, readApiError } from '../../services/httpClient';

type Condo = {
  id: number;
  nome: string;
  ativo: boolean;
  api_key: string;
  responsavel_nome: string | null;
  responsavel_telefone: string | null;
};

type CondoAdmin = {
  id: number;
  condominio_id: number;
  nome: string;
  email: string;
  telefone: string;
  perfil: 'ADMIN';
  responsavel_sistema: boolean;
  ativo: boolean;
};

type CreateCondoResponse = {
  id: number;
  nome: string;
  ativo: boolean;
  api_key: string;
  admin: {
    id: number;
    email: string;
    telefone: string;
    perfil: string;
  };
};

type TabKey = 'resumo' | 'admins' | 'config';

export function GlobalManagementPage(): JSX.Element {
  const [items, setItems] = useState<Condo[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [selectedCondoId, setSelectedCondoId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('resumo');

  const [admins, setAdmins] = useState<CondoAdmin[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  const [showCreateCondoModal, setShowCreateCondoModal] = useState(false);
  const [showEditCondoModal, setShowEditCondoModal] = useState(false);
  const [showInactivateCondoModal, setShowInactivateCondoModal] = useState(false);
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [showEditAdminModal, setShowEditAdminModal] = useState(false);

  const [creatingCondo, setCreatingCondo] = useState(false);
  const [createCondoNome, setCreateCondoNome] = useState('');
  const [createAdminNome, setCreateAdminNome] = useState('');
  const [createAdminEmail, setCreateAdminEmail] = useState('');
  const [createAdminTelefone, setCreateAdminTelefone] = useState('');
  const [createAdminSenha, setCreateAdminSenha] = useState('');

  const [editingCondo, setEditingCondo] = useState(false);
  const [editCondoNome, setEditCondoNome] = useState('');
  const [editCondoAtivo, setEditCondoAtivo] = useState(true);

  const [inactivatingCondo, setInactivatingCondo] = useState(false);

  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [newAdminNome, setNewAdminNome] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminTelefone, setNewAdminTelefone] = useState('');
  const [newAdminSenha, setNewAdminSenha] = useState('');

  const [adminEditing, setAdminEditing] = useState<CondoAdmin | null>(null);
  const [updatingAdmin, setUpdatingAdmin] = useState(false);
  const [editAdminNome, setEditAdminNome] = useState('');
  const [editAdminTelefone, setEditAdminTelefone] = useState('');
  const [editAdminSenha, setEditAdminSenha] = useState('');
  const [editAdminAtivo, setEditAdminAtivo] = useState(true);
  const [editAdminResponsavel, setEditAdminResponsavel] = useState(false);

  const [createdSummary, setCreatedSummary] = useState<{
    condominioNome: string;
    condominioApiKey: string;
    adminEmail: string;
    adminTelefone: string;
    adminSenha: string;
  } | null>(null);

  function formatPhoneInput(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits ? `(${digits}` : '';
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  function handlePhoneChange(
    event: ChangeEvent<HTMLInputElement>,
    setter: Dispatch<SetStateAction<string>>
  ): void {
    setter(formatPhoneInput(event.target.value));
  }

  const selectedCondo = useMemo(
    () => items.find((item) => item.id === selectedCondoId) ?? null,
    [items, selectedCondoId]
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const byStatus =
        statusFilter === 'ALL' || (statusFilter === 'ACTIVE' && item.ativo) || (statusFilter === 'INACTIVE' && !item.ativo);
      const text = query.trim().toLowerCase();
      const byQuery = !text || item.nome.toLowerCase().includes(text) || String(item.id).includes(text);
      return byStatus && byQuery;
    });
  }, [items, query, statusFilter]);

  const kpis = useMemo(() => {
    const active = items.filter((item) => item.ativo).length;
    const inactive = items.length - active;
    return { total: items.length, active, inactive };
  }, [items]);

  const canConfirmCreateCondo = useMemo(
    () =>
      createCondoNome.trim() &&
      createAdminNome.trim() &&
      createAdminEmail.trim() &&
      createAdminTelefone.trim() &&
      createAdminSenha.trim(),
    [createCondoNome, createAdminNome, createAdminEmail, createAdminTelefone, createAdminSenha]
  );

  const canCreateAdmin = useMemo(
    () =>
      newAdminNome.trim() &&
      newAdminEmail.trim() &&
      newAdminTelefone.trim() &&
      newAdminSenha.trim() &&
      selectedCondo,
    [newAdminNome, newAdminEmail, newAdminTelefone, newAdminSenha, selectedCondo]
  );

  async function loadCondominios(): Promise<void> {
    setLoadingItems(true);
    setError(null);
    try {
      const { data } = await backendApi.get<Condo[]>('/admin/condominios');
      setItems(data);
      if (data.length > 0 && selectedCondoId === null) {
        setSelectedCondoId(data[0].id);
      }
      if (data.length === 0) {
        setSelectedCondoId(null);
      }
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setLoadingItems(false);
    }
  }

  async function loadAdmins(condominioId: number): Promise<void> {
    setLoadingAdmins(true);
    setError(null);
    try {
      const { data } = await backendApi.get<CondoAdmin[]>(`/admin/condominios/${condominioId}/admins`);
      setAdmins(data);
    } catch (err) {
      setError(readApiError(err));
      setAdmins([]);
    } finally {
      setLoadingAdmins(false);
    }
  }

  useEffect(() => {
    void loadCondominios();
  }, []);

  useEffect(() => {
    if (selectedCondoId !== null) {
      void loadAdmins(selectedCondoId);
    } else {
      setAdmins([]);
    }
  }, [selectedCondoId]);

  function clearCondoForm(): void {
    setCreateCondoNome('');
    setCreateAdminNome('');
    setCreateAdminEmail('');
    setCreateAdminTelefone('');
    setCreateAdminSenha('');
  }

  function generatePassword(size = 14): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let result = '';
    for (let i = 0; i < size; i += 1) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }

  function maskApiKey(value: string): string {
    if (value.length < 8) return '••••••••';
    return `${value.slice(0, 4)}••••••••${value.slice(-4)}`;
  }

  async function copyText(value: string, okMessage: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback(okMessage);
      setTimeout(() => setFeedback(null), 1800);
    } catch {
      setFeedback('Falha ao copiar para a área de transferência.');
      setTimeout(() => setFeedback(null), 2200);
    }
  }

  async function createCondo(): Promise<void> {
    if (!canConfirmCreateCondo) return;
    setCreatingCondo(true);
    setError(null);
    try {
      const currentPassword = createAdminSenha;
      const { data } = await backendApi.post<CreateCondoResponse>('/condominios', {
        nome: createCondoNome,
        admin: {
          nome: createAdminNome,
          email: createAdminEmail,
          telefone: createAdminTelefone,
          senha: createAdminSenha
        }
      });
      setCreatedSummary({
        condominioNome: data.nome,
        condominioApiKey: data.api_key,
        adminEmail: data.admin.email,
        adminTelefone: data.admin.telefone,
        adminSenha: currentPassword
      });
      clearCondoForm();
      setShowCreateCondoModal(false);
      await loadCondominios();
      setSelectedCondoId(data.id);
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setCreatingCondo(false);
    }
  }

  function openEditCondoModal(condo: Condo): void {
    setSelectedCondoId(condo.id);
    setEditCondoNome(condo.nome);
    setEditCondoAtivo(condo.ativo);
    setActiveTab('resumo');
    setShowEditCondoModal(true);
  }

  async function updateCondo(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!selectedCondo) return;
    setEditingCondo(true);
    setError(null);
    try {
      await backendApi.put(`/admin/condominios/${selectedCondo.id}`, {
        nome: editCondoNome.trim(),
        ativo: editCondoAtivo
      });
      setShowEditCondoModal(false);
      await loadCondominios();
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setEditingCondo(false);
    }
  }

  async function inactivateCondo(): Promise<void> {
    if (!selectedCondo) return;
    setInactivatingCondo(true);
    setError(null);
    try {
      await backendApi.put(`/admin/condominios/${selectedCondo.id}`, { ativo: false });
      setShowInactivateCondoModal(false);
      await loadCondominios();
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setInactivatingCondo(false);
    }
  }

  async function createAdmin(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!selectedCondo || !canCreateAdmin) return;
    setCreatingAdmin(true);
    setError(null);
    try {
      await backendApi.post(`/admin/condominios/${selectedCondo.id}/admins`, {
        nome: newAdminNome,
        email: newAdminEmail,
        telefone: newAdminTelefone,
        senha: newAdminSenha
      });
      setNewAdminNome('');
      setNewAdminEmail('');
      setNewAdminTelefone('');
      setNewAdminSenha('');
      setShowCreateAdminModal(false);
      await loadAdmins(selectedCondo.id);
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setCreatingAdmin(false);
    }
  }

  function openEditAdminModal(admin: CondoAdmin): void {
    setAdminEditing(admin);
    setEditAdminNome(admin.nome);
    setEditAdminTelefone(admin.telefone);
    setEditAdminAtivo(admin.ativo);
    setEditAdminResponsavel(admin.responsavel_sistema);
    setEditAdminSenha('');
    setShowEditAdminModal(true);
  }

  async function updateAdmin(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!selectedCondo || !adminEditing) return;
    setUpdatingAdmin(true);
    setError(null);
    try {
      await backendApi.put(`/admin/condominios/${selectedCondo.id}/admins/${adminEditing.id}`, {
        nome: editAdminNome,
        telefone: editAdminTelefone,
        senha: editAdminSenha.trim() ? editAdminSenha : undefined,
        responsavel_sistema: editAdminResponsavel,
        ativo: editAdminAtivo
      });
      setShowEditAdminModal(false);
      setAdminEditing(null);
      await loadAdmins(selectedCondo.id);
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setUpdatingAdmin(false);
    }
  }

  return (
    <section className="global-saas-page">
      <header className="global-saas-header">
        <div>
          <h1>Painel Global SaaS</h1>
          <p>Operação central de condomínios e gestão de Admins por condomínio.</p>
        </div>
        <div className="global-header-actions">
          <button type="button" className="button-soft" onClick={() => void loadCondominios()}>
            Atualizar
          </button>
          <button type="button" className="cta" onClick={() => setShowCreateCondoModal(true)}>
            Criar condomínio
          </button>
        </div>
      </header>

      <section className="global-kpis">
        <article className="kpi-card">
          <span>Total</span>
          <strong>{kpis.total}</strong>
        </article>
        <article className="kpi-card">
          <span>Ativos</span>
          <strong>{kpis.active}</strong>
        </article>
        <article className="kpi-card">
          <span>Inativos</span>
          <strong>{kpis.inactive}</strong>
        </article>
      </section>

      {error ? <p className="error-box">{error}</p> : null}
      {feedback ? <p className="info-box">{feedback}</p> : null}

      <article className="card global-list-panel global-list-panel-full">
        <div className="list-toolbar">
          <input
            placeholder="Buscar por nome ou ID"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar condomínio"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
            <option value="ALL">Todos</option>
            <option value="ACTIVE">Ativos</option>
            <option value="INACTIVE">Inativos</option>
          </select>
        </div>

        <div className="table-wrap">
          <table className="global-condo-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Condomínio</th>
                <th>Nome do Responsável</th>
                <th>Telefone do Responsável</th>
                <th>API Key</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loadingItems ? (
                <tr>
                  <td colSpan={7}>Carregando condomínios...</td>
                </tr>
              ) : null}
              {!loadingItems && filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7}>Nenhum condomínio encontrado.</td>
                </tr>
              ) : null}
              {!loadingItems
                ? filteredItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.id}</td>
                      <td>{item.nome}</td>
                      <td>
                        {item.responsavel_nome ? (
                          <>
                            {item.responsavel_nome} <span className="status-badge active">Responsável</span>
                          </>
                        ) : (
                          'Não definido'
                        )}
                      </td>
                      <td>{item.responsavel_telefone ?? 'Não definido'}</td>
                      <td>
                        <div className="masked-key">
                          <code>{maskApiKey(item.api_key)}</code>
                          <button
                            type="button"
                            className="icon-copy-button"
                            aria-label="Copiar API Key"
                            title="Copiar API Key"
                            onClick={() => void copyText(item.api_key, 'API Key copiada.')}
                          >
                            <span aria-hidden="true" className="copy-icon" />
                          </button>
                        </div>
                      </td>
                      <td>
                        <span className={item.ativo ? 'status-badge active' : 'status-badge inactive'}>
                          {item.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td>
                        <div className="action-group">
                          <button
                            type="button"
                            className="button-soft"
                            onClick={() => {
                              setSelectedCondoId(item.id);
                              openEditCondoModal(item);
                            }}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="button-warning"
                            disabled={!item.ativo}
                            onClick={() => {
                              setSelectedCondoId(item.id);
                              setShowInactivateCondoModal(true);
                            }}
                          >
                            {item.ativo ? 'Inativar' : 'Inativo'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>
      </article>

      {showCreateCondoModal ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <section className="modal-card">
            <h3>Novo condomínio</h3>
            <form
              className="form-grid"
              onSubmit={(event) => {
                event.preventDefault();
                if (!canConfirmCreateCondo || creatingCondo) return;
                void createCondo();
              }}
            >
              <label>
                Nome do condomínio
                <input value={createCondoNome} onChange={(e) => setCreateCondoNome(e.target.value)} required />
              </label>
              <label>
                Nome do Admin (responsável)
                <input value={createAdminNome} onChange={(e) => setCreateAdminNome(e.target.value)} required />
              </label>
              <label>
                E-mail do Admin (responsável)
                <input
                  type="email"
                  value={createAdminEmail}
                  onChange={(e) => setCreateAdminEmail(e.target.value)}
                  required
                />
              </label>
              <label>
                Telefone do Admin (responsável)
                <input
                  value={createAdminTelefone}
                  onChange={(e) => handlePhoneChange(e, setCreateAdminTelefone)}
                  inputMode="numeric"
                  maxLength={15}
                  placeholder="(00) 99999-8888"
                  required
                />
              </label>
              <label>
                Senha do Admin (responsável)
                <div className="input-action-wrap">
                  <input
                    value={createAdminSenha}
                    onChange={(e) => setCreateAdminSenha(e.target.value)}
                    required
                    className="has-inline-action"
                  />
                  <button
                    type="button"
                    className="input-inline-action"
                    onClick={() => setCreateAdminSenha(generatePassword())}
                    title="Gerar senha segura automaticamente"
                  >
                    Gerar
                  </button>
                </div>
              </label>
              <div className="modal-actions modal-actions-right">
                <button type="button" className="button-soft" onClick={() => setShowCreateCondoModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="cta" disabled={!canConfirmCreateCondo || creatingCondo}>
                  {creatingCondo ? 'Criando...' : 'Criar condomínio'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {showEditCondoModal && selectedCondo ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <section className="modal-card modal-card-wide">
            <header className="detail-head">
              <div>
                <h3>Gerenciar condomínio: {selectedCondo.nome}</h3>
                <p>ID {selectedCondo.id}</p>
              </div>
            </header>

            <nav className="detail-tabs" aria-label="Seções do condomínio">
              <button
                type="button"
                className={activeTab === 'resumo' ? 'active' : ''}
                onClick={() => setActiveTab('resumo')}
              >
                Resumo
              </button>
              <button
                type="button"
                className={activeTab === 'admins' ? 'active' : ''}
                onClick={() => setActiveTab('admins')}
              >
                Admins
              </button>
              <button
                type="button"
                className={activeTab === 'config' ? 'active' : ''}
                onClick={() => setActiveTab('config')}
              >
                Configurações
              </button>
            </nav>

            {activeTab === 'resumo' ? (
              <section className="detail-content">
                <form className="form-grid" onSubmit={(event) => void updateCondo(event)}>
                  <label>
                    Nome
                    <input value={editCondoNome} onChange={(e) => setEditCondoNome(e.target.value)} required />
                  </label>
                  <label className="inline-option">
                    <input type="checkbox" checked={editCondoAtivo} onChange={(e) => setEditCondoAtivo(e.target.checked)} />
                    Condomínio ativo
                  </label>
                  <div className="modal-actions">
                    <button type="submit" className="cta" disabled={editingCondo}>
                      {editingCondo ? 'Salvando...' : 'Salvar alterações'}
                    </button>
                  </div>
                </form>

                <div className="summary-grid">
                  <article className="summary-card">
                    <span>Status atual</span>
                    <strong>{selectedCondo.ativo ? 'Ativo' : 'Inativo'}</strong>
                  </article>
                  <article className="summary-card">
                    <span>Admins</span>
                    <strong>{admins.length}</strong>
                  </article>
                </div>
                <div className="summary-api-key">
                  <span>API Key do condomínio</span>
                  <div className="masked-key">
                    <code>{maskApiKey(selectedCondo.api_key)}</code>
                    <button
                      type="button"
                      className="icon-copy-button"
                      aria-label="Copiar API Key"
                      title="Copiar API Key"
                      onClick={() => void copyText(selectedCondo.api_key, 'API Key copiada.')}
                    >
                      <span aria-hidden="true" className="copy-icon" />
                    </button>
                  </div>
                </div>
              </section>
            ) : null}

            {activeTab === 'admins' ? (
              <section className="detail-content">
                <div className="detail-content-head">
                  <h3>Usuários Admin do condomínio</h3>
                  <button type="button" className="button-soft" onClick={() => setShowCreateAdminModal(true)}>
                    Novo Admin
                  </button>
                </div>
                <div className="table-wrap">
                  <table className="admins-table">
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>E-mail</th>
                        <th>Telefone</th>
                        <th>Status</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                        {loadingAdmins ? (
                          <tr>
                            <td colSpan={5}>Carregando admins...</td>
                          </tr>
                        ) : null}
                        {!loadingAdmins && admins.length === 0 ? (
                          <tr>
                            <td colSpan={5}>Sem usuários Admin cadastrados.</td>
                          </tr>
                        ) : null}
                      {!loadingAdmins
                        ? admins.map((admin) => (
                            <tr key={admin.id}>
                              <td>{admin.nome}</td>
                              <td>{admin.email}</td>
                              <td>{admin.telefone}</td>
                              <td>
                                <span className={admin.ativo ? 'status-badge active' : 'status-badge inactive'}>
                                  {admin.ativo ? 'Ativo' : 'Inativo'}
                                </span>
                                {admin.responsavel_sistema ? <span className="status-badge active">Responsável</span> : null}
                              </td>
                              <td>
                                <button type="button" className="button-soft" onClick={() => openEditAdminModal(admin)}>
                                  Editar/Atualizar
                                </button>
                              </td>
                            </tr>
                          ))
                        : null}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}

            {activeTab === 'config' ? (
              <section className="detail-content">
                <p>Espaço preparado para políticas globais do condomínio e integrações futuras.</p>
                <p>Nesta versão, as ações de governança estão disponíveis em Resumo e Admins.</p>
              </section>
            ) : null}

            <div className="modal-actions">
              <button type="button" className="button-soft" onClick={() => setShowEditCondoModal(false)}>
                Fechar
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {showInactivateCondoModal && selectedCondo ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <section className="modal-card">
            <h3>Inativar condomínio</h3>
            <p className="modal-intro">Confirma a inativação de {selectedCondo.nome}?</p>
            <div className="modal-actions">
              <button type="button" className="button-soft" onClick={() => setShowInactivateCondoModal(false)}>
                Cancelar
              </button>
              <button type="button" className="button-warning" disabled={inactivatingCondo} onClick={() => void inactivateCondo()}>
                {inactivatingCondo ? 'Inativando...' : 'Confirmar'}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {showCreateAdminModal && selectedCondo ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <section className="modal-card">
            <h3>Novo Admin para {selectedCondo.nome}</h3>
            <form className="form-grid" onSubmit={(event) => void createAdmin(event)}>
              <label>
                Nome
                <input value={newAdminNome} onChange={(e) => setNewAdminNome(e.target.value)} required />
              </label>
              <label>
                E-mail
                <input type="email" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} required />
              </label>
              <label>
                Telefone
                <input
                  value={newAdminTelefone}
                  onChange={(e) => handlePhoneChange(e, setNewAdminTelefone)}
                  inputMode="numeric"
                  maxLength={15}
                  placeholder="(00) 99999-8888"
                  required
                />
              </label>
              <label>
                Senha
                <div className="input-action-wrap">
                  <input
                    value={newAdminSenha}
                    onChange={(e) => setNewAdminSenha(e.target.value)}
                    required
                    className="has-inline-action"
                  />
                  <button
                    type="button"
                    className="input-inline-action"
                    onClick={() => setNewAdminSenha(generatePassword())}
                    title="Gerar senha segura automaticamente"
                  >
                    Gerar
                  </button>
                </div>
              </label>
              <div className="modal-actions modal-actions-right">
                <button type="button" className="button-soft" onClick={() => setShowCreateAdminModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="cta" disabled={!canCreateAdmin || creatingAdmin}>
                  {creatingAdmin ? 'Criando...' : 'Criar Admin'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {showEditAdminModal && adminEditing && selectedCondo ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <section className="modal-card">
            <h3>Editar Admin de {selectedCondo.nome}</h3>
            <form className="form-grid" onSubmit={(event) => void updateAdmin(event)}>
              <label>
                Nome
                <input value={editAdminNome} onChange={(e) => setEditAdminNome(e.target.value)} required />
              </label>
              <label>
                Telefone
                <input
                  value={editAdminTelefone}
                  onChange={(e) => handlePhoneChange(e, setEditAdminTelefone)}
                  inputMode="numeric"
                  maxLength={15}
                  placeholder="(00) 99999-8888"
                  required
                />
              </label>
              <label>
                Nova senha (opcional)
                <div className="input-action-wrap">
                  <input
                    value={editAdminSenha}
                    onChange={(e) => setEditAdminSenha(e.target.value)}
                    className="has-inline-action"
                  />
                  <button
                    type="button"
                    className="input-inline-action"
                    onClick={() => setEditAdminSenha(generatePassword())}
                    title="Gerar senha segura automaticamente"
                  >
                    Gerar
                  </button>
                </div>
              </label>
              <label className="inline-option">
                <input type="checkbox" checked={editAdminAtivo} onChange={(e) => setEditAdminAtivo(e.target.checked)} />
                Admin ativo
              </label>
              <label className="inline-option">
                <input
                  type="checkbox"
                  checked={editAdminResponsavel}
                  onChange={(e) => setEditAdminResponsavel(e.target.checked)}
                />
                Admin responsável pela gestão do condomínio
              </label>
              <div className="modal-actions">
                <button
                  type="button"
                  className="button-soft"
                  onClick={() => {
                    setShowEditAdminModal(false);
                    setAdminEditing(null);
                  }}
                >
                  Cancelar
                </button>
                <button type="submit" className="cta" disabled={updatingAdmin}>
                  {updatingAdmin ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {createdSummary ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <section className="modal-card">
            <h3>Condomínio criado com sucesso</h3>
            <div className="modal-data">
              <p>
                <b>Condomínio:</b> {createdSummary.condominioNome}
              </p>
              <p>
                <b>API Key:</b> {createdSummary.condominioApiKey}
              </p>
              <p>
                <b>Admin (responsável):</b> {createdSummary.adminEmail}
              </p>
              <p>
                <b>Telefone do Admin (responsável):</b> {createdSummary.adminTelefone}
              </p>
              <p>
                <b>Senha do Admin (responsável):</b> {createdSummary.adminSenha}
              </p>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="button-soft"
                onClick={() =>
                  void copyText(
                    [
                      `Condomínio: ${createdSummary.condominioNome}`,
                      `API Key: ${createdSummary.condominioApiKey}`,
                      `Admin (responsável): ${createdSummary.adminEmail}`,
                      `Telefone do Admin (responsável): ${createdSummary.adminTelefone}`,
                      `Senha do Admin (responsável): ${createdSummary.adminSenha}`
                    ].join('\n'),
                    'Dados do condomínio copiados.'
                  )
                }
              >
                Copiar dados
              </button>
              <button type="button" className="cta" onClick={() => setCreatedSummary(null)}>
                Fechar
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
