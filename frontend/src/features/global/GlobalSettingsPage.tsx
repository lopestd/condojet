import { FormEvent, useEffect, useMemo, useState } from 'react';

import { backendApi, readApiError } from '../../services/httpClient';

type EmpresaResponsavelGlobal = {
  id: number;
  nome: string;
  ativo: boolean;
};

export function GlobalSettingsPage(): JSX.Element {
  const [items, setItems] = useState<EmpresaResponsavelGlobal[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [editingItem, setEditingItem] = useState<EmpresaResponsavelGlobal | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editAtivo, setEditAtivo] = useState(true);

  async function loadEmpresas(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const { data } = await backendApi.get<EmpresaResponsavelGlobal[]>('/empresas-responsaveis-globais?incluir_inativas=true');
      setItems(data);
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEmpresas();
  }, []);

  const filteredItems = useMemo(() => {
    const term = query.trim().toLowerCase();
    return items.filter((item) => {
      const statusOk =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && item.ativo) ||
        (statusFilter === 'INACTIVE' && !item.ativo);
      const queryOk = !term || item.nome.toLowerCase().includes(term) || String(item.id).includes(term);
      return statusOk && queryOk;
    });
  }, [items, query, statusFilter]);

  async function createEmpresa(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!newNome.trim()) return;

    setSaving(true);
    setError(null);
    setFeedback(null);
    try {
      await backendApi.post('/empresas-responsaveis-globais', { nome: newNome.trim() });
      setShowCreateModal(false);
      setNewNome('');
      setFeedback('Empresa responsável cadastrada com sucesso.');
      await loadEmpresas();
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setSaving(false);
    }
  }

  function openEditModal(item: EmpresaResponsavelGlobal): void {
    setEditingItem(item);
    setEditNome(item.nome);
    setEditAtivo(item.ativo);
    setShowEditModal(true);
  }

  async function updateEmpresa(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!editingItem) return;

    setSaving(true);
    setError(null);
    setFeedback(null);
    try {
      await backendApi.put(`/empresas-responsaveis-globais/${editingItem.id}`, {
        nome: editNome.trim(),
        ativo: editAtivo
      });
      setShowEditModal(false);
      setEditingItem(null);
      setFeedback('Empresa responsável atualizada com sucesso.');
      await loadEmpresas();
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page-grid settings-page">
      <header className="page-header">
        <h1>Configurações Globais</h1>
        <p>Parâmetros globais da plataforma CondoJET.</p>
      </header>

      {error ? <p className="error-box">{error}</p> : null}
      {feedback ? <p className="info-box">{feedback}</p> : null}

      <article className="card global-list-panel global-list-panel-full">
        <div className="list-toolbar">
          <input
            placeholder="Buscar empresa por nome ou ID"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Buscar empresa responsável"
          />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
            <option value="ALL">Todos</option>
            <option value="ACTIVE">Ativos</option>
            <option value="INACTIVE">Inativos</option>
          </select>
          <button type="button" className="cta" onClick={() => setShowCreateModal(true)}>
            Nova empresa
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Empresa</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4}>Carregando empresas...</td>
                </tr>
              ) : null}
              {!loading && filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={4}>Nenhuma empresa encontrada.</td>
                </tr>
              ) : null}
              {!loading
                ? filteredItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.id}</td>
                      <td>{item.nome}</td>
                      <td>
                        <span className={item.ativo ? 'status-badge active' : 'status-badge inactive'}>
                          {item.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td>
                        <button type="button" className="button-soft" onClick={() => openEditModal(item)}>
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>
      </article>

      {showCreateModal ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <section className="modal-card">
            <h3>Nova empresa responsável</h3>
            <form className="form-grid" onSubmit={(event) => void createEmpresa(event)}>
              <label>
                Nome da empresa
                <input value={newNome} onChange={(event) => setNewNome(event.target.value)} required />
              </label>
              <div className="modal-actions">
                <button type="button" className="button-soft" onClick={() => setShowCreateModal(false)} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="cta" disabled={saving || !newNome.trim()}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {showEditModal && editingItem ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <section className="modal-card">
            <h3>Editar empresa responsável</h3>
            <form className="form-grid" onSubmit={(event) => void updateEmpresa(event)}>
              <label>
                Nome da empresa
                <input value={editNome} onChange={(event) => setEditNome(event.target.value)} required />
              </label>
              <label className="inline-option">
                <input type="checkbox" checked={editAtivo} onChange={(event) => setEditAtivo(event.target.checked)} />
                Empresa ativa
              </label>
              <div className="modal-actions">
                <button type="button" className="button-soft" onClick={() => setShowEditModal(false)} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="cta" disabled={saving || !editNome.trim()}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}
