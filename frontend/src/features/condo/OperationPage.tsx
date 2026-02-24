import { FormEvent, useEffect, useState } from 'react';

import { backendApi, readApiError } from '../../services/httpClient';

type Encomenda = {
  id: number;
  condominio_id: number;
  codigo_interno: string;
  status: string;
  tipo: string;
  morador_id: number;
  endereco_id: number;
};

export function OperationPage(): JSX.Element {
  const [items, setItems] = useState<Encomenda[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [tipo, setTipo] = useState<'PACOTE' | 'ENVELOPE' | 'CAIXA'>('PACOTE');
  const [moradorId, setMoradorId] = useState('');
  const [enderecoId, setEnderecoId] = useState('');
  const [codigoExterno, setCodigoExterno] = useState('');
  const [descricao, setDescricao] = useState('');

  const [entregaId, setEntregaId] = useState('');
  const [retiradoPorNome, setRetiradoPorNome] = useState('');

  const [reabrirId, setReabrirId] = useState('');
  const [motivoReabertura, setMotivoReabertura] = useState('');

  async function loadEncomendas(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const { data } = await backendApi.get<Encomenda[]>('/encomendas');
      setItems(data);
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEncomendas();
  }, []);

  async function onCreate(event: FormEvent): Promise<void> {
    event.preventDefault();
    try {
      await backendApi.post('/encomendas', {
        tipo,
        morador_id: Number(moradorId),
        endereco_id: Number(enderecoId),
        codigo_externo: codigoExterno || undefined,
        descricao: descricao || undefined
      });
      setMoradorId('');
      setEnderecoId('');
      setCodigoExterno('');
      setDescricao('');
      await loadEncomendas();
    } catch (err) {
      setError(readApiError(err));
    }
  }

  async function onEntregar(event: FormEvent): Promise<void> {
    event.preventDefault();
    try {
      await backendApi.put(`/encomendas/${Number(entregaId)}/entregar`, {
        retirado_por_nome: retiradoPorNome
      });
      setEntregaId('');
      setRetiradoPorNome('');
      await loadEncomendas();
    } catch (err) {
      setError(readApiError(err));
    }
  }

  async function onReabrir(event: FormEvent): Promise<void> {
    event.preventDefault();
    try {
      await backendApi.put(`/encomendas/${Number(reabrirId)}/reabrir`, {
        motivo_reabertura: motivoReabertura
      });
      setReabrirId('');
      setMotivoReabertura('');
      await loadEncomendas();
    } catch (err) {
      setError(readApiError(err));
    }
  }

  return (
    <section className="page-grid operation-page">
      <header className="page-header">
        <h1>Operação de Encomendas</h1>
        <p>Recebimento, entrega e reabertura (admin) das encomendas do condomínio.</p>
        <button type="button" className="button-soft" onClick={() => void loadEncomendas()}>
          Atualizar
        </button>
      </header>

      {error ? <p className="error-box">{error}</p> : null}
      {loading ? <p className="info-box">Carregando...</p> : null}

      <article className="card section-card">
        <h2>Encomendas</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Código</th>
                <th>Status</th>
                <th>Tipo</th>
                <th>Morador</th>
                <th>Endereço</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.codigo_interno}</td>
                  <td>{item.status}</td>
                  <td>{item.tipo}</td>
                  <td>{item.morador_id}</td>
                  <td>{item.endereco_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="card section-card">
        <h2>Receber encomenda</h2>
        <form className="form-grid inline-panel" onSubmit={(e) => void onCreate(e)}>
          <label>
            Tipo
            <select value={tipo} onChange={(e) => setTipo(e.target.value as 'PACOTE' | 'ENVELOPE' | 'CAIXA')}>
              <option value="PACOTE">PACOTE</option>
              <option value="ENVELOPE">ENVELOPE</option>
              <option value="CAIXA">CAIXA</option>
            </select>
          </label>
          <label>
            ID morador
            <input type="number" min={1} value={moradorId} onChange={(e) => setMoradorId(e.target.value)} required />
          </label>
          <label>
            ID endereço
            <input type="number" min={1} value={enderecoId} onChange={(e) => setEnderecoId(e.target.value)} required />
          </label>
          <label>
            Código externo
            <input value={codigoExterno} onChange={(e) => setCodigoExterno(e.target.value)} />
          </label>
          <label>
            Descrição
            <input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </label>
          <button className="cta" type="submit">
            Registrar recebimento
          </button>
        </form>
      </article>

      <article className="card section-card">
        <h2>Entregar encomenda</h2>
        <form className="form-grid inline-panel" onSubmit={(e) => void onEntregar(e)}>
          <label>
            ID encomenda
            <input type="number" min={1} value={entregaId} onChange={(e) => setEntregaId(e.target.value)} required />
          </label>
          <label>
            Retirado por
            <input value={retiradoPorNome} onChange={(e) => setRetiradoPorNome(e.target.value)} required />
          </label>
          <button className="cta" type="submit">
            Entregar
          </button>
        </form>
      </article>

      <article className="card section-card">
        <h2>Reabrir encomenda (somente Admin)</h2>
        <form className="form-grid inline-panel" onSubmit={(e) => void onReabrir(e)}>
          <label>
            ID encomenda
            <input type="number" min={1} value={reabrirId} onChange={(e) => setReabrirId(e.target.value)} required />
          </label>
          <label>
            Motivo
            <input value={motivoReabertura} onChange={(e) => setMotivoReabertura(e.target.value)} required />
          </label>
          <button className="cta" type="submit">
            Reabrir
          </button>
        </form>
      </article>
    </section>
  );
}
