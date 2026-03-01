import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../auth/AuthContext';
import { backendApi, readApiError } from '../../services/httpClient';
import type { Endereco } from '../encomendas/types';
import type { EncomendaListItem } from '../encomendas/types';
import { isOverdue } from '../encomendas/utils/statusMapping';

type DashboardData = {
  total: number
  aguardando: number
  notificado: number
  entregue: number
  atrasado: number
  todayReceived: number
  todayDelivered: number
  alertPackages: AlertItem[]
}

type AlertItem = {
  id: number
  nome: string
  apartamento: string
  tempoAguardandoHoras: number
  risco: 'Atrasado critico' | 'Atrasado'
};

function initials(nome: string): string {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function DashboardPage(): JSX.Element {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [now, setNow] = useState(() => new Date());
  const [items, setItems] = useState<EncomendaListItem[]>([]);
  const [enderecosById, setEnderecosById] = useState<Map<number, Endereco>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadDashboardData(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const [encomendasResponse, enderecosResponse] = await Promise.all([
          backendApi.get<EncomendaListItem[]>('/encomendas'),
          backendApi.get<Endereco[]>('/enderecos')
        ]);
        setItems(encomendasResponse.data);
        const map = new Map<number, Endereco>();
        enderecosResponse.data.forEach((endereco) => {
          map.set(endereco.id, endereco);
        });
        setEnderecosById(map);
      } catch (err) {
        setError(readApiError(err));
      } finally {
        setLoading(false);
      }
    }
    void loadDashboardData();
  }, []);

  const dashboardData = useMemo<DashboardData>(() => {
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    let aguardando = 0;
    let notificado = 0;
    let entregue = 0;
    let atrasado = 0;
    let todayReceived = 0;
    let todayDelivered = 0;
    const overdueItems: Array<{ item: EncomendaListItem; horas: number }> = [];

    items.forEach((item) => {
      if (item.status === 'RECEBIDA') aguardando += 1;
      if (item.status === 'DISPONIVEL_RETIRADA') notificado += 1;
      if (item.status === 'ENTREGUE') entregue += 1;

      const received = item.data_recebimento ? new Date(item.data_recebimento) : null;
      if (received && !Number.isNaN(received.getTime())) {
        if (received >= startOfToday && received <= endOfToday) {
          todayReceived += 1;
        }
      }

      const delivered = item.data_entrega ? new Date(item.data_entrega) : null;
      if (delivered && !Number.isNaN(delivered.getTime())) {
        if (delivered >= startOfToday && delivered <= endOfToday) {
          todayDelivered += 1;
        }
      }

      if (isOverdue(item, now.getTime())) {
        atrasado += 1;
        if (received && !Number.isNaN(received.getTime())) {
          const horas = Math.max(1, Math.floor((now.getTime() - received.getTime()) / (1000 * 60 * 60)));
          overdueItems.push({ item, horas });
        }
      }
    });

    overdueItems.sort((a, b) => b.horas - a.horas);
    const alertPackages: AlertItem[] = overdueItems.slice(0, 6).map(({ item, horas }) => {
      const endereco = enderecosById.get(item.endereco_id);
      const apartamento = item.endereco_label || (endereco ? `${endereco.quadra}` : `Endereco #${item.endereco_id}`);
      return {
        id: item.id,
        nome: item.morador_nome ?? `Morador #${item.morador_id}`,
        apartamento,
        tempoAguardandoHoras: horas,
        risco: horas >= 72 ? 'Atrasado critico' : 'Atrasado'
      };
    });

    return {
      total: items.length,
      aguardando,
      notificado,
      entregue,
      atrasado,
      todayReceived,
      todayDelivered,
      alertPackages
    };
  }, [items, now, enderecosById]);

  const dataLabel = now.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  const horaLabel = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const alertTitle =
    dashboardData.alertPackages.length > 0
      ? `${dashboardData.alertPackages.length} encomendas requerem atencao`
      : 'Nenhuma encomenda atrasada';
  const contexto = user?.nomeCondominio ?? (user?.condominioId ? `Condominio ${user.condominioId}` : 'CondoJET Global');
  const canCreateEncomenda = user?.role === 'ADMIN' || user?.role === 'PORTEIRO';

  return (
    <section className="page-grid dashboard-page">
      <header className="panel dashboard-hero">
        <div className="dashboard-hero-main">
          <p className="dashboard-hero-kicker">{`${dataLabel} • ${horaLabel}`}</p>
          <h1>CondoJET - Encomendas</h1>
          <p>Visao executiva da operacao com foco em desempenho diario e tratativa de pendencias.</p>
          <small>{`Contexto: ${contexto}`}</small>
        </div>
        <div className="dashboard-hero-side">
          {canCreateEncomenda ? (
            <button type="button" className="cta dashboard-hero-cta" onClick={() => navigate('/encomendas')}>
              + Nova encomenda
            </button>
          ) : null}
        </div>
      </header>

      <section className="kpi-grid dashboard-kpi-grid">
        <article className="panel kpi-highlight dashboard-kpi dashboard-kpi-aguardando">
          <span>Aguardando</span>
          <strong>{dashboardData.aguardando}</strong>
          <small>Prontas para retirada</small>
        </article>
        <article className="panel kpi-highlight dashboard-kpi dashboard-kpi-notificado">
          <span>Notificados</span>
          <strong>{dashboardData.notificado}</strong>
          <small>Moradores avisados hoje</small>
        </article>
        <article className="panel kpi-highlight dashboard-kpi dashboard-kpi-entregue">
          <span>Entregues</span>
          <strong>{dashboardData.entregue}</strong>
          <small>Volume no periodo</small>
        </article>
        <article className="panel kpi-highlight dashboard-kpi dashboard-kpi-atrasado">
          <span>Atrasados</span>
          <strong>{dashboardData.atrasado}</strong>
          <small>Requerem atencao imediata</small>
        </article>
      </section>

      <section className="dashboard-activity-grid">
        <article className="panel dashboard-activity-card dashboard-activity-inbound">
          <h2>Recebidas hoje</h2>
          <strong>{dashboardData.todayReceived}</strong>
          <p>Entradas registradas nas ultimas 24 horas.</p>
        </article>

        <article className="panel dashboard-activity-card dashboard-activity-delivered">
          <h2>Entregues hoje</h2>
          <strong>{dashboardData.todayDelivered}</strong>
          <p>Retiradas concluidas no turno.</p>
        </article>
      </section>

      <article className="panel dashboard-alerts-panel">
        <div className="dashboard-alerts-head">
          <h2>{alertTitle}</h2>
          <small>{`Total monitorado: ${dashboardData.total} encomendas`}</small>
        </div>
        {loading ? <p className="info-box">Carregando painel...</p> : null}
        {error ? <p className="error-box">{error}</p> : null}
        {!loading && !error && dashboardData.alertPackages.length === 0 ? (
          <p className="dashboard-empty-alerts">Fluxo normalizado: nenhuma entrega em atraso no momento.</p>
        ) : !loading && !error ? (
          <ul className="dashboard-alerts-list">
            {dashboardData.alertPackages.map((alert) => (
              <li key={alert.id} className="dashboard-alert-item">
                <div className="dashboard-alert-avatar" aria-hidden="true">
                  {initials(alert.nome)}
                </div>
                <div className="dashboard-alert-content">
                  <p>{alert.nome}</p>
                  <small>{alert.apartamento}</small>
                </div>
                <div className="dashboard-alert-meta">
                  <small>{`${alert.tempoAguardandoHoras}h aguardando`}</small>
                  <span className={`status-badge ${alert.risco === 'Atrasado critico' ? 'inactive' : 'recebida'}`}>{alert.risco}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </article>
    </section>
  );
}
