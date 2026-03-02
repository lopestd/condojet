import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../auth/AuthContext';
import { backendApi, readApiError } from '../../services/httpClient';
import { getAppTimezone, parseApiDate } from '../../utils/dateTime';
import type { Endereco } from '../encomendas/types';
import type { EncomendaListItem } from '../encomendas/types';
import { isForgotten } from '../encomendas/utils/statusMapping';

type DashboardData = {
  total: number
  aguardando: number
  notificado: number
  entregue: number
  esquecida: number
  todayReceived: number
  alertPackages: AlertItem[]
}

type AlertItem = {
  id: number
  nome: string
  endereco: {
    quadra: string
    secondLabel: string
    secondValue: string
    thirdLabel: string
    thirdValue: string
  }
  tempoAguardandoDias: number
  risco: 'Esquecida crítica' | 'Esquecida'
};

type ViewPeriod = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

type DateRange = {
  start: Date
  end: Date
  label: string
};

const PERIOD_OPTIONS: Array<{ value: ViewPeriod; label: string }> = [
  { value: 'DAY', label: 'Hoje' },
  { value: 'WEEK', label: 'Últimos 7 dias' },
  { value: 'MONTH', label: 'Últimos 30 dias' },
  { value: 'YEAR', label: 'Anual' }
];
const DEFAULT_FORGOTTEN_DAYS = 15;
const DAY_MS = 1000 * 60 * 60 * 24;

type ConfiguracoesResponse = {
  timezone: string;
  prazo_dias_encomenda_esquecida: number;
};

function capitalizeFirst(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function resolveDateRange(now: Date, period: ViewPeriod, dataAnchor: Date): DateRange {
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
    return { start, end, label: 'nos últimos 7 dias' };
  }
  if (period === 'MONTH') {
    const start = new Date(now);
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    return { start, end, label: 'nos últimos 30 dias' };
  }
  const start = new Date(dataAnchor.getFullYear(), 0, 1, 0, 0, 0, 0);
  const endOfYear = new Date(dataAnchor.getFullYear(), 11, 31, 23, 59, 59, 999);
  return { start, end: endOfYear, label: `no ano de ${dataAnchor.getFullYear()}` };
}

function initials(nome: string): string {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function getEnderecoParts(endereco: Endereco | undefined): {
  quadra: string
  secondLabel: string
  secondValue: string
  thirdLabel: string
  thirdValue: string
} {
  if (!endereco) {
    return {
      quadra: '-',
      secondLabel: 'Conjunto',
      secondValue: '-',
      thirdLabel: 'Lote',
      thirdValue: '-'
    };
  }
  if (endereco.tipo_endereco === 'QUADRA_SETOR_CHACARA') {
    return {
      quadra: endereco.quadra || '-',
      secondLabel: 'Setor/Chácara',
      secondValue: endereco.setor_chacara || '-',
      thirdLabel: 'Número Chácara',
      thirdValue: endereco.numero_chacara || '-'
    };
  }
  return {
    quadra: endereco.quadra || '-',
    secondLabel: 'Conjunto',
    secondValue: endereco.conjunto || '-',
    thirdLabel: 'Lote',
    thirdValue: endereco.lote || '-'
  };
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
  const [forgottenDaysThreshold, setForgottenDaysThreshold] = useState<number>(DEFAULT_FORGOTTEN_DAYS);

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
        if (user?.role === 'ADMIN' || user?.role === 'PORTEIRO') {
          try {
            const { data } = await backendApi.get<ConfiguracoesResponse>('/configuracoes');
            setForgottenDaysThreshold(data.prazo_dias_encomenda_esquecida ?? DEFAULT_FORGOTTEN_DAYS);
          } catch {
            setForgottenDaysThreshold(DEFAULT_FORGOTTEN_DAYS);
          }
        } else {
          setForgottenDaysThreshold(DEFAULT_FORGOTTEN_DAYS);
        }
      } catch (err) {
        setError(readApiError(err));
      } finally {
        setLoading(false);
      }
    }
    void loadDashboardData();
  }, [user?.role]);

  const dataAnchor = useMemo(() => {
    let latest: Date | null = null;
    items.forEach((item) => {
      const received = parseApiDate(item.data_recebimento);
      const delivered = parseApiDate(item.data_entrega);
      if (received && (!latest || received > latest)) latest = received;
      if (delivered && (!latest || delivered > latest)) latest = delivered;
    });
    return latest ?? now;
  }, [items, now]);

  const dashboardData = useMemo<DashboardData>(() => {
    const range = resolveDateRange(now, viewPeriod, dataAnchor);

    let aguardando = 0;
    let notificado = 0;
    let entregue = 0;
    let esquecida = 0;
    let todayReceived = 0;
    const overdueItems: Array<{ item: EncomendaListItem; dias: number }> = [];

    items.forEach((item) => {
      const received = parseApiDate(item.data_recebimento);
      const delivered = parseApiDate(item.data_entrega);
      const forgotten = isForgotten(item, forgottenDaysThreshold, now.getTime());
      const isReceivedInPeriod = Boolean(received && received >= range.start && received <= range.end);
      const isDeliveredInPeriod = Boolean(delivered && delivered >= range.start && delivered <= range.end);
      const notified = item.status === 'DISPONIVEL_RETIRADA';
      const pending = item.status === 'RECEBIDA' || notified || forgotten;

      if (pending) {
        aguardando += 1;
      }
      if (notified) {
        if (isReceivedInPeriod) {
          notificado += 1;
        }
      }
      if (forgotten) {
        esquecida += 1;
      }
      if (isReceivedInPeriod) {
        todayReceived += 1;
      }
      if (isDeliveredInPeriod) {
        entregue += 1;
      }

      if (forgotten) {
        if (received) {
          const dias = Math.max(1, Math.floor((now.getTime() - received.getTime()) / DAY_MS));
          overdueItems.push({ item, dias });
        }
      }
    });

    overdueItems.sort((a, b) => b.dias - a.dias);
    const alertPackages: AlertItem[] = overdueItems.slice(0, 10).map(({ item, dias }) => {
      const endereco = enderecosById.get(item.endereco_id);
      return {
        id: item.id,
        nome: item.morador_nome ?? `Morador #${item.morador_id}`,
        endereco: getEnderecoParts(endereco),
        tempoAguardandoDias: dias,
        risco: dias >= 3 ? 'Esquecida crítica' : 'Esquecida'
      };
    });

    return {
      total: items.length,
      aguardando,
      notificado,
      entregue,
      esquecida,
      todayReceived,
      alertPackages
    };
  }, [items, now, enderecosById, viewPeriod, dataAnchor, forgottenDaysThreshold]);

  const appTimezone = getAppTimezone();
  const dataLabel = now.toLocaleDateString('pt-BR', {
    timeZone: appTimezone,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  const horaLabel = now.toLocaleTimeString('pt-BR', { timeZone: appTimezone, hour: '2-digit', minute: '2-digit' });
  const periodLabel = resolveDateRange(now, viewPeriod, dataAnchor).label;
  const yearPeriodText = String(dataAnchor.getFullYear());
  const periodOptions = PERIOD_OPTIONS.map((option) => {
    if (option.value === 'YEAR') return { ...option, label: `Anual (${yearPeriodText})` };
    return option;
  });
  const alertTitle = 'Top 10 encomendas mais antigas aguardando retirada.';
  const hasOverdueAlerts = dashboardData.alertPackages.length > 0;
  const condominio = user?.nomeCondominio ?? (user?.condominioId ? `Condomínio ${user.condominioId}` : 'CondoJET Global');
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

      <section className="panel dashboard-period-panel" aria-label="Período de visualização">
        <p>Período de visualização</p>
        <div className="dashboard-period-options" role="tablist" aria-label="Selecionar período do painel">
          {periodOptions.map((option) => (
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
        <article className="panel kpi-highlight dashboard-kpi dashboard-kpi-recebidas">
          <span>Recebidas</span>
          <strong>{dashboardData.todayReceived}</strong>
          <small>{`Entradas registradas ${periodLabel}`}</small>
        </article>
        <article className="panel kpi-highlight dashboard-kpi dashboard-kpi-entregue">
          <span>Entregues</span>
          <strong>{dashboardData.entregue}</strong>
          <small>{`Concluídas ${periodLabel}`}</small>
        </article>
        <article className="panel kpi-highlight dashboard-kpi dashboard-kpi-notificado">
          <span>Notificados</span>
          <strong>{dashboardData.notificado}</strong>
          <small>{`Moradores avisados ${periodLabel}`}</small>
        </article>
        <article className="panel kpi-highlight dashboard-kpi dashboard-kpi-aguardando">
          <span>Aguardando retirada</span>
          <strong>{dashboardData.aguardando}</strong>
          <small>Pendências ativas (inclui notificadas e esquecidas)</small>
        </article>
        <article className="panel kpi-highlight dashboard-kpi dashboard-kpi-atrasado">
          <span>Esquecidas</span>
          <strong>{dashboardData.esquecida}</strong>
          <small>{`Aguardando retirada há mais de ${forgottenDaysThreshold} dias`}</small>
        </article>
      </section>

      <article className={`panel dashboard-alerts-panel ${hasOverdueAlerts ? 'dashboard-alerts-panel-danger' : 'dashboard-alerts-panel-ok'}`}>
        <div className="dashboard-alerts-head">
          <h2>{alertTitle}</h2>
          <small>{`Exibindo ${dashboardData.alertPackages.length} de ${dashboardData.esquecida} encomendas esquecidas`}</small>
        </div>
        {loading ? <p className="info-box">Carregando painel...</p> : null}
        {error ? <p className="error-box">{error}</p> : null}
        {!loading && !error && dashboardData.alertPackages.length === 0 ? (
          <p className="dashboard-empty-alerts">Fluxo normalizado: nenhuma encomenda esquecida no momento.</p>
        ) : !loading && !error ? (
          <ul className="dashboard-alerts-list">
            {dashboardData.alertPackages.map((alert) => (
              <li key={alert.id} className="dashboard-alert-item">
                <div className="dashboard-alert-avatar" aria-hidden="true">
                  {initials(alert.nome)}
                </div>
                <div className="dashboard-alert-content">
                  <p className="dashboard-alert-destinatario">
                    <strong>Destinatário(a):</strong> {alert.nome}
                  </p>
                  <div className="dashboard-alert-body">
                    <div className="address-stack dashboard-alert-address">
                      <p><strong>Quadra:</strong> {alert.endereco.quadra}</p>
                      <p><strong>{alert.endereco.secondLabel}:</strong> {alert.endereco.secondValue}</p>
                      <p><strong>{alert.endereco.thirdLabel}:</strong> {alert.endereco.thirdValue}</p>
                    </div>
                    <div className="dashboard-alert-meta">
                      <small>{`Aguardando --> ${alert.tempoAguardandoDias} dias.`}</small>
                      <span className={`status-badge ${alert.risco === 'Esquecida crítica' ? 'inactive' : 'recebida'}`}>{alert.risco}</span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </article>
    </section>
  );
}
