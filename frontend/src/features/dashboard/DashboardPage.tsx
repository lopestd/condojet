import { useMemo, useState } from 'react';

import { useAuth } from '../../auth/AuthContext';

const MONTHS = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export function DashboardPage(): JSX.Element {
  const { user } = useAuth();
  const now = new Date();
  const [mes, setMes] = useState(String(now.getMonth()));
  const [contexto, setContexto] = useState(user?.condominioId ? `Condominio ${user.condominioId}` : 'Global SaaS');

  const kpis = useMemo(() => {
    const base = user?.role === 'ADMIN_GLOBAL' ? 42 : user?.role === 'ADMIN' ? 18 : user?.role === 'PORTEIRO' ? 11 : 7;
    return {
      entregasDia: base + Number(mes),
      pendentes: Math.max(2, Math.round(base / 2)),
      moradoresAtivos: base * 9,
      taxaEntrega: `${Math.min(98, 70 + base)}%`
    };
  }, [mes, user?.role]);

  return (
    <section className="page-grid">
      <div className="panel page-intro">
        <div>
          <h1>Visao geral</h1>
          <p>Visao consolidada da operacao com foco em encomendas, moradores e produtividade.</p>
        </div>
        <div className="filter-row">
          <label>
            Contexto
            <select value={contexto} onChange={(event) => setContexto(event.target.value)}>
              <option value={contexto}>{contexto}</option>
            </select>
          </label>
          <label>
            Mes
            <select value={mes} onChange={(event) => setMes(event.target.value)}>
              {MONTHS.map((month, idx) => (
                <option key={month} value={idx}>
                  {month}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="kpi-grid">
        <article className="panel kpi-highlight">
          <span>Entregas no dia</span>
          <strong>{kpis.entregasDia}</strong>
        </article>
        <article className="panel kpi-highlight">
          <span>Pendentes de retirada</span>
          <strong>{kpis.pendentes}</strong>
        </article>
        <article className="panel kpi-highlight">
          <span>Moradores ativos</span>
          <strong>{kpis.moradoresAtivos}</strong>
        </article>
        <article className="panel kpi-highlight">
          <span>Taxa de entrega</span>
          <strong>{kpis.taxaEntrega}</strong>
        </article>
      </div>

      <div className="content-two">
        <article className="panel">
          <h2>Status operacional</h2>
          <div className="chart-placeholder">
            <div className="bar" style={{ width: '76%' }} />
            <div className="bar" style={{ width: '58%' }} />
            <div className="bar" style={{ width: '89%' }} />
            <div className="bar" style={{ width: '64%' }} />
          </div>
        </article>
        <article className="panel">
          <h2>Resumo do turno</h2>
          <ul className="summary-list">
            <li>3 entregas aguardando confirmacao de retirada.</li>
            <li>1 reabertura pendente de validacao administrativa.</li>
            <li>Fluxo de recebimento dentro do SLA nas ultimas 24h.</li>
          </ul>
        </article>
      </div>
    </section>
  );
}
