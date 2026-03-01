import { useEffect, useMemo, useState } from 'react';

import { backendApi, readApiError } from '../../services/httpClient';
import { parseApiDate } from '../../utils/dateTime';
import type { Endereco, EncomendaListItem } from '../encomendas/types';

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

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

function capitalizeFirst(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => {
  const base = new Date(2026, index, 1);
  return {
    value: index,
    label: capitalizeFirst(base.toLocaleDateString('pt-BR', { month: 'long' }))
  };
});

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

function resolveDateRange(selectedYear: number, monthStart: number, monthEnd: number): DateRange {
  const start = new Date(selectedYear, monthStart, 1, 0, 0, 0, 0);
  const end = new Date(selectedYear, monthEnd + 1, 0, 23, 59, 59, 999);
  const startLabel = capitalizeFirst(start.toLocaleDateString('pt-BR', { month: 'long' }));
  const endLabel = capitalizeFirst(end.toLocaleDateString('pt-BR', { month: 'long' }));
  const label = monthStart === monthEnd
    ? `no mes de ${startLabel}/${selectedYear}`
    : `de ${startLabel} a ${endLabel}/${selectedYear}`;
  return { start, end, label };
}

function formatHours(value: number): string {
  if (!Number.isFinite(value)) return '-';
  return `${value.toFixed(1)}h`;
}

export function ReportsPage(): JSX.Element {
  const [now, setNow] = useState(() => new Date());
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [monthStart, setMonthStart] = useState(() => new Date().getMonth());
  const [monthEnd, setMonthEnd] = useState(() => new Date().getMonth());
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
    years.add(now.getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [allRecordDates, now]);

  useEffect(() => {
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  const range = useMemo(() => resolveDateRange(selectedYear, monthStart, monthEnd), [selectedYear, monthStart, monthEnd]);

  const report = useMemo(() => {
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
      receivedByWeekday,
      deliveredByWeekday,
      consistency
    };
  }, [items, enderecos, range, now]);

  const monthEndOptions = MONTH_OPTIONS.filter((option) => option.value >= monthStart);

  return (
    <section className="page-grid reports-page">
      <header className="panel reports-header">
        <div>
          <h1>Relatorios de Encomendas</h1>
          <p>{`Indicadores operacionais ${range.label}, com base nos dados reais registrados no sistema.`}</p>
        </div>
        <div className="reports-period" aria-label="Selecionar periodo dos relatorios">
          <label className="reports-period-card active">
            <span className="reports-period-card-head">Escolha o Ano</span>
            <select
              value={String(selectedYear)}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>

          <label className="reports-period-card active">
            <span className="reports-period-card-head">Mes inicio</span>
            <select
              value={String(monthStart)}
              onChange={(event) => {
                const nextStart = Number(event.target.value);
                setMonthStart(nextStart);
                setMonthEnd(nextStart);
              }}
            >
              {MONTH_OPTIONS.map((month) => (
                <option key={month.value} value={String(month.value)}>
                  {month.label}
                </option>
              ))}
            </select>
          </label>

          <label className="reports-period-card active">
            <span className="reports-period-card-head">Mes fim</span>
            <select
              value={String(monthEnd)}
              onChange={(event) => {
                const nextEnd = Number(event.target.value);
                if (nextEnd < monthStart) {
                  setMonthEnd(monthStart);
                  return;
                }
                setMonthEnd(nextEnd);
              }}
            >
              {monthEndOptions.map((month) => (
                <option key={month.value} value={String(month.value)}>
                  {month.label}
                </option>
              ))}
            </select>
          </label>
        </div>
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
