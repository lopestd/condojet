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
      recebidasHoje: base + Number(mes),
      pendentes: Math.max(2, Math.round(base / 2)),
      entreguesHoje: Math.max(1, base - 3),
      atrasadas: Math.max(1, Math.round(base / 4)),
      notificadas: Math.max(1, Math.round((base + Number(mes)) / 2)),
      taxaEntrega: `${Math.min(98, 70 + base)}%`
    };
  }, [mes, user?.role]);

  const insights = useMemo(
    () => [
      `${kpis.atrasadas} encomendas exigem acompanhamento prioritario.`,
      `${kpis.notificadas} moradores ja foram notificados hoje.`,
      `Taxa estimada de entrega no periodo: ${kpis.taxaEntrega}.`
    ],
    [kpis.atrasadas, kpis.notificadas, kpis.taxaEntrega]
  );

  const dataAtualLabel = now.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  return (
    <section className="page-grid dashboard-page">
      <header className="panel dashboard-hero">
        <div>
          <p className="dashboard-hero-kicker">Painel Operacional</p>
          <h1>Dashboard CondoJET</h1>
          <p>Visao consolidada do fluxo de recebimento, notificacao e entrega de encomendas.</p>
          <small>{dataAtualLabel}</small>
        </div>
        <div className="filter-row dashboard-filters">
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
      </header>

      <section className="kpi-grid dashboard-kpi-grid">
        <article className="panel kpi-highlight dashboard-kpi">
          <span>Recebidas hoje</span>
          <strong>{kpis.recebidasHoje}</strong>
        </article>
        <article className="panel kpi-highlight dashboard-kpi">
          <span>Pendentes de retirada</span>
          <strong>{kpis.pendentes}</strong>
        </article>
        <article className="panel kpi-highlight dashboard-kpi">
          <span>Entregues hoje</span>
          <strong>{kpis.entreguesHoje}</strong>
        </article>
        <article className="panel kpi-highlight dashboard-kpi">
          <span>Taxa de entrega</span>
          <strong>{kpis.taxaEntrega}</strong>
        </article>
      </section>

      <section className="content-two">
        <article className="panel dashboard-panel">
          <h2>Fluxo operacional</h2>
          <div className="chart-placeholder">
            <div className="bar" style={{ width: '82%' }} />
            <div className="bar" style={{ width: '67%' }} />
            <div className="bar" style={{ width: '91%' }} />
            <div className="bar" style={{ width: '58%' }} />
          </div>
          <p className="dashboard-panel-caption">Capacidade de processamento por etapa nas ultimas 24 horas.</p>
        </article>

        <article className="panel dashboard-panel">
          <h2>Alertas e prioridade</h2>
          <ul className="summary-list">
            {insights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="dashboard-dual-grid">
        <article className="panel dashboard-panel">
          <h2>Resumo do turno</h2>
          <ul className="summary-list">
            <li>{`Pendentes de retirada: ${kpis.pendentes}`}</li>
            <li>{`Notificadas hoje: ${kpis.notificadas}`}</li>
            <li>{`Atrasadas em observacao: ${kpis.atrasadas}`}</li>
          </ul>
        </article>

        <article className="panel dashboard-panel">
          <h2>Checklist operacional</h2>
          <ul className="summary-list">
            <li>Conferir codigo interno antes de concluir entrega.</li>
            <li>Registrar nome de retirada em toda entrega efetuada.</li>
            <li>Revisar encomendas pendentes acima de 48 horas.</li>
          </ul>
        </article>
      </section>
    </section>
  );
}
