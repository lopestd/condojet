import { useEffect, useMemo, useState } from 'react';

import { backendApi, readApiError } from '../../services/httpClient';
import { parseApiDate } from '../../utils/dateTime';
import type { Endereco, EncomendaListItem } from '../encomendas/types';

type ViewPeriod = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

type DateRange = {
  start: Date;
  end: Date;
  label: string;
};

type RiskBuckets = {
  ate24h: number;
  de24a48h: number;
  de48a72h: number;
  acima72h: number;
};

const PERIOD_OPTIONS: Array<{ value: ViewPeriod; label: string }> = [
  { value: 'DAY', label: 'Hoje' },
  { value: 'WEEK', label: 'Ultimos 7 dias' },
  { value: 'MONTH', label: 'Mensal' },
  { value: 'YEAR', label: 'Anual' }
];

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

function capitalizeFirst(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function resolveDateRange(now: Date, period: ViewPeriod, dataAnchor: Date, selectedYear: number): DateRange {
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
    const start = new Date(dataAnchor.getFullYear(), dataAnchor.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(dataAnchor.getFullYear(), dataAnchor.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthLabel = capitalizeFirst(start.toLocaleDateString('pt-BR', { month: 'long' }));
    return { start, end: endOfMonth, label: `no mes de ${monthLabel}` };
  }
  const start = new Date(selectedYear, 0, 1, 0, 0, 0, 0);
  const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
  return { start, end: endOfYear, label: `no ano de ${selectedYear}` };
}

function parseDateTime(data?: string | null, hora?: string | null): Date | null {
  const date = parseApiDate(data);
  if (!date) return null;
  if (!hora) return date;
  const parts = hora.split(':').map((value) => Number(value));
  const hh = Number.isFinite(parts[0]) ? parts[0] : 0;
  const mm = Number.isFinite(parts[1]) ? parts[1] : 0;
  const ss = Number.isFinite(parts[2]) ? parts[2] : 0;
  date.setHours(hh, mm, ss, 0);
  return date;
}

function inRange(date: Date | null, range: DateRange): boolean {
  if (!date) return false;
  return date >= range.start && date <= range.end;
}

function formatHours(value: number): string {
  if (!Number.isFinite(value)) return '-';
  return `${value.toFixed(1)}h`;
}

export function ReportsPage(): JSX.Element {
  const [viewPeriod, setViewPeriod] = useState<ViewPeriod>('MONTH');
  const [now, setNow] = useState(() => new Date());
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<EncomendaListItem[]>([]);
  const [enderecos, setEnderecos] = useState<Endereco[]>([]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadData(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const [encomendasResponse, enderecosResponse] = await Promise.all([
          backendApi.get<EncomendaListItem[]>('/encomendas'),
          backendApi.get<Endereco[]>('/enderecos')
        ]);
        setItems(encomendasResponse.data);
        setEnderecos(enderecosResponse.data);
      } catch (err) {
        setError(readApiError(err));
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  const allRecordDates = useMemo(() => {
    const dates: Date[] = [];
    items.forEach((item) => {
      const received = parseDateTime(item.data_recebimento, item.hora_recebimento);
      const delivered = parseApiDate(item.data_entrega);
      if (received) dates.push(received);
      if (delivered) dates.push(delivered);
    });
    return dates;
  }, [items]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    allRecordDates.forEach((date) => years.add(date.getFullYear()));
    if (years.size === 0) years.add(now.getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [allRecordDates, now]);

  useEffect(() => {
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  const dataAnchor = useMemo(() => {
    const datesForSelectedYear = allRecordDates.filter((date) => date.getFullYear() === selectedYear);
    const source = datesForSelectedYear.length > 0 ? datesForSelectedYear : allRecordDates;
    if (source.length === 0) return now;
    return source.reduce((latest, current) => (current > latest ? current : latest));
  }, [allRecordDates, selectedYear, now]);

  const range = useMemo(
    () => resolveDateRange(now, viewPeriod, dataAnchor, selectedYear),
    [now, viewPeriod, dataAnchor, selectedYear]
  );

  const periodOptions = useMemo(() => {
    const monthLabel = capitalizeFirst(dataAnchor.toLocaleDateString('pt-BR', { month: 'long' }));
    return PERIOD_OPTIONS.map((option) => {
      if (option.value === 'MONTH') return { ...option, label: `Mensal (${monthLabel})` };
      if (option.value === 'YEAR') return { ...option, label: `Anual (${selectedYear})` };
      return option;
    });
  }, [dataAnchor, selectedYear]);

  const report = useMemo(() => {
    const enderecosById = new Map<number, Endereco>();
    enderecos.forEach((endereco) => enderecosById.set(endereco.id, endereco));

    const recebidasNoPeriodo = items.filter((item) => inRange(parseDateTime(item.data_recebimento, item.hora_recebimento), range));
    const entreguesNoPeriodo = items.filter((item) => item.status === 'ENTREGUE' && inRange(parseApiDate(item.data_entrega), range));

    const emAberto = items.filter((item) => item.status !== 'ENTREGUE');
    const atrasadasEmAberto = emAberto.filter((item) => {
      const recebidaEm = parseDateTime(item.data_recebimento, item.hora_recebimento);
      if (!recebidaEm) return false;
      return now.getTime() - recebidaEm.getTime() >= 48 * 60 * 60 * 1000;
    });

    const riskBuckets: RiskBuckets = { ate24h: 0, de24a48h: 0, de48a72h: 0, acima72h: 0 };

    emAberto.forEach((item) => {
      const recebidaEm = parseDateTime(item.data_recebimento, item.hora_recebimento);
      if (!recebidaEm) return;
      const waitingHours = (now.getTime() - recebidaEm.getTime()) / (1000 * 60 * 60);
      if (waitingHours < 24) {
        riskBuckets.ate24h += 1;
      } else if (waitingHours < 48) {
        riskBuckets.de24a48h += 1;
      } else if (waitingHours < 72) {
        riskBuckets.de48a72h += 1;
      } else {
        riskBuckets.acima72h += 1;
      }
    });

    const slaDurationsHours = entreguesNoPeriodo
      .map((item) => {
        const recebidaEm = parseDateTime(item.data_recebimento, item.hora_recebimento);
        const entregueEm = parseApiDate(item.data_entrega);
        if (!recebidaEm || !entregueEm) return null;
        const diff = (entregueEm.getTime() - recebidaEm.getTime()) / (1000 * 60 * 60);
        return diff >= 0 ? diff : null;
      })
      .filter((value): value is number => value !== null);

    const slaCount = slaDurationsHours.length;
    const slaAverage = slaCount > 0 ? slaDurationsHours.reduce((sum, value) => sum + value, 0) / slaCount : 0;
    const sla24 = slaCount > 0 ? (slaDurationsHours.filter((value) => value <= 24).length / slaCount) * 100 : 0;
    const sla48 = slaCount > 0 ? (slaDurationsHours.filter((value) => value <= 48).length / slaCount) * 100 : 0;

    const volumeByEnderecoMap = new Map<string, number>();
    recebidasNoPeriodo.forEach((item) => {
      const endereco = enderecosById.get(item.endereco_id);
      const label = item.endereco_label || (endereco ? endereco.quadra : `Endereco #${item.endereco_id}`);
      volumeByEnderecoMap.set(label, (volumeByEnderecoMap.get(label) ?? 0) + 1);
    });
    const volumeByEndereco = Array.from(volumeByEnderecoMap.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const receivedByWeekday = new Array<number>(7).fill(0);
    const deliveredByWeekday = new Array<number>(7).fill(0);

    recebidasNoPeriodo.forEach((item) => {
      const receivedAt = parseDateTime(item.data_recebimento, item.hora_recebimento);
      if (!receivedAt) return;
      receivedByWeekday[receivedAt.getDay()] += 1;
    });

    entreguesNoPeriodo.forEach((item) => {
      const deliveredAt = parseApiDate(item.data_entrega);
      if (!deliveredAt) return;
      deliveredByWeekday[deliveredAt.getDay()] += 1;
    });

    const consistency = {
      semDataRecebimento: items.filter((item) => !item.data_recebimento).length,
      entregueSemDataEntrega: items.filter((item) => item.status === 'ENTREGUE' && !item.data_entrega).length,
      abertoSemMorador: items.filter((item) => item.status !== 'ENTREGUE' && !item.morador_nome).length
    };

    return {
      recebidasNoPeriodo: recebidasNoPeriodo.length,
      entreguesNoPeriodo: entreguesNoPeriodo.length,
      emAberto: emAberto.length,
      atrasadasEmAberto: atrasadasEmAberto.length,
      riskBuckets,
      slaCount,
      slaAverage,
      sla24,
      sla48,
      volumeByEndereco,
      receivedByWeekday,
      deliveredByWeekday,
      consistency
    };
  }, [items, enderecos, range, now]);

  return (
    <section className="page-grid reports-page">
      <header className="panel reports-header">
        <div>
          <h1>Relatorios de Encomendas</h1>
          <p>{`Indicadores operacionais ${range.label}, com base nos dados reais registrados no sistema.`}</p>
        </div>
        <div className="reports-period" role="tablist" aria-label="Selecionar periodo dos relatorios">
          {periodOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`reports-period-button ${viewPeriod === option.value ? 'active' : ''}`}
              onClick={() => setViewPeriod(option.value)}
              role="tab"
              aria-selected={viewPeriod === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
        {viewPeriod === 'YEAR' ? (
          <label className="reports-year-select">
            Ano
            <select value={String(selectedYear)} onChange={(event) => setSelectedYear(Number(event.target.value))}>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </header>

      {loading ? <p className="info-box">Carregando relatorios...</p> : null}
      {error ? <p className="error-box">{error}</p> : null}

      {!loading && !error ? (
        <>
          <section className="kpi-grid reports-kpi-grid">
            <article className="panel kpi-highlight">
              <span>Recebidas</span>
              <strong>{report.recebidasNoPeriodo}</strong>
              <small>No periodo selecionado</small>
            </article>
            <article className="panel kpi-highlight">
              <span>Entregues</span>
              <strong>{report.entreguesNoPeriodo}</strong>
              <small>No periodo selecionado</small>
            </article>
            <article className="panel kpi-highlight">
              <span>Em aberto</span>
              <strong>{report.emAberto}</strong>
              <small>Estoque atual</small>
            </article>
            <article className="panel kpi-highlight">
              <span>Atrasadas</span>
              <strong>{report.atrasadasEmAberto}</strong>
              <small>Abertas ha 48h ou mais</small>
            </article>
          </section>

          <section className="reports-grid">
            <article className="panel report-card">
              <h2>SLA de Entrega</h2>
              <p>Tempo entre recebimento e retirada das encomendas entregues no periodo.</p>
              <dl>
                <div>
                  <dt>Base analisada</dt>
                  <dd>{report.slaCount} entregas</dd>
                </div>
                <div>
                  <dt>Tempo medio</dt>
                  <dd>{formatHours(report.slaAverage)}</dd>
                </div>
                <div>
                  <dt>Dentro de 24h</dt>
                  <dd>{`${report.sla24.toFixed(1)}%`}</dd>
                </div>
                <div>
                  <dt>Dentro de 48h</dt>
                  <dd>{`${report.sla48.toFixed(1)}%`}</dd>
                </div>
              </dl>
            </article>

            <article className="panel report-card">
              <h2>Risco de Atraso</h2>
              <p>Classificacao das encomendas em aberto por tempo de espera atual.</p>
              <ul className="report-list">
                <li><b>Ate 24h:</b> {report.riskBuckets.ate24h}</li>
                <li><b>24h a 48h:</b> {report.riskBuckets.de24a48h}</li>
                <li><b>48h a 72h:</b> {report.riskBuckets.de48a72h}</li>
                <li><b>Acima de 72h:</b> {report.riskBuckets.acima72h}</li>
              </ul>
            </article>

            <article className="panel report-card report-card-wide">
              <h2>Volume por Localizacao</h2>
              <p>Top localizacoes com maior volume de recebimento no periodo.</p>
              {report.volumeByEndereco.length === 0 ? (
                <p className="report-empty">Sem registros no periodo selecionado.</p>
              ) : (
                <ul className="report-volume-list">
                  {report.volumeByEndereco.map((row) => (
                    <li key={row.label}>
                      <span>{row.label}</span>
                      <b>{row.count}</b>
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article className="panel report-card">
              <h2>Fluxo por Dia da Semana</h2>
              <p>Comparativo de recebimentos e entregas por dia da semana no periodo.</p>
              <ul className="report-week-list">
                {WEEK_DAYS.map((day, index) => (
                  <li key={day}>
                    <span>{day}</span>
                    <small>{`Rec ${report.receivedByWeekday[index]} | Ent ${report.deliveredByWeekday[index]}`}</small>
                  </li>
                ))}
              </ul>
            </article>

            <article className="panel report-card">
              <h2>Auditoria de Consistencia</h2>
              <p>Qualidade dos registros para rastreabilidade e conformidade.</p>
              <ul className="report-list">
                <li><b>Sem data de recebimento:</b> {report.consistency.semDataRecebimento}</li>
                <li><b>Entregues sem data de entrega:</b> {report.consistency.entregueSemDataEntrega}</li>
                <li><b>Abertas sem nome do morador:</b> {report.consistency.abertoSemMorador}</li>
              </ul>
            </article>
          </section>
        </>
      ) : null}
    </section>
  );
}
