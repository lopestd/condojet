import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../auth/AuthContext';
import { backendApi, readApiError } from '../../services/httpClient';
import { getAppTimezone, parseApiDate } from '../../utils/dateTime';
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

type ViewPeriod = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

type DateRange = {
  start: Date
  end: Date
  label: string
};

const PERIOD_OPTIONS: Array<{ value: ViewPeriod; label: string }> = [
  { value: 'DAY', label: 'Hoje' },
  { value: 'WEEK', label: 'Ultimos 7 dias' },
  { value: 'MONTH', label: 'Mensal' },
  { value: 'YEAR', label: 'Anual' }
];

function resolveDateRange(now: Date, period: ViewPeriod): DateRange {
  const end = new Date(now);
  if (period === 'DAY') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { start, end, label: 'hoje' };
  }
  if (period === 'WEEK') {
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return { start, end, label: 'nos ultimos 7 dias' };
  }
  if (period === 'MONTH') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return { start, end, label: 'no mes atual' };
  }
  const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
  return { start, end, label: 'no ano atual' };
}

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
  const [viewPeriod, setViewPeriod] = useState<ViewPeriod>('DAY');

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
    const range = resolveDateRange(now, viewPeriod);

    let aguardando = 0;
    let notificado = 0;
    let entregue = 0;
    let atrasado = 0;
    let todayReceived = 0;
    let todayDelivered = 0;
    const overdueItems: Array<{ item: EncomendaListItem; horas: number }> = [];

    items.forEach((item) => {
      const received = parseApiDate(item.data_recebimento);
      const delivered = parseApiDate(item.data_entrega);
      const isReceivedInPeriod = Boolean(received && received >= range.start && received <= range.end);
      const isDeliveredInPeriod = Boolean(delivered && delivered >= range.start && delivered <= range.end);

      if (isReceivedInPeriod) {
        todayReceived += 1;
        if (item.status === 'RECEBIDA') aguardando += 1;
        if (item.status === 'DISPONIVEL_RETIRADA') notificado += 1;
      }
      if (isDeliveredInPeriod) {
        todayDelivered += 1;
        entregue += 1;
      }

      if (isReceivedInPeriod && isOverdue(item, now.getTime())) {
        atrasado += 1;
        if (received) {
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
      total: todayReceived + todayDelivered,
      aguardando,
      notificado,
      entregue,
      atrasado,
      todayReceived,
      todayDelivered,
      alertPackages
    };
  }, [items, now, enderecosById, viewPeriod]);

  const appTimezone = getAppTimezone();
  const dataLabel = now.toLocaleDateString('pt-BR', {
    timeZone: appTimezone,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  const horaLabel = now.toLocaleTimeString('pt-BR', { timeZone: appTimezone, hour: '2-digit', minute: '2-digit' });
  const periodLabel = resolveDateRange(now, viewPeriod).label;
  const alertTitle =
    dashboardData.alertPackages.length > 0
      ? `${dashboardData.alertPackages.length} encomendas requerem atencao ${periodLabel}`
      : `Nenhuma encomenda atrasada ${periodLabel}`;
  const hasOverdueAlerts = dashboardData.alertPackages.length > 0;
  const condominio = user?.nomeCondominio ?? (user?.condominioId ? `Condominio ${user.condominioId}` : 'CondoJET Global');
  const canCreateEncomenda = user?.role === 'ADMIN' || user?.role === 'PORTEIRO';

  return (
    <section className="page-grid dashboard-page">
      <header className="panel dashboard-hero">
        <div className="dashboard-hero-main">
          <p className="dashboard-hero-kicker">
            <span className="dashboard-condo-badge">{condominio}</span>
            <span>{`(${dataLabel} • ${horaLabel})`}</span>
          </p>
          <h1>CondoJET - Dashboard Encomendas</h1>
          <p>Acompanhamento das situações das encomendas recebidas na portaria do Condomínio.</p>
        </div>
        <div className="dashboard-hero-side">
          {canCreateEncomenda ? (
            <button type="button" className="cta dashboard-hero-cta" onClick={() => navigate('/condo/encomendas?new=1')}>
              + Nova encomenda
            </button>
          ) : null}
        </div>
      </header>

      <section className="panel dashboard-period-panel" aria-label="Periodo de visualizacao">
        <p>Periodo de visualizacao</p>
        <div className="dashboard-period-options" role="tablist" aria-label="Selecionar periodo do painel">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`dashboard-period-button ${viewPeriod === option.value ? 'active' : ''}`}
              onClick={() => setViewPeriod(option.value)}
              role="tab"
              aria-selected={viewPeriod === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="kpi-grid dashboard-kpi-grid">
        <article className="panel kpi-highlight dashboard-kpi dashboard-kpi-aguardando">
          <span>Aguardando</span>
          <strong>{dashboardData.aguardando}</strong>
          <small>{`Prontas para retirada ${periodLabel}`}</small>
        </article>
        <article className="panel kpi-highlight dashboard-kpi dashboard-kpi-notificado">
          <span>Notificados</span>
          <strong>{dashboardData.notificado}</strong>
          <small>{`Moradores avisados ${periodLabel}`}</small>
        </article>
        <article className="panel kpi-highlight dashboard-kpi dashboard-kpi-entregue">
          <span>Entregues</span>
          <strong>{dashboardData.entregue}</strong>
          <small>{`Concluidas ${periodLabel}`}</small>
        </article>
        <article className="panel kpi-highlight dashboard-kpi dashboard-kpi-atrasado">
          <span>Atrasados</span>
          <strong>{dashboardData.atrasado}</strong>
          <small>{`Pendencias ${periodLabel}`}</small>
        </article>
      </section>

      <section className="dashboard-activity-grid">
        <article className="panel dashboard-activity-card dashboard-activity-inbound">
          <h2>Recebidas</h2>
          <strong>{dashboardData.todayReceived}</strong>
          <p>{`Entradas registradas ${periodLabel}.`}</p>
        </article>

        <article className="panel dashboard-activity-card dashboard-activity-delivered">
          <h2>Entregues</h2>
          <strong>{dashboardData.todayDelivered}</strong>
          <p>{`Retiradas concluidas ${periodLabel}.`}</p>
        </article>
      </section>

      <article className={`panel dashboard-alerts-panel ${hasOverdueAlerts ? 'dashboard-alerts-panel-danger' : 'dashboard-alerts-panel-ok'}`}>
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
