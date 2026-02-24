import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';

import { useAuth } from '../../auth/AuthContext';
import { backendApi, readApiError } from '../../services/httpClient';

type Usuario = {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  perfil: 'ADMIN' | 'PORTEIRO';
  responsavel_sistema?: boolean;
  ativo: boolean;
};

type UsuarioFormState = {
  nome: string;
  email: string;
  telefone: string;
  perfil: 'ADMIN' | 'PORTEIRO';
  senha: string;
  ativo: boolean;
};

const DEFAULT_PAGE_SIZE = 10;

function buildInitialForm(): UsuarioFormState {
  return {
    nome: '',
    email: '',
    telefone: '',
    perfil: 'PORTEIRO',
    senha: '',
    ativo: true
  };
}

function formatPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function generatePassword(size = 14): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let result = '';
  for (let i = 0; i < size; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export function AdminUsersPage(): JSX.Element {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ATIVO' | 'INATIVO'>('ALL');

  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
  const [showStatusConfirmModal, setShowStatusConfirmModal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [savingUsuario, setSavingUsuario] = useState(false);
  const [usuarioForm, setUsuarioForm] = useState<UsuarioFormState>(buildInitialForm);

  const pageSizeStorageKey = useMemo(() => {
    const identity = `${user?.role ?? 'anon'}:${user?.condominioId ?? 'global'}:${user?.nomeUsuario ?? 'anon'}`;
    return `condojet:usuarios:page_size:${identity}`;
  }, [user?.role, user?.condominioId, user?.nomeUsuario]);

  useEffect(() => {
    const raw = window.localStorage.getItem(pageSizeStorageKey);
    if (!raw) return;
    const parsed = Number(raw);
    if ([10, 25, 50, 100].includes(parsed)) {
      setPageSize(parsed);
    }
  }, [pageSizeStorageKey]);

  async function loadUsuarios(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const { data } = await backendApi.get<Usuario[]>('/usuarios');
      setUsuarios(data);
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsuarios();
  }, []);

  const filteredUsuarios = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return usuarios.filter((usuario) => {
      const matchesStatus =
        statusFilter === 'ALL' || (statusFilter === 'ATIVO' ? usuario.ativo : !usuario.ativo);
      if (!matchesStatus) return false;
      if (!term) return true;

      const perfilLabel = usuario.perfil === 'PORTEIRO' ? 'atendente' : usuario.perfil.toLowerCase();
      const searchable = [
        String(usuario.id),
        usuario.nome,
        usuario.email,
        usuario.telefone,
        perfilLabel,
        usuario.responsavel_sistema ? 'responsavel responsável' : '',
        usuario.ativo ? 'ativo' : 'inativo'
      ]
        .join(' ')
        .toLowerCase();
      return searchable.includes(term);
    });
  }, [usuarios, searchTerm, statusFilter]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredUsuarios.length / pageSize)), [filteredUsuarios.length, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const paginatedUsuarios = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsuarios.slice(start, start + pageSize);
  }, [filteredUsuarios, currentPage, pageSize]);

  function openCreateModal(): void {
    setFormMode('create');
    setSelectedUsuario(null);
    setUsuarioForm(buildInitialForm());
    setShowFormModal(true);
  }

  function openEditModal(usuario: Usuario): void {
    setFormMode('edit');
    setSelectedUsuario(usuario);
    setUsuarioForm({
      nome: usuario.nome,
      email: usuario.email,
      telefone: usuario.telefone,
      perfil: usuario.perfil,
      senha: '',
      ativo: usuario.ativo
    });
    setShowFormModal(true);
  }

  function closeFormModal(): void {
    setShowFormModal(false);
    setSelectedUsuario(null);
    setUsuarioForm(buildInitialForm());
  }

  function openStatusConfirmModal(usuario: Usuario): void {
    if (usuario.perfil === 'ADMIN' && usuario.responsavel_sistema && usuario.ativo) {
      setError('O usuário ADMIN responsável não pode ser inativado.');
      return;
    }
    setSelectedUsuario(usuario);
    setShowStatusConfirmModal(true);
  }

  function closeStatusConfirmModal(): void {
    setShowStatusConfirmModal(false);
    setSelectedUsuario(null);
  }

  function handlePhoneChange(event: ChangeEvent<HTMLInputElement>): void {
    setUsuarioForm((previous) => ({ ...previous, telefone: formatPhoneInput(event.target.value) }));
  }

  async function onSaveUsuario(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setFeedback(null);

    setSavingUsuario(true);
    try {
      if (formMode === 'create') {
        await backendApi.post('/usuarios', {
          nome: usuarioForm.nome,
          email: usuarioForm.email,
          telefone: usuarioForm.telefone,
          senha: usuarioForm.senha,
          perfil: usuarioForm.perfil
        });
        setFeedback('Usuário cadastrado com sucesso.');
      } else if (selectedUsuario) {
        const payload: Record<string, unknown> = {
          nome: usuarioForm.nome,
          telefone: usuarioForm.telefone,
          ativo: usuarioForm.ativo
        };
        if (usuarioForm.senha.trim()) {
          payload.senha = usuarioForm.senha;
        }
        await backendApi.put(`/usuarios/${selectedUsuario.id}`, payload);
        setFeedback('Usuário atualizado com sucesso.');
      }

      await loadUsuarios();
      closeFormModal();
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setSavingUsuario(false);
    }
  }

  async function toggleUsuarioStatus(usuario: Usuario): Promise<void> {
    if (usuario.perfil === 'ADMIN' && usuario.responsavel_sistema && usuario.ativo) {
      setError('O usuário ADMIN responsável não pode ser inativado.');
      return;
    }
    setError(null);
    setFeedback(null);
    setUpdatingStatus(true);
    try {
      await backendApi.put(`/usuarios/${usuario.id}`, { ativo: !usuario.ativo });
      setFeedback(`Usuário ${!usuario.ativo ? 'ativado' : 'inativado'} com sucesso.`);
      await loadUsuarios();
      closeStatusConfirmModal();
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setUpdatingStatus(false);
    }
  }

  const firstRecord = filteredUsuarios.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastRecord = Math.min(filteredUsuarios.length, currentPage * pageSize);

  return (
    <section className="page-grid condo-admin-page">
      <header className="page-header">
        <h1>Gestão de usuários</h1>
        <p>Gerencie usuários administradores e porteiros do condomínio.</p>
        <div className="action-group">
          <button type="button" className="button-soft" onClick={() => void loadUsuarios()}>
            Atualizar
          </button>
          <button type="button" className="cta" onClick={openCreateModal}>
            Novo(a) usuário(a)
          </button>
        </div>
      </header>

      {error ? <p className="error-box">{error}</p> : null}
      {feedback ? <p className="info-box">{feedback}</p> : null}
      {loading ? <p className="info-box">Carregando dados...</p> : null}

      <article className="card section-card">
        <h2>Usuários cadastrados</h2>

        <div className="list-filters">
          <label>
            Pesquisar usuário
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Nome, e-mail, telefone, perfil ou ID"
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
          <p className="table-meta">{`Exibindo ${firstRecord}-${lastRecord} de ${filteredUsuarios.length}`}</p>
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
          <table className="residents-table users-table">
            <colgroup>
              <col className="col-id" />
              <col className="col-nome" />
              <col className="col-telefone" />
              <col className="col-email" />
              <col className="col-perfil" />
              <col className="col-situacao" />
              <col className="col-acoes" />
            </colgroup>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>Telefone</th>
                <th>E-Mail</th>
                <th>Perfil</th>
                <th>Situação</th>
                <th className="actions-col">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsuarios.map((usuario) => (
                <tr key={usuario.id}>
                  <td>{usuario.id}</td>
                  <td>{usuario.nome}</td>
                  <td>{usuario.telefone}</td>
                  <td>{usuario.email}</td>
                  <td>
                    {usuario.perfil === 'PORTEIRO' ? 'ATENDENTE' : usuario.perfil}{' '}
                    {usuario.perfil === 'ADMIN' && usuario.responsavel_sistema ? (
                      <span className="status-badge active">Responsável</span>
                    ) : null}
                  </td>
                  <td>
                    <span className={usuario.ativo ? 'status-badge active' : 'status-badge inactive'}>
                      {usuario.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <div className="action-group action-group-icons">
                      <button
                        type="button"
                        className="icon-action-button"
                        onClick={() => openStatusConfirmModal(usuario)}
                        title={
                          usuario.perfil === 'ADMIN' && usuario.responsavel_sistema && usuario.ativo
                            ? 'ADMIN responsável não pode ser inativado'
                            : usuario.ativo
                              ? 'Inativar usuário'
                              : 'Ativar usuário'
                        }
                        aria-label={
                          usuario.perfil === 'ADMIN' && usuario.responsavel_sistema && usuario.ativo
                            ? 'ADMIN responsável não pode ser inativado'
                            : usuario.ativo
                              ? 'Inativar usuário'
                              : 'Ativar usuário'
                        }
                        disabled={usuario.perfil === 'ADMIN' && usuario.responsavel_sistema && usuario.ativo}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M12 3v8" />
                          <path d="M7.8 5.8a8 8 0 1 0 8.4 0" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="icon-action-button icon-action-button-primary"
                        onClick={() => openEditModal(usuario)}
                        title="Editar usuário"
                        aria-label="Editar usuário"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M3 21h6l11-11a2.2 2.2 0 0 0-3.1-3.1L5.9 17.8 3 21Z" />
                          <path d="m14 6 4 4" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && paginatedUsuarios.length === 0 ? (
                <tr>
                  <td colSpan={7}>Nenhum usuário encontrado com os filtros aplicados.</td>
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

      {showStatusConfirmModal && selectedUsuario ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h3>{selectedUsuario.ativo ? 'Inativar usuário' : 'Ativar usuário'}</h3>
            <p className="modal-intro">
              {selectedUsuario.ativo
                ? `Confirma a inativação de ${selectedUsuario.nome}?`
                : `Confirma a ativação de ${selectedUsuario.nome}?`}
            </p>
            <div className="modal-actions">
              <button type="button" className="button-soft" onClick={closeStatusConfirmModal} disabled={updatingStatus}>
                Cancelar
              </button>
              <button
                type="button"
                className={selectedUsuario.ativo ? 'button-warning' : 'cta'}
                onClick={() => void toggleUsuarioStatus(selectedUsuario)}
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
          <div className="modal-card morador-modal">
            <h3>{formMode === 'create' ? 'Novo(a) usuário(a)' : 'Editar usuário'}</h3>
            <form className="form-grid" onSubmit={(event) => void onSaveUsuario(event)}>
              <label>
                Nome
                <input value={usuarioForm.nome} onChange={(e) => setUsuarioForm((v) => ({ ...v, nome: e.target.value }))} required />
              </label>

              <label>
                E-mail
                <input
                  type="email"
                  value={usuarioForm.email}
                  onChange={(e) => setUsuarioForm((v) => ({ ...v, email: e.target.value }))}
                  required
                  disabled={formMode === 'edit'}
                />
              </label>

              <label>
                Telefone
                <input
                  value={usuarioForm.telefone}
                  onChange={handlePhoneChange}
                  inputMode="numeric"
                  maxLength={15}
                  placeholder="(00) 99999-8888"
                  required
                />
              </label>

              <label>
                Perfil
                <select
                  value={usuarioForm.perfil}
                  onChange={(e) => setUsuarioForm((v) => ({ ...v, perfil: e.target.value as 'ADMIN' | 'PORTEIRO' }))}
                  disabled={formMode === 'edit'}
                >
                  <option value="PORTEIRO">ATENDENTE</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </label>

              <label className="senha-field">
                {formMode === 'create' ? 'Senha' : 'Nova senha (opcional)'}
                <div className="input-action-wrap">
                  <input
                    type="password"
                    value={usuarioForm.senha}
                    onChange={(e) => setUsuarioForm((v) => ({ ...v, senha: e.target.value }))}
                    required={formMode === 'create'}
                    className="has-inline-action"
                  />
                  <button
                    type="button"
                    className="input-inline-action"
                    onClick={() => setUsuarioForm((v) => ({ ...v, senha: generatePassword() }))}
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
                    checked={usuarioForm.ativo}
                    onChange={(e) => setUsuarioForm((v) => ({ ...v, ativo: e.target.checked }))}
                  />
                  Usuário ativo
                </label>
              ) : null}

              <div className="modal-actions">
                <button type="button" className="button-soft" onClick={closeFormModal} disabled={savingUsuario}>
                  Cancelar
                </button>
                <button type="submit" className="cta" disabled={savingUsuario}>
                  {savingUsuario ? 'Salvando...' : formMode === 'create' ? 'Cadastrar usuário' : 'Salvar alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
