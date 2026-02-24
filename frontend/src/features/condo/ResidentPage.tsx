import { useEffect, useState } from 'react';

import { backendApi, readApiError } from '../../services/httpClient';

type MinhaEncomenda = {
  id: number;
  codigo_interno: string;
  status: string;
  tipo: string;
};

export function ResidentPage(): JSX.Element {
  const [items, setItems] = useState<MinhaEncomenda[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const { data } = await backendApi.get<MinhaEncomenda[]>('/minhas-encomendas');
      setItems(data);
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="page-grid resident-page">
      <header className="page-header">
        <h1>Acompanhamento</h1>
        <p>Acompanhe suas encomendas e status de retirada.</p>
        <button type="button" className="button-soft" onClick={() => void load()}>
          Atualizar
        </button>
      </header>

      {error ? <p className="error-box">{error}</p> : null}
      {loading ? <p className="info-box">Carregando...</p> : null}

      <article className="card section-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Código interno</th>
                <th>Tipo</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.codigo_interno}</td>
                  <td>{item.tipo}</td>
                  <td>{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
