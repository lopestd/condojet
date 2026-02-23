import { FormEvent, useEffect, useState } from 'react';

import { backendApi, readApiError } from '../../services/httpClient';

type Usuario = { id: number; nome: string; email: string; perfil: string; ativo: boolean };
type Endereco = {
  id: number;
  tipo_endereco: string;
  quadra: string;
  conjunto?: string | null;
  lote?: string | null;
  setor_chacara?: string | null;
  numero_chacara?: string | null;
};
type Morador = { id: number; nome: string; email: string; telefone: string; endereco_id: number; ativo: boolean };

export function AdminCondoPage(): JSX.Element {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [enderecos, setEnderecos] = useState<Endereco[]>([]);
  const [moradores, setMoradores] = useState<Morador[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [novoUsuarioNome, setNovoUsuarioNome] = useState('');
  const [novoUsuarioEmail, setNovoUsuarioEmail] = useState('');
  const [novoUsuarioSenha, setNovoUsuarioSenha] = useState('');
  const [novoUsuarioPerfil, setNovoUsuarioPerfil] = useState<'ADMIN' | 'PORTEIRO'>('PORTEIRO');
  const [editUsuarioId, setEditUsuarioId] = useState('');
  const [editUsuarioAtivo, setEditUsuarioAtivo] = useState(true);

  const [tipoEndereco, setTipoEndereco] = useState<'QUADRA_CONJUNTO_LOTE' | 'QUADRA_SETOR_CHACARA'>('QUADRA_CONJUNTO_LOTE');
  const [quadra, setQuadra] = useState('');
  const [conjunto, setConjunto] = useState('');
  const [lote, setLote] = useState('');
  const [setorChacara, setSetorChacara] = useState('');
  const [numeroChacara, setNumeroChacara] = useState('');

  const [moradorNome, setMoradorNome] = useState('');
  const [moradorEmail, setMoradorEmail] = useState('');
  const [moradorTelefone, setMoradorTelefone] = useState('');
  const [moradorSenha, setMoradorSenha] = useState('');
  const [moradorEnderecoId, setMoradorEnderecoId] = useState('');
  const [editMoradorId, setEditMoradorId] = useState('');
  const [editMoradorAtivo, setEditMoradorAtivo] = useState(true);

  async function loadAll(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const [u, e, m] = await Promise.all([
        backendApi.get<Usuario[]>('/usuarios'),
        backendApi.get<Endereco[]>('/enderecos'),
        backendApi.get<Morador[]>('/moradores')
      ]);
      setUsuarios(u.data);
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

  async function onCreateUser(event: FormEvent): Promise<void> {
    event.preventDefault();
    try {
      await backendApi.post('/usuarios', {
        nome: novoUsuarioNome,
        email: novoUsuarioEmail,
        senha: novoUsuarioSenha,
        perfil: novoUsuarioPerfil
      });
      setNovoUsuarioNome('');
      setNovoUsuarioEmail('');
      setNovoUsuarioSenha('');
      await loadAll();
    } catch (err) {
      setError(readApiError(err));
    }
  }

  async function onUpdateUser(event: FormEvent): Promise<void> {
    event.preventDefault();
    try {
      await backendApi.put(`/usuarios/${Number(editUsuarioId)}`, { ativo: editUsuarioAtivo });
      await loadAll();
    } catch (err) {
      setError(readApiError(err));
    }
  }

  async function onCreateEndereco(event: FormEvent): Promise<void> {
    event.preventDefault();
    const payload: Record<string, unknown> = { tipo_endereco: tipoEndereco, quadra };
    if (tipoEndereco === 'QUADRA_CONJUNTO_LOTE') {
      payload.conjunto = conjunto;
      payload.lote = lote;
    } else {
      payload.setor_chacara = setorChacara;
      payload.numero_chacara = numeroChacara;
    }
    try {
      await backendApi.post('/enderecos', payload);
      setQuadra('');
      setConjunto('');
      setLote('');
      setSetorChacara('');
      setNumeroChacara('');
      await loadAll();
    } catch (err) {
      setError(readApiError(err));
    }
  }

  async function onCreateMorador(event: FormEvent): Promise<void> {
    event.preventDefault();
    try {
      await backendApi.post('/moradores', {
        nome: moradorNome,
        email: moradorEmail,
        telefone: moradorTelefone,
        senha: moradorSenha,
        endereco_id: Number(moradorEnderecoId)
      });
      setMoradorNome('');
      setMoradorEmail('');
      setMoradorTelefone('');
      setMoradorSenha('');
      await loadAll();
    } catch (err) {
      setError(readApiError(err));
    }
  }

  async function onUpdateMorador(event: FormEvent): Promise<void> {
    event.preventDefault();
    try {
      await backendApi.put(`/moradores/${Number(editMoradorId)}`, { ativo: editMoradorAtivo });
      await loadAll();
    } catch (err) {
      setError(readApiError(err));
    }
  }

  return (
    <section className="page-grid">
      <header className="page-header">
        <h1>Painel de Administração do Condomínio</h1>
        <p>Gerencie usuários, endereços e moradores do seu condomínio.</p>
        <button type="button" className="button-soft" onClick={() => void loadAll()}>
          Atualizar
        </button>
      </header>

      {error ? <p className="error-box">{error}</p> : null}
      {loading ? <p className="info-box">Carregando dados...</p> : null}

      <article className="card">
        <h2>Usuários</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Perfil</th>
                <th>Ativo</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.nome}</td>
                  <td>{u.email}</td>
                  <td>{u.perfil}</td>
                  <td>{u.ativo ? 'Sim' : 'Não'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form className="form-grid" onSubmit={(e) => void onCreateUser(e)}>
          <h3>Criar usuário</h3>
          <label>
            Nome
            <input value={novoUsuarioNome} onChange={(e) => setNovoUsuarioNome(e.target.value)} required />
          </label>
          <label>
            E-mail
            <input type="email" value={novoUsuarioEmail} onChange={(e) => setNovoUsuarioEmail(e.target.value)} required />
          </label>
          <label>
            Senha
            <input type="password" value={novoUsuarioSenha} onChange={(e) => setNovoUsuarioSenha(e.target.value)} required />
          </label>
          <label>
            Perfil
            <select value={novoUsuarioPerfil} onChange={(e) => setNovoUsuarioPerfil(e.target.value as 'ADMIN' | 'PORTEIRO')}>
              <option value="PORTEIRO">PORTEIRO</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </label>
          <button className="cta" type="submit">
            Criar usuário
          </button>
        </form>
        <form className="form-grid" onSubmit={(e) => void onUpdateUser(e)}>
          <h3>Atualizar usuário (ativo/inativo)</h3>
          <label>
            ID usuário
            <input type="number" min={1} value={editUsuarioId} onChange={(e) => setEditUsuarioId(e.target.value)} required />
          </label>
          <label className="inline-option">
            <input type="checkbox" checked={editUsuarioAtivo} onChange={(e) => setEditUsuarioAtivo(e.target.checked)} />
            Usuário ativo
          </label>
          <button className="cta" type="submit">
            Atualizar usuário
          </button>
        </form>
      </article>

      <article className="card">
        <h2>Endereços</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Tipo</th>
                <th>Quadra</th>
                <th>Complemento</th>
              </tr>
            </thead>
            <tbody>
              {enderecos.map((e) => (
                <tr key={e.id}>
                  <td>{e.id}</td>
                  <td>{e.tipo_endereco}</td>
                  <td>{e.quadra}</td>
                  <td>{e.conjunto ? `${e.conjunto}/${e.lote}` : `${e.setor_chacara}/${e.numero_chacara}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form className="form-grid" onSubmit={(e) => void onCreateEndereco(e)}>
          <h3>Criar endereço</h3>
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
          <label>
            Quadra
            <input value={quadra} onChange={(e) => setQuadra(e.target.value)} required />
          </label>
          {tipoEndereco === 'QUADRA_CONJUNTO_LOTE' ? (
            <>
              <label>
                Conjunto
                <input value={conjunto} onChange={(e) => setConjunto(e.target.value)} required />
              </label>
              <label>
                Lote
                <input value={lote} onChange={(e) => setLote(e.target.value)} required />
              </label>
            </>
          ) : (
            <>
              <label>
                Setor/Chácara
                <input value={setorChacara} onChange={(e) => setSetorChacara(e.target.value)} required />
              </label>
              <label>
                Número
                <input value={numeroChacara} onChange={(e) => setNumeroChacara(e.target.value)} required />
              </label>
            </>
          )}
          <button className="cta" type="submit">
            Criar endereço
          </button>
        </form>
      </article>

      <article className="card">
        <h2>Moradores</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Telefone</th>
                <th>Endereço</th>
                <th>Ativo</th>
              </tr>
            </thead>
            <tbody>
              {moradores.map((m) => (
                <tr key={m.id}>
                  <td>{m.id}</td>
                  <td>{m.nome}</td>
                  <td>{m.email}</td>
                  <td>{m.telefone}</td>
                  <td>{m.endereco_id}</td>
                  <td>{m.ativo ? 'Sim' : 'Não'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form className="form-grid" onSubmit={(e) => void onCreateMorador(e)}>
          <h3>Criar morador</h3>
          <label>
            Nome
            <input value={moradorNome} onChange={(e) => setMoradorNome(e.target.value)} required />
          </label>
          <label>
            E-mail
            <input type="email" value={moradorEmail} onChange={(e) => setMoradorEmail(e.target.value)} required />
          </label>
          <label>
            Telefone
            <input value={moradorTelefone} onChange={(e) => setMoradorTelefone(e.target.value)} required />
          </label>
          <label>
            Senha
            <input type="password" value={moradorSenha} onChange={(e) => setMoradorSenha(e.target.value)} required />
          </label>
          <label>
            ID endereço
            <input
              type="number"
              min={1}
              value={moradorEnderecoId}
              onChange={(e) => setMoradorEnderecoId(e.target.value)}
              required
            />
          </label>
          <button className="cta" type="submit">
            Criar morador
          </button>
        </form>
        <form className="form-grid" onSubmit={(e) => void onUpdateMorador(e)}>
          <h3>Atualizar morador (ativo/inativo)</h3>
          <label>
            ID morador
            <input type="number" min={1} value={editMoradorId} onChange={(e) => setEditMoradorId(e.target.value)} required />
          </label>
          <label className="inline-option">
            <input type="checkbox" checked={editMoradorAtivo} onChange={(e) => setEditMoradorAtivo(e.target.checked)} />
            Morador ativo
          </label>
          <button className="cta" type="submit">
            Atualizar morador
          </button>
        </form>
      </article>
    </section>
  );
}
